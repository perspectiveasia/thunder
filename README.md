# thunder

<p>
    <a href="https://www.npmjs.com/package/@thunder-so/thunder"><img alt="Version" src="https://img.shields.io/npm/v/@thunder-so/thunder.svg" /></a>
    <a href="https://www.npmjs.com/package/@thunder-so/thunder"><img alt="License" src="https://img.shields.io/npm/l/@thunder-so/thunder.svg" /></a>
</p>

The AWS CDK library and CLI for deploying modern web applications on AWS. One library to rule them all: Static SPAs, Lambda Functions, Containers on Fargate and EC2, and Full-stack Frameworks.

## Features

- **Constructs:** One-line deployment for `Static`, `Lambda`, `Fargate`, `EC2`, `Nuxt`, and `Astro`.
- **Thunder CLI (`th`):** Context-aware CLI for initializing, deploying, and managing your infrastructure.
- **VPC Link Pattern:** Easily connect your compute resources to a shared VPC.
- **High-Performance Serving:** Pre-configured CloudFront distributions with OAC, security headers, and edge optimizations.
- **Built-in CI/CD:** Optional AWS CodePipeline integration with GitHub support.

## Supported Frameworks & Patterns

- **Static:** Vite (React, Vue, Svelte, Solid), Next.js (SSG), Astro (SSG), Gatsby.
- **Serverless:** Node.js Lambda, Bun, Container-based Lambda.
- **Containers:** ECS Fargate with ALB, Docker on EC2 with Elastic IP.
- **Full-stack SSR:** Nuxt.js, Astro (SSR), and extensibility for SvelteKit, TanStack Start, AnalogJS.

## Quick Start

### 1. Install

```bash
bun add @thunder-so/thunder --development
```

### 2. Initialize

```bash
npx th init
```

### 3. Configure

```typescript
// stack/dev.ts
import { Cdk, Static, type StaticProps } from '@thunder-so/thunder';

const myApp: StaticProps = {
  env: { 
    account: '123456789012', 
    region: 'us-east-1' 
  },
  application: 'myapp',
  service: 'web',
  environment: 'prod',

  rootDir: '.',
  outputDir: 'dist',
});

new Static(
  new Cdk.App(),
  `${myApp.application}-${myApp.service}-${myApp.environment}-stack`,
  myApp
);
```

### 4. Deploy

```bash
npx cdk deploy --app "npx tsx stack/dev.ts" --profile default
```

## CLI Commands

| Command | Description |
| :--- | :--- |
| `th init` | Scaffold a new project or service |
| `th deploy` | Deploy stacks to AWS |
| `th destroy` | Remove resources from AWS |

## Documentation

For detailed documentation on each construct and advanced configurations, see the [Wiki](https://github.com/thunder-so/thunder/wiki).

## License

Apache-2.0
