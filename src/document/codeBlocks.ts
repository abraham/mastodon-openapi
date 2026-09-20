import { fenceMask } from './blocks';

export interface CodeBlock {
  /** Info string of the opening fence, e.g. `json`. Empty when absent. */
  lang: string;
  content: string;
}

const FENCE = /^(\s*)(`{3,}|~{3,})(.*)$/;

/** Fenced code blocks in document order. */
export function parseCodeBlocks(content: string): CodeBlock[] {
  const lines = content.split('\n');
  const mask = fenceMask(lines);
  const blocks: CodeBlock[] = [];

  let open: { marker: string; lang: string; body: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    if (!mask[i]) {
      continue;
    }

    const match = lines[i].match(FENCE);

    if (open === null) {
      if (match) {
        open = { marker: match[2], lang: match[3].trim(), body: [] };
      }
      continue;
    }

    const closes =
      match &&
      match[2][0] === open.marker[0] &&
      match[2].length >= open.marker.length &&
      match[3].trim() === '';

    if (closes) {
      blocks.push({ lang: open.lang, content: open.body.join('\n') });
      open = null;
    } else {
      open.body.push(lines[i]);
    }
  }

  return blocks;
}

/** First fenced block, optionally restricted to an info string. */
export function firstCodeBlock(
  content: string,
  lang?: string
): CodeBlock | undefined {
  return parseCodeBlocks(content).find(
    (block) => lang === undefined || block.lang === lang
  );
}

/**
 * A fenced block that opens the content, preceded by nothing but blank lines.
 * Used where the documentation convention is "heading, then the sample".
 */
export function leadingCodeBlock(
  content: string,
  lang?: string
): CodeBlock | undefined {
  const lines = content.split('\n');
  const opensAt = lines.findIndex((line) => line.trim() !== '');

  if (opensAt === -1 || !/^\s*(`{3,}|~{3,})/.test(lines[opensAt])) {
    return undefined;
  }

  const block = parseCodeBlocks(lines.slice(opensAt).join('\n'))[0];
  return block && (lang === undefined || block.lang === lang)
    ? block
    : undefined;
}
