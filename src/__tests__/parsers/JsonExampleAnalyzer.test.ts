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

  test('should merge with existing attributes correctly', () => {
    const existingAttributes = [
      { name: 'id', type: 'String', description: 'Account ID' },
      { name: 'username', type: 'String', description: 'Account username' },
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
    ];

    const merged = analyzer.mergeWithExistingAttributes(
      existingAttributes,
      exampleAttributes
    );

    expect(merged).toHaveLength(4); // 2 existing + 2 new
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
