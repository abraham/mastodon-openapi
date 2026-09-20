import { OpenAPISpec } from '../interfaces/OpenAPISchema';
import { LinkGenerator } from '../generators/LinkGenerator';
import { PassInput, SpecPass } from './SpecPass';

/**
 * Connects creating operations to the operations that act on what they
 * created. Needs every operation to exist first, so it runs after conversion.
 */
export class GenerateLinksPass implements SpecPass {
  public readonly name = 'generate-links';

  private readonly linkGenerator = new LinkGenerator();

  public run(spec: OpenAPISpec, input: PassInput): void {
    this.linkGenerator.generateLinks(input.methodFiles, spec);
  }
}
