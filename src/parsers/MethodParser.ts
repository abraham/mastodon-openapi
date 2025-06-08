import * as fs from 'fs';
import * as path from 'path';
import { ApiMethodsFile } from '../interfaces/ApiMethodsFile';
import { MethodFileParser } from './MethodFileParser';

class MethodParser {
  private methodsPath: string;
  private methodFileParser: MethodFileParser;

  constructor() {
    this.methodsPath = path.join(
      __dirname,
      '../../mastodon-documentation/content/en/methods'
    );
    this.methodFileParser = new MethodFileParser();
  }

  public parseAllMethods(): ApiMethodsFile[] {
    const methodFiles: ApiMethodsFile[] = [];

    if (!fs.existsSync(this.methodsPath)) {
      console.error(`Methods path does not exist: ${this.methodsPath}`);
      return methodFiles;
    }

    const files = fs
      .readdirSync(this.methodsPath)
      .filter(
        (file) =>
          file.endsWith('.md') &&
          fs.statSync(path.join(this.methodsPath, file)).isFile()
      );

    for (const file of files) {
      try {
        const methodFile = this.methodFileParser.parseMethodFile(
          path.join(this.methodsPath, file)
        );
        if (methodFile) {
          methodFiles.push(methodFile);
        }
      } catch (error) {
        console.error(`Error parsing method file ${file}:`, error);
      }
    }

    return methodFiles;
  }
}

export { MethodParser };
