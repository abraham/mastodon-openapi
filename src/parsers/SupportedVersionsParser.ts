import { readFileSync } from 'fs';
import { SECURITY_POLICY_PATH } from '../config';

export interface SupportedVersions {
  /** Lowest still-supported release, e.g. "4.4.0". */
  minimum: string;
  /** Highest supported release, e.g. "4.7.0". */
  maximum: string;
}

/**
 * Reads the supported Mastodon versions from the vendored mastodon/mastodon
 * SECURITY.md, which is the canonical source for the support window.
 *
 * "Until <date>" rows are treated as supported regardless of the date so that
 * output depends only on the pinned commit, never on the current clock.
 */
export class SupportedVersionsParser {
  private static cached: SupportedVersions | undefined;

  public static parse(): SupportedVersions {
    if (!this.cached) {
      this.cached = this.read();
    }
    return this.cached;
  }

  /** Test seam: drop the memoized result. */
  public static reset(): void {
    this.cached = undefined;
  }

  private static read(): SupportedVersions {
    let content: string;
    try {
      content = readFileSync(SECURITY_POLICY_PATH, 'utf8');
    } catch (error) {
      throw new Error(
        `Could not read ${SECURITY_POLICY_PATH}: ${(error as Error).message}. ` +
          'Run `npm run setup-security-policy` to vendor it.'
      );
    }

    return this.parseContent(content);
  }

  public static parseContent(content: string): SupportedVersions {
    const section = content.match(
      /## Supported Versions\s*\n([\s\S]*?)(?=\n## |$)/
    );

    if (!section) {
      throw new Error('SECURITY.md has no "## Supported Versions" section');
    }

    const versions: string[] = [];

    for (const row of section[1].matchAll(/^\|([^|]+)\|([^|]+)\|/gm)) {
      const version = row[1].trim();
      const supported = row[2].trim();

      if (/^-+$/.test(version) || version.toLowerCase() === 'version') {
        continue;
      }
      if (supported.toLowerCase() === 'no') {
        continue;
      }

      const normalized = this.normalizeVersion(version);
      if (normalized) {
        versions.push(normalized);
      }
    }

    if (versions.length === 0) {
      throw new Error(
        'SECURITY.md "## Supported Versions" table lists no supported versions'
      );
    }

    const sorted = versions.sort(this.compare);

    return { minimum: sorted[0], maximum: sorted[sorted.length - 1] };
  }

  /** "4.7.0" -> "4.7.0", "4.5.x" -> "4.5.0", "< 4.4" -> null. */
  private static normalizeVersion(version: string): string | null {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+|x)$/);
    if (!match) {
      return null;
    }
    const patch = match[3] === 'x' ? '0' : match[3];
    return `${match[1]}.${match[2]}.${patch}`;
  }

  private static compare(a: string, b: string): number {
    const left = a.split('.').map(Number);
    const right = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if (left[i] !== right[i]) {
        return left[i] - right[i];
      }
    }
    return 0;
  }
}
