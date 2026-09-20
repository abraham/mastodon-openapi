/**
 * Fenced-code awareness. Documentation embeds JSON and HTTP samples that can
 * contain lines which look like headings, so any line-oriented scan has to
 * know which lines are inside a fence.
 */

const FENCE = /^(\s*)(`{3,}|~{3,})(.*)$/;

/**
 * For each line, whether it sits inside a fenced code block. Fence delimiter
 * lines themselves count as inside, so they are never mistaken for content.
 */
export function fenceMask(lines: string[]): boolean[] {
  const mask: boolean[] = new Array(lines.length).fill(false);

  let openMarker: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(FENCE);

    if (!match) {
      mask[i] = openMarker !== null;
      continue;
    }

    const marker = match[2];

    if (openMarker === null) {
      // A fence opens; its info string may not contain the marker character
      openMarker = marker;
      mask[i] = true;
    } else if (
      marker[0] === openMarker[0] &&
      marker.length >= openMarker.length &&
      match[3].trim() === ''
    ) {
      openMarker = null;
      mask[i] = true;
    } else {
      mask[i] = true;
    }
  }

  return mask;
}

/**
 * Split content on a line predicate, ignoring lines inside fenced blocks.
 * Returns the chunks including the matched line at the start of each.
 */
export function splitOutsideFences(
  content: string,
  isBoundary: (line: string) => boolean
): string[] {
  const lines = content.split('\n');
  const mask = fenceMask(lines);

  const chunks: string[] = [];
  let current: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!mask[i] && isBoundary(lines[i]) && current.length > 0) {
      chunks.push(current.join('\n'));
      current = [];
    }
    current.push(lines[i]);
  }

  if (current.length > 0) {
    chunks.push(current.join('\n'));
  }

  return chunks;
}

/**
 * Blank out HTML comments, preserving line count so positions stay aligned.
 * Comments inside fenced blocks are left alone, since they are sample content
 * rather than commentary.
 */
export function stripHtmlComments(content: string): string {
  const lines = content.split('\n');
  const mask = fenceMask(lines);

  let inComment = false;

  return lines
    .map((line, i) => {
      if (mask[i]) {
        return line;
      }

      let result = '';
      let rest = line;

      while (rest.length > 0) {
        if (inComment) {
          const close = rest.indexOf('-->');
          if (close === -1) {
            return result;
          }
          rest = rest.slice(close + 3);
          inComment = false;
          continue;
        }

        const open = rest.indexOf('<!--');
        if (open === -1) {
          return result + rest;
        }
        result += rest.slice(0, open);
        rest = rest.slice(open + 4);
        inComment = true;
      }

      return result;
    })
    .join('\n');
}
