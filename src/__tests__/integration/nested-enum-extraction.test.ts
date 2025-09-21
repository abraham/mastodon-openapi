import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { MethodParser } from '../../parsers/MethodParser';
import { EntityParser } from '../../parsers/EntityParser';

describe('Integration: Nested enum extraction', () => {
  it('should extract nested enums like CredentialAccount.source.privacy to schema components', () => {
    const methodParser = new MethodParser();
    const entityParser = new EntityParser();
    const generator = new OpenAPIGenerator();

    // Parse all methods and entities
    const methodFiles = methodParser.parseAllMethods();
    const entities = entityParser.parseAllEntities();

    // Generate the OpenAPI schema
    const schema = generator.generateSchema(entities, methodFiles);

    // Check that CredentialAccount exists
    expect(schema.components?.schemas?.CredentialAccount).toBeDefined();

    const credentialAccount = schema.components!.schemas!
      .CredentialAccount as any;
    expect(credentialAccount.properties.source).toBeDefined();
    expect(credentialAccount.properties.source.type).toBe('object');
    expect(
      credentialAccount.properties.source.properties.privacy
    ).toBeDefined();

    // CURRENT BEHAVIOR: privacy enum is inline
    const privacyProperty =
      credentialAccount.properties.source.properties.privacy;

    // Log the current behavior for debugging
    console.log(
      'Current privacy property:',
      JSON.stringify(privacyProperty, null, 2)
    );
    console.log(
      'Available schema components:',
      Object.keys(schema.components?.schemas || {})
    );

    // Check if there's a dedicated enum component for privacy
    const privacyEnumComponents = Object.keys(
      schema.components?.schemas || {}
    ).filter((key) => key.toLowerCase().includes('privacy'));
    console.log('Privacy-related components:', privacyEnumComponents);

    // DESIRED BEHAVIOR: should be a reference to a shared enum component
    // Currently this will fail - that's what we need to fix
    expect(privacyProperty.$ref).toBeDefined();
    expect(privacyProperty.$ref).toMatch(/^#\/components\/schemas\/.+Enum$/);
  });

  it('should extract method parameter nested enums to schema components', () => {
    const methodParser = new MethodParser();
    const entityParser = new EntityParser();
    const generator = new OpenAPIGenerator();

    // Parse all methods and entities
    const methodFiles = methodParser.parseAllMethods();
    const entities = entityParser.parseAllEntities();

    // Generate the OpenAPI schema
    const schema = generator.generateSchema(entities, methodFiles);

    // Check the update_credentials endpoint
    expect(schema.paths['/api/v1/accounts/update_credentials']).toBeDefined();
    const operation =
      schema.paths['/api/v1/accounts/update_credentials'].patch!;
    expect(operation.requestBody).toBeDefined();

    const requestBodySchema = operation.requestBody!.content![
      'application/json'
    ].schema as any;
    const sourceProperty = requestBodySchema.properties.source;
    const privacyProperty = sourceProperty.properties.privacy;

    // Log the current behavior for debugging
    console.log(
      'Method parameter privacy property:',
      JSON.stringify(privacyProperty, null, 2)
    );

    // DESIRED BEHAVIOR: should be a reference to a shared enum component
    // Currently this will fail - that's what we need to fix
    expect(privacyProperty.$ref).toBeDefined();
    expect(privacyProperty.$ref).toMatch(/^#\/components\/schemas\/.+Enum$/);
  });
});
