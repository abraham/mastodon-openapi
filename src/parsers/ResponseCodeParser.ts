import { readFileSync } from 'fs';
import { docsContentPath } from '../config';

/**
 * Interface for HTTP response code information
 */
export interface ResponseCode {
  code: string;
  description: string;
  returnType?: string;
}

/**
 * Parser for extracting HTTP response codes from the intro.md file
 */
export class ResponseCodeParser {
  /**
   * Parse HTTP response codes from the intro.md file
   */
  public static parseResponseCodes(): ResponseCode[] {
    const introPath = docsContentPath('client', 'intro.md');

    let content: string;
    try {
      content = readFileSync(introPath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Could not read ${introPath}: ${(error as Error).message}. Run \`npm run setup-docs\`.`
      );
    }

    // Find the responses section
    const responsesMatch = content.match(
      /## How to use API response data {#responses}([\s\S]*?)(?=\n##|\n$)/
    );

    if (!responsesMatch) {
      throw new Error(
        `No "How to use API response data" section found in ${introPath}`
      );
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

    // Fix incorrect 422 description from documentation
    const code422 = codes.find((code) => code.code === '422');
    if (code422 && code422.description === 'Unprocessed') {
      code422.description = 'Unprocessable Content';
    }

    if (codes.length === 0) {
      throw new Error(`No response codes found in ${introPath}`);
    }

    return codes;
  }
}
