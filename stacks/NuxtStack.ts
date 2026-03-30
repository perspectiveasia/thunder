import { Stack, Aws } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NuxtConstruct } from '../lib/nuxt';
import { FrameworkPipeline } from '../lib/frameworks/pipeline';
import { MetadataConstruct } from '../lib/constructs/metadata';
import { NuxtProps } from '../types/NuxtProps';

export class Nuxt extends Stack {
  constructor(scope: Construct, id: string, props: NuxtProps) {
    // Populate default env if not provided
    props = {
      ...props,
      env: {
        account: props.env?.account || process.env.CDK_DEFAULT_ACCOUNT || Aws.ACCOUNT_ID,
        region: props.env?.region || process.env.CDK_DEFAULT_REGION || Aws.REGION,
      },
    } as NuxtProps;

    super(scope, id, props);

    // 1. Nuxt (SSR Server + Client Origin)
    const nuxt = new NuxtConstruct(this, 'Nuxt', props);

    // 2. Pipeline (Optional)
    let pipeline: FrameworkPipeline | undefined;
    if (props.accessTokenSecretArn && props.sourceProps) {
      pipeline = new FrameworkPipeline(this, 'Pipeline', props);
    }

    // 3. Metadata
    new MetadataConstruct(this, 'Metadata', {
      ...props,
      stackType: 'NUXT',
      stackProps: {
        serverProps: props.serverProps,
        domain: props.domain,
        globalCertificateArn: props.globalCertificateArn,
        regionalCertificateArn: props.regionalCertificateArn,
        hostedZoneId: props.hostedZoneId,
      },
      resources: {
        DistributionId: nuxt.client.cdn.distributionId,
        DistributionUrl: `https://${nuxt.client.cdn.distributionDomainName}`,
        LambdaFunctionArn: nuxt.server.lambdaFunction.functionArn,
        Route53Domain: props.domain ? `https://${props.domain}` : undefined,
        CodePipelineName: pipeline?.codePipeline.pipelineName,
      }
    });
  }
}
