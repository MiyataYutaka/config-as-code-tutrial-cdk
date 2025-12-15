import * as cdk from 'aws-cdk-lib';
import { aws_s3 as s3 } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AppConfigSchema } from '../../config/schema';

export class SecureBucketBase extends s3.Bucket {
  constructor(scope: Construct, id: string, props?: s3.BucketProps) {
    super(scope, id, {
      versioned: false,
      autoDeleteObjects: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      ...props,
    });
  }
}
