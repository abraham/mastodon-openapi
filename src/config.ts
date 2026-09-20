import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Absolute path to the repository root, derived from this module's location so
 * that every consumer resolves inputs identically regardless of process.cwd().
 */
export const REPO_ROOT = resolve(__dirname, '..');

export const CONFIG_PATH = resolve(REPO_ROOT, 'config.json');

/** Clone of mastodon/documentation, pinned by `mastodonDocsCommit`. */
export const DOCS_ROOT = resolve(REPO_ROOT, 'mastodon-documentation');

/** English documentation content root. */
export const DOCS_CONTENT_ROOT = resolve(DOCS_ROOT, 'content', 'en');

/** Vendored mastodon/mastodon SECURITY.md, pinned by `mastodonSecurityCommit`. */
export const SECURITY_POLICY_DIR = resolve(REPO_ROOT, 'mastodon-security');
export const SECURITY_POLICY_PATH = resolve(SECURITY_POLICY_DIR, 'SECURITY.md');

/** Records which commit the vendored SECURITY.md was downloaded from. */
export const SECURITY_POLICY_SHA_PATH = resolve(SECURITY_POLICY_DIR, '.commit');

export interface Config {
  /** Commit SHA of mastodon/documentation to generate from. */
  mastodonDocsCommit: string;
  /** Commit SHA of mastodon/mastodon to read SECURITY.md from. */
  mastodonSecurityCommit: string;
  /** Documentation files to skip, relative to content/en. */
  blockedFiles: string[];
  /** Repository to cherry-pick documentation fixes from. */
  overridesRepository: string;
  /** Commits to cherry-pick, in order. */
  overrideCommits: string[];
}

const REQUIRED_STRING_KEYS = [
  'mastodonDocsCommit',
  'mastodonSecurityCommit',
  'overridesRepository',
] as const;

const REQUIRED_ARRAY_KEYS = ['blockedFiles', 'overrideCommits'] as const;

let cached: Config | undefined;

/**
 * Resolve a path inside the English documentation content tree.
 */
export function docsContentPath(...segments: string[]): string {
  return resolve(DOCS_CONTENT_ROOT, ...segments);
}

/**
 * Load and validate config.json. Memoized; throws on a malformed config rather
 * than letting downstream code fall back to defaults.
 */
export function getConfig(): Config {
  if (!cached) {
    cached = loadConfig();
  }
  return cached;
}

/** Test seam: drop the memoized config. */
export function resetConfigCache(): void {
  cached = undefined;
}

function loadConfig(): Config {
  let contents: string;
  try {
    contents = readFileSync(CONFIG_PATH, 'utf8');
  } catch (error) {
    throw new Error(
      `Could not read ${CONFIG_PATH}: ${(error as Error).message}`
    );
  }

  return parseConfig(contents, CONFIG_PATH);
}

/**
 * Validate raw config JSON. Exported so the rules can be tested without
 * touching the filesystem.
 */
export function parseConfig(contents: string, source = CONFIG_PATH): Config {
  let raw: unknown;
  try {
    raw = JSON.parse(contents);
  } catch (error) {
    throw new Error(`Could not parse ${source}: ${(error as Error).message}`);
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`${source} must contain a JSON object`);
  }

  const config = raw as Record<string, unknown>;
  const problems: string[] = [];

  for (const key of REQUIRED_STRING_KEYS) {
    if (typeof config[key] !== 'string' || config[key] === '') {
      problems.push(`"${key}" must be a non-empty string`);
    }
  }

  for (const key of REQUIRED_ARRAY_KEYS) {
    if (!Array.isArray(config[key])) {
      problems.push(`"${key}" must be an array`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Invalid ${source}:\n  - ${problems.join('\n  - ')}`);
  }

  return config as unknown as Config;
}
