import { Aws } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';
import { AppProps } from '../../types/AppProps';

export interface MetadataProps extends AppProps {
  readonly stackType: string;
  readonly stackProps: Record<string, any>;
  readonly resources: Record<string, any>;
}

export class MetadataConstruct extends Construct {
  constructor(scope: Construct, id: string, props: MetadataProps) {
    super(scope, id);

    const account = props.env?.account || Aws.ACCOUNT_ID;
    const region = props.env?.region || Aws.REGION;
    const bucketName = `thunder-metadata-${account}-${region}`;

    const bucketChecker = new AwsCustomResource(this, 'BucketChecker', {
      onCreate: {
        service: 'S3',
        action: 'createBucket',
        parameters: { Bucket: bucketName },
        physicalResourceId: PhysicalResourceId.of(bucketName),
        ignoreErrorCodesMatching: 'BucketAlreadyOwnedByYou|BucketAlreadyExists',
      },
      onDelete: {
        service: 'S3',
        action: 'headBucket',
        parameters: { Bucket: bucketName },
        physicalResourceId: PhysicalResourceId.of(bucketName),
        ignoreErrorCodesMatching: '.*',
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: [`arn:aws:s3:::${bucketName}`] }),
      installLatestAwsSdk: false,
    });

    const discoveryBucket = Bucket.fromBucketName(this, 'DiscoveryBucket', bucketName);

    const metadataContent = {
      name: props.service,
      stack_type: props.stackType,
      stack_version: '1.1.0', // TODO: Read from package.json dynamically
      owner: props.sourceProps?.owner,
      repo: props.sourceProps?.repo,
      branch: props.sourceProps?.branchOrRef,
      rootDir: props.rootDir || '/',
      metadata: props.stackProps,
      resources: props.resources,
      created_at: new Date().toISOString(),
      environment_id: `${props.application}-${props.environment}`,
    };

    const deployment = new BucketDeployment(this, 'Metadata', {
      sources: [Source.jsonData('metadata.json', metadataContent)],
      destinationBucket: discoveryBucket,
      destinationKeyPrefix: `apps/${props.application}/${props.environment}/${props.service}`,
      prune: false,
      retainOnDelete: true,
    });

    deployment.node.addDependency(bucketChecker);

    // Track updates and deletes
    const metadataKey = `apps/${props.application}/${props.environment}/${props.service}/metadata.json`;
    
    new AwsCustomResource(this, 'MetadataTimestamps', {
      onUpdate: {
        service: 'S3',
        action: 'putObject',
        parameters: {
          Bucket: bucketName,
          Key: metadataKey,
          Body: JSON.stringify({ ...metadataContent, updated_at: new Date().toISOString() }),
          ContentType: 'application/json',
        },
        physicalResourceId: PhysicalResourceId.of(`${bucketName}/${metadataKey}`),
      },
      onDelete: {
        service: 'S3',
        action: 'putObject',
        parameters: {
          Bucket: bucketName,
          Key: metadataKey,
          Body: JSON.stringify({ ...metadataContent, deleted_at: new Date().toISOString() }),
          ContentType: 'application/json',
        },
        physicalResourceId: PhysicalResourceId.of(`${bucketName}/${metadataKey}`),
        ignoreErrorCodesMatching: '.*',
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: [`arn:aws:s3:::${bucketName}/*`] }),
      installLatestAwsSdk: false,
    });
  }
}
