import * as fs from 'fs';
import * as path from 'path';
import { EntityClass } from '../interfaces/EntityClass';
import { EntityFileParser } from './EntityFileParser';
import { MethodEntityParser } from './MethodEntityParser';

class EntityParser {
  private entitiesPath: string;
  private methodsPath: string;

  constructor() {
    this.entitiesPath = path.join(
      __dirname,
      '../../mastodon-documentation/content/en/entities'
    );
    this.methodsPath = path.join(
      __dirname,
      '../../mastodon-documentation/content/en/methods'
    );
  }

  public parseAllEntities(): EntityClass[] {
    const entities: EntityClass[] = [];

    // Parse entities from dedicated entity files
    if (fs.existsSync(this.entitiesPath)) {
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
          console.error(`Error parsing entity file ${file}:`, error);
        }
      }
    } else {
      console.error(`Entities path does not exist: ${this.entitiesPath}`);
    }

    // Parse entities from method files
    if (fs.existsSync(this.methodsPath)) {
      const methodFiles = fs
        .readdirSync(this.methodsPath)
        .filter((file) => file.endsWith('.md'));

      for (const file of methodFiles) {
        try {
          const methodEntities = MethodEntityParser.parseEntitiesFromMethodFile(
            path.join(this.methodsPath, file)
          );
          if (methodEntities.length > 0) {
            entities.push(...methodEntities);
          }
        } catch (error) {
          console.error(
            `Error parsing entities from method file ${file}:`,
            error
          );
        }
      }
    } else {
      console.error(`Methods path does not exist: ${this.methodsPath}`);
    }

    return entities;
  }
}

export { EntityParser };
