import { EntityConverter } from '../../generators/EntityConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { EntityClass } from '../../interfaces/EntityClass';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('EntityConverter - Date Format Handling', () => {
  let entityConverter: EntityConverter;
  let typeParser: TypeParser;
  let utilityHelpers: UtilityHelpers;

  beforeEach(() => {
    utilityHelpers = new UtilityHelpers();
    typeParser = new TypeParser(utilityHelpers);
    entityConverter = new EntityConverter(typeParser, utilityHelpers);
  });

  it('should handle entity attributes with Date and DateTime formats', () => {
    const entities: EntityClass[] = [
      {
        name: 'TestEntity',
        description: 'Test entity with date fields',
        attributes: [
          {
            name: 'created_at',
            type: 'String ([Datetime](/api/datetime-format#datetime))',
            description: 'The timestamp of creation',
            optional: false,
            nullable: false,
            deprecated: false,
            enumValues: [],
            versions: ['1.0.0'],
          },
          {
            name: 'last_status_at',
            type: 'String ([Date](/api/datetime-format#date))',
            description: 'The date of the last status',
            optional: false,
            nullable: false,
            deprecated: false,
            enumValues: [],
            versions: ['1.0.0'],
          },
          {
            name: 'regular_string',
            type: 'String',
            description: 'Just a regular string',
            optional: false,
            nullable: false,
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

    // DateTime attribute should have date-time format
    const createdAtProperty = schema?.properties?.['created_at'];
    expect(createdAtProperty?.type).toBe('string');
    expect(createdAtProperty?.format).toBe('date-time');

    // Date attribute should have date format
    const lastStatusAtProperty = schema?.properties?.['last_status_at'];
    expect(lastStatusAtProperty?.type).toBe('string');
    expect(lastStatusAtProperty?.format).toBe('date');

    // Regular string should remain as string without format
    const regularStringProperty = schema?.properties?.['regular_string'];
    expect(regularStringProperty?.type).toBe('string');
    expect(regularStringProperty?.format).toBeUndefined();
  });

  it('should handle various date format patterns in entity attributes', () => {
    const entities: EntityClass[] = [
      {
        name: 'DateTestEntity',
        description: 'Entity with various date patterns',
        attributes: [
          {
            name: 'iso8601_field',
            type: 'String (ISO8601 format)',
            description: 'Field with ISO8601 format',
            optional: false,
            nullable: false,
            deprecated: false,
            enumValues: [],
            versions: ['1.0.0'],
          },
          {
            name: 'datetime_field',
            type: 'String (datetime)',
            description: 'Field with datetime type',
            optional: false,
            nullable: false,
            deprecated: false,
            enumValues: [],
            versions: ['1.0.0'],
          },
          {
            name: 'updated_field',
            type: 'String. The previously obtained token, to be invalidated.',
            description:
              'Field with "invalidated" containing "date" - should NOT be treated as date',
            optional: false,
            nullable: false,
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

    const schema = spec.components?.schemas?.['DateTestEntity'];
    expect(schema).toBeDefined();

    // ISO8601 field should have date-time format
    const iso8601Property = schema?.properties?.['iso8601_field'];
    expect(iso8601Property?.type).toBe('string');
    expect(iso8601Property?.format).toBe('date-time');

    // DateTime field should have date-time format
    const datetimeProperty = schema?.properties?.['datetime_field'];
    expect(datetimeProperty?.type).toBe('string');
    expect(datetimeProperty?.format).toBe('date-time');

    // Updated field should NOT have date format (contains "invalidated")
    const updatedProperty = schema?.properties?.['updated_field'];
    expect(updatedProperty?.type).toBe('string');
    expect(updatedProperty?.format).toBeUndefined();
  });
});
