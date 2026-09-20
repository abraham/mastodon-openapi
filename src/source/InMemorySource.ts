import { DocumentKind, DocumentSource } from './DocumentSource';

export interface InMemoryDocuments {
  entity?: Record<string, string>;
  method?: Record<string, string>;
  guides?: Record<string, string>;
  securityPolicy?: string;
}

/** Test double backed by plain objects. */
export class InMemorySource implements DocumentSource {
  constructor(private readonly documents: InMemoryDocuments = {}) {}

  public list(kind: DocumentKind): string[] {
    return Object.keys(this.documents[kind] ?? {}).sort();
  }

  public read(kind: DocumentKind, id: string): string {
    const contents = this.documents[kind]?.[id];
    if (contents === undefined) {
      throw new Error(`No ${kind} document named ${id}`);
    }
    return contents;
  }

  public readGuide(relativePath: string): string {
    const contents = this.documents.guides?.[relativePath];
    if (contents === undefined) {
      throw new Error(`No guide document at ${relativePath}`);
    }
    return contents;
  }

  public readSecurityPolicy(): string {
    if (this.documents.securityPolicy === undefined) {
      throw new Error('No security policy configured');
    }
    return this.documents.securityPolicy;
  }
}
