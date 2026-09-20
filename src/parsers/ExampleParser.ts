import { MarkdownDocument } from '../document/MarkdownDocument';
import { firstCodeBlock, leadingCodeBlock } from '../document/codeBlocks';
import { splitOutsideFences } from '../document/blocks';
import { reportOverride } from '../overrides/report';

/**
 * Handles parsing of JSON examples from markdown content
 */
export class ExampleParser {
  /**
   * Attempts to parse JSON with improved error handling
   * 1. Strips out comments (e.g. // ...) before parsing
   * 2. If parsing fails, wraps content in {} and tries again
   */
  private static parseJsonWithFallback(jsonContent: string): any | null {
    if (!jsonContent.trim()) {
      return null;
    }

    // First, strip out line comments (// ...)
    // This handles comments at the end of lines
    let cleanedContent = jsonContent
      .split('\n')
      .map((line) => {
        // Find // that's not inside a string
        // More robust approach: track if we're inside a string
        let inString = false;
        let escaped = false;
        let commentIndex = -1;

        for (let i = 0; i < line.length - 1; i++) {
          const char = line[i];
          const nextChar = line[i + 1];

          if (escaped) {
            escaped = false;
            continue;
          }

          if (char === '\\') {
            escaped = true;
            continue;
          }

          if (char === '"') {
            inString = !inString;
            continue;
          }

          // If we're not in a string and we find //, mark it
          if (!inString && char === '/' && nextChar === '/') {
            commentIndex = i;
            break;
          }
        }

        if (commentIndex !== -1) {
          return line.substring(0, commentIndex).trimEnd();
        }

        return line;
      })
      .join('\n')
      .trim();

    // Remove trailing commas before closing braces/brackets
    // This handles cases where comments were removed leaving trailing commas
    cleanedContent = cleanedContent.replace(/,(\s*[}\]])/g, '$1');

    // Try parsing the cleaned content directly
    try {
      return JSON.parse(cleanedContent);
    } catch (error) {
      // If that fails, try wrapping in braces
      try {
        const wrappedContent = `{${cleanedContent}}`;
        return JSON.parse(wrappedContent);
      } catch (secondError) {
        // If both attempts fail, return null
        return null;
      }
    }
  }
  /**
   * Parses JSON examples from an "## Example" section in entity markdown
   */
  static parseEntityExample(
    content: string,
    sourceLabel = 'entity'
  ): any | null {
    const section = MarkdownDocument.fromBody(content)
      .allSections()
      .find(
        (candidate) =>
          candidate.heading.level === 2 &&
          candidate.heading.title.toLowerCase() === 'example'
      );

    if (!section) {
      return null;
    }

    // The fence must directly follow the heading. Entities that introduce the
    // sample with a paragraph or a subheading are skipped, matching long-standing
    // behaviour; see docs/pipeline-rewrite.md §8.5.
    const block = leadingCodeBlock(section.body, 'json');
    if (!block) {
      if (firstCodeBlock(section.content, 'json')) {
        reportOverride(
          'workaround',
          `${sourceLabel} example skipped: sample is not directly after the heading`,
          'preserved behaviour, see docs/pipeline-rewrite.md §10 D1'
        );
      }
      return null;
    }

    const jsonContent = block.content.trim();
    if (!jsonContent) {
      return null;
    }

    const result = this.parseJsonWithFallback(jsonContent);
    if (result === null) {
      // If JSON parsing fails, return null (don't break the build)
      console.warn(`Failed to parse example JSON: unable to parse content`);
    }
    return result;
  }

  /**
   * Parses JSON examples from method response sections
   * Returns a map of status codes to examples
   */
  static parseMethodResponseExamples(content: string): Record<string, any> {
    const examples: Record<string, any> = {};

    // Split content by response headers, ignoring lines inside fenced samples
    const responseSections = splitOutsideFences(content, (line) =>
      /^##### \d{3}:/.test(line)
    );

    for (const section of responseSections) {
      // Check if this section contains a response status header
      const headerMatch = section.match(/^##### (\d{3}):/);
      if (!headerMatch) {
        continue;
      }

      const statusCode = headerMatch[1];

      // Look for JSON blocks within this response section
      const block = firstCodeBlock(section, 'json');
      if (!block) {
        continue;
      }

      const jsonContent = block.content.trim();
      if (jsonContent) {
        const result = this.parseJsonWithFallback(jsonContent);
        if (result !== null) {
          examples[statusCode] = result;
        } else {
          // If JSON parsing fails, skip this example (don't break the build)
          console.warn(
            `Failed to parse response example for ${statusCode}: unable to parse content`
          );
        }
      }
    }

    return examples;
  }
}
