import { FrameworkConfig, ServerlessBaseProps } from '../types/ServerlessProps';

export const FRAMEWORK_CONFIGS: Record<string, FrameworkConfig> = {
  nuxt: {
    name: 'Nuxt',
    defaultServerDir: '.output/server',
    defaultClientDir: '.output/public',
    defaultHandler: 'index.handler',
    defaultServerPaths: ['/api/*'],
    requiresFallbackEdge: false,
    nitroPreset: 'aws-lambda',
  },
  astro: {
    name: 'Astro',
    defaultServerDir: '.output/server',
    defaultClientDir: '.output/public',
    defaultHandler: 'index.handler',
    defaultServerPaths: ['/api/*'],
    requiresFallbackEdge: true,
    nitroPreset: 'aws-lambda',
  },
  'tanstack-start': {
    name: 'TanStack Start',
    defaultServerDir: '.output/server',
    defaultClientDir: '.output/public',
    defaultHandler: 'index.handler',
    defaultServerPaths: ['/api/*'],
    requiresFallbackEdge: false,
    nitroPreset: 'aws-lambda',
  },
  'react-router': {
    name: 'React Router v7',
    defaultServerDir: 'build/server',
    defaultClientDir: 'build/client',
    defaultHandler: 'index.handler',
    defaultServerPaths: ['/api/*'],
    requiresFallbackEdge: false,
    nitroPreset: 'aws-lambda',
  },
  sveltekit: {
    name: 'SvelteKit',
    defaultServerDir: 'build/server',
    defaultClientDir: 'build/client',
    defaultHandler: 'index.handler',
    defaultServerPaths: ['/api/*'],
    requiresFallbackEdge: false,
    adapterRequired: true,
  },
  'solid-start': {
    name: 'Solid Start',
    defaultServerDir: '.output/server',
    defaultClientDir: '.output/public',
    defaultHandler: 'index.handler',
    defaultServerPaths: ['/api/*'],
    requiresFallbackEdge: false,
    nitroPreset: 'aws-lambda-streaming',
  },
  analogjs: {
    name: 'AnalogJS',
    defaultServerDir: 'dist/analog/server',
    defaultClientDir: 'dist/analog/public',
    defaultHandler: 'index.mjs',
    defaultServerPaths: ['/api/*'],
    requiresFallbackEdge: false,
    nitroPreset: 'aws-lambda',
  },
};

export function getFrameworkConfig(framework: string): FrameworkConfig {
  const config = FRAMEWORK_CONFIGS[framework];
  if (!config) {
    throw new Error(`Unknown framework: ${framework}`);
  }
  return config;
}

export function mergePropsWithDefaults(
  props: ServerlessBaseProps & { framework: string },
  config: FrameworkConfig
): ServerlessBaseProps & { framework: string } {
  return {
    ...props,
    serverProps: {
      codeDir: config.defaultServerDir,
      handler: config.defaultHandler,
      paths: config.defaultServerPaths,
      ...props.serverProps,
    },
    clientProps: {
      outputDir: config.defaultClientDir,
      useFallbackEdge: config.requiresFallbackEdge,
      ...props.clientProps,
    },
  };
}