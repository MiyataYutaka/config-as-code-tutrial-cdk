#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ConfigAsCodeTutrialCdkStack } from '../lib/config-as-code-tutrial-cdk-stack';
import { AppConfigSchema, AppConfig } from '../config/schema';
import { devConfig } from '../config/values';

const app = new cdk.App();
const envKey = app.node.tryGetContext('env') || 'dev';

new ConfigAsCodeTutrialCdkStack(app, 'ConfigAsCodeTutrialCdkStack', {
  config: AppConfigSchema.parse(devConfig),
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

// 2. 環境名に応じた設定値を選択
let rawConfig: any;
switch (envKey) {
  case 'dev':
    rawConfig = devConfig;
    break;
  case 'prod':
    // rawConfig = prodConfig; 
    throw new Error('Production config is not yet defined in this sample.');
    break;
  default:
    throw new Error(`Unsupported environment: ${envKey}. Please use "dev" or "prod".`);
}

// 3. 【重要】Zodによる設定値のバリデーション
// ここでスキーマ違反（例：ACUの範囲外、必須項目の欠落）があれば、
// CloudFormationの生成前にプロセスが終了し、デプロイミスを防ぎます。
let config: AppConfig;
try {
  config = AppConfigSchema.parse(rawConfig);
  console.log(`Configuration for '${envKey}' environment is valid.`);
} catch (error) {
  console.error(`Configuration validation failed for '${envKey}' environment:`);
  console.error(error);
  process.exit(1);
}

// 4. スタックの作成
// スタック名にも環境名を含めることで、同一アカウント内での競合を防ぎます
const stackName = `${config.project.system}-${config.project.service}-${config.envName}`;

const stack = new ConfigAsCodeTutrialCdkStack(app, 'ApiServiceStack', {
  stackName: stackName,
  config: config, // バリデーション済みの設定オブジェクトを渡す
  
  // AWSアカウントとリージョンの設定
  // 環境変数 CDK_DEFAULT_ACCOUNT 等を利用するのが一般的です
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
});

// 5. 共通タグの適用 (組織のガバナンス対応)
// このスタック内の全リソースにタグが付与されます
cdk.Tags.of(stack).add('Environment', config.envName);
cdk.Tags.of(stack).add('System', config.project.system);
cdk.Tags.of(stack).add('Service', config.project.service);
cdk.Tags.of(stack).add('Owner', config.project.org);
cdk.Tags.of(stack).add('ManagedBy', 'CDK');