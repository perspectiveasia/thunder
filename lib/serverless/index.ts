// Unified serverless deployment abstraction for meta-frameworks
// Supports: Nuxt, Astro, TanStack Start, Remix, SvelteKit, Solid Start, AnalogJS

// Framework-specific stacks (recommended)
export * from './frameworks';

// Base constructs for custom implementations
export { ServerlessStack } from './base/ServerlessStack';
export { ServerlessServer } from './base/ServerlessServer';
export { ServerlessClient } from './base/ServerlessClient';

// Types and configuration
export * from './types/ServerlessProps';
export * from './utils/framework-config';