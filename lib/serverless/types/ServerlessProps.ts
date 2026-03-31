import { Runtime, Architecture } from 'aws-cdk-lib/aws-lambda';
import { AppProps } from '../../../types/AppProps';

export interface ServerlessBaseProps extends AppProps {
  // Domain & DNS (serverless-specific)
  domain?: string;
  hostedZoneId?: string;
  globalCertificateArn?: string;  // CloudFront (us-east-1)
  regionalCertificateArn?: string; // API Gateway (region-specific)

  // Framework-specific overrides
  serverProps?: ServerlessServerProps;
  clientProps?: ServerlessClientProps;
  buildProps?: ServerlessBuildProps;
}

export interface ServerlessServerProps {
  // Build paths
  codeDir?: string;              // Default: .output/server
  handler?: string;              // Default: index.handler

  // Lambda configuration
  runtime?: Runtime;
  architecture?: Architecture;
  memorySize?: number;
  timeout?: number;
  reservedConcurrency?: number;
  provisionedConcurrency?: number;

  // Docker support (container mode when specified)
  dockerFile?: string;
  dockerBuildArgs?: Record<string, string | number>;

  // Files & environment
  include?: string[];
  exclude?: string[];
  variables?: Array<Record<string, string>>;
  secrets?: Array<{ key: string; resource: string }>;

  // API routing
  paths?: string[];              // Server-rendered paths (e.g., /api/*)

  // Features
  keepWarm?: boolean;
  tracing?: boolean;
  streaming?: boolean;           // Enable API Gateway streaming
}

export interface ServerlessClientProps {
  // Build paths
  outputDir?: string;            // Default: .output/public

  // Asset handling
  include?: string[];
  exclude?: string[];

  // Edge functions
  useFallbackEdge?: boolean;     // For Astro-style routing

  // Cache behavior
  allowHeaders?: string[];
  allowCookies?: string[];
  allowQueryParams?: string[];
  denyQueryParams?: string[];

  // Security
  responseHeadersPolicy?: ResponseHeadersPolicyProps;
}

export interface ServerlessBuildProps {
  outputDir?: string;
  include?: string[];
  exclude?: string[];
}

export interface FrameworkConfig {
  name: string;
  defaultServerDir: string;
  defaultClientDir: string;
  defaultHandler: string;
  defaultServerPaths: string[];
  requiresFallbackEdge: boolean;
  nitroPreset?: string;
  buildCommand?: string;
  adapterRequired?: boolean;
  defaultIncludes?: string[];
}

// Re-export CDK types for convenience
export type { Runtime, Architecture } from 'aws-cdk-lib/aws-lambda';

// Import missing types
interface ResponseHeadersPolicyProps {
  // This would be imported from aws-cdk-lib/aws-cloudfront
  // For now, using a placeholder
  [key: string]: any;
}