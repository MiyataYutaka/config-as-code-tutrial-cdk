import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { NamingManager } from '../utils/naming';

interface CoreLambdaProps extends nodejs.NodejsFunctionProps {
  naming: NamingManager; // 必須
  detailName: string;    // <detail>部分のみ指定させる
}

export class CoreLambda extends Construct {
  public readonly function: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: CoreLambdaProps) {
    super(scope, id);

    const { naming, detailName,...funcProps } = props;

    // 命名規則の適用: <Org>-<System>-<Service>-lambda-<detail>
    const resourceName = naming.generate('lambda', detailName);

    this.function = new nodejs.NodejsFunction(this, 'Function', {
     ...funcProps,
      functionName: resourceName, // 名前を強制上書き
      runtime: lambda.Runtime.NODEJS_20_X, // 組織標準ランタイム
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk', 'mysql2'], // Layer利用時は除外
       ...funcProps.bundling,
      },
    });
  }
}