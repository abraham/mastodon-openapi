import { AttributeParser } from '../../parsers/AttributeParser';

describe('AttributeParser - Removed Attributes', () => {
  describe('parseAttributesFromSection', () => {
    it('should exclude attributes marked with {{%removed%}}', () => {
      const content = `
### \`text_url\` {{%removed%}} {#text_url}

**Description:** A shorter URL for the attachment.\\
**Type:** String (URL)\\
**Version history:**\\
0.6.0 - added\\
3.5.0 - removed

### \`valid_attribute\` {#valid_attribute}

**Description:** A valid attribute that should be included.\\
**Type:** String\\
**Version history:**\\
1.0.0 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(content);

      // Should only include the valid attribute, not the removed one
      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('valid_attribute');
      expect(attributes[0].type).toBe('String');
      expect(attributes[0].description).toBe(
        'A valid attribute that should be included.'
      );
    });

    it('should parse normal attributes without {{%removed%}} marker', () => {
      const content = `
### \`id\` {#id}

**Description:** The ID of the attachment in the database.\\
**Type:** String (cast from an integer but not guaranteed to be a number)\\
**Version history:**\\
0.6.0 - added

### \`type\` {#type}

**Description:** The type of the attachment.\\
**Type:** String (Enumerable, oneOf)\\
**Version history:**\\
0.6.0 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(content);

      expect(attributes).toHaveLength(2);
      expect(attributes[0].name).toBe('id');
      expect(attributes[1].name).toBe('type');
    });

    it('should handle real MediaAttachment entity content correctly', () => {
      // Real content from MediaAttachment.md with the text_url removed attribute
      const content = `
### \`url\` {#url}

**Description:** The location of the original full-size attachment.\\
**Type:** String (URL)\\
**Version history:**\\
0.6.0 - added

### \`text_url\` {{%removed%}} {#text_url}

**Description:** A shorter URL for the attachment.\\
**Type:** String (URL)\\
**Version history:**\\
0.6.0 - added\\
3.5.0 - removed

### \`description\` {#description}

**Description:** Alternate text that describes what is in the media attachment, to be used for the visually impaired or when media attachments do not load.\\
**Type:** {{<nullable>}} String, or null if alternate text was not provided for the media attachment\\
**Version history:**\\
2.0.0 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(content);

      // Should include url and description but not text_url
      expect(attributes).toHaveLength(2);
      expect(attributes.map((attr) => attr.name)).toEqual([
        'url',
        'description',
      ]);
      expect(
        attributes.find((attr) => attr.name === 'text_url')
      ).toBeUndefined();
    });
  });

  describe('parseMethodEntityAttributes', () => {
    it('should exclude method entity attributes marked with {{%removed%}}', () => {
      const content = `
#### \`text_url\` {{%removed%}} {#text_url}

**Description:** A shorter URL for the attachment.\\
**Type:** String (URL)\\
**Version history:**\\
0.6.0 - added\\
3.5.0 - removed

#### \`valid_attribute\` {#valid_attribute}

**Description:** A valid attribute that should be included.\\
**Type:** String\\
**Version history:**\\
1.0.0 - added
`;

      const attributes = AttributeParser.parseMethodEntityAttributes(content);

      // Should only include the valid attribute, not the removed one
      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('valid_attribute');
      expect(attributes[0].type).toBe('String');
      expect(attributes[0].description).toBe(
        'A valid attribute that should be included.'
      );
    });

    it('should parse normal method entity attributes without {{%removed%}} marker', () => {
      const content = `
#### \`id\` {#id}

**Description:** The ID of the attachment in the database.\\
**Type:** String (cast from an integer but not guaranteed to be a number)\\
**Version history:**\\
0.6.0 - added

#### \`type\` {#type}

**Description:** The type of the attachment.\\
**Type:** String (Enumerable, oneOf)\\
**Version history:**\\
0.6.0 - added
`;

      const attributes = AttributeParser.parseMethodEntityAttributes(content);

      expect(attributes).toHaveLength(2);
      expect(attributes[0].name).toBe('id');
      expect(attributes[1].name).toBe('type');
    });
  });
});
