import { ExampleParser } from '../../parsers/ExampleParser';

describe('ExampleParser.parseEntityExample', () => {
  it('reads a sample that directly follows the heading', () => {
    expect(
      ExampleParser.parseEntityExample(`## Example

\`\`\`json
{ "id": "1" }
\`\`\`
`)
    ).toEqual({ id: '1' });
  });

  it('ignores a heading that only looks like Example', () => {
    expect(
      ExampleParser.parseEntityExample(`### Example

\`\`\`json
{ "id": "1" }
\`\`\`
`)
    ).toBeNull();
  });

  /**
   * Current behaviour, not desired behaviour: nine entity pages introduce their
   * sample with a paragraph or a subheading and lose the example entirely.
   * Pinned so that fixing it upstream is a visible, deliberate change.
   * See docs/pipeline-rewrite.md §8.5.
   */
  describe('samples that are not adjacent to the heading (known gap)', () => {
    it('drops a sample introduced by a paragraph', () => {
      expect(
        ExampleParser.parseEntityExample(`## Example

Monthly retention data for the month of 2022-09.

\`\`\`json
{ "period": "2022-09-01T00:00:00+00:00" }
\`\`\`
`)
      ).toBeNull();
    });

    it('drops a sample nested under a subheading', () => {
      expect(
        ExampleParser.parseEntityExample(`## Example

### Image

\`\`\`json
{ "id": "22345792" }
\`\`\`
`)
      ).toBeNull();
    });
  });
});
