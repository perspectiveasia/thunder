import { Construct } from 'constructs';
import { CfnOutput, SecretValue } from 'aws-cdk-lib';
import { Pipeline, Artifact, PipelineType } from 'aws-cdk-lib/aws-codepipeline';
import { GitHubSourceAction, GitHubTrigger, CodeBuildAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { PipelineProject, LinuxArmBuildImage, ComputeType, BuildSpec } from 'aws-cdk-lib/aws-codebuild';
import { ServerlessBaseProps } from '../../types/ServerlessProps';
import { getResourceIdPrefix } from '../utils';
import { EventsConstruct } from '../constructs/events';

export class ServerlessPipeline extends Construct {
  public readonly codePipeline: Pipeline;

  constructor(scope: Construct, id: string, props: ServerlessBaseProps) {
    super(scope, id);

    const prefix = getResourceIdPrefix(props.application, props.service, props.environment);
    const bp = props.buildProps;

    const sourceOutput = new Artifact();
    const buildOutput = new Artifact();

    const project = new PipelineProject(this, 'BuildProject', {
      projectName: `${prefix}-build`,
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              [bp?.runtime || 'nodejs']: bp?.runtime_version || 22,
            },
            commands: [bp?.installcmd || 'npm install'],
          },
          build: {
            commands: [bp?.buildcmd || 'npm run build'],
          },
        },
        artifacts: {
          files: ['**/*'],
          'base-directory': bp?.outputDir || '.output',
        },
      }),
      environment: {
        buildImage: LinuxArmBuildImage.AMAZON_LINUX_2023_STANDARD_3_0,
        computeType: ComputeType.MEDIUM,
        environmentVariables: Object.fromEntries(
          (bp?.environment || []).flatMap(obj =>
            Object.entries(obj).map(([k, v]) => [k, { value: v }])
          )
        ),
      },
    });

    this.codePipeline = new Pipeline(this, 'Pipeline', {
      pipelineName: `${prefix}-pipeline`,
      pipelineType: PipelineType.V2,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new GitHubSourceAction({
              actionName: 'GitHub_Source',
              owner: props.sourceProps!.owner!,
              repo: props.sourceProps!.repo!,
              branch: props.sourceProps?.branchOrRef || 'main',
              oauthToken: SecretValue.secretsManager(props.accessTokenSecretArn!),
              output: sourceOutput,
              trigger: GitHubTrigger.WEBHOOK,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new CodeBuildAction({
              actionName: 'Build',
              project,
              input: sourceOutput,
              outputs: [buildOutput],
            }),
          ],
        },
      ],
    });

    new EventsConstruct(this, 'Events', {
      ...props,
      codePipeline: this.codePipeline,
    });

    new CfnOutput(this, 'CodePipelineName', {
      value: this.codePipeline.pipelineName,
      description: 'The name of the deployment pipeline',
      exportName: `${prefix}-CodePipelineName`,
    });
  }
}
