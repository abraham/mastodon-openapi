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

  describe('samples that are not adjacent to the heading', () => {
    it('reads a sample introduced by a paragraph', () => {
      expect(
        ExampleParser.parseEntityExample(`## Example

Monthly retention data for the month of 2022-09.

\`\`\`json
{ "period": "2022-09-01T00:00:00+00:00" }
\`\`\`
`)
      ).toEqual({ period: '2022-09-01T00:00:00+00:00' });
    });

    it('reads a sample nested under a subheading', () => {
      expect(
        ExampleParser.parseEntityExample(`## Example

### Image

\`\`\`json
{ "id": "22345792" }
\`\`\`
`)
      ).toEqual({ id: '22345792' });
    });

    it('takes the first sample when several are shown', () => {
      expect(
        ExampleParser.parseEntityExample(`## Example

### Image

\`\`\`json
{ "type": "image" }
\`\`\`

### Video

\`\`\`json
{ "type": "video" }
\`\`\`
`)
      ).toEqual({ type: 'image' });
    });
  });
});
