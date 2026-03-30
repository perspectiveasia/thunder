import { ServerlessStack } from '../base/ServerlessStack';
import { ServerlessBaseProps } from '../types/ServerlessProps';

export class TanStackStart extends ServerlessStack {
  constructor(scope: any, id: string, props: ServerlessBaseProps) {
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