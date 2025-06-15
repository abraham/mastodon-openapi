import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { EntityParser } from '../../parsers/EntityParser';
import { MethodParser } from '../../parsers/MethodParser';

describe('OAuth Scopes Consolidation', () => {
  test('should consolidate OAuth scopes for Application and CredentialApplication, and override createApp scopes', () => {
    // Parse entities and methods
    const entityParser = new EntityParser();
    const entities = entityParser.parseAllEntities();

    const methodParser = new MethodParser();
    const methodFiles = methodParser.parseAllMethods();

    // Generate OpenAPI schema
    const generator = new OpenAPIGenerator();
    const spec = generator.generateSchema(entities, methodFiles);

    // Check that the common OAuth scope schemas exist
    expect(spec.components?.schemas?.OAuthScope).toBeDefined();
    expect(spec.components?.schemas?.OAuthScopes).toBeDefined();

    // Check that OAuthScope has proper enum values
    const oauthScope = spec.components!.schemas!.OAuthScope as any;
    expect(oauthScope.type).toBe('string');
    expect(oauthScope.enum).toBeDefined();
    expect(oauthScope.enum).toContain('read');
    expect(oauthScope.enum).toContain('write');
    expect(oauthScope.enum).toContain('profile');
    expect(oauthScope.enum).toContain('admin:read');
    expect(oauthScope.enum.length).toBeGreaterThan(40);

    // Check that OAuthScopes references OAuthScope
    const oauthScopes = spec.components!.schemas!.OAuthScopes as any;
    expect(oauthScopes.type).toBe('array');
    expect(oauthScopes.items?.$ref).toBe('#/components/schemas/OAuthScope');

    // Check that Application schema uses the common OAuthScopes schema
    const applicationSchema = spec.components!.schemas!.Application as any;
    expect(applicationSchema.properties?.scopes?.$ref).toBe(
      '#/components/schemas/OAuthScopes'
    );

    // Check that CredentialApplication schema uses the common OAuthScopes schema
    const credentialApplicationSchema = spec.components!.schemas!
      .CredentialApplication as any;
    expect(credentialApplicationSchema.properties?.scopes?.$ref).toBe(
      '#/components/schemas/OAuthScopes'
    );

    // Check that createApp requestBody uses format scopes (changed behavior)
    const createAppOperation = spec.paths['/api/v1/apps']?.post;
    expect(createAppOperation).toBeDefined();

    const requestBodySchema = createAppOperation!.requestBody?.content?.[
      'application/json'
    ]?.schema as any;
    expect(requestBodySchema?.properties?.scopes?.type).toBe('string');
    expect(requestBodySchema?.properties?.scopes?.format).toBe('scopes');
    expect(requestBodySchema?.properties?.scopes?.enum).toBeUndefined();
  });

  test('should maintain backwards compatibility for scope descriptions', () => {
    // Parse entities and methods
    const entityParser = new EntityParser();
    const entities = entityParser.parseAllEntities();

    const methodParser = new MethodParser();
    const methodFiles = methodParser.parseAllMethods();

    // Generate OpenAPI schema
    const generator = new OpenAPIGenerator();
    const spec = generator.generateSchema(entities, methodFiles);

    // Check that Application and CredentialApplication retain their original descriptions
    const applicationSchema = spec.components!.schemas!.Application as any;
    expect(applicationSchema.properties?.scopes?.description).toContain(
      'scopes for your application'
    );

    const credentialApplicationSchema = spec.components!.schemas!
      .CredentialApplication as any;
    expect(
      credentialApplicationSchema.properties?.scopes?.description
    ).toContain('scopes for your application');
  });
});
