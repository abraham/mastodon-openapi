import { EntityConverter } from '../../generators/EntityConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { EntityClass } from '../../interfaces/EntityClass';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('EntityConverter - Nullable Properties', () => {
  let entityConverter: EntityConverter;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    const typeParser = new TypeParser(utilityHelpers);
    entityConverter = new EntityConverter(typeParser, utilityHelpers);
  });

  test('should mark nullable fields with nullable: true in OpenAPI schema', () => {
    const mockEntity: EntityClass = {
      name: 'TestEntity',
      description: 'Test entity with nullable properties',
      attributes: [
        {
          name: 'required_field',
          type: 'String',
          description: 'A required field',
        },
        {
          name: 'optional_field',
          type: 'String',
          description: 'An optional field (not nullable)',
          optional: true,
        },
        {
          name: 'nullable_field',
          type: 'String or null',
          description: 'A nullable field',
          optional: true,
          nullable: true,
        },
        {
          name: 'nullable_entity',
          type: '[Poll]() or null',
          description: 'A nullable entity reference',
          optional: true,
          nullable: true,
        },
      ],
    };

    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: { schemas: {} },
    };

    entityConverter.convertEntities([mockEntity], spec);

    const schema = spec.components?.schemas?.TestEntity;
    expect(schema).toBeDefined();

    // Check required field - should not be nullable
    expect(schema?.properties?.required_field).toBeDefined();
    expect(schema?.properties?.required_field?.nullable).toBeUndefined();

    // Check optional field - should not be nullable
    expect(schema?.properties?.optional_field).toBeDefined();
    expect(schema?.properties?.optional_field?.nullable).toBeUndefined();

    // Check nullable field - should be nullable
    expect(schema?.properties?.nullable_field).toBeDefined();
    expect(schema?.properties?.nullable_field?.nullable).toBe(true);

    // Check nullable entity - should be nullable
    expect(schema?.properties?.nullable_entity).toBeDefined();
    expect(schema?.properties?.nullable_entity?.nullable).toBe(true);

    // Check required array - should contain only required_field
    expect(schema?.required).toContain('required_field');
    expect(schema?.required).not.toContain('optional_field');
    expect(schema?.required).not.toContain('nullable_field');
    expect(schema?.required).not.toContain('nullable_entity');
  });

  test('should handle nullable fields correctly with convertAttribute method', () => {
    const mockAttributes = [
      {
        name: 'regular_field',
        type: 'String',
        description: 'A regular field',
      },
      {
        name: 'nullable_field',
        type: 'String or null',
        description: 'A nullable field',
        optional: true,
        nullable: true,
      },
    ];

    // Test convertAttribute directly
    const regularProperty = entityConverter.convertAttribute(mockAttributes[0]);
    expect(regularProperty.nullable).toBeUndefined();
    expect(regularProperty.type).toBe('string');

    const nullableProperty = entityConverter.convertAttribute(
      mockAttributes[1]
    );
    expect(nullableProperty.nullable).toBe(true);
    expect(nullableProperty.type).toBe('string');
  });

  test('should mark optional fields as nullable in the schema and exclude from required', () => {
    const mockEntity: EntityClass = {
      name: 'TestOptionalNullable',
      description: 'Test entity with optional field',
      attributes: [
        {
          name: 'required_field',
          type: 'String',
          description: 'A required field',
        },
        {
          name: 'optional_field',
          type: 'Hash',
          description: 'An optional field marked as nullable',
          optional: true,
          nullable: true,
        },
      ],
    };

    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: { schemas: {} },
    };

    entityConverter.convertEntities([mockEntity], spec);

    const schema = spec.components?.schemas?.TestOptionalNullable;
    expect(schema).toBeDefined();

    // Check optional field is nullable and not in required array
    expect(schema?.properties?.optional_field).toBeDefined();
    expect(schema?.properties?.optional_field?.nullable).toBe(true);
    expect(schema?.required).toContain('required_field');
    expect(schema?.required).not.toContain('optional_field');
  });
});
