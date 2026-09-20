import { AttributeParser } from '../../parsers/AttributeParser';

const attributeBlock = `**Description:** The server's VAPID public key.\\
**Type:** String\\
**Version history:**\\
4.3.0 - added`;

describe('AttributeParser heading recognition', () => {
  it('reads an attribute whose heading is followed by a blank line', () => {
    const attributes = AttributeParser.parseAttributesFromSection(
      `#### \`public_key\` {#public_key}\n\n${attributeBlock}\n`
    );

    expect(attributes.map((a) => a.name)).toEqual(['public_key']);
    expect(attributes[0].type).toBe('String');
  });

  it('ignores headings that do not name an attribute in backticks', () => {
    const attributes = AttributeParser.parseAttributesFromSection(
      `#### Some prose heading\n\n${attributeBlock}\n`
    );

    expect(attributes).toEqual([]);
  });

  it('reads an attribute whose heading is not followed by a blank line', () => {
    const attributes = AttributeParser.parseAttributesFromSection(
      `#### \`public_key\` {#public_key}\n${attributeBlock}\n`
    );

    expect(attributes.map((a) => a.name)).toEqual(['public_key']);
    expect(attributes[0].type).toBe('String');
  });
});
