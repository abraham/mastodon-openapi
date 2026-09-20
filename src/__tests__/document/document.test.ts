import { MarkdownDocument } from '../../document/MarkdownDocument';
import {
  fenceMask,
  splitOutsideFences,
  stripHtmlComments,
} from '../../document/blocks';
import { parseDefinitionList } from '../../document/definitionList';
import { parseTables } from '../../document/tables';
import { firstCodeBlock, parseCodeBlocks } from '../../document/codeBlocks';

describe('parseCodeBlocks', () => {
  it('returns blocks with their info string', () => {
    const blocks = parseCodeBlocks(
      ['text', '```json', '{ "a": 1 }', '```', '```http', 'GET /x', '```'].join(
        '\n'
      )
    );

    expect(blocks).toEqual([
      { lang: 'json', content: '{ "a": 1 }' },
      { lang: 'http', content: 'GET /x' },
    ]);
  });

  it('does not treat an inner fence of a different marker as a close', () => {
    const blocks = parseCodeBlocks(['~~~text', '```', 'x', '~~~'].join('\n'));
    expect(blocks).toEqual([{ lang: 'text', content: '```\nx' }]);
  });

  it('selects by language', () => {
    const content = ['```http', 'GET /x', '```', '```json', '{}', '```'].join(
      '\n'
    );
    expect(firstCodeBlock(content, 'json')).toEqual({
      lang: 'json',
      content: '{}',
    });
  });
});

describe('fenceMask', () => {
  it('marks lines inside a fenced block', () => {
    const lines = ['a', '```json', '{ "x": 1 }', '```', 'b'];
    expect(fenceMask(lines)).toEqual([false, true, true, true, false]);
  });
  it('handles tilde fences', () => {
    const lines = ['a', '~~~', 'x', '~~~', 'b'];
    expect(fenceMask(lines)).toEqual([false, true, true, true, false]);
  });

  it('does not close a backtick fence with a tilde fence', () => {
    const lines = ['```', '~~~', '```', 'after'];
    expect(fenceMask(lines)).toEqual([true, true, true, false]);
  });

  it('treats an unterminated fence as running to the end', () => {
    expect(fenceMask(['```', 'x', 'y'])).toEqual([true, true, true]);
  });
});

describe('splitOutsideFences', () => {
  it('does not split on a boundary inside a fence', () => {
    const content = [
      '## One',
      '```http',
      '## not a heading',
      '```',
      '## Two',
    ].join('\n');

    const chunks = splitOutsideFences(content, (line) =>
      line.startsWith('## ')
    );

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toContain('## not a heading');
  });
});

describe('MarkdownDocument', () => {
  const doc = MarkdownDocument.parse(
    `---
title: Account
description: A user.
---

## Example

\`\`\`json
{
  "## fake": "heading",
  "text": "### also fake"
}
\`\`\`

## Attributes

### \`id\` {#id}

**Type:** String

### \`suspended\` {{%optional%}} {#suspended}

**Type:** Boolean
`,
    'Account.md'
  );

  it('exposes frontmatter', () => {
    expect(doc.frontmatter.title).toBe('Account');
    expect(doc.id).toBe('Account.md');
    expect(doc.isDraft).toBe(false);
  });

  it('ignores headings inside fenced code blocks', () => {
    expect(doc.sections.map((s) => s.heading.title)).toEqual([
      'Example',
      'Attributes',
    ]);
  });

  it('keeps the fenced sample in the section body', () => {
    expect(doc.findSection('Example')!.body).toContain('"## fake"');
  });

  it('nests subsections under their parent', () => {
    const attributes = doc.findSection('Attributes')!;
    expect(attributes.children.map((c) => c.heading.title)).toEqual([
      '`id`',
      '`suspended`',
    ]);
  });

  it('extracts Hugo anchors and shortcode modifiers from headings', () => {
    const suspended = doc.findSection('`suspended`')!;
    expect(suspended.heading.anchor).toBe('suspended');
    expect(suspended.heading.modifiers).toEqual(['optional']);
    expect(suspended.heading.title).toBe('`suspended`');
  });

  it('distinguishes body from content', () => {
    const attributes = doc.findSection('Attributes')!;
    expect(attributes.body.trim()).toBe('');
    expect(attributes.content).toContain('**Type:** Boolean');
  });
});

describe('parseDefinitionList', () => {
  it('parses terms and definitions', () => {
    const entries = parseDefinitionList(`
max_id
: {{<required>}} String. Return results older than this ID.

since_id
: String. Return results newer than this ID.
`);

    expect(entries).toEqual([
      {
        term: 'max_id',
        definition: '{{<required>}} String. Return results older than this ID.',
      },
      {
        term: 'since_id',
        definition: 'String. Return results newer than this ID.',
      },
    ]);
  });

  it('strips backticks from terms', () => {
    const entries = parseDefinitionList(
      '`X-RateLimit-Limit`\n: Number of requests'
    );
    expect(entries[0].term).toBe('X-RateLimit-Limit');
  });

  it('joins continuation lines', () => {
    const entries = parseDefinitionList('term\n: first\n  second');
    expect(entries[0].definition).toBe('first second');
  });

  it('ignores definition lists inside fenced blocks', () => {
    expect(parseDefinitionList('```\nterm\n: value\n```')).toEqual([]);
  });
});

describe('parseTables', () => {
  it('parses a GFM table', () => {
    const tables = parseTables(`
| Scope | Description |
| ----- | ----------- |
| \`read\` | Read everything |
| \`write\` | Write everything |
`);

    expect(tables).toHaveLength(1);
    expect(tables[0].headers).toEqual(['Scope', 'Description']);
    expect(tables[0].rows).toEqual([
      ['`read`', 'Read everything'],
      ['`write`', 'Write everything'],
    ]);
  });

  it('ignores tables inside fenced blocks', () => {
    expect(parseTables('```\n| a | b |\n| - | - |\n| 1 | 2 |\n```')).toEqual(
      []
    );
  });
});

describe('stripHtmlComments', () => {
  it('removes a multi-line comment but keeps line count', () => {
    const input = [
      'keyword',
      ': A keyword.',
      '',
      '<!-- TODO: remove when fixed',
      'id',
      ': Will 404 if provided.',
      '-->',
      '',
      'whole_word',
      ': Boolean.',
    ].join('\n');

    const output = stripHtmlComments(input);

    expect(output.split('\n')).toHaveLength(input.split('\n').length);
    expect(output).toContain('keyword');
    expect(output).toContain('whole_word');
    expect(output).not.toContain('Will 404 if provided');
    expect(output).not.toContain('TODO');
  });

  it('removes an inline comment', () => {
    expect(stripHtmlComments('before <!-- hidden --> after')).toBe(
      'before  after'
    );
  });

  it('leaves comments inside fenced blocks alone', () => {
    const input = '```html\n<!-- kept -->\n```';
    expect(stripHtmlComments(input)).toBe(input);
  });

  it('drops an unterminated comment through to the end', () => {
    expect(stripHtmlComments('a\n<!-- b\nc')).toBe('a\n\n');
  });
});
