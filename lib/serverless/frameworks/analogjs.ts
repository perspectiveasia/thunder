import { ServerlessStack } from '../../../stacks/ServerlessStack';
import { ServerlessBaseProps } from '../../../types/ServerlessProps';

export class AnalogJS extends ServerlessStack {
  constructor(scope: any, id: string, props: ServerlessBaseProps) {
    super(scope, id, {
      ...props,
      framework: 'analogjs',
    });
  }
}