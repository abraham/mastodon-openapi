import * as fs from 'fs';
import * as path from 'path';
import { EntityClass } from '../interfaces/EntityClass';
import { EntityFileParser } from './EntityFileParser';
import { MethodEntityParser } from './MethodEntityParser';
import { getConfig, docsContentPath } from '../config';

class EntityParser {
  private entitiesPath: string;
  private methodsPath: string;

  constructor() {
    this.entitiesPath = docsContentPath('entities');
    this.methodsPath = docsContentPath('methods');
  }

  public parseAllEntities(): EntityClass[] {
    const entities: EntityClass[] = [];

    if (!fs.existsSync(this.entitiesPath)) {
      throw new Error(
        `Entities path does not exist: ${this.entitiesPath}. Run \`npm run setup-docs\`.`
      );
    }

    if (!fs.existsSync(this.methodsPath)) {
      throw new Error(
        `Methods path does not exist: ${this.methodsPath}. Run \`npm run setup-docs\`.`
      );
    }

    // Parse entities from dedicated entity files
    const files = fs
      .readdirSync(this.entitiesPath)
      .filter((file) => file.endsWith('.md'));

    for (const file of files) {
      try {
        const fileEntities = EntityFileParser.parseEntityFile(
          path.join(this.entitiesPath, file)
        );
        if (fileEntities) {
          entities.push(...fileEntities);
        }
      } catch (error) {
        throw new Error(
          `Error parsing entity file ${file}: ${(error as Error).message}`,
          { cause: error }
        );
      }
    }

    // Parse entities from method files
    const blockedFiles = getConfig().blockedFiles;

    const methodFiles = fs
      .readdirSync(this.methodsPath)
      .filter((file) => file.endsWith('.md'));

    for (const file of methodFiles) {
      const relativePath = `methods/${file}`;
      if (blockedFiles.includes(relativePath)) {
        console.log(
          `Skipping blocked file for entity parsing: ${relativePath}`
        );
        continue;
      }

      try {
        const methodEntities = MethodEntityParser.parseEntitiesFromMethodFile(
          path.join(this.methodsPath, file)
        );
        if (methodEntities.length > 0) {
          entities.push(...methodEntities);
        }
      } catch (error) {
        throw new Error(
          `Error parsing entities from method file ${file}: ${(error as Error).message}`,
          { cause: error }
        );
      }
    }

    return entities;
  }
}

export { EntityParser };
