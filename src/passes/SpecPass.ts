import { EntityClass } from '../interfaces/EntityClass';
import { ApiMethodsFile } from '../interfaces/ApiMethodsFile';
import { OpenAPISpec } from '../interfaces/OpenAPISchema';

/** What a pass may read in addition to the spec being built. */
export interface PassInput {
  entities: EntityClass[];
  methodFiles: ApiMethodsFile[];
}

/**
 * A whole-document transform. Passes run after the per-entity and per-operation
 * emitters, in a declared order, and are the only place global knowledge of the
 * finished document is used.
 */
export interface SpecPass {
  readonly name: string;
  run(spec: OpenAPISpec, input: PassInput): void;
}
