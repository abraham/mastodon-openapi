import { Config, getConfig } from '../config';
import { DocumentSource } from '../source/DocumentSource';
import { defaultSource } from '../source/FileSystemSource';

/**
 * Everything a pipeline stage is allowed to reach for. Passed explicitly so
 * that no stage resolves configuration or the filesystem on its own.
 */
export interface PipelineContext {
  readonly config: Config;
  readonly source: DocumentSource;
}

export function createPipelineContext(
  overrides: Partial<PipelineContext> = {}
): PipelineContext {
  return {
    config: overrides.config ?? getConfig(),
    source: overrides.source ?? defaultSource(),
  };
}
