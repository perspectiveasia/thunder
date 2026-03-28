import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ServiceConstruct } from '../lib/fargate/service';
import { PipelineConstruct } from '../lib/fargate/pipeline';
import { MetadataConstruct } from '../lib/constructs/metadata';
import { FargateProps } from '../types/FargateProps';
import { getResourceIdPrefix } from '../lib/utils';

export class Fargate extends Stack {
  constructor(scope: Construct, id: string, props: FargateProps) {
    super(scope, id, props);

    // Check mandatory properties
    if (!props?.env) {
      throw new Error('Must provide AWS account and region.');
    }
    if (!props.application || !props.environment || !props.service) {
      throw new Error('Mandatory stack properties missing.');
    }

    const resourceIdPrefix = getResourceIdPrefix(props.application, props.service, props.environment);

    // Create Fargate construct
    const fargate = new ServiceConstruct(this, 'Fargate', props);

    // Pipeline (if GitHub access token provided)
    let pipeline: PipelineConstruct | undefined;
    if (props?.accessTokenSecretArn) {
      // Check for sourceProps
      if (!props.sourceProps?.owner || !props.sourceProps?.repo || !props.sourceProps?.branchOrRef) {
        throw new Error('Missing sourceProps: Github owner, repo and branch/ref required.');
      }

      pipeline = new PipelineConstruct(this, 'Pipeline', {
        ...props,
        clusterName: fargate.clusterName,
        fargateService: fargate.fargateService,
        taskDefinition: fargate.taskDefinition,
      });
    }

    // Metadata
    new MetadataConstruct(this, 'Metadata', {
      ...props,
      stackType: 'FARGATE',
      stackProps: {
        serviceProps: props.serviceProps,
        domain: props.domain,
        globalCertificateArn: props.globalCertificateArn,
        hostedZoneId: props.hostedZoneId,
      },
      resources: {
        LoadBalancerDNS: fargate.loadBalancerDnsName,
        LoadBalancerArn: fargate.loadBalancer.loadBalancerArn,
        ServiceUrl: props.domain ? `https://${props.domain}` : `http://${fargate.loadBalancerDnsName}`,
        Route53Domain: props.domain ? `https://${props.domain}` : undefined,
        CodePipelineName: pipeline?.codePipeline.pipelineName,
      }
    });
  }
}
