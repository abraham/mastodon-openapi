import { EntityParsingUtils } from '../../parsers/EntityParsingUtils';
import { EntityAttribute } from '../../interfaces/EntityAttribute';

describe('EntityParsingUtils - removeNullableIfSameVersion', () => {
  it('should remove nullable flag when all attributes were added in the same version', () => {
    const attributes: EntityAttribute[] = [
      {
        name: 'id',
        type: 'String',
        description: 'The ID',
        versions: ['4.4.0'],
        nullable: true,
      },
      {
        name: 'status',
        type: 'String',
        description: 'The status',
        versions: ['4.4.0'],
        nullable: true,
      },
      {
        name: 'result_count',
        type: 'Integer',
        description: 'The count',
        versions: ['4.4.0'],
        nullable: true,
      },
    ];

    const result = EntityParsingUtils.removeNullableIfSameVersion(attributes);

    expect(result).toHaveLength(3);
    expect(result[0].nullable).toBeUndefined();
    expect(result[1].nullable).toBeUndefined();
    expect(result[2].nullable).toBeUndefined();
  });

  it('should NOT remove nullable flag when attributes were added in different versions', () => {
    const attributes: EntityAttribute[] = [
      {
        name: 'id',
        type: 'String',
        description: 'The ID',
        versions: ['4.2.0'],
        nullable: true,
      },
      {
        name: 'status',
        type: 'String',
        description: 'The status',
        versions: ['4.3.0'],
        nullable: true,
      },
      {
        name: 'result_count',
        type: 'Integer',
        description: 'The count',
        versions: ['4.4.0'],
        nullable: true,
      },
    ];

    const result = EntityParsingUtils.removeNullableIfSameVersion(attributes);

    expect(result).toHaveLength(3);
    expect(result[0].nullable).toBe(true);
    expect(result[1].nullable).toBe(true);
    expect(result[2].nullable).toBe(true);
  });

  it('should preserve explicitly optional attributes without version information', () => {
    const attributes: EntityAttribute[] = [
      {
        name: 'id',
        type: 'String',
        description: 'The ID',
        versions: ['4.4.0'],
        nullable: true,
      },
      {
        name: 'optional_field',
        type: 'String',
        description: 'An optional field without version info',
        optional: true,
        nullable: true,
      },
    ];

    const result = EntityParsingUtils.removeNullableIfSameVersion(attributes);

    // The field without version info should remain unchanged
    expect(result[1].optional).toBe(true);
    expect(result[1].nullable).toBe(true);

    // The version-based nullable field should have nullable removed
    expect(result[0].nullable).toBeUndefined();
  });

  it('should handle attributes with multiple versions correctly', () => {
    const attributes: EntityAttribute[] = [
      {
        name: 'id',
        type: 'String',
        description: 'The ID',
        versions: ['4.4.0'],
        nullable: true,
      },
      {
        name: 'status',
        type: 'String',
        description: 'The status',
        versions: ['4.4.0', '4.5.0'], // Enhanced in 4.5.0 but added in 4.4.0
        nullable: true,
      },
    ];

    const result = EntityParsingUtils.removeNullableIfSameVersion(attributes);

    // Both should have nullable removed since they were both added in 4.4.0
    expect(result[0].nullable).toBeUndefined();
    expect(result[1].nullable).toBeUndefined();
  });

  it('should return empty array unchanged', () => {
    const attributes: EntityAttribute[] = [];

    const result = EntityParsingUtils.removeNullableIfSameVersion(attributes);

    expect(result).toEqual([]);
  });

  it('should handle attributes without version information', () => {
    const attributes: EntityAttribute[] = [
      {
        name: 'id',
        type: 'String',
        description: 'The ID',
      },
      {
        name: 'status',
        type: 'String',
        description: 'The status',
      },
    ];

    const result = EntityParsingUtils.removeNullableIfSameVersion(attributes);

    expect(result).toEqual(attributes);
  });

  it('should handle mix of attributes with and without versions', () => {
    const attributes: EntityAttribute[] = [
      {
        name: 'id',
        type: 'String',
        description: 'The ID',
        versions: ['4.4.0'],
        nullable: true,
      },
      {
        name: 'legacy_field',
        type: 'String',
        description: 'A legacy field without version info',
      },
    ];

    const result = EntityParsingUtils.removeNullableIfSameVersion(attributes);

    // Should remove nullable from the versioned attribute
    expect(result[0].nullable).toBeUndefined();
    // Legacy field should remain unchanged
    expect(result[1]).toEqual(attributes[1]);
  });

  it('should preserve other attribute properties when removing nullable', () => {
    const attributes: EntityAttribute[] = [
      {
        name: 'id',
        type: 'String',
        description: 'The ID',
        versions: ['4.4.0'],
        nullable: true,
      },
      {
        name: 'deprecated_field',
        type: 'String',
        description: 'A deprecated field',
        versions: ['4.4.0'],
        nullable: true,
        deprecated: true,
      },
    ];

    const result = EntityParsingUtils.removeNullableIfSameVersion(attributes);

    expect(result[0].nullable).toBeUndefined();
    expect(result[0].name).toBe('id');
    expect(result[0].type).toBe('String');
    expect(result[0].description).toBe('The ID');
    expect(result[0].versions).toEqual(['4.4.0']);

    expect(result[1].nullable).toBeUndefined();
    expect(result[1].deprecated).toBe(true);
  });

  it('should handle AsyncRefresh example correctly', () => {
    // This is the real-world example from the issue
    const attributes: EntityAttribute[] = [
      {
        name: 'id',
        type: 'String',
        description: 'The ID of the async refresh',
        versions: ['4.4.0'],
        nullable: true,
      },
      {
        name: 'status',
        type: 'String (Enumerable oneOf)',
        description: 'Status of the async refresh.',
        versions: ['4.4.0'],
        nullable: true,
        enumValues: ['running', 'finished'],
      },
      {
        name: 'result_count',
        type: 'integer',
        description:
          'Optional number of results already created/fetched as part of this async refresh.',
        versions: ['4.4.0'],
        nullable: true,
        optional: true, // This was explicitly marked as nullable in docs
      },
    ];

    const result = EntityParsingUtils.removeNullableIfSameVersion(attributes);

    // All three should have nullable removed since they were all added in 4.4.0
    expect(result[0].nullable).toBeUndefined();
    expect(result[1].nullable).toBeUndefined();
    expect(result[2].nullable).toBeUndefined();
    // But optional should be preserved for explicitly optional fields
    expect(result[2].optional).toBe(true);
  });

  it('should preserve nullable for explicitly nullable attributes even when all added in same version', () => {
    // Test the Conversation entity case where last_status is explicitly nullable
    const attributes: EntityAttribute[] = [
      {
        name: 'id',
        type: 'String',
        description: 'The ID',
        versions: ['2.6.0'],
        nullable: true,
      },
      {
        name: 'unread',
        type: 'Boolean',
        description: 'Is unread',
        versions: ['2.6.0'],
        nullable: true,
      },
      {
        name: 'last_status',
        type: '[Status]',
        description: 'The last status',
        versions: ['2.6.0'],
        nullable: true,
        optional: true,
        explicitlyNullable: true, // Explicitly marked with {{<nullable>}} in docs
      },
    ];

    const result = EntityParsingUtils.removeNullableIfSameVersion(attributes);

    // id and unread should have nullable removed
    expect(result[0].nullable).toBeUndefined();
    expect(result[1].nullable).toBeUndefined();

    // last_status should remain nullable because it's explicitly nullable
    expect(result[2].nullable).toBe(true);
    expect(result[2].optional).toBe(true);
    expect(result[2].explicitlyNullable).toBe(true);
  });
});
