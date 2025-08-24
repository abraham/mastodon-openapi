import { EntityConverter } from '../../generators/EntityConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { EntityClass } from '../../interfaces/EntityClass';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('EntityConverter - CredentialApplication Moved Properties Fix', () => {
  let entityConverter: EntityConverter;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    const typeParser = new TypeParser(utilityHelpers);
    entityConverter = new EntityConverter(typeParser, utilityHelpers);
  });

  test('should not mark moved properties as nullable in CredentialApplication', () => {
    // Mock Application entity
    const applicationEntity: EntityClass = {
      name: 'Application',
      description: 'Application entity',
      attributes: [
        { name: 'name', type: 'String', description: 'Application name' },
        { name: 'website', type: 'String', description: 'Application website' },
        {
          name: 'scopes',
          type: 'Array of Strings',
          description: 'Application scopes',
        },
      ],
    };

    // Mock CredentialApplication entity with moved properties
    const credentialApplicationEntity: EntityClass = {
      name: 'CredentialApplication',
      description: 'CredentialApplication entity',
      attributes: [
        {
          name: 'client_id',
          type: 'String',
          description: 'Client ID key, to be used for obtaining OAuth tokens.',
          // This simulates the real version history from the docs
          versions: ['0.9.9', '4.3.0'],
          nullable: false, // Should remain false after processing
        },
        {
          name: 'client_secret',
          type: 'String',
          description:
            'Client secret key, to be used for obtaining OAuth tokens.',
          // This simulates the real version history from the docs
          versions: ['0.9.9', '4.3.0'],
          nullable: false, // Should remain false after processing
        },
      ],
    };

    const entities = [applicationEntity, credentialApplicationEntity];

    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: { schemas: {} },
    };

    entityConverter.convertEntities(entities, spec);

    // Verify CredentialApplication schema
    const credentialAppSchema = spec.components?.schemas?.CredentialApplication;
    expect(credentialAppSchema).toBeDefined();
    expect(credentialAppSchema?.properties).toBeDefined();

    // Check that client_id and client_secret are NOT nullable
    const clientIdProperty = credentialAppSchema!.properties!.client_id;
    const clientSecretProperty = credentialAppSchema!.properties!.client_secret;

    expect(clientIdProperty).toBeDefined();
    expect(clientSecretProperty).toBeDefined();

    // These should be regular string types, not ["string", "null"]
    expect(clientIdProperty.type).toBe('string');
    expect(clientSecretProperty.type).toBe('string');

    // They should not have nullable property or oneOf with null
    expect(clientIdProperty.nullable).toBeUndefined();
    expect(clientSecretProperty.nullable).toBeUndefined();
    expect(clientIdProperty.oneOf).toBeUndefined();
    expect(clientSecretProperty.oneOf).toBeUndefined();

    // They should be in the required array since they're not optional and not nullable
    expect(credentialAppSchema?.required).toContain('client_id');
    expect(credentialAppSchema?.required).toContain('client_secret');
  });
});
