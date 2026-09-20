import { fenceMask } from './blocks';

const RELREF = /\{\{<\s*relref\s+"([^"]+)"\s*>\}\}/g;

const DOCS_BASE = 'https://docs.joinmastodon.org';

/**
 * Turn a Hugo relref target into a docs.joinmastodon.org URL.
 * `entities/Account#source-privacy` -> `.../entities/Account/#source-privacy`
 */
export function relrefToUrl(target: string): string {
  const [path, anchor] = target.split('#');
  const base = `${DOCS_BASE}/${path.replace(/^\/+|\/+$/g, '')}/`;
  return anchor ? `${base}#${anchor}` : base;
}

/**
 * Replace `{{< relref "..." >}}` with the URL it resolves to, leaving fenced
 * samples untouched. Without this the raw shortcode ends up in descriptions.
 */
export function resolveRelrefs(content: string): string {
  if (!content.includes('relref')) {
    return content;
  }

  const lines = content.split('\n');
  const mask = fenceMask(lines);

  return lines
    .map((line, i) =>
      mask[i] ? line : line.replace(RELREF, (_, target) => relrefToUrl(target))
    )
    .join('\n');
}
