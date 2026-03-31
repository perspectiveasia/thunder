import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ServerlessBaseProps } from '../types/ServerlessProps';
import { getFrameworkConfig, mergePropsWithDefaults } from '../lib/utils/framework-config';
import { ServerlessServer } from '../lib/serverless/server';
import { ServerlessClient } from '../lib/serverless/client';
import { ServerlessPipeline } from '../lib/serverless/pipeline';

export interface ServerlessStackProps extends ServerlessBaseProps {
  framework: string;
}

export class ServerlessStack extends Stack {
  constructor(scope: Construct, id: string, props: ServerlessStackProps) {
    super(scope, id, props);

    const frameworkConfig = getFrameworkConfig(props.framework);
    const mergedProps = mergePropsWithDefaults(props, frameworkConfig);

    const server = new ServerlessServer(this, 'Server', mergedProps);

    const client = new ServerlessClient(this, 'Client', {
      ...mergedProps,
      httpOrigin: server.httpOrigin,
    });

    if (props.accessTokenSecretArn && props.sourceProps) {
      new ServerlessPipeline(this, 'Pipeline', mergedProps);
    }
  }
}