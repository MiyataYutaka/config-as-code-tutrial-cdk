import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { NamingManager } from '../../utils/naming';

interface CoreVpcProps extends ec2.VpcProps {
  naming: NamingManager; // 必須
  config: {
    cidr: string;
    natGateways: number;
    maxAzs: number;
    usePrivateLink: boolean;
  };    // <detail>部分のみ指定させる
}

export class CoreVpc extends Construct {
  public readonly function: ec2.Vpc;
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: CoreVpcProps) {
    super(scope, id );

    const { naming, config, ...vpcprops } = props;

    // 1. デフォルト設定の定義
    const defaultProps: Partial<ec2.VpcProps> = {
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
    };

    // 2. 設定のマージとLambda作成
    // funcProps (Configからの値) が defaultProps を上書きします
    this.function = new ec2.Vpc(this, 'MyVpc', {
     ...defaultProps, // デフォルト値を展開
     ...vpcprops,    // ユーザー指定値で上書き (メモリサイズなどはここから来る)      
      // 命名規則の適用 (これは上書きさせない)
      vpcName: naming.generate('vpc', 'main'),
    });
  }
}