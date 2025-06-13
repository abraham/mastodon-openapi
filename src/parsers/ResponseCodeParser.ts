import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Interface for HTTP response code information
 */
export interface ResponseCode {
  code: string;
  description: string;
}

/**
 * Parser for extracting HTTP response codes from the intro.md file
 */
export class ResponseCodeParser {
  private static readonly INTRO_FILE_PATH =
    'mastodon-documentation/content/en/client/intro.md';

  /**
   * Parse HTTP response codes from the intro.md file
   * Returns default codes if file cannot be read or parsed
   */
  public static parseResponseCodes(): ResponseCode[] {
    try {
      const introPath = join(process.cwd(), this.INTRO_FILE_PATH);
      const content = readFileSync(introPath, 'utf-8');

      // Find the responses section
      const responsesMatch = content.match(
        /## How to use API response data {#responses}([\s\S]*?)(?=\n##|\n$)/
      );

      if (!responsesMatch) {
        return this.getDefaultResponseCodes();
      }

      const responsesSection = responsesMatch[1];
      const codes: ResponseCode[] = [];

      // Parse individual response codes
      // Format: "- 200 = OK. The request was handled successfully."
      // Format: "- 4xx = Client error. ... you may see 401 Unauthorized, 404 Not Found, 410 Gone, or 422 Unprocessed."
      // Format: "- 5xx = Server error. ... you may see 503 Unavailable."

      // First, add the 200 code
      const okMatch = responsesSection.match(/- 200 = ([^.]*\.)/);
      if (okMatch) {
        codes.push({
          code: '200',
          description: okMatch[1].trim(),
        });
      }

      // Extract all specific error codes mentioned in the text
      // Match patterns like "401 Unauthorized", "404 Not Found", etc.
      const errorCodeMatches = responsesSection.match(
        /\d{3} [A-Za-z\s]+(?=[,.]|\s+or\s+)/g
      );
      if (errorCodeMatches) {
        for (const codeText of errorCodeMatches) {
          const trimmed = codeText.trim();
          const spaceIndex = trimmed.indexOf(' ');
          if (spaceIndex > 0) {
            const code = trimmed.substring(0, spaceIndex);
            const description = trimmed.substring(spaceIndex + 1);
            codes.push({
              code,
              description,
            });
          }
        }
      }

      // Always ensure 429 rate limiting response is included
      const has429 = codes.some((code) => code.code === '429');
      if (!has429) {
        codes.push({
          code: '429',
          description: 'Too Many Requests',
        });
      }

      return codes.length > 0 ? codes : this.getDefaultResponseCodes();
    } catch (error) {
      console.warn(
        'Could not parse response codes from intro.md, using defaults:',
        error
      );
      return this.getDefaultResponseCodes();
    }
  }

  /**
   * Get default response codes if parsing fails
   */
  private static getDefaultResponseCodes(): ResponseCode[] {
    return [
      { code: '200', description: 'OK. Request was handled successfully.' },
      { code: '401', description: 'Unauthorized' },
      { code: '404', description: 'Not Found' },
      { code: '410', description: 'Gone' },
      { code: '422', description: 'Unprocessable Entity' },
      { code: '429', description: 'Too Many Requests' },
      { code: '503', description: 'Service Unavailable' },
    ];
  }
}
