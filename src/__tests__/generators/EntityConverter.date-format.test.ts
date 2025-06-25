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

  it('should convert client_secret_expires_at to integer type', () => {
    const entities: EntityClass[] = [
      {
        name: 'CredentialApplication',
        description: 'CredentialApplication entity',
        attributes: [
          {
            name: 'client_id',
            type: 'String',
            description: 'Client ID key, to be used for obtaining OAuth tokens',
            optional: false,
            nullable: false,
            deprecated: false,
            enumValues: [],
            versions: ['1.0.0'],
          },
          {
            name: 'client_secret',
            type: 'String',
            description:
              'Client secret key, to be used for obtaining OAuth tokens',
            optional: false,
            nullable: false,
            deprecated: false,
            enumValues: [],
            versions: ['1.0.0'],
          },
          {
            name: 'client_secret_expires_at',
            type: 'String',
            description:
              'When the client secret key will expire at, presently this always returns 0 indicating that OAuth Clients do not expire',
            optional: false,
            nullable: false,
            deprecated: false,
            enumValues: [],
            versions: ['1.0.0'],
          },
          {
            name: 'created_at',
            type: 'String',
            description: 'When the application was created',
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

    const schema = spec.components?.schemas?.['CredentialApplication'];
    expect(schema).toBeDefined();

    // client_secret_expires_at should be integer (always returns 0)
    const clientSecretExpiresAtProperty =
      schema?.properties?.['client_secret_expires_at'];
    expect(clientSecretExpiresAtProperty?.type).toBe('integer');
    expect(clientSecretExpiresAtProperty?.format).toBeUndefined();

    // created_at should still have date-time format (normal _at field)
    const createdAtProperty = schema?.properties?.['created_at'];
    expect(createdAtProperty?.type).toBe('string');
    expect(createdAtProperty?.format).toBe('date-time');

    // Other fields should not have date-time format
    const clientIdProperty = schema?.properties?.['client_id'];
    expect(clientIdProperty?.type).toBe('string');
    expect(clientIdProperty?.format).toBeUndefined();

    const clientSecretProperty = schema?.properties?.['client_secret'];
    expect(clientSecretProperty?.type).toBe('string');
    expect(clientSecretProperty?.format).toBeUndefined();
  });

  it('should convert expires_in to integer type in ScheduledStatus poll context', () => {
    // Test TypeParser directly first to ensure it handles "Integer" type correctly
    const utilityHelpers = new UtilityHelpers();
    const typeParser = new TypeParser(utilityHelpers);
    
    const integerTypeResult = typeParser.parseType('Integer');
    expect(integerTypeResult.type).toBe('integer');

    // Test the full EntityConverter with nested polling attributes
    const entities: EntityClass[] = [
      {
        name: 'ScheduledStatus',
        description: 'ScheduledStatus entity',
        attributes: [
          {
            name: 'id',
            type: 'String',
            description: 'ID of the scheduled status in the database.',
            optional: false,
            nullable: false,
            deprecated: false,
            enumValues: [],
            versions: ['2.7.0'],
          },
          {
            name: 'params[poll][expires_in]',
            type: 'Integer',
            description:
              'How many seconds the poll should last before closing.',
            optional: false,
            nullable: false,
            deprecated: false,
            enumValues: [],
            versions: ['2.8.0'],
          },
          {
            name: 'params[poll][options]',
            type: 'Array of String',
            description: 'The poll options to be used.',
            optional: false,
            nullable: false,
            deprecated: false,
            enumValues: [],
            versions: ['2.8.0'],
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

    const schema = spec.components?.schemas?.['ScheduledStatus'];
    expect(schema).toBeDefined();

    // Verify nested structure params.poll.expires_in
    const paramsProperty = schema?.properties?.['params'];
    expect(paramsProperty).toBeDefined();
    expect(paramsProperty?.type).toBe('object');
    expect(paramsProperty?.properties).toBeDefined();

    const pollProperty = paramsProperty?.properties?.['poll'];
    expect(pollProperty).toBeDefined();
    expect(pollProperty?.type).toBe('object');
    expect(pollProperty?.properties).toBeDefined();

    // expires_in should be integer type in poll context
    const expiresInProperty = pollProperty?.properties?.['expires_in'];
    expect(expiresInProperty).toBeDefined();
    expect(expiresInProperty?.type).toBe('integer');
    expect(expiresInProperty?.description).toBe(
      'How many seconds the poll should last before closing.'
    );

    // options should be array of strings
    const optionsProperty = pollProperty?.properties?.['options'];
    expect(optionsProperty).toBeDefined();
    expect(optionsProperty?.type).toBe('array');
    expect(optionsProperty?.items?.type).toBe('string');
  });
});
