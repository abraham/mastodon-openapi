import { AttributeParser } from '../../parsers/AttributeParser';

describe('AttributeParser - Nullable Patterns', () => {
  describe('parseAttributesFromSection', () => {
    it('should mark fields with {{<nullable>}} shortcode as optional', () => {
      const content = `
### \`poll\` {#poll}

**Description:** The poll attached to the status.\\
**Type:** {{<nullable>}} [Poll]({{< relref "entities/Poll" >}}) or null\\
**Version history:**\\
2.8.0 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('poll');
      expect(attributes[0].optional).toBe(true);
      expect(attributes[0].nullable).toBe(true);
      expect(attributes[0].type).toBe('[Poll]() or null');
    });

    it('should mark fields ending with "or null" as optional', () => {
      const content = `
### \`card\` {#card}

**Description:** Preview card for links included within status content.\\
**Type:** [PreviewCard]({{< relref "entities/PreviewCard" >}}) or null\\
**Version history:**\\
2.6.0 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('card');
      expect(attributes[0].optional).toBe(true);
      expect(attributes[0].nullable).toBe(true);
      expect(attributes[0].type).toBe('[PreviewCard]() or null');
    });

    it('should handle both {{<nullable>}} and "or null" together', () => {
      const content = `
### \`test_field\` {#test_field}

**Description:** A test field with both patterns.\\
**Type:** {{<nullable>}} [SomeEntity]({{< relref "entities/SomeEntity" >}}) or null\\
**Version history:**\\
1.0.0 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('test_field');
      expect(attributes[0].optional).toBe(true);
      expect(attributes[0].nullable).toBe(true);
      expect(attributes[0].type).toBe('[SomeEntity]() or null');
    });

    it('should not mark regular entity references as optional', () => {
      const content = `
### \`account\` {#account}

**Description:** The account that authored this status.\\
**Type:** [Account]({{< relref "entities/Account" >}})\\
**Version history:**\\
0.1.0 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('account');
      expect(attributes[0].optional).toBeUndefined();
      expect(attributes[0].nullable).toBeUndefined();
      expect(attributes[0].type).toBe('[Account]()');
    });

    it('should handle nullable primitives', () => {
      const content = `
### \`language\` {#language}

**Description:** Primary language of this status.\\
**Type:** {{<nullable>}} String (ISO 639 Part 1 two-letter language code) or null\\
**Version history:**\\
1.4.0 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('language');
      expect(attributes[0].optional).toBe(true);
      expect(attributes[0].nullable).toBe(true);
      expect(attributes[0].type).toBe(
        'String (ISO 639 Part 1 two-letter language code) or null'
      );
    });
  });

  describe('parseMethodEntityAttributes', () => {
    it('should mark method entity fields with {{<nullable>}} shortcode as optional', () => {
      const content = `
#### \`poll\` {#poll}

**Description:** The poll attached to the status.\\
**Type:** {{<nullable>}} [Poll]({{< relref "entities/Poll" >}}) or null\\
**Version history:**\\
2.8.0 - added
`;

      const attributes = AttributeParser.parseMethodEntityAttributes(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('poll');
      expect(attributes[0].optional).toBe(true);
      expect(attributes[0].nullable).toBe(true);
      expect(attributes[0].type).toBe('[Poll]() or null');
    });

    it('should mark method entity fields ending with "or null" as optional', () => {
      const content = `
#### \`card\` {#card}

**Description:** Preview card for links included within status content.\\
**Type:** [PreviewCard]({{< relref "entities/PreviewCard" >}}) or null\\
**Version history:**\\
2.6.0 - added
`;

      const attributes = AttributeParser.parseMethodEntityAttributes(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('card');
      expect(attributes[0].optional).toBe(true);
      expect(attributes[0].nullable).toBe(true);
      expect(attributes[0].type).toBe('[PreviewCard]() or null');
    });
  });
});
