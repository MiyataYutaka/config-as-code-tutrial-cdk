import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as appconfig from 'aws-cdk-lib/aws-appconfig';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NamingManager } from './utils/naming';
import { AppConfig } from '../config/schema';
import { CoreLambda } from './constructs/lambda/core-lambda';

interface StackProps extends cdk.StackProps {
  config: AppConfig; // バリデーション済みの設定オブジェクト
}
export class ConfigAsCodeTutrialCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const { config } = props;
    // 命名戦略のインスタンス化
    const naming = new NamingManager(config.project.org, config.project.system, config.project.service);

    // Network
    const vpc = new ec2.Vpc(this, 'Vpc', {
      vpcName: naming.generate('vpc', 'main'),
      maxAzs: 2,
      natGateways : 0,
      subnetConfiguration: [
        {
          name: naming.generate('subnet', 'public-subnet'),
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: naming.generate('subnet', 'app-subnet'),
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
        {
          name: naming.generate('subnet', 'db-subbnet'),
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        }
      ],
    });

    // AuroraMySQL Serverless v2
    const dbCluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
      clusterIdentifier: naming.generate('rds', 'aurora-cluster'),
      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_3_10_2,
      }),
      writer: rds.ClusterInstance.serverlessV2('Writer-Instance', {
        instanceIdentifier: naming.generate('rds', 'writer-instance'), 
      }),
      serverlessV2MinCapacity: config.database.minAcu,
      serverlessV2MaxCapacity: config.database.maxAcu,
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      defaultDatabaseName: config.database.dbName,
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // AppConfigのセットアップ
    const app = new appconfig.Application(this, "App", {
      applicationName: 'myappconfig-demo',
    });
    const env = new appconfig.Environment(this, 'MyEnv', {
      application: app,
      environmentName: 'dev'
    });

    const hostedConfig = new appconfig.HostedConfiguration(this, 'MyHostedConfig', {
      application: app,
      name: 'runtime-config',
      content: appconfig.ConfigurationContent.fromInlineText(
        JSON.stringify({ logLevel: 'INFO', featureX: false })
      ),
      deployTo: [env]
    });

// Lambda (カスタムコンストラクト利用)
    const apiLambda = new CoreLambda(this, 'ApiLambda', {
      naming: naming,
      detailName: 'create-order', // これだけで ACME-Ecom-Order-lambda-createOrder になる
      entry: 'src/lambda/index.ts',
      environment: {
        DB_SECRET_ARN: dbCluster.secret!.secretArn,
      },
      vpc,
    });


    // 権限付与
    dbCluster.secret!.grantRead(apiLambda.function);
    dbCluster.connections.allowFrom(apiLambda.function, ec2.Port.tcp(3306));
    
    const api = new apigateway.RestApi(this, 'ApiGateway', {
      restApiName: naming.generate('apigw', 'api-gateway'),
      deployOptions: {
        stageName: config.api.stagename,
      },
    });
    api.root.addMethod('GET', new apigateway.LambdaIntegration((apiLambda.function), {
      proxy: true,
    }));
  }  
}
