import matter from 'gray-matter';
import { fenceMask } from './blocks';

const HEADING = /^(#{1,6})\s+(.*?)\s*$/;
const ANCHOR = /\{#([^}]+)\}/;
const SHORTCODE = /\{\{[<%]\s*([^%>]+?)\s*[%>]\}\}/g;

export interface Heading {
  /** Number of leading `#` characters. */
  level: number;
  /** Heading text with the Hugo anchor and shortcodes removed. */
  title: string;
  /** Value of a Hugo `{#anchor}` suffix, if present. */
  anchor?: string;
  /** Hugo shortcodes in the heading, e.g. `optional`, `deprecated`. */
  modifiers: string[];
  /** The heading line as written. */
  raw: string;
  line: number;
}

export interface Section {
  heading: Heading;
  /** Text after the heading, up to the next heading of any level. */
  body: string;
  /** Text after the heading, up to the next heading of the same or lower level. */
  content: string;
  children: Section[];
}

function parseHeading(line: string, index: number): Heading | null {
  const match = line.match(HEADING);
  if (!match) {
    return null;
  }

  let title = match[2];

  const anchorMatch = title.match(ANCHOR);
  const anchor = anchorMatch ? anchorMatch[1] : undefined;
  if (anchorMatch) {
    title = title.replace(ANCHOR, '');
  }

  const modifiers = [...title.matchAll(SHORTCODE)].map((m) => m[1]);
  title = title.replace(SHORTCODE, '').replace(/\s+/g, ' ').trim();

  return {
    level: match[1].length,
    title,
    anchor,
    modifiers,
    raw: line,
    line: index,
  };
}

/**
 * A documentation page split into a heading tree. Section boundaries are
 * detected outside fenced code blocks only, so JSON and HTTP samples
 * containing `#` lines cannot split a document.
 */
export class MarkdownDocument {
  private constructor(
    public readonly id: string,
    public readonly frontmatter: Record<string, unknown>,
    public readonly body: string,
    private readonly tree: Section[]
  ) {}

  public static parse(content: string, id = '<inline>'): MarkdownDocument {
    const parsed = matter(content);
    return new MarkdownDocument(
      id,
      parsed.data ?? {},
      parsed.content,
      buildTree(parsed.content)
    );
  }

  /**
   * Build a document from a fragment that has already had frontmatter removed,
   * so a leading `---` is treated as content rather than a delimiter.
   */
  public static fromBody(content: string, id = '<fragment>'): MarkdownDocument {
    return new MarkdownDocument(id, {}, content, buildTree(content));
  }

  /** True when the page is marked as a draft in frontmatter. */
  public get isDraft(): boolean {
    return this.frontmatter.draft === true;
  }

  /** Top-level sections, in document order. */
  public get sections(): Section[] {
    return this.tree;
  }

  /** Every section at any depth, in document order. */
  public allSections(): Section[] {
    const flat: Section[] = [];
    const visit = (sections: Section[]) => {
      for (const section of sections) {
        flat.push(section);
        visit(section.children);
      }
    };
    visit(this.tree);
    return flat;
  }

  /** First section matching a title, compared case-insensitively. */
  public findSection(title: string): Section | undefined {
    const wanted = title.toLowerCase();
    return this.allSections().find(
      (s) => s.heading.title.toLowerCase() === wanted
    );
  }
}

function buildTree(content: string): Section[] {
  const lines = content.split('\n');
  const mask = fenceMask(lines);

  const headings: Heading[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (mask[i]) {
      continue;
    }
    const heading = parseHeading(lines[i], i);
    if (heading) {
      headings.push(heading);
    }
  }

  const flat = headings.map((heading, i) => {
    const bodyEnd = headings[i + 1]?.line ?? lines.length;

    let contentEnd = lines.length;
    for (let j = i + 1; j < headings.length; j++) {
      if (headings[j].level <= heading.level) {
        contentEnd = headings[j].line;
        break;
      }
    }

    return {
      heading,
      body: lines.slice(heading.line + 1, bodyEnd).join('\n'),
      content: lines.slice(heading.line + 1, contentEnd).join('\n'),
      children: [] as Section[],
    };
  });

  const roots: Section[] = [];
  const stack: Section[] = [];

  for (const section of flat) {
    while (
      stack.length > 0 &&
      stack[stack.length - 1].heading.level >= section.heading.level
    ) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(section);
    } else {
      stack[stack.length - 1].children.push(section);
    }

    stack.push(section);
  }

  return roots;
}
