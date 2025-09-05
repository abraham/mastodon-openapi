import { AttributeParser } from '../../parsers/AttributeParser';

describe('AttributeParser - Newline in description', () => {
  describe('Entity format', () => {
    it('should parse full description with newline characters for redirect_uri', () => {
      const content = `
### \`redirect_uri\` {{%deprecated%}} {#redirect_uri}

**Description:** The registered redirection URI(s) for the application stored as a single string. Multiple URIs are separated by whitespace characters. May contain \`\\n\` characters when multiple redirect URIs are registered.\\
**Type:** String\\
**Version history:**\\
0.0.0 - added\\
4.3.0 - deprecated in favour of [\`redirect_uris\`]({{< relref "entities/Application#redirect_uris" >}}), since the value of this property is not a well-formed URI when multiple redirect URIs are registered
`;

      const attributes = AttributeParser.parseAttributesFromSection(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('redirect_uri');
      expect(attributes[0].description).toContain('May contain');
      expect(attributes[0].description).toContain('\\n');
      expect(attributes[0].description).toContain('characters when multiple redirect URIs are registered');
      expect(attributes[0].deprecated).toBe(true);
    });

    it('should parse full description with multiline content', () => {
      const content = `
### \`multiline_field\` {#multiline_field}

**Description:** This is a description that spans
multiple lines and should be captured
completely until the Type section.\\
**Type:** String\\
**Version history:**\\
1.0.0 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('multiline_field');
      expect(attributes[0].description).toContain('This is a description that spans');
      expect(attributes[0].description).toContain('multiple lines and should be captured');
      expect(attributes[0].description).toContain('completely until the Type section');
    });
  });

  describe('Method entity format', () => {
    it('should parse full description with newline characters in method entities', () => {
      const content = `
#### \`redirect_uri\` {{%deprecated%}} {#redirect_uri}

**Description:** The registered redirection URI(s) for the application stored as a single string. Multiple URIs are separated by whitespace characters. May contain \`\\n\` characters when multiple redirect URIs are registered.\\
**Type:** String\\
**Version history:**\\
0.0.0 - added\\
4.3.0 - deprecated
`;

      const attributes = AttributeParser.parseMethodEntityAttributes(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('redirect_uri');
      expect(attributes[0].description).toContain('May contain');
      expect(attributes[0].description).toContain('\\n');
      expect(attributes[0].description).toContain('characters when multiple redirect URIs are registered');
      expect(attributes[0].deprecated).toBe(true);
    });

    it('should parse full description with multiline content in method entities', () => {
      const content = `
#### \`multiline_field\` {#multiline_field}

**Description:** This is a description that spans
multiple lines and should be captured
completely until the Type section.\\
**Type:** String\\
**Version history:**\\
1.0.0 - added
`;

      const attributes = AttributeParser.parseMethodEntityAttributes(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('multiline_field');
      expect(attributes[0].description).toContain('This is a description that spans');
      expect(attributes[0].description).toContain('multiple lines and should be captured');
      expect(attributes[0].description).toContain('completely until the Type section');
    });
  });
});