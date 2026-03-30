import { ServerlessStack } from '../base/ServerlessStack';
import { ServerlessBaseProps } from '../types/ServerlessProps';

export class SvelteKit extends ServerlessStack {
  constructor(scope: any, id: string, props: ServerlessBaseProps) {
    super(scope, id, {
      ...props,
      framework: 'sveltekit',
    });
  }
}