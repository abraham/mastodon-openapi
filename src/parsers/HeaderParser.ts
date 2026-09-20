import { DocumentSource } from '../source/DocumentSource';
import { defaultSource } from '../source/FileSystemSource';
import { MarkdownDocument } from '../document/MarkdownDocument';
import { parseDefinitionList } from '../document/definitionList';

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

const RATE_LIMITS_FILE = 'api/rate-limits.md';
const GUIDELINES_FILE = 'api/guidelines.md';
const ASYNC_REFRESH_FILE = 'methods/async_refreshes.md';

/**
 * Parser for extracting HTTP headers from Mastodon documentation
 */
export class HeaderParser {
  /**
   * Parse all HTTP headers from documentation
   */
  public static parseHeaders(
    source: DocumentSource = defaultSource()
  ): HttpHeader[] {
    return [
      ...this.parseRateLimitHeaders(source),
      this.parseLinkHeader(source),
      this.parseAsyncRefreshHeader(source),
    ];
  }

  /**
   * Parse rate limit headers from rate-limits.md
   */
  public static parseRateLimitHeaders(
    source: DocumentSource = defaultSource()
  ): HttpHeader[] {
    const document = MarkdownDocument.parse(
      source.readGuide(RATE_LIMITS_FILE),
      RATE_LIMITS_FILE
    );

    const headers: HttpHeader[] = [];
    const section = document.findSection('Headers');

    for (const entry of section ? parseDefinitionList(section.content) : []) {
      const { term: name, definition: description } = entry;

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

    if (headers.length === 0) {
      throw new Error(`No rate limit headers found in ${RATE_LIMITS_FILE}`);
    }

    return headers;
  }

  /**
   * Parse Link header from guidelines.md
   */
  private static parseLinkHeader(source: DocumentSource): HttpHeader {
    const content = source.readGuide(GUIDELINES_FILE);

    // Find the pagination section with Link header examples
    const paginationMatch = content.match(
      /Link: <https:\/\/mastodon\.example\/api\/v1\/endpoint\?[^>]+>; rel="next", <https:\/\/mastodon\.example\/api\/v1\/endpoint\?[^>]+>; rel="prev"/
    );

    if (!paginationMatch) {
      throw new Error(`No Link header example found in ${GUIDELINES_FILE}`);
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
  private static parseAsyncRefreshHeader(source: DocumentSource): HttpHeader {
    const content = source.readGuide(ASYNC_REFRESH_FILE);

    // Find the header format
    const headerMatch = content.match(
      /Mastodon-Async-Refresh: id="<string>", retry=<int>, result_count=<int>/
    );

    if (!headerMatch) {
      throw new Error(
        `No Mastodon-Async-Refresh header format found in ${ASYNC_REFRESH_FILE}`
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
