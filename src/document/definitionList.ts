import { fenceMask } from './blocks';

export interface DefinitionEntry {
  /** The term line, with surrounding backticks stripped. */
  term: string;
  /** The definition, with continuation lines joined. */
  definition: string;
}

const DEFINITION = /^:\s?(.*)$/;

/**
 * Parses the `term` / `: definition` lists the documentation uses for
 * parameters and headers. This is a PHP-Markdown-Extra extension rather than
 * CommonMark, so it has no equivalent in a standard markdown parser.
 *
 * A term is any non-empty line immediately followed by a `:` line. Subsequent
 * indented or `:` lines continue the definition.
 */
export function parseDefinitionList(content: string): DefinitionEntry[] {
  const lines = content.split('\n');
  const mask = fenceMask(lines);
  const entries: DefinitionEntry[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (mask[i]) {
      continue;
    }

    const term = lines[i].trim();
    if (term === '' || DEFINITION.test(term)) {
      continue;
    }

    const next = lines[i + 1];
    if (next === undefined || mask[i + 1]) {
      continue;
    }

    const definitionMatch = next.trim().match(DEFINITION);
    if (!definitionMatch) {
      continue;
    }

    const parts = [definitionMatch[1].trim()];

    let j = i + 2;
    for (; j < lines.length && !mask[j]; j++) {
      const line = lines[j];
      if (line.trim() === '') {
        break;
      }

      const continuation = line.trim().match(DEFINITION);
      parts.push(continuation ? continuation[1].trim() : line.trim());
    }

    entries.push({
      term: stripBackticks(term),
      // A trailing backslash is a markdown hard line break, not content.
      definition: parts
        .map((part) => part.replace(/\\$/, '').trim())
        .join(' ')
        .trim(),
    });

    i = j - 1;
  }

  return entries;
}

function stripBackticks(value: string): string {
  const match = value.match(/^`(.+)`$/);
  return match ? match[1] : value;
}
