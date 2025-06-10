import { AttributeParser } from '../../parsers/AttributeParser';

describe('AttributeParser - Suggestion Source Exclusion', () => {
  describe('parseAttributesFromSection', () => {
    it('should exclude source attribute from Suggestion entity', () => {
      // Content that mimics the actual Suggestion.md structure
      const content = `
### \`source\` {#source}

**Description:** The reason this account is being suggested.\\
**Type:** String (Enumerable oneOf)\\
\`staff\` = This account was manually recommended by your administration team\\
\`past_interactions\` = You have interacted with this account previously\\
\`global\` = This account has many reblogs, favourites, and active local followers within the last 30 days\\
**Version history:**\\
3.4.0 - added\\
4.3.0 - deprecated, use \`sources\` instead

### \`sources\` {#sources}

**Description:** A list of reasons this account is being suggested. This replaces \`source\`\\
**Type:** Array of String (Enumerable oneOf)\\
\`featured\` = This account was manually recommended by your administration team. Equivalent to the \`staff\` value for \`source\`\\
\`most_followed\` = This account has many active local followers\\
\`most_interactions\` = This account had many reblogs and favourites within the last 30 days\\
\`similar_to_recently_followed\` = This account's profile is similar to your most recent follows\\
\`friends_of_friends\` = This account is followed by people you follow\\
**Version history:**\\
4.3.0 - added

### \`account\` {#account}

**Description:** The account being recommended to follow.\\
**Type:** [Account]()\\
**Version history:**\\
3.4.0 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(
        content,
        'Suggestion'
      );

      // Should exclude 'source' but include 'sources' and 'account'
      expect(attributes).toHaveLength(2);
      expect(attributes.map((attr) => attr.name)).toEqual([
        'sources',
        'account',
      ]);
      expect(attributes.find((attr) => attr.name === 'source')).toBeUndefined();
    });

    it('should include source attribute from non-Suggestion entities', () => {
      // Test that source attributes in other entities are not affected
      const content = `
### \`source\` {#source}

**Description:** Some other source field.\\
**Type:** String\\
**Version history:**\\
1.0.0 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(
        content,
        'SomeOtherEntity'
      );

      // Should include the source attribute for non-Suggestion entities
      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('source');
      expect(attributes[0].type).toBe('String');
    });
  });
});
