import { EntityConverter } from '../../generators/EntityConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { EntityClass } from '../../interfaces/EntityClass';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('EntityConverter - attribution_domains nullable fix', () => {
  let entityConverter: EntityConverter;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    const typeParser = new TypeParser(utilityHelpers);
    entityConverter = new EntityConverter(typeParser, utilityHelpers);
  });

  test('source[attribution_domains] should be nullable and not in required array', () => {
    // Simulating CredentialAccount entity with source[attribution_domains] field
    const mockEntity: EntityClass = {
      name: 'CredentialAccount',
      description: 'CredentialAccount entity',
      attributes: [
        {
          name: 'id',
          type: 'String',
          description: 'The account id',
        },
        {
          name: 'username',
          type: 'String',
          description: 'The username',
        },
        {
          name: 'source[attribution_domains]',
          type: 'Array of String',
          description: 'Domains of websites allowed to credit the account.',
          nullable: true, // This should make it not required
        },
        {
          name: 'source[note]',
          type: 'String',
          description: 'Profile bio, in plain-text instead of in HTML.',
        },
        {
          name: 'source[privacy]',
          type: 'String',
          description: 'The default post privacy to be used for new statuses.',
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

    const schema = spec.components?.schemas?.CredentialAccount;
    expect(schema).toBeDefined();

    // Check that source object has the right structure
    expect(schema?.properties?.source).toBeDefined();
    expect(schema?.properties?.source?.properties).toBeDefined();

    // attribution_domains should be present and nullable
    expect(
      schema?.properties?.source?.properties?.['attribution_domains']
    ).toBeDefined();
    expect(
      schema?.properties?.source?.properties?.['attribution_domains']?.nullable
    ).toBeUndefined();
    expect(
      schema?.properties?.source?.properties?.['attribution_domains']?.type
    ).toEqual(['array', 'null']);

    // CRITICAL: attribution_domains should NOT be in the required array of source
    if (schema?.properties?.source?.required) {
      expect(schema.properties.source.required).not.toContain(
        'attribution_domains'
      );
    }

    // Other fields should be in required array
    expect(schema?.properties?.source?.required).toContain('note');
    expect(schema?.properties?.source?.required).toContain('privacy');
  });
});
