import { EntityParser } from '../../parsers/EntityParser';
import { MethodParser } from '../../parsers/MethodParser';
import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';

describe('CredentialApplication Properties Integration', () => {
  test('should generate correct nullable properties for CredentialApplication in the full pipeline', () => {
    // This is an integration test that runs the full pipeline to ensure
    // the fix for moved properties works correctly with real data

    // Parse entities and methods (like in the main generate.ts file)
    const entityParser = new EntityParser();
    const methodParser = new MethodParser();

    const entities = entityParser.parseAllEntities();
    const methodFiles = methodParser.parseAllMethods();

    const generator = new OpenAPIGenerator();
    const spec = generator.generateSchema(entities, methodFiles);

    // Get the CredentialApplication schema
    const credentialAppSchema = spec.components?.schemas?.CredentialApplication;
    expect(credentialAppSchema).toBeDefined();
    expect(credentialAppSchema?.properties).toBeDefined();

    // Test moved properties - these should NOT be nullable
    const clientIdProperty = credentialAppSchema!.properties!.client_id;
    const clientSecretProperty = credentialAppSchema!.properties!.client_secret;

    expect(clientIdProperty).toBeDefined();
    expect(clientSecretProperty).toBeDefined();

    // These were moved in 4.3.0 but originally added in 0.9.9, so should not be nullable
    expect(clientIdProperty.type).toBe('string');
    expect(clientSecretProperty.type).toBe('string');
    expect(clientIdProperty.nullable).toBeUndefined();
    expect(clientSecretProperty.nullable).toBeUndefined();

    // Should be required
    expect(credentialAppSchema?.required).toContain('client_id');
    expect(credentialAppSchema?.required).toContain('client_secret');

    // Test actually added property - this should be nullable
    const clientSecretExpiresAtProperty =
      credentialAppSchema!.properties!.client_secret_expires_at;
    expect(clientSecretExpiresAtProperty).toBeDefined();

    // This was actually added in 4.3.0, so it should be nullable
    expect(clientSecretExpiresAtProperty.type).toEqual(['integer', 'null']);

    // Should not be required since it's nullable
    expect(credentialAppSchema?.required).not.toContain(
      'client_secret_expires_at'
    );
  });
});
