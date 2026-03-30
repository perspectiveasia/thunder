import { ServerlessStack } from '../base/ServerlessStack';
import { ServerlessBaseProps } from '../types/ServerlessProps';

export class Astro extends ServerlessStack {
  constructor(scope: any, id: string, props: ServerlessBaseProps) {
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