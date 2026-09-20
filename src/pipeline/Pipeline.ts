import { EntityParser } from '../parsers/EntityParser';
import { MethodParser } from '../parsers/MethodParser';
import { OpenAPIGenerator } from '../generators/OpenAPIGenerator';
import { OpenAPISpec } from '../interfaces/OpenAPISchema';
import { PipelineContext, createPipelineContext } from './PipelineContext';

export interface PipelineResult {
  spec: OpenAPISpec;
  json: string;
  entityCount: number;
  methodFileCount: number;
  methodCount: number;
}

/**
 * Composes the read -> parse -> generate stages. This is the only place the
 * end-to-end order is declared.
 */
export class Pipeline {
  constructor(
    private readonly context: PipelineContext = createPipelineContext()
  ) {}

  public run(): PipelineResult {
    const entities = new EntityParser(this.context).parseAllEntities();
    const methodFiles = new MethodParser(this.context).parseAllMethods();

    const generator = new OpenAPIGenerator(this.context);
    const spec = generator.generateSchema(entities, methodFiles);

    return {
      spec,
      json: generator.toJSON(),
      entityCount: entities.length,
      methodFileCount: methodFiles.length,
      methodCount: methodFiles.reduce(
        (sum, file) => sum + file.methods.length,
        0
      ),
    };
  }
}
