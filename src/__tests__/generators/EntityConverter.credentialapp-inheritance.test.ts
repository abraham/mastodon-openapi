import { EntityConverter } from '../../generators/EntityConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { EntityClass } from '../../interfaces/EntityClass';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('CredentialApplication Entity Inheritance', () => {
  test('should inherit all Application attributes plus its own', () => {
    const utilityHelpers = new UtilityHelpers();
    const typeParser = new TypeParser(utilityHelpers);
    const entityConverter = new EntityConverter(typeParser, utilityHelpers);

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

    // Mock CredentialApplication entity
    const credentialApplicationEntity: EntityClass = {
      name: 'CredentialApplication',
      description: 'CredentialApplication entity',
      attributes: [
        { name: 'client_id', type: 'String', description: 'Client ID' },
        { name: 'client_secret', type: 'String', description: 'Client secret' },
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

    // Verify CredentialApplication has all Application properties plus its own
    const credentialAppSchema = spec.components?.schemas?.CredentialApplication;
    expect(credentialAppSchema).toBeDefined();
    expect(credentialAppSchema?.properties).toBeDefined();

    const properties = Object.keys(credentialAppSchema!.properties!);

    // Should have Application properties
    expect(properties).toContain('name');
    expect(properties).toContain('website');
    expect(properties).toContain('scopes');

    // Should have CredentialApplication properties
    expect(properties).toContain('client_id');
    expect(properties).toContain('client_secret');

    // Should have 5 total properties (3 from Application + 2 from CredentialApplication)
    expect(properties).toHaveLength(5);
  });
});
