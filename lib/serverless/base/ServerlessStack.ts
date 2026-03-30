import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ServerlessBaseProps } from '../types/ServerlessProps';
import { getFrameworkConfig, mergePropsWithDefaults } from '../utils/framework-config';
import { ServerlessServer } from './ServerlessServer';
import { ServerlessClient } from './ServerlessClient';

export interface ServerlessStackProps extends ServerlessBaseProps {
  framework: string;
}

export class ServerlessStack extends Stack {
  constructor(scope: Construct, id: string, props: ServerlessStackProps) {
    super(scope, id, props);

    // Get framework configuration and merge with defaults
    const frameworkConfig = getFrameworkConfig(props.framework);
    const mergedProps = mergePropsWithDefaults(props, frameworkConfig);

    // Create the server construct (Lambda + API Gateway)
    const server = new ServerlessServer(this, 'Server', mergedProps);

    // Create the client construct (CloudFront + S3)
    const client = new ServerlessClient(this, 'Client', {
      ...mergedProps,
      httpOrigin: server.httpOrigin,
    });
  }
}