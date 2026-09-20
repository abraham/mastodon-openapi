import { readFileSync } from 'fs';
import { docsContentPath } from '../config';

/**
 * Interface for HTTP header information
 */
export interface HttpHeader {
  name: string;
  description: string;
  schema: {
    type: string;
    format?: string;
  };
}

/**
 * Parser for extracting HTTP headers from Mastodon documentation
 */
export class HeaderParser {
  private static rateLimitsFile(): string {
    return docsContentPath('api', 'rate-limits.md');
  }

  private static guidelinesFile(): string {
    return docsContentPath('api', 'guidelines.md');
  }

  private static asyncRefreshFile(): string {
    return docsContentPath('methods', 'async_refreshes.md');
  }

  private static read(filePath: string): string {
    try {
      return readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Could not read ${filePath}: ${(error as Error).message}. Run \`npm run setup-docs\`.`
      );
    }
  }

  /**
   * Parse all HTTP headers from documentation
   */
  public static parseHeaders(): HttpHeader[] {
    return [
      ...this.parseRateLimitHeaders(),
      this.parseLinkHeader(),
      this.parseAsyncRefreshHeader(),
    ];
  }

  /**
   * Parse rate limit headers from rate-limits.md
   */
  public static parseRateLimitHeaders(): HttpHeader[] {
    const filePath = this.rateLimitsFile();
    const content = this.read(filePath);

    const headers: HttpHeader[] = [];

    // Find the Headers section
    const headersMatch = content.match(/## Headers\n\n([\s\S]*?)(?=\n##|$)/);

    if (headersMatch) {
      const headersSection = headersMatch[1];

      // Extract header definitions
      // Pattern: `HeaderName`\n: Description
      const headerMatches = headersSection.matchAll(/`([^`]+)`\n:\s*([^\n]+)/g);

      for (const match of headerMatches) {
        const name = match[1];
        const description = match[2];

        // Determine type and format based on header name and description
        let type = 'string';
        let format: string | undefined = undefined;

        // Check for timestamp/date types first (more specific)
        if (
          name.includes('Reset') ||
          description.toLowerCase().includes('timestamp')
        ) {
          type = 'string';
          format = 'date-time';
        }
        // Check for numeric types
        else if (
          name.includes('Limit') ||
          name.includes('Remaining') ||
          description.toLowerCase().includes('number of')
        ) {
          type = 'integer';
        }

        headers.push({
          name,
          description,
          schema: {
            type,
            ...(format && { format }),
          },
        });
      }
    }

    if (headers.length === 0) {
      throw new Error(`No rate limit headers found in ${filePath}`);
    }

    return headers;
  }

  /**
   * Parse Link header from guidelines.md
   */
  private static parseLinkHeader(): HttpHeader {
    const filePath = this.guidelinesFile();
    const content = this.read(filePath);

    // Find the pagination section with Link header examples
    const paginationMatch = content.match(
      /Link: <https:\/\/mastodon\.example\/api\/v1\/endpoint\?[^>]+>; rel="next", <https:\/\/mastodon\.example\/api\/v1\/endpoint\?[^>]+>; rel="prev"/
    );

    if (!paginationMatch) {
      throw new Error(`No Link header example found in ${filePath}`);
    }

    const example = paginationMatch[0];

    let description = 'Pagination links for browsing older or newer results.';
    description += ` Format: ${example}.`;
    description +=
      ' See [RFC 8288](https://www.rfc-editor.org/rfc/rfc8288) for more information.';

    return {
      name: 'Link',
      description,
      schema: {
        type: 'string',
      },
    };
  }

  /**
   * Parse Mastodon-Async-Refresh header from async_refreshes.md
   */
  private static parseAsyncRefreshHeader(): HttpHeader {
    const filePath = this.asyncRefreshFile();
    const content = this.read(filePath);

    // Find the header format
    const headerMatch = content.match(
      /Mastodon-Async-Refresh: id="<string>", retry=<int>, result_count=<int>/
    );

    if (!headerMatch) {
      throw new Error(
        `No Mastodon-Async-Refresh header format found in ${filePath}`
      );
    }

    const format = headerMatch[0].replace('Mastodon-Async-Refresh: ', '');

    // Extract description from surrounding context
    const contextMatch = content.match(
      /The `retry` key includes a number of second[^.]*\./
    );
    const resultCountMatch = content.match(
      /The key `result_count` is optional[^.]*\./
    );

    let description = 'Indicates an async refresh is in progress.';
    description += ` Format: ${format}.`;

    if (contextMatch) {
      description += ` The retry value indicates seconds to wait before retrying.`;
    }

    if (resultCountMatch) {
      description += ` The result_count is optional and indicates results already fetched.`;
    }

    return {
      name: 'Mastodon-Async-Refresh',
      description,
      schema: {
        type: 'string',
      },
    };
  }
}
