import { EntityClass } from '../interfaces/EntityClass';
import { EntityFileParser } from './EntityFileParser';
import { MethodEntityParser } from './MethodEntityParser';
import {
  PipelineContext,
  createPipelineContext,
} from '../pipeline/PipelineContext';

class EntityParser {
  constructor(
    private readonly context: PipelineContext = createPipelineContext()
  ) {}

  public parseAllEntities(): EntityClass[] {
    const entities: EntityClass[] = [];
    const source = this.context.source;

    // Parse entities from dedicated entity files
    for (const id of source.list('entity')) {
      try {
        entities.push(
          ...EntityFileParser.parseEntityFile(source.read('entity', id), id)
        );
      } catch (error) {
        throw new Error(
          `Error parsing entity file ${id}: ${(error as Error).message}`,
          { cause: error }
        );
      }
    }

    // Parse entities from method files
    const blockedFiles = this.context.config.blockedFiles;

    for (const id of source.list('method')) {
      const relativePath = `methods/${id}`;
      if (blockedFiles.includes(relativePath)) {
        console.log(
          `Skipping blocked file for entity parsing: ${relativePath}`
        );
        continue;
      }

      try {
        entities.push(
          ...MethodEntityParser.parseEntitiesFromMethodFile(
            source.read('method', id)
          )
        );
      } catch (error) {
        throw new Error(
          `Error parsing entities from method file ${id}: ${(error as Error).message}`,
          { cause: error }
        );
      }
    }

    return entities;
  }
}

export { EntityParser };
