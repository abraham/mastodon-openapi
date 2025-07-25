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
    expect(schema?.properties?.nullable_field?.type).toEqual([
      'string',
      'null',
    ]);

    // Check nullable entity - should be nullable
    expect(schema?.properties?.nullable_entity).toBeDefined();
    expect(schema?.properties?.nullable_entity?.oneOf).toEqual([
      { $ref: '#/components/schemas/Poll' },
      { type: 'null' },
    ]);

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
    expect(nullableProperty.type).toEqual(['string', 'null']);
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
    expect(schema?.properties?.optional_field?.type).toEqual([
      'object',
      'null',
    ]);
    expect(schema?.required).toContain('required_field');
    expect(schema?.required).not.toContain('optional_field');
  });

  test('should handle optional parent with required children correctly', () => {
    const mockEntity: EntityClass = {
      name: 'TestOptionalParent',
      description: 'Test entity with optional parent and required children',
      attributes: [
        {
          name: 'application',
          type: 'Hash',
          description: 'Optional application object',
          optional: true,
          nullable: true,
        },
        {
          name: 'application[name]',
          type: 'String',
          description: 'Required name within application',
        },
        {
          name: 'application[website]',
          type: 'String',
          description: 'Optional website within application',
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

    const schema = spec.components?.schemas?.TestOptionalParent;
    expect(schema).toBeDefined();

    // The application object should be nullable due to being optional
    expect(schema?.properties?.application).toBeDefined();
    expect(schema?.properties?.application?.type).toEqual(['object', 'null']);

    // The application object should have proper nested structure
    expect(schema?.properties?.application?.properties?.name).toBeDefined();
    expect(schema?.properties?.application?.properties?.website).toBeDefined();
    expect(schema?.properties?.application?.properties?.website?.type).toEqual([
      'string',
      'null',
    ]);

    // The application's required array should only contain 'name'
    expect(schema?.properties?.application?.required).toEqual(['name']);

    // This is the key question: should 'application' be in the parent's required array?
    // Based on the issue description, optional should mean not required
    if (schema?.required) {
      expect(schema.required).not.toContain('application');
    } else {
      // If there's no required array, that's also fine - it means nothing is required
      expect(schema?.required).toBeUndefined();
    }
  });
});
