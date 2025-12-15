import { Handler } from 'aws-lambda';
import * as mysql from 'mysql2/promise';
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

// グローバルスコープでプールを保持（コンテナ再利用のため）
let pool: mysql.Pool | null = null;
let currentConfigToken: string | null = null;

// AppConfig Extensionのエンドポイント
const APPCONFIG_PORT = process.env.AWS_APPCONFIG_EXTENSION_HTTP_PORT || '2772';
// 環境変数からパスを取得 (prefetch設定と同じパス)
const CONFIG_PATH = process.env.AWS_APPCONFIG_EXTENSION_PREFETCH_LIST || ''; 

// 設定の型定義
interface DynamicConfig {
  connectionLimit: number;
  logLevel: string;
  queryTimeoutMs: number;
}

const secretsManager = new SecretsManager({});

// AppConfigから設定を取得する関数
async function getDynamicConfig(): Promise<{ config: DynamicConfig; token: string }> {
  const url = `http://localhost:${APPCONFIG_PORT}${CONFIG_PATH}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`AppConfig error: ${response.statusText}`);
    
    const config = await response.json() as DynamicConfig;
    // ExtensionはヘッダーにConfiguration-Versionトークンを返す
    const token = response.headers.get('Configuration-Version') || 'unknown';
    
    return { config, token };
  } catch (error) {
    console.error('Failed to fetch config', error);
    // フォールバック設定
    return { 
      config: { connectionLimit: 5, logLevel: 'ERROR', queryTimeoutMs: 3000 }, 
      token: 'fallback' 
    };
  }
}

// DB接続プールを取得・更新する関数
async function getDbPool(dynamicConfig: DynamicConfig, token: string): Promise<mysql.Pool> {
  // 設定が変更された場合、既存のプールを破棄して再作成
  if (pool && currentConfigToken!== token) {
    console.log('Configuration changed. Recreating DB pool...');
    await pool.end();
    pool = null;
  }

  if (!pool) {
    // Secrets Managerから認証情報を取得 (実際はキャッシュ推奨)
    const secretArn = process.env.DB_SECRET_ARN;
    const secretVal = await secretsManager.getSecretValue({ SecretId: secretArn });
    const creds = JSON.parse(secretVal.SecretString!);

    console.log(`Initializing pool with limit: ${dynamicConfig.connectionLimit}`);
    
    pool = mysql.createPool({
      host: creds.host,
      user: creds.username,
      password: creds.password,
      database: creds.dbname,
      // ★ ここでAppConfigの値を適用
      connectionLimit: dynamicConfig.connectionLimit,
      connectTimeout: dynamicConfig.queryTimeoutMs,
      waitForConnections: true,
      queueLimit: 0
    });
    currentConfigToken = token;
  }

  return pool;
}

export const handler: Handler = async (event, context) => {
  // 1. AppConfig Extensionから設定を取得 (http経由、高速)
  const { config, token } = await getDynamicConfig();

  // ログレベル制御の例
  if (config.logLevel === 'DEBUG') {
    console.log('Event:', JSON.stringify(event));
  }

  try {
    // 2. 設定に基づいてDBプールを取得（変更があれば再作成）
    const db = await getDbPool(config, token);

    // 3. クエリ実行
    const [rows] = await db.query('SELECT NOW() as now');

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Success', 
        data: rows,
        configUsed: {
          connectionLimit: config.connectionLimit,
          logLevel: config.logLevel
        }
      }),
    };
  } catch (error) {
    console.error('Database Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};