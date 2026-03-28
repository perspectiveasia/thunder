import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AstroConstruct } from '../lib/astro';
import { FrameworkPipeline } from '../lib/frameworks/pipeline';
import { MetadataConstruct } from '../lib/constructs/metadata';
import { NuxtProps as AstroProps } from '../types/NuxtProps';

export class Astro extends Stack {
  constructor(scope: Construct, id: string, props: AstroProps) {
    super(scope, id, props);

    // 1. Astro (SSR Server + Client Origin with Edge Fallback)
    const astro = new AstroConstruct(this, 'Astro', props);

    // 2. Pipeline (Optional)
    let pipeline: FrameworkPipeline | undefined;
    if (props.accessTokenSecretArn && props.sourceProps) {
      pipeline = new FrameworkPipeline(this, 'Pipeline', props);
    }

    // 3. Metadata
    new MetadataConstruct(this, 'Metadata', {
      ...props,
      stackType: 'ASTRO',
      stackProps: {
        serverProps: props.serverProps,
        domain: props.domain,
        globalCertificateArn: props.globalCertificateArn,
        regionalCertificateArn: props.regionalCertificateArn,
        hostedZoneId: props.hostedZoneId,
      },
      resources: {
        DistributionId: astro.client.cdn.distributionId,
        DistributionUrl: `https://${astro.client.cdn.distributionDomainName}`,
        LambdaFunctionArn: astro.server.lambdaFunction.functionArn,
        Route53Domain: props.domain ? `https://${props.domain}` : undefined,
        CodePipelineName: pipeline?.codePipeline.pipelineName,
      }
    });
  }
}
