/** Categories of documentation the pipeline reads. */
export type DocumentKind = 'entity' | 'method';

/**
 * The pipeline's only view of the filesystem. Implementations are responsible
 * for resolving locations; callers address documents by kind and id so that
 * tests can supply fixtures without touching disk.
 */
export interface DocumentSource {
  /** Document ids of a kind, e.g. `accounts.md`, in a stable order. */
  list(kind: DocumentKind): string[];

  /** Contents of a document. Throws if it does not exist. */
  read(kind: DocumentKind, id: string): string;

  /** Contents of a page addressed relative to the content root, e.g. `api/rate-limits.md`. */
  readGuide(relativePath: string): string;

  /** Contents of the vendored mastodon/mastodon SECURITY.md. */
  readSecurityPolicy(): string;
}
