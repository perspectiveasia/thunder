# Plan: Serverless Meta-Framework Abstraction Layer

Based on analysis of existing Nuxt and Astro constructs, TanStack Start documentation, and research on other meta-frameworks, this document outlines a comprehensive plan for creating a unified serverless deployment pattern.

## Key Findings

**Common Pattern Across Frameworks:**
- All frameworks use **Vite** for client bundling and **Nitro** (or Nitro-based) for server runtime
- Build outputs follow similar structure:
  - Client assets: `.output/public` or `dist/client`
  - Server bundle: `.output/server` or `dist/server`
- Server bundles expose a standard handler (e.g., `index.handler`) compatible with AWS Lambda
- All support streaming responses via API Gateway
- CloudFront routes static assets (S3) and dynamic requests (Lambda via API Gateway)

**Framework-Specific Details:**

| Framework | Client Builder | Server Runtime | Default Output | Handler | Nitro Preset | Notes |
|-----------|---------------|----------------|----------------|---------|--------------|-------|
| Nuxt | Vite | Nitro | `.output/public`, `.output/server` | `index.handler` | `aws-lambda` | NITRO_PRESET=aws-lambda |
| Astro | Vite | @astro-aws/adapter | `dist/client`, `dist/lambda` | `entry.handler` | N/A | Uses Lambda@Edge for fallback |
| TanStack Start | Vite | Nitro | `.output/public`, `.output/server` | `index.handler` | `aws-lambda` | Streaming enabled by default |
| Remix/RR v7 | Vite | Custom/Nitro | `build/client`, `build/server` | `index.handler` | `aws-lambda` | Framework mode uses Nitro |
| SvelteKit | Vite | Adapter-based | `build/client`, `build/server` | Adapter-specific | N/A | Multiple Lambda adapters available |
| Solid Start | Vite | Nitro | `.output/public`, `.output/server` | `index.handler` | `aws-lambda-streaming` | aws-lambda-streaming preset |
| AnalogJS | Vite | Nitro | `dist/analog/public`, `dist/analog/server` | `index.handler` | `aws-lambda` | Angular-based, uses Nitro |

## Proposed Architecture

```
thunder/lib/
├── serverless/                    # New abstraction layer
│   ├── base/
│   │   ├── ServerlessServer.ts   # Base Lambda construct
│   │   ├── ServerlessClient.ts   # Base S3 + CloudFront construct
│   │   └── ServerlessStack.ts    # Orchestrator
│   ├── types/
│   │   └── ServerlessProps.ts    # Unified prop interfaces
│   └── utils/
│       └── framework-config.ts   # Framework-specific defaults
├── frameworks/                    # Framework aliases
│   ├── nuxt.ts                   # Nuxt-specific wrapper
│   ├── astro.ts                  # Astro-specific wrapper
│   ├── tanstack-start.ts         # TanStack Start wrapper
│   ├── remix.ts                  # Remix/React Router v7 wrapper
│   ├── sveltekit.ts              # SvelteKit wrapper
│   ├── solid-start.ts            # Solid Start wrapper
│   └── analogjs.ts               # AnalogJS wrapper
```

## Implementation Plan

### Phase 1: Create Base Abstraction Layer

#### 1.1 Define Unified Props Interface (`serverless/types/ServerlessProps.ts`)

```typescript
export interface ServerlessBaseProps {
  // Common deployment props
  application: string;
  service: string;
  environment: string;
  contextDirectory?: string;
  rootDir?: string;
  
  // Domain & DNS
  domain?: string;
  hostedZoneId?: string;
  globalCertificateArn?: string;  // CloudFront (us-east-1)
  regionalCertificateArn?: string; // API Gateway (region-specific)
  
  // Debug & monitoring
  debug?: boolean;
  
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
}
```

#### 1.2 Create Framework Configuration Registry (`serverless/utils/framework-config.ts`)

```typescript
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
    defaultServerDir: 'dist/lambda',
    defaultClientDir: 'dist/client',
    defaultHandler: 'entry.handler',
    defaultServerPaths: ['/api/*'],
    requiresFallbackEdge: true,
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
  remix: {
    name: 'Remix',
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
    defaultHandler: 'index.handler',
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
): ServerlessBaseProps {
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
```

#### 1.3 Create Base Server Construct (`serverless/base/ServerlessServer.ts`)

Extract common Lambda logic from `nuxt/server.ts`:
- Lambda function creation (standard & container)
- Environment variables & secrets management
- API Gateway setup with streaming support
- Keep-warm ping rule
- Merge framework-specific defaults with user overrides

Key methods:
- `createLambdaFunction()` - Standard Lambda (ZIP mode)
- `createContainerLambdaFunction()` - Docker-based Lambda (container mode)
- `createApiGateway()` - HTTP API with optional streaming
- `createHttpOrigin()` - CloudFront origin
- `createPingRule()` - Keep-warm scheduler
- `addEnvironmentVariables()` - Env var injection
- `addSecrets()` - Secrets Manager integration

#### Container Mode Support

When `dockerFile` is specified in `ServerlessServerProps`, the construct will automatically use container deployment mode:

1. **Build Docker Image**: Use framework-specific Dockerfile from `docker/` directory
2. **Push to ECR**: Create private ECR repository and push image
3. **Create Container Lambda**: Use `DockerImageFunction` instead of `NodejsFunction`
4. **Environment Variables**: Pass via `environment` prop (not build args)
5. **Handler**: Use `index.handler` (same as ZIP mode)
6. **Architecture**: Support both x86_64 and arm64

Container mode benefits:
- Larger deployment packages (up to 10GB vs 250MB ZIP)
- Native dependencies support
- Faster cold starts for large applications
- Better performance for CPU-intensive workloads

#### 1.4 Create Base Client Construct (`serverless/base/ServerlessClient.ts`)

Extract common CloudFront logic from `nuxt/client.ts` and `astro/client.ts`:
- S3 bucket creation with OAC (IPv6-compatible)
- Origin Access Control configuration for secure S3 access
- CloudFront distribution with multiple origins
- Cache policies (server vs static assets)
- Response headers policy
- Bucket deployment
- Route53 DNS records
- Optional Lambda@Edge fallback function

Key methods:
- `createStaticAssetsBucket()` - S3 with OAC
- `createOriginAccessControl()` - OAC for IPv6 support
- `createEdgeLambda()` - Optional fallback (Astro-style)
- `createCloudFrontDistribution()` - Multi-origin CDN
- `setupDeployments()` - Asset upload & invalidation
- `createDnsRecords()` - Route53 A/AAAA records

#### 1.5 Create Orchestrator Stack (`serverless/base/ServerlessStack.ts`)

```typescript
export class ServerlessStack extends Stack {
  constructor(scope: Construct, id: string, props: ServerlessBaseProps & { framework: string }) {
    super(scope, id);
    
    const frameworkConfig = getFrameworkConfig(props.framework);
    const mergedProps = mergePropsWithDefaults(props, frameworkConfig);
    
    const server = new ServerlessServer(this, 'Server', mergedProps);
    const client = new ServerlessClient(this, 'Client', {
      ...mergedProps,
      httpOrigin: server.httpOrigin,
    });
  }
}
```

### Phase 2: Create Framework Aliases

Each framework gets a thin wrapper that sets framework-specific defaults:

#### Example: `frameworks/tanstack-start.ts`

```typescript
import { ServerlessStack } from '../serverless/base/ServerlessStack';
import { ServerlessBaseProps } from '../serverless/types/ServerlessProps';

export class TanStackStart extends ServerlessStack {
  constructor(scope: Construct, id: string, props: ServerlessBaseProps) {
    super(scope, id, {
      ...props,
      framework: 'tanstack-start',
      serverProps: {
        streaming: true, // TanStack Start default
        ...props.serverProps,
      },
    });
  }
}
```

#### Example: `frameworks/astro.ts`

```typescript
export class Astro extends ServerlessStack {
  constructor(scope: Construct, id: string, props: ServerlessBaseProps) {
    super(scope, id, {
      ...props,
      framework: 'astro',
      clientProps: {
        useFallbackEdge: true, // Astro needs Lambda@Edge fallback
        ...props.clientProps,
      },
    });
  }
}
```

#### Example: `frameworks/analogjs.ts`

```typescript
export class AnalogJS extends ServerlessStack {
  constructor(scope: Construct, id: string, props: ServerlessBaseProps) {
    super(scope, id, {
      ...props,
      framework: 'analogjs',
      // AnalogJS-specific defaults already in config
    });
  }
}
```

### Phase 3: Migration Strategy

#### 3.1 Backward Compatibility
- Keep existing `nuxt/` and `astro/` constructs as-is initially
- Mark them as deprecated with migration guide
- New constructs use `frameworks/nuxt.ts` and `frameworks/astro.ts`

#### 3.2 Gradual Migration
```typescript
// Old way (deprecated)
import { ServerConstruct } from '../lib/nuxt/server';
import { ClientConstruct } from '../lib/nuxt/client';

// New way
import { Nuxt } from '@thunder-so/thunder';
```

### Phase 4: Testing & Validation

#### 4.1 Test Matrix
- Deploy each framework with default configuration
- Test custom overrides (memory, timeout, domains)
- Verify streaming responses work
- Test keep-warm functionality
- Validate CloudFront cache behaviors

#### 4.2 Documentation
- Create migration guide from old constructs
- Document framework-specific quirks
- Provide example stacks for each framework
- Add troubleshooting section

## Key Benefits

1. **DRY Principle**: Single source of truth for serverless deployment logic
2. **Consistency**: All frameworks deploy with same architecture pattern
3. **Flexibility**: Framework-specific overrides where needed
4. **Maintainability**: Bug fixes apply to all frameworks
5. **Extensibility**: Easy to add new frameworks
6. **Type Safety**: Unified TypeScript interfaces
7. **Best Practices**: Streaming, OAC, security headers built-in
8. **IPv6 Compatible**: OAC implementation supports both IPv4 and IPv6 traffic

## Framework-Specific Considerations

### TanStack Start
- Uses Nitro with `aws-lambda` preset and streaming support (`awsLambda: { streaming: true }`)
- Build configuration in `vite.config.ts` with nitro plugin
- Build output: `.output/server` and `.output/public`
- Handler: `index.handler`
- Supports AI streaming responses via API Gateway streaming

### Remix/React Router v7
- Framework mode uses Nitro with `aws-lambda` preset
- Classic mode may need custom adapter configuration
- Build output: `build/server` and `build/client`
- Handler: `index.handler`
- API routes handled through server-side rendering

### SvelteKit
- Uses adapter system, requires Lambda-compatible adapter for serverless
- Multiple community adapters available for AWS Lambda
- Build output: `build/server` and `build/client` (adapter-dependent)
- Handler: Adapter-specific (typically `index.handler`)
- May need custom adapter configuration for Nitro compatibility
- **Note:** Does not use Nitro by default, requires adapter selection

### Solid Start
- Uses `aws-lambda-streaming` preset for optimal streaming performance
- Build output: `.output/server` and `.output/public`
- Handler: `index.handler`
- Streaming enabled by default for better performance

### AnalogJS
- Angular-based framework using Nitro for serverless deployment
- Build output: `dist/analog/server` and `dist/analog/public`
- Handler: `index.handler` (Lambda handler format is `file.function`)
- Uses standard `aws-lambda` preset
- Supports various deployment targets via Nitro presets

### Nuxt
- Current implementation reference
- NITRO_PRESET=aws-lambda
- Build output: `.output/server` and `.output/public`
- Handler: `index.handler`

### Astro
- Uses `@astro-aws/adapter` for AWS Lambda deployment
- Build output: `dist/lambda` (server) and `dist/client` (client)
- Handler: `entry.handler`
- Requires Lambda@Edge fallback for SPA-style routing
- Handles 404 → index.html redirects via edge function

## Container Mode: Dockerfile Specifications

For container deployments, each framework requires a Lambda-specific Dockerfile that packages the built application with the correct Node.js runtime and handler configuration.

### General AWS Lambda Container Requirements

All Dockerfiles must:
- Use AWS Lambda Node.js base images
- Copy built server code to `/var/task/`
- Set the CMD to the handler function
- Include only production dependencies
- Be optimized for Lambda cold start performance

### TanStack Start Dockerfile

```dockerfile
# Use AWS Lambda Node.js 24 base image
FROM public.ecr.aws/lambda/nodejs:24

# Copy package files (from the server directory context)
COPY package.json ./

# Note: Dependencies are already bundled in the Nitro server build
# The node_modules from the build are included in the context

# Copy all server files (index.mjs, chunks/, node_modules/)
COPY . ./

# Set the Lambda handler
CMD ["index.handler"]
```

**Build Context:**
- Build the app first: `npm run build`
- Server output: `.output/server/`
- Handler: `index.handler`

### Remix/React Router v7 Dockerfile

```dockerfile
# Use AWS Lambda Node.js 24 base image
FROM public.ecr.aws/lambda/nodejs:24

# Copy package files (from the server directory context)
COPY package.json ./

# Note: Dependencies are already bundled in the server build
# The node_modules from the build are included in the context

# Copy all server files
COPY . ./

# Set the Lambda handler
CMD ["index.handler"]
```

**Build Context:**
- Build the app first: `npm run build`
- Server output: `build/server/`
- Handler: `index.handler`

### SvelteKit Dockerfile

```dockerfile
# Use AWS Lambda Node.js 24 base image
FROM public.ecr.aws/lambda/nodejs:24

# Copy package files (from the server directory context)
COPY package.json ./

# Note: Dependencies and adapter files are already bundled in the build

# Copy all server files (adapter-dependent)
COPY . ./

# Set the Lambda handler (adapter-specific)
CMD ["index.handler"]
```

**Build Context:**
- Requires Lambda-compatible adapter (e.g., `@sveltejs/adapter-node`)
- Build the app first: `npm run build`
- Server output: `build/server/` (adapter-dependent)
- Handler: Adapter-specific, typically `index.handler`

### Solid Start Dockerfile

```dockerfile
# Use AWS Lambda Node.js 24 base image
FROM public.ecr.aws/lambda/nodejs:24

# Copy package files (from the server directory context)
COPY package.json ./

# Note: Dependencies are already bundled in the Nitro server build
# The node_modules from the build are included in the context

# Copy all server files (index.mjs, chunks/, node_modules/)
COPY . ./

# Set the Lambda handler
CMD ["index.handler"]
```

**Build Context:**
- Build the app first: `npm run build`
- Server output: `.output/server/`
- Handler: `index.handler`

### AnalogJS Dockerfile

```dockerfile
# Use AWS Lambda Node.js 24 base image
FROM public.ecr.aws/lambda/nodejs:24

# Copy package files (from the server directory context)
COPY package.json ./

# Note: Dependencies are already bundled in the AnalogJS server build
# The node_modules from the build are included in the context

# Copy all server files (index.mjs, chunks/, node_modules/)
COPY . ./

# Set the Lambda handler
CMD ["index.handler"]
```

**Build Context:**
- Build the app first: `npm run build`
- Server output: `dist/analog/server/`
- Handler: `index.handler` (Lambda handler format is `file.function`)

### Nuxt Dockerfile

```dockerfile
# Use AWS Lambda Node.js 24 base image
FROM public.ecr.aws/lambda/nodejs:24

# Set Nitro preset environment variable
ENV NITRO_PRESET=aws-lambda

# Copy package files (from the server directory context)
COPY package.json ./

# Note: Dependencies are already bundled in the Nitro server build
# The node_modules from the build are included in the context

# Copy all server files (index.mjs, chunks/, node_modules/)
COPY . ./

# Set the Lambda handler
CMD ["index.handler"]
```

**Build Context:**
- Build the app first: `npm run build`
- Server output: `.output/server/`
- Handler: `index.handler`
- Environment: `NITRO_PRESET=aws-lambda`

### Astro Dockerfile

```dockerfile
# Use AWS Lambda Node.js 24 base image
FROM public.ecr.aws/lambda/nodejs:24

# Copy all server files from dist/lambda/
# Note: Dependencies are already bundled in entry.mjs by @astro-aws/adapter
# No package.json needed since all dependencies are bundled
COPY . ./

# Set the Lambda handler
CMD ["entry.handler"]
```

**Build Context:**
- Build the app first: `npm run build`
- Server output: `dist/lambda/` (contains `entry.mjs` with bundled dependencies)
- Client output: `dist/client/`
- Handler: `entry.handler`
- Note: Requires Lambda@Edge fallback for SPA routing

### Multi-Stage Build Optimization

For better performance and smaller images, use multi-stage builds:

```dockerfile
# Build stage
FROM node:24-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM public.ecr.aws/lambda/nodejs:24

# Change to the server output directory as build context
WORKDIR /var/task

# Copy built server from builder stage (includes package.json, index.mjs, chunks/, node_modules/)
COPY --from=builder /app/.output/server/ ./

# Set the Lambda handler
CMD ["index.handler"]
```

**Note:** When using CDK's `DockerImageCode`, the build context is automatically set to the server output directory (e.g., `.output/server/`), so all COPY commands are relative to that directory.

### Container Build Commands

**Build Docker Image:**
```bash
# For TanStack Start
docker build -t my-tanstack-app .

# For Nuxt
docker build -t my-nuxt-app .

# For other frameworks, adjust accordingly
```

**Test Locally with RIE:**
```bash
# Run with AWS Lambda Runtime Interface Emulator
docker run -p 9000:8080 my-app

# Test invocation
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{}'
```

**Push to ECR:**
```bash
# Tag and push to Amazon ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker tag my-app:latest <account>.dkr.ecr.us-east-1.amazonaws.com/my-app:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/my-app:latest
```

## Framework Configuration Details

### TanStack Start Configuration

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'
import tanstackStart from '@tanstack/react-start/plugin/vite'

export default defineConfig({
  plugins: [
    tanstackStart(),
    nitro({
      awsLambda: { streaming: true },
      preset: 'aws-lambda',
    }),
    viteReact(),
  ],
})
```

**Build Process:**
- `pnpm webapp:build` runs `vite build`
- Nitro generates `.output/server` and `.output/public`
- Lambda function uses `index.handler`

### Remix/React Router v7 Configuration

**Framework Mode (Recommended):**
```typescript
// app.config.ts
export default {
  server: {
    preset: 'aws-lambda'
  }
}
```

**Build Output:**
- Server: `build/server/index.js`
- Client: `build/client/`
- Handler: `index.handler`

### SvelteKit Configuration

**svelte.config.js:**
```javascript
import adapter from '@sveltejs/adapter-node'; // or Lambda adapter

export default {
  kit: {
    adapter: adapter({
      // adapter-specific options
    })
  }
};
```

**Note:** Requires Lambda-compatible adapter. Community adapters available. Does not use Nitro by default.

### Solid Start Configuration

**app.config.ts:**
```typescript
export default {
  server: {
    preset: 'aws-lambda-streaming'
  }
}
```

**Build Process:**
- Uses `aws-lambda-streaming` preset automatically
- Output: `.output/server` and `.output/public`

### AnalogJS Configuration

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite'
import analog from '@analogjs/platform'

export default defineConfig({
  plugins: [
    analog({
      nitro: {
        preset: 'aws-lambda'
      }
    })
  ]
})
```

**Build Output:**
- Server: `dist/analog/server/index.mjs`
- Client: `dist/analog/public/`
- Handler: `index.handler` (Lambda handler format is `file.function`)

### Nuxt Configuration

**Environment:**
```bash
NITRO_PRESET=aws-lambda
```

**Build Output:**
- Server: `.output/server/index.js`
- Client: `.output/public/`

### Astro Configuration

**astro.config.mjs:**
```javascript
import { defineConfig } from 'astro/config';
import aws from '@astro-aws/adapter';

export default defineConfig({
  adapter: aws(),
  output: 'server'
});
```

**Build Output:**
- Server: `dist/lambda/entry.mjs` (exports `handler`)
- Client: `dist/client/`

**Note:** Requires Lambda@Edge fallback function for client-side routing.

## Implementation Steps

### Step 1: Create Base Abstraction Layer
1. Create `serverless/types/ServerlessProps.ts` with unified interfaces
2. Create `serverless/utils/framework-config.ts` with framework registry
3. Create `serverless/base/ServerlessServer.ts` by extracting from `nuxt/server.ts`
4. Create `serverless/base/ServerlessClient.ts` by extracting from `nuxt/client.ts` and `astro/client.ts`
5. Create `serverless/base/ServerlessStack.ts` as orchestrator

### Step 2: Implement TanStack Start
1. Create `frameworks/tanstack-start.ts` wrapper
2. Test deployment with example app
3. Verify streaming responses
4. Document configuration

### Step 3: Migrate Existing Frameworks
1. Create `frameworks/nuxt.ts` using new pattern
2. Create `frameworks/astro.ts` using new pattern
3. Test backward compatibility
4. Update documentation

### Step 4: Add Remaining Frameworks
1. Implement `frameworks/solid-start.ts`
2. Implement `frameworks/remix.ts`
3. Implement `frameworks/sveltekit.ts`
4. Implement `frameworks/analogjs.ts`
5. Test each framework deployment

### Step 5: Documentation & Examples
1. Create migration guide
2. Add framework-specific examples
3. Document troubleshooting
4. Update main README

## Technical Details

### API Gateway Streaming Support

For frameworks that support streaming (TanStack Start, Solid Start):

```typescript
// In ServerlessServer.ts
private createApiGateway(props: ServerlessBaseProps): HttpApi {
  const integrationOptions = props.serverProps?.streaming
    ? { responseTransferMode: ResponseTransferMode.STREAM }
    : {};
    
  // Use LambdaRestApi for streaming, HttpApi for standard
  if (props.serverProps?.streaming) {
    return new LambdaRestApi(this, 'API', {
      handler: this.lambdaFunction,
      integrationOptions,
      endpointConfiguration: { types: [EndpointType.REGIONAL] },
    });
  }
  
  // Standard HttpApi for non-streaming
  return new HttpApi(this, 'API', {
    defaultIntegration: new HttpLambdaIntegration('Integration', this.lambdaFunction),
  });
}
```

### CloudFront Behavior Patterns

```typescript
// Default behavior: Route to Lambda (SSR)
const defaultBehavior = {
  origin: httpOrigin,
  cachePolicy: serverCachePolicy,
  allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
  viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
};

// Static assets: Route to S3
const staticBehavior = {
  origin: s3Origin,
  cachePolicy: CachePolicy.CACHING_OPTIMIZED,
  allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
  viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
};

// API routes: Route to Lambda (no caching)
const apiBehavior = {
  origin: httpOrigin,
  cachePolicy: serverCachePolicy,
  allowedMethods: AllowedMethods.ALLOW_ALL,
  viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
};

// Apply behaviors
additionalBehaviors['*.*'] = staticBehavior;
for (const path of serverPaths) {
  additionalBehaviors[path] = apiBehavior;
}
```

### Origin Access Control (OAC) Implementation

**AWS Limitation**: Origin Access Identity (OAI) does not support IPv6 traffic. Origin Access Control (OAC) is required for full IPv6 compatibility and is the recommended modern approach.

```typescript
// In ServerlessClient.ts
private createOriginAccessControl(bucket: Bucket): CfnOriginAccessControl {
  const oac = new CfnOriginAccessControl(this, 'OAC', {
    originAccessControlConfig: {
      name: `${resourceIdPrefix}-OAC`,
      description: `Origin Access Control for ${resourceIdPrefix}`,
      originAccessControlOriginType: 's3',
      signingBehavior: 'always',
      signingProtocol: 'sigv4',
    },
  });

  // Create S3 origin with OAC
  const s3Origin = S3BucketOrigin.withOriginAccessControl(bucket, {
    originId: `${resourceIdPrefix}-s3origin`,
    originAccessLevels: [AccessLevel.READ],
    originAccessControlId: oac.attrId,
  });

  // Update bucket policy for OAC access
  bucket.addToResourcePolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['s3:GetObject'],
      principals: [new AnyPrincipal()],
      resources: [`${bucket.bucketArn}/*`],
      conditions: {
        StringEquals: {
          'AWS:SourceArn': `arn:aws:cloudfront::${Aws.ACCOUNT_ID}:origin-access-control/${oac.attrId}`,
          'aws:SourceAccount': Aws.ACCOUNT_ID,
        },
      },
    })
  );

  return oac;
}
```

**Key Differences from OAI**:
- Uses `AnyPrincipal()` with specific ARN conditions instead of service principal
- Supports both IPv4 and IPv6 traffic
- More flexible permission model
- Required for modern CloudFront distributions

### Lambda@Edge Fallback (Astro Pattern)

For frameworks requiring SPA-style fallback routing:

```typescript
// In ServerlessClient.ts
private createEdgeLambda(): experimental.EdgeFunction {
  return new experimental.EdgeFunction(this, 'FallbackEdge', {
    runtime: Runtime.NODEJS_20_X,
    handler: 'index.handler',
    code: Code.fromInline(`
      exports.handler = (event, context, callback) => {
        const response = event.Records[0].cf.response;
        const request = event.Records[0].cf.request;
        const host = event.Records[0].cf.config.distributionDomainName;

        if (response.status == '404') {
          let redirectUrl;
          if (request.uri.endsWith('/')) {
            redirectUrl = 'https://' + host + request.uri + 'index.html';
          } else if (!request.uri.includes('.')) {
            redirectUrl = 'https://' + host + request.uri + '/index.html';
          }
          callback(null, {
            status: '302',
            statusDescription: 'Found',
            headers: { 'Location': [{ key: 'Location', value: redirectUrl }] }
          });
        } else if (response.status == '403') {
          callback(null, {
            status: '404',
            statusDescription: 'Not Found',
            body: '<h1>404 Not Found</h1>',
          });
        } else {
          callback(null, response);
        }
      };
    `),
  });
}
```

## Usage Examples

### Basic Deployment

```typescript
import { TanStackStart } from '@thunder-so/thunder';

new TanStackStart(app, 'MyApp', {
  application: 'my-app',
  service: 'web',
  environment: 'production',
  env: { region: 'us-east-1', account: '123456789' },
});
```

### Advanced Configuration

```typescript
new Nuxt(app, 'MyApp', {
  application: 'my-app',
  service: 'web',
  environment: 'production',
  domain: 'example.com',
  hostedZoneId: 'Z1234567890ABC',
  globalCertificateArn: 'arn:aws:acm:us-east-1:...',
  regionalCertificateArn: 'arn:aws:acm:us-west-2:...',
  serverProps: {
    memorySize: 2048,
    timeout: 30,
    keepWarm: true,
    streaming: true,
    variables: [{ API_URL: 'https://api.example.com' }],
    secrets: [{ key: 'DB_PASSWORD', resource: 'arn:aws:secretsmanager:...' }],
  },
  clientProps: {
    allowHeaders: ['Authorization'],
    allowCookies: ['session'],
  },
  env: { region: 'us-west-2', account: '123456789' },
});
```

### Docker-based Deployment

```typescript
new Remix(app, 'MyApp', {
  application: 'my-app',
  service: 'web',
  environment: 'production',
  serverProps: {
    dockerFile: 'Dockerfile',
    dockerBuildArgs: { NODE_ENV: 'production' },
    memorySize: 3008,
  },
  env: { region: 'us-east-1', account: '123456789' },
});
```

### Container Mode Deployment

```typescript
new TanStackStart(app, 'MyApp', {
  application: 'my-app',
  service: 'web',
  environment: 'production',
  serverProps: {
    dockerFile: 'Dockerfile',  // Container mode automatically enabled
    memorySize: 2048,
    timeout: 30,
    // Docker image will be built and pushed automatically
  },
  env: { region: 'us-east-1', account: '123456789' },
});
```

## Next Steps

1. Create base abstraction layer constructs
2. Implement TanStack Start as first new framework
3. Test deployment end-to-end (both ZIP and container modes via dockerFile detection)
4. Migrate Nuxt and Astro to use new pattern
5. Add remaining frameworks incrementally
6. Update documentation and examples
7. Add container mode testing and validation

## References

- [TanStack Start Hosting Docs](https://tanstack.com/start/latest/docs/framework/react/guide/hosting)
- [TanStack Start AWS Deployment Example](https://johanneskonings.dev/blog/2025-11-30-tanstack-start-aws-serverless/)
- [AnalogJS Deployment Docs](https://analogjs.org/docs/features/deployment/overview)
- [AnalogJS Providers](https://analogjs.org/docs/features/deployment/providers)
- [Solid Start AWS Deployment](https://docs.solidjs.com/guides/deployment-options/aws-via-sst)
- [SvelteKit Adapters](https://svelte.dev/docs/kit/adapters)
- [SvelteKit Node Adapter](https://svelte.dev/docs/kit/adapter-node)
- [Nitro Deployment Presets](https://nitro.unjs.io/deploy)
- [AWS Lambda Container Images](https://aws.amazon.com/blogs/aws/new-for-aws-lambda-container-image-support/)
- [AWS Lambda Node.js Images](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-image.html)
- Existing Thunder constructs: `thunder/lib/nuxt/` and `thunder/lib/astro/`

---

*Content was rephrased for compliance with licensing restrictions*
