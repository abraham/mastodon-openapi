import { readFileSync } from 'fs';
import { join } from 'path';

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
  private static readonly RATE_LIMITS_FILE =
    'mastodon-documentation/content/en/api/rate-limits.md';
  private static readonly GUIDELINES_FILE =
    'mastodon-documentation/content/en/api/guidelines.md';
  private static readonly ASYNC_REFRESH_FILE =
    'mastodon-documentation/content/en/methods/async_refreshes.md';

  /**
   * Parse all HTTP headers from documentation
   */
  public static parseHeaders(): HttpHeader[] {
    const headers: HttpHeader[] = [];

    // Parse rate limit headers
    headers.push(...this.parseRateLimitHeaders());

    // Parse Link header
    const linkHeader = this.parseLinkHeader();
    if (linkHeader) {
      headers.push(linkHeader);
    }

    // Parse Mastodon-Async-Refresh header
    const asyncRefreshHeader = this.parseAsyncRefreshHeader();
    if (asyncRefreshHeader) {
      headers.push(asyncRefreshHeader);
    }

    return headers;
  }

  /**
   * Parse rate limit headers from rate-limits.md
   */
  private static parseRateLimitHeaders(): HttpHeader[] {
    try {
      const filePath = join(process.cwd(), this.RATE_LIMITS_FILE);
      const content = readFileSync(filePath, 'utf-8');

      const headers: HttpHeader[] = [];

      // Find the Headers section
      const headersMatch = content.match(/## Headers\n\n([\s\S]*?)(?=\n##|$)/);

      if (headersMatch) {
        const headersSection = headersMatch[1];

        // Extract header definitions
        // Pattern: `HeaderName`\n: Description
        const headerMatches = headersSection.matchAll(
          /`([^`]+)`\n:\s*([^\n]+)/g
        );

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

      return headers.length > 0 ? headers : this.getDefaultRateLimitHeaders();
    } catch (error) {
      console.warn(
        'Could not parse rate limit headers from rate-limits.md, using defaults:',
        error
      );
      return this.getDefaultRateLimitHeaders();
    }
  }

  /**
   * Parse Link header from guidelines.md
   */
  private static parseLinkHeader(): HttpHeader | null {
    try {
      const filePath = join(process.cwd(), this.GUIDELINES_FILE);
      const content = readFileSync(filePath, 'utf-8');

      // Find the pagination section with Link header examples
      const paginationMatch = content.match(
        /Link: <https:\/\/mastodon\.example\/api\/v1\/endpoint\?[^>]+>; rel="next", <https:\/\/mastodon\.example\/api\/v1\/endpoint\?[^>]+>; rel="prev"/
      );

      if (paginationMatch) {
        const example = paginationMatch[0];

        // Extract description context
        const contextMatch = content.match(
          /you can retrieve the HTTP `Link` header[^.]*\. See \[RFC 9651\][^\]]*\][^,]*, and see \[RFC 8288\]\([^\)]+\)[^.]*\./
        );

        let description =
          'Pagination links for browsing older or newer results.';

        // Add example format
        description += ` Format: ${example}.`;

        // Add RFC reference
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

      return this.getDefaultLinkHeader();
    } catch (error) {
      console.warn(
        'Could not parse Link header from guidelines.md, using default:',
        error
      );
      return this.getDefaultLinkHeader();
    }
  }

  /**
   * Parse Mastodon-Async-Refresh header from async_refreshes.md
   */
  private static parseAsyncRefreshHeader(): HttpHeader | null {
    try {
      const filePath = join(process.cwd(), this.ASYNC_REFRESH_FILE);
      const content = readFileSync(filePath, 'utf-8');

      // Find the header format
      const headerMatch = content.match(
        /Mastodon-Async-Refresh: id="<string>", retry=<int>, result_count=<int>/
      );

      if (headerMatch) {
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

      return this.getDefaultAsyncRefreshHeader();
    } catch (error) {
      console.warn(
        'Could not parse Mastodon-Async-Refresh header from async_refreshes.md, using default:',
        error
      );
      return this.getDefaultAsyncRefreshHeader();
    }
  }

  /**
   * Get default rate limit headers if parsing fails
   */
  private static getDefaultRateLimitHeaders(): HttpHeader[] {
    return [
      {
        name: 'X-RateLimit-Limit',
        description: 'Number of requests permitted per time period',
        schema: {
          type: 'integer',
        },
      },
      {
        name: 'X-RateLimit-Remaining',
        description: 'Number of requests you can still make',
        schema: {
          type: 'integer',
        },
      },
      {
        name: 'X-RateLimit-Reset',
        description: 'Timestamp when your rate limit will reset',
        schema: {
          type: 'string',
          format: 'date-time',
        },
      },
    ];
  }

  /**
   * Get default Link header if parsing fails
   */
  private static getDefaultLinkHeader(): HttpHeader {
    return {
      name: 'Link',
      description:
        'Pagination links for browsing older or newer results. Format: <https://mastodon.example/api/v1/endpoint?max_id=123456>; rel="next", <https://mastodon.example/api/v1/endpoint?min_id=789012>; rel="prev". See [RFC 8288](https://www.rfc-editor.org/rfc/rfc8288) for more information.',
      schema: {
        type: 'string',
      },
    };
  }

  /**
   * Get default Mastodon-Async-Refresh header if parsing fails
   */
  private static getDefaultAsyncRefreshHeader(): HttpHeader {
    return {
      name: 'Mastodon-Async-Refresh',
      description:
        'Indicates an async refresh is in progress. Format: id="<string>", retry=<int>, result_count=<int>. The retry value indicates seconds to wait before retrying. The result_count is optional and indicates results already fetched.',
      schema: {
        type: 'string',
      },
    };
  }
}
