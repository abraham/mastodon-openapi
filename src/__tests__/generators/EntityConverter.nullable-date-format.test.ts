import { EntityConverter } from '../../generators/EntityConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { EntityClass } from '../../interfaces/EntityClass';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('EntityConverter - Nullable Date Format Handling', () => {
  let entityConverter: EntityConverter;
  let typeParser: TypeParser;
  let utilityHelpers: UtilityHelpers;

  beforeEach(() => {
    utilityHelpers = new UtilityHelpers();
    typeParser = new TypeParser(utilityHelpers);
    entityConverter = new EntityConverter(typeParser, utilityHelpers);
  });

  it('should preserve date format for nullable date fields', () => {
    const entities: EntityClass[] = [
      {
        name: 'TestEntity',
        description: 'Test entity with nullable date fields',
        attributes: [
          {
            name: 'last_status_at',
            type: 'String ([Date](/api/datetime-format#date))',
            description: 'When the most recent status was posted.',
            optional: false,
            nullable: true,
            deprecated: false,
            enumValues: [],
            versions: ['1.0.0'],
          },
          {
            name: 'regular_nullable_string',
            type: 'String',
            description: 'A regular nullable string',
            optional: false,
            nullable: true,
            deprecated: false,
            enumValues: [],
            versions: ['1.0.0'],
          },
        ],
      },
    ];

    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    };

    entityConverter.convertEntities(entities, spec);

    const schema = spec.components?.schemas?.['TestEntity'];
    expect(schema).toBeDefined();
    expect(schema?.properties).toBeDefined();

    // Nullable date field should have date format preserved
    const lastStatusAtProperty = schema?.properties?.['last_status_at'];
    expect(lastStatusAtProperty?.type).toEqual(['string', 'null']);
    expect(lastStatusAtProperty?.format).toBe('date');

    // Regular nullable string should NOT have format
    const regularNullableProperty =
      schema?.properties?.['regular_nullable_string'];
    expect(regularNullableProperty?.type).toEqual(['string', 'null']);
    expect(regularNullableProperty?.format).toBeUndefined();
  });

  it('should preserve datetime format for nullable datetime fields', () => {
    const entities: EntityClass[] = [
      {
        name: 'TestEntity',
        description: 'Test entity with nullable datetime fields',
        attributes: [
          {
            name: 'created_at',
            type: 'String ([Datetime](/api/datetime-format#datetime))',
            description: 'When the entity was created.',
            optional: false,
            nullable: true,
            deprecated: false,
            enumValues: [],
            versions: ['1.0.0'],
          },
        ],
      },
    ];

    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    };

    entityConverter.convertEntities(entities, spec);

    const schema = spec.components?.schemas?.['TestEntity'];
    expect(schema).toBeDefined();

    // Nullable datetime field should have date-time format preserved
    const createdAtProperty = schema?.properties?.['created_at'];
    expect(createdAtProperty?.type).toEqual(['string', 'null']);
    expect(createdAtProperty?.format).toBe('date-time');
  });

  it('should preserve email format for nullable email fields', () => {
    const entities: EntityClass[] = [
      {
        name: 'TestEntity',
        description: 'Test entity with nullable email fields',
        attributes: [
          {
            name: 'email',
            type: 'String',
            description: 'The email address of the user.',
            optional: false,
            nullable: true,
            deprecated: false,
            enumValues: [],
            versions: ['1.0.0'],
          },
        ],
      },
    ];

    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    };

    entityConverter.convertEntities(entities, spec);

    const schema = spec.components?.schemas?.['TestEntity'];
    expect(schema).toBeDefined();

    // Nullable email field should have email format preserved
    const emailProperty = schema?.properties?.['email'];
    expect(emailProperty?.type).toEqual(['string', 'null']);
    expect(emailProperty?.format).toBe('email');
  });
});
