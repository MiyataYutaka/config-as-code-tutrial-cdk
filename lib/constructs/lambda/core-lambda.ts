import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { NamingManager } from '../../utils/naming';

interface CoreLambdaProps extends nodejs.NodejsFunctionProps {
  naming: NamingManager; // 必須
  detailName: string;    // <detail>部分のみ指定させる
}

export class CoreLambda extends Construct {
  public readonly function: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: CoreLambdaProps) {
    super(scope, id );

    const { naming, detailName,...funcProps } = props;

    // 1. デフォルト設定の定義
    const defaultProps: Partial<nodejs.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      logRetention: cdk.aws_logs.RetentionDays.ONE_MONTH,
      tracing: lambda.Tracing.ACTIVE,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk', 'mysql2'], // Layer利用時は除外
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };

    // 2. 環境変数のマージ
    // デフォルトの環境変数と、ユーザー指定の環境変数を結合します
    const mergedEnvironment = {
     ...defaultProps.environment,
     ...funcProps.environment,
      // 必要に応じて強制的に入れたい環境変数
      TZ: 'Asia/Tokyo', 
      NODE_OPTIONS: '--enable-source-maps', // スタックトレースを見やすくする
    };

    // 3. 設定のマージとLambda作成
    // funcProps (Configからの値) が defaultProps を上書きします
    this.function = new nodejs.NodejsFunction(this, 'Function', {
     ...defaultProps, // デフォルト値を展開
     ...funcProps,    // ユーザー指定値で上書き (メモリサイズなどはここから来る)      
      environment: mergedEnvironment,
      // 命名規則の適用 (これは上書きさせない)
      functionName: naming.generate('lambda', detailName),
      // バンドリングオプションのマージ (深い階層のマージが必要な場合)
      bundling: {
       ...defaultProps.bundling,
       ...funcProps.bundling,
      }
    });
  }
}