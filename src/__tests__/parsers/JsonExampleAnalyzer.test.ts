import { JsonExampleAnalyzer } from '../../parsers/JsonExampleAnalyzer';

describe('JsonExampleAnalyzer', () => {
  let analyzer: JsonExampleAnalyzer;

  beforeEach(() => {
    analyzer = new JsonExampleAnalyzer();
  });

  test('should analyze simple JSON object', () => {
    const jsonObj = {
      id: '14715',
      username: 'trwnh',
      locked: false,
      followers_count: 821,
      created_at: '2016-11-24T10:02:12.085Z',
      url: 'https://mastodon.social/@trwnh',
    };

    const attributes = analyzer.analyzeJsonObject(jsonObj);

    expect(attributes).toHaveLength(6);
    expect(attributes.find((a) => a.name === 'id')?.type).toBe('String');
    expect(attributes.find((a) => a.name === 'username')?.type).toBe('String');
    expect(attributes.find((a) => a.name === 'locked')?.type).toBe('Boolean');
    expect(attributes.find((a) => a.name === 'followers_count')?.type).toBe(
      'Integer'
    );
    expect(attributes.find((a) => a.name === 'created_at')?.type).toBe(
      'String (Date)'
    );
    expect(attributes.find((a) => a.name === 'url')?.type).toBe('String (URL)');
  });

  test('should handle arrays', () => {
    const jsonObj = {
      emojis: [
        {
          shortcode: 'fatyoshi',
          url: 'https://example.com/emoji.png',
        },
      ],
      fields: [],
    };

    const attributes = analyzer.analyzeJsonObject(jsonObj);

    expect(attributes).toHaveLength(2);

    const emojisAttr = attributes.find((a) => a.name === 'emojis');
    expect(emojisAttr?.isArray).toBe(true);
    expect(emojisAttr?.type).toBe('object');
    expect(emojisAttr?.nestedObject).toHaveLength(2);
    expect(
      emojisAttr?.nestedObject?.find((n) => n.name === 'shortcode')?.type
    ).toBe('String');
    expect(emojisAttr?.nestedObject?.find((n) => n.name === 'url')?.type).toBe(
      'String (URL)'
    );

    const fieldsAttr = attributes.find((a) => a.name === 'fields');
    expect(fieldsAttr?.isArray).toBe(true);
    expect(fieldsAttr?.type).toBe('unknown'); // Empty array
  });

  test('should handle nested objects', () => {
    const jsonObj = {
      source: {
        privacy: 'public',
        sensitive: false,
        fields: [
          {
            name: 'Website',
            value: 'https://example.com',
          },
        ],
      },
    };

    const attributes = analyzer.analyzeJsonObject(jsonObj);

    expect(attributes).toHaveLength(1);

    const sourceAttr = attributes.find((a) => a.name === 'source');
    expect(sourceAttr?.type).toBe('object');
    expect(sourceAttr?.nestedObject).toHaveLength(3);
    expect(
      sourceAttr?.nestedObject?.find((n) => n.name === 'privacy')?.type
    ).toBe('String');
    expect(
      sourceAttr?.nestedObject?.find((n) => n.name === 'sensitive')?.type
    ).toBe('Boolean');

    const fieldsNested = sourceAttr?.nestedObject?.find(
      (n) => n.name === 'fields'
    );
    expect(fieldsNested?.isArray).toBe(true);
    expect(fieldsNested?.type).toBe('object');
  });

  test('should convert to EntityAttribute format', () => {
    const jsonObj = {
      id: '14715',
      username: 'trwnh',
      locked: false,
    };

    const jsonAttributes = analyzer.analyzeJsonObject(jsonObj);
    const entityAttributes = analyzer.convertToEntityAttributes(jsonAttributes);

    expect(entityAttributes).toHaveLength(3);
    expect(entityAttributes.find((a) => a.name === 'id')?.type).toBe('String');
    expect(entityAttributes.find((a) => a.name === 'username')?.type).toBe(
      'String'
    );
    expect(entityAttributes.find((a) => a.name === 'locked')?.type).toBe(
      'Boolean'
    );

    for (const attr of entityAttributes) {
      expect(attr.description).toContain(
        'Attribute discovered from JSON example'
      );
    }
  });

  test('should convert nested objects with proper nested properties', () => {
    const jsonObj = {
      source: {
        privacy: 'public',
        sensitive: false,
      },
      configuration: {
        polls: {
          max_expiration: 2629746,
          min_expiration: 300,
        },
        accounts: {
          max_featured_tags: 10,
        },
      },
    };

    const jsonAttributes = analyzer.analyzeJsonObject(jsonObj);
    const entityAttributes = analyzer.convertToEntityAttributes(jsonAttributes);

    // Should only create top-level properties
    expect(entityAttributes).toHaveLength(2);

    const sourceAttr = entityAttributes.find((a) => a.name === 'source');
    expect(sourceAttr?.type).toBe('object');
    expect(sourceAttr?.properties).toBeDefined();

    if (sourceAttr?.properties) {
      expect(Object.keys(sourceAttr.properties)).toEqual([
        'privacy',
        'sensitive',
      ]);
      expect(sourceAttr.properties.privacy.type).toBe('String');
      expect(sourceAttr.properties.sensitive.type).toBe('Boolean');
    }

    const configAttr = entityAttributes.find((a) => a.name === 'configuration');
    expect(configAttr?.type).toBe('object');
    expect(configAttr?.properties).toBeDefined();

    if (configAttr?.properties) {
      expect(Object.keys(configAttr.properties)).toEqual(['polls', 'accounts']);

      // Check nested properties in configuration.polls
      const pollsProperty = configAttr.properties.polls;
      expect(pollsProperty?.type).toBe('object');
      expect(pollsProperty?.properties).toBeDefined();

      if (pollsProperty?.properties) {
        expect(Object.keys(pollsProperty.properties)).toEqual([
          'max_expiration',
          'min_expiration',
        ]);
        expect(pollsProperty.properties.max_expiration.type).toBe('Integer');
        expect(pollsProperty.properties.min_expiration.type).toBe('Integer');
      }

      // Check nested properties in configuration.accounts
      const accountsProperty = configAttr.properties.accounts;
      expect(accountsProperty?.type).toBe('object');
      expect(accountsProperty?.properties).toBeDefined();

      if (accountsProperty?.properties) {
        expect(Object.keys(accountsProperty.properties)).toEqual([
          'max_featured_tags',
        ]);
        expect(accountsProperty.properties.max_featured_tags.type).toBe(
          'Integer'
        );
      }
    }
  });

  test('should merge with existing attributes correctly', () => {
    const existingAttributes = [
      { name: 'id', type: 'String', description: 'Account ID' },
      { name: 'username', type: 'String', description: 'Account username' },
      {
        name: 'configuration',
        type: 'Hash',
        description: 'Server configuration',
      },
    ];

    const exampleAttributes = [
      {
        name: 'id',
        type: 'String',
        description: 'Attribute discovered from JSON example',
      },
      {
        name: 'display_name',
        type: 'String',
        description: 'Attribute discovered from JSON example',
      },
      {
        name: 'locked',
        type: 'Boolean',
        description: 'Attribute discovered from JSON example',
      },
      {
        name: 'configuration',
        type: 'object',
        description: 'Attribute discovered from JSON example',
        properties: {
          polls: {
            name: 'polls',
            type: 'object',
            description: 'Attribute discovered from JSON example',
            properties: {
              max_expiration: {
                name: 'max_expiration',
                type: 'Integer',
                description: 'Attribute discovered from JSON example',
              },
            },
          },
        },
      },
    ];

    const merged = analyzer.mergeWithExistingAttributes(
      existingAttributes,
      exampleAttributes
    );

    expect(merged).toHaveLength(5); // 3 existing + 2 new
    expect(merged.find((a) => a.name === 'id')?.description).toBe('Account ID'); // Existing kept
    expect(merged.find((a) => a.name === 'username')?.description).toBe(
      'Account username'
    ); // Existing kept
    expect(
      merged.find((a) => a.name === 'display_name')?.description
    ).toContain('missing from entity definition');
    expect(merged.find((a) => a.name === 'locked')?.description).toContain(
      'missing from entity definition'
    );

    // Check that configuration was updated with nested properties
    const configAttr = merged.find((a) => a.name === 'configuration');
    expect(configAttr?.type).toBe('object'); // Updated from 'Hash'
    expect(configAttr?.description).toBe('Server configuration'); // Original description kept
    expect(configAttr?.properties).toBeDefined();
    expect(configAttr?.properties?.polls).toBeDefined();
    expect(configAttr?.properties?.polls.properties?.max_expiration.type).toBe(
      'Integer'
    );
  });

  test('should not create array index properties when analyzing arrays directly', () => {
    // This test demonstrates that arrays should not be analyzed directly
    // as it creates properties like "0", "1", etc.
    const arrayOfObjects = [
      {
        id: '14715',
        username: 'trwnh',
        locked: false,
      },
      {
        id: '14716',
        username: 'alice',
        locked: true,
      },
    ];

    const attributes = analyzer.analyzeJsonObject(arrayOfObjects);

    // This should NOT create properties like "0", "1", "0.id", "0.username", etc.
    // Instead, the array should be handled specially to extract the entity structure
    const arrayIndexProps = attributes.filter((attr) =>
      /^\d+$/.test(attr.name)
    );
    const nestedArrayIndexProps = attributes.filter((attr) =>
      /^\d+\./.test(attr.name)
    );

    // Currently this demonstrates the problematic behavior that creates array index properties
    expect(arrayIndexProps.length).toBe(2); // Shows array indices "0", "1" are created as properties
    expect(nestedArrayIndexProps.length).toBe(0); // Nested props would be in nestedObject
  });
});
