// Stacks
export { Static } from './stacks/StaticStack';
export { Lambda } from './stacks/LambdaStack';
export { Fargate } from './stacks/FargateStack';
export { Ec2 } from './stacks/Ec2Stack';
export { Template } from './stacks/TemplateStack';
export { Vpc } from './stacks/VpcStack';

// Serverless framework stacks (new unified abstraction)
export * from './lib/serverless';

// Types
export type { StaticProps } from './types/StaticProps';
export type { LambdaProps } from './types/LambdaProps';
export type { FargateProps } from './types/FargateProps';
export type { Ec2Props } from './types/Ec2Props';
export type { TemplateProps } from './types/TemplateProps';

// Serverless framework types
export type { ServerlessBaseProps as NuxtProps } from './lib/serverless/types/ServerlessProps';
export type { ServerlessBaseProps as AstroProps } from './lib/serverless/types/ServerlessProps';
export type { ServerlessBaseProps as TanStackStartProps } from './lib/serverless/types/ServerlessProps';
export type { ServerlessBaseProps as SvelteKitProps } from './lib/serverless/types/ServerlessProps';
export type { ServerlessBaseProps as SolidStartProps } from './lib/serverless/types/ServerlessProps';
export type { ServerlessBaseProps as AnalogJSProps } from './lib/serverless/types/ServerlessProps';
export type { ServerlessBaseProps, ServerlessServerProps, ServerlessClientProps, ServerlessBuildProps } from './lib/serverless/types/ServerlessProps';

// Coolify Template utilities
export { fetchTemplate } from './lib/template/template/fetch';
export { hydrateTemplate } from './lib/template/template/hydrate';

// Re-export everything from aws-cdk-lib
export * as Cdk from 'aws-cdk-lib';