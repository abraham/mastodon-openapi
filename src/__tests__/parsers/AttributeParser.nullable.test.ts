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

    it('should mark fields with {{%nullable%}} modifier as optional and nullable', () => {
      const content = `
### \`account\` {{%nullable%}} {#account}

**Description:** The fediverse account of the author.\\
**Type:** [Account]({{< relref "entities/Account" >}})\\
**Version history:**\\
4.3.0 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('account');
      expect(attributes[0].optional).toBe(true);
      expect(attributes[0].nullable).toBe(true);
      expect(attributes[0].type).toBe('[Account]()');
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

    it('should mark optional fields as nullable (entity file format)', () => {
      const content = `
### \`application\` {{%optional%}} {#application}

**Description:** The application used to post this status.\\
**Type:** Hash\\
**Version history:**\\
0.9.9 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('application');
      expect(attributes[0].optional).toBe(true);
      expect(attributes[0].nullable).toBe(true); // This should be true for optional fields
      expect(attributes[0].type).toBe('Hash');
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

    it('should mark method entity fields with {{%nullable%}} modifier as optional and nullable', () => {
      const content = `
#### \`account\` {{%nullable%}} {#account}

**Description:** The fediverse account of the author.\\
**Type:** [Account]({{< relref "entities/Account" >}})\\
**Version history:**\\
4.3.0 - added
`;

      const attributes = AttributeParser.parseMethodEntityAttributes(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('account');
      expect(attributes[0].optional).toBe(true);
      expect(attributes[0].nullable).toBe(true);
      expect(attributes[0].type).toBe('[Account]()');
    });

    it('should mark optional fields as nullable (Status#application example)', () => {
      const content = `
#### \`application\` {{%optional%}} {#application}

**Description:** The application used to post this status.\\
**Type:** Hash\\
**Version history:**\\
0.9.9 - added
`;

      const attributes = AttributeParser.parseMethodEntityAttributes(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('application');
      expect(attributes[0].optional).toBe(true);
      expect(attributes[0].nullable).toBe(true); // This should be true for optional fields
      expect(attributes[0].type).toBe('Hash');
    });
  });

  describe('Special cases', () => {
    it('should mark Account#hide_collections as nullable due to servers returning null values', () => {
      const content = `
### \`hide_collections\` {#hide_collections}

**Description:** Whether the user hides the contents of their follows and followers collections.\\
**Type:** Boolean\\
**Version history:**\\
4.3.0 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(
        content,
        'Account'
      );

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('hide_collections');
      expect(attributes[0].nullable).toBe(true);
      expect(attributes[0].type).toBe('Boolean');
    });

    it('should mark hide_collections as nullable in method entities as well', () => {
      const content = `
#### \`hide_collections\` {#hide_collections}

**Description:** Whether the user hides the contents of their follows and followers collections.\\
**Type:** Boolean\\
**Version history:**\\
4.3.0 - added
`;

      const attributes = AttributeParser.parseMethodEntityAttributes(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('hide_collections');
      expect(attributes[0].nullable).toBe(true);
      expect(attributes[0].type).toBe('Boolean');
    });

    it('should mark Rule#translations as nullable due to special exception', () => {
      const content = `
### \`translations\` {#translations}

**Description:** Available translations for this rule's \`text\` and \`hint\`, as a Hash where keys are locale codes and values are hashes with \`text\` and \`hint\` keys.\\
**Type:** Hash\\
**Version history:**\\
4.4.0 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(
        content,
        'Rule'
      );

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('translations');
      expect(attributes[0].nullable).toBe(true);
      expect(attributes[0].type).toBe('Hash');
    });

    it('should mark source[attribution_domains] as nullable due to it not being released yet', () => {
      const content = `
### \`source[attribution_domains]\` {#source-attribution_domains}

**Description:** Domains of websites allowed to credit the account.\\
**Type:** Array of String\\
**Version history:**\\
4.4.0 (\`mastodon\` API version 3) - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('source[attribution_domains]');
      expect(attributes[0].nullable).toBe(true);
      expect(attributes[0].type).toBe('Array of String');
    });

    it('should mark source[attribution_domains] as nullable in method entities as well', () => {
      const content = `
#### \`source[attribution_domains]\` {#source-attribution_domains}

**Description:** Domains of websites allowed to credit the account.\\
**Type:** Array of String\\
**Version history:**\\
4.4.0 (\`mastodon\` API version 3) - added
`;

      const attributes = AttributeParser.parseMethodEntityAttributes(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('source[attribution_domains]');
      expect(attributes[0].nullable).toBe(true);
      expect(attributes[0].type).toBe('Array of String');
    });
  });

  describe('Empty string patterns', () => {
    it('should mark fields ending with "or empty string" as optional and nullable', () => {
      const content = `
### \`language\` {#language}

**Description:** The default posting language for new statuses.\\
**Type:** String (ISO 639-1 language two-letter code) or empty string\\
**Version history:**\\
2.4.2 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('language');
      expect(attributes[0].optional).toBe(true);
      expect(attributes[0].nullable).toBe(true);
      expect(attributes[0].type).toBe(
        'String (ISO 639-1 language two-letter code) or empty string'
      );
    });

    it('should mark method entity fields ending with "or empty string" as optional and nullable', () => {
      const content = `
#### \`language\` {#language}

**Description:** The default posting language for new statuses.\\
**Type:** String (ISO 639-1 language two-letter code) or empty string\\
**Version history:**\\
2.4.2 - added
`;

      const attributes = AttributeParser.parseMethodEntityAttributes(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('language');
      expect(attributes[0].optional).toBe(true);
      expect(attributes[0].nullable).toBe(true);
      expect(attributes[0].type).toBe(
        'String (ISO 639-1 language two-letter code) or empty string'
      );
    });

    it('should handle mixed patterns with both "or null" and "or empty string"', () => {
      const content = `
### \`mixed_field\` {#mixed_field}

**Description:** A test field with mixed pattern.\\
**Type:** String or null or empty string\\
**Version history:**\\
1.0.0 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('mixed_field');
      expect(attributes[0].optional).toBe(true);
      expect(attributes[0].nullable).toBe(true);
      expect(attributes[0].type).toBe('String or null or empty string');
    });
  });

  describe('Version-based nullable attributes', () => {
    it('should mark attributes added in newer versions as nullable (entity format)', () => {
      const content = `
### \`new_feature\` {#new_feature}

**Description:** A feature added in a newer version.\\
**Type:** String\\
**Version history:**\\
4.4.0 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('new_feature');
      expect(attributes[0].nullable).toBe(true);
      expect(attributes[0].type).toBe('String');
      expect(attributes[0].versions).toEqual(['4.4.0']);
    });

    it('should mark attributes added in newer versions as nullable (method entity format)', () => {
      const content = `
#### \`future_field\` {#future_field}

**Description:** A field that will be added in the future.\\
**Type:** Boolean\\
**Version history:**\\
4.5.0 - added
`;

      const attributes = AttributeParser.parseMethodEntityAttributes(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('future_field');
      expect(attributes[0].nullable).toBe(true);
      expect(attributes[0].type).toBe('Boolean');
      expect(attributes[0].versions).toEqual(['4.5.0']);
    });

    it('should NOT mark attributes added in older or current versions as nullable', () => {
      const content = `
### \`old_feature\` {#old_feature}

**Description:** A feature added in an older version.\\
**Type:** String\\
**Version history:**\\
4.2.0 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('old_feature');
      expect(attributes[0].nullable).toBeUndefined();
      expect(attributes[0].type).toBe('String');
      expect(attributes[0].versions).toEqual(['4.2.0']);
    });

    it('should NOT mark attributes added in current supported version as nullable', () => {
      const content = `
### \`current_feature\` {#current_feature}

**Description:** A feature added in the current supported version.\\
**Type:** String\\
**Version history:**\\
4.3.0 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('current_feature');
      expect(attributes[0].nullable).toBeUndefined();
      expect(attributes[0].type).toBe('String');
      expect(attributes[0].versions).toEqual(['4.3.0']);
    });

    it('should mark attributes as nullable if ANY version is newer than supported', () => {
      const content = `
### \`evolved_feature\` {#evolved_feature}

**Description:** A feature that was updated in a newer version.\\
**Type:** String\\
**Version history:**\\
4.0.0 - added\\
4.4.0 - enhanced with new functionality
`;

      const attributes = AttributeParser.parseAttributesFromSection(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('evolved_feature');
      expect(attributes[0].nullable).toBe(true);
      expect(attributes[0].type).toBe('String');
      expect(attributes[0].versions).toEqual(['4.0.0', '4.4.0']);
    });

    it('should mark Instance registrations[min_age] as nullable due to version 4.4.0', () => {
      const content = `
#### \`registrations[min_age]\` {#registrations-min_age}

**Description:** A minimum age required to register, if configured.\\
**Type:** {{<nullable>}} Integer or null\\
**Version history:**\\
4.4.0 - added
`;

      const attributes = AttributeParser.parseMethodEntityAttributes(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('registrations[min_age]');
      expect(attributes[0].nullable).toBe(true);
      expect(attributes[0].type).toBe('Integer or null');
      expect(attributes[0].versions).toEqual(['4.4.0']);
    });
  });

  describe('Special case exceptions', () => {
    it('should mark Relationship#languages as nullable (entity format)', () => {
      const content = `
### \`languages\` {#languages}

**Description:** Which languages are you following from this user?\\
**Type:** Array of String (ISO 639-1 language two-letter code)\\
**Version history:**\\
4.0.0 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(
        content,
        'Relationship'
      );

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('languages');
      expect(attributes[0].nullable).toBe(true);
      expect(attributes[0].type).toBe(
        'Array of String (ISO 639-1 language two-letter code)'
      );
    });

    it('should mark languages field as nullable in method entities', () => {
      const content = `
#### \`languages\` {#languages}

**Description:** Which languages are you following from this user?\\
**Type:** Array of String (ISO 639-1 language two-letter code)\\
**Version history:**\\
4.0.0 - added
`;

      const attributes = AttributeParser.parseMethodEntityAttributes(content);

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('languages');
      expect(attributes[0].nullable).toBe(true);
      expect(attributes[0].type).toBe(
        'Array of String (ISO 639-1 language two-letter code)'
      );
    });

    it('should NOT mark languages as nullable when not in Relationship entity', () => {
      const content = `
### \`languages\` {#languages}

**Description:** Some other languages field.\\
**Type:** Array of String\\
**Version history:**\\
4.0.0 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(
        content,
        'SomeOtherEntity'
      );

      expect(attributes).toHaveLength(1);
      expect(attributes[0].name).toBe('languages');
      expect(attributes[0].nullable).toBeUndefined();
      expect(attributes[0].type).toBe('Array of String');
    });
  });
});
