import * as fs from 'fs';
import * as path from 'path';
import {
  DOCS_CONTENT_ROOT,
  SECURITY_POLICY_PATH,
  docsContentPath,
} from '../config';
import { DocumentKind, DocumentSource } from './DocumentSource';

const KIND_DIRECTORIES: Record<DocumentKind, string> = {
  entity: 'entities',
  method: 'methods',
};

/**
 * Reads documentation from the vendored checkouts. All locations are anchored
 * on the repository root, never on process.cwd().
 */
export class FileSystemSource implements DocumentSource {
  public list(kind: DocumentKind): string[] {
    const directory = docsContentPath(KIND_DIRECTORIES[kind]);

    if (!fs.existsSync(directory)) {
      throw new Error(
        `Documentation directory does not exist: ${directory}. Run \`npm run setup-docs\`.`
      );
    }

    return fs
      .readdirSync(directory)
      .filter(
        (file) =>
          file.endsWith('.md') &&
          fs.statSync(path.join(directory, file)).isFile()
      )
      .sort();
  }

  public read(kind: DocumentKind, id: string): string {
    return this.readFile(docsContentPath(KIND_DIRECTORIES[kind], id));
  }

  public readGuide(relativePath: string): string {
    return this.readFile(path.resolve(DOCS_CONTENT_ROOT, relativePath));
  }

  public readSecurityPolicy(): string {
    try {
      return fs.readFileSync(SECURITY_POLICY_PATH, 'utf-8');
    } catch (error) {
      throw new Error(
        `Could not read ${SECURITY_POLICY_PATH}: ${(error as Error).message}. ` +
          'Run `npm run setup-security-policy` to vendor it.'
      );
    }
  }

  private readFile(filePath: string): string {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Could not read ${filePath}: ${(error as Error).message}. Run \`npm run setup-docs\`.`
      );
    }
  }
}

let shared: DocumentSource | undefined;

/** Process-wide FileSystemSource, created on first use. */
export function defaultSource(): DocumentSource {
  if (!shared) {
    shared = new FileSystemSource();
  }
  return shared;
}
