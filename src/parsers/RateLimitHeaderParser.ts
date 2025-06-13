import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Interface for rate limit header information
 */
export interface RateLimitHeader {
  name: string;
  description: string;
}

/**
 * Parser for extracting rate limit headers from the rate-limits.md file
 */
export class RateLimitHeaderParser {
  private static readonly RATE_LIMITS_FILE_PATH =
    'mastodon-documentation/content/en/api/rate-limits.md';

  /**
   * Parse rate limit headers from the rate-limits.md file
   * Returns default headers if file cannot be read or parsed
   */
  public static parseRateLimitHeaders(): RateLimitHeader[] {
    try {
      const filePath = join(process.cwd(), this.RATE_LIMITS_FILE_PATH);
      const content = readFileSync(filePath, 'utf-8');

      const headers: RateLimitHeader[] = [];

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
          headers.push({
            name,
            description,
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
   * Get default rate limit headers if parsing fails
   */
  private static getDefaultRateLimitHeaders(): RateLimitHeader[] {
    return [
      {
        name: 'X-RateLimit-Limit',
        description: 'Number of requests permitted per time period',
      },
      {
        name: 'X-RateLimit-Remaining',
        description: 'Number of requests you can still make',
      },
      {
        name: 'X-RateLimit-Reset',
        description: 'Timestamp when your rate limit will reset',
      },
    ];
  }
}
