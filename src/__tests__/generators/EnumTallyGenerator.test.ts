import { EnumTallyGenerator } from '../../generators/EnumTallyGenerator';

describe('EnumTallyGenerator', () => {
  let generator: EnumTallyGenerator;

  beforeEach(() => {
    generator = new EnumTallyGenerator();
  });

  it('should track enum occurrences correctly', () => {
    // Track the same enum in different places
    generator.trackEnum(
      ['public', 'unlisted', 'private'],
      'Status',
      'visibility'
    );
    generator.trackEnum(
      ['public', 'unlisted', 'private'],
      'Preferences',
      'default_visibility'
    );
    generator.trackEnum(['different', 'values'], 'Other', 'something');

    const duplicates = generator.getDuplicateEnums();

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].enumValues).toEqual(['public', 'unlisted', 'private']);
    expect(duplicates[0].occurrences).toHaveLength(2);
    expect(duplicates[0].occurrences[0].entityName).toBe('Status');
    expect(duplicates[0].occurrences[0].propertyName).toBe('visibility');
    expect(duplicates[0].occurrences[1].entityName).toBe('Preferences');
    expect(duplicates[0].occurrences[1].propertyName).toBe(
      'default_visibility'
    );
  });

  it('should handle method parameter tracking', () => {
    generator.trackEnum(
      ['param1', 'param2'],
      undefined,
      undefined,
      '/api/v1/test',
      'filter'
    );
    generator.trackEnum(
      ['param1', 'param2'],
      undefined,
      undefined,
      '/api/v2/test',
      'filter'
    );

    const duplicates = generator.getDuplicateEnums();

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].enumValues).toEqual(['param1', 'param2']);
    expect(duplicates[0].occurrences).toHaveLength(2);
    expect(duplicates[0].occurrences[0].methodPath).toBe('/api/v1/test');
    expect(duplicates[0].occurrences[0].parameterName).toBe('filter');
    expect(duplicates[0].occurrences[1].methodPath).toBe('/api/v2/test');
    expect(duplicates[0].occurrences[1].parameterName).toBe('filter');
  });

  it('should generate markdown correctly', () => {
    generator.trackEnum(['public', 'private'], 'Status', 'visibility');
    generator.trackEnum(['public', 'private'], 'User', 'privacy');

    const markdown = generator.generateEnumsMarkdown();

    expect(markdown).toContain('# Enum Duplicates');
    expect(markdown).toContain('**Total duplicate enum patterns found:** 1');
    expect(markdown).toContain('## Enum: public, private');
    expect(markdown).toContain('**Values:** `["public","private"]`');
    expect(markdown).toContain('**Occurs in 2 places:**');
    expect(markdown).toContain('Entity: `Status` → Property: `visibility`');
    expect(markdown).toContain('Entity: `User` → Property: `privacy`');
  });

  it('should handle case with no duplicates', () => {
    generator.trackEnum(['unique1'], 'Entity1', 'prop1');
    generator.trackEnum(['unique2'], 'Entity2', 'prop2');

    const duplicates = generator.getDuplicateEnums();
    expect(duplicates).toHaveLength(0);

    const markdown = generator.generateEnumsMarkdown();
    expect(markdown).toContain('No duplicate enums found');
  });

  it('should sort duplicates by occurrence count', () => {
    // Create enum with 3 occurrences
    generator.trackEnum(['a', 'b'], 'Entity1', 'prop1');
    generator.trackEnum(['a', 'b'], 'Entity2', 'prop1');
    generator.trackEnum(['a', 'b'], 'Entity3', 'prop1');

    // Create enum with 2 occurrences
    generator.trackEnum(['c', 'd'], 'Entity4', 'prop2');
    generator.trackEnum(['c', 'd'], 'Entity5', 'prop2');

    const duplicates = generator.getDuplicateEnums();

    expect(duplicates).toHaveLength(2);
    expect(duplicates[0].occurrences).toHaveLength(3); // Should be first (most occurrences)
    expect(duplicates[1].occurrences).toHaveLength(2); // Should be second
  });

  it('should clear tracked enums', () => {
    generator.trackEnum(['test'], 'Entity', 'prop');
    expect(generator.getDuplicateEnums()).toHaveLength(0); // No duplicates yet

    generator.trackEnum(['test'], 'Entity2', 'prop');
    expect(generator.getDuplicateEnums()).toHaveLength(1); // Now has duplicates

    generator.clear();
    expect(generator.getDuplicateEnums()).toHaveLength(0); // Cleared
  });
});
