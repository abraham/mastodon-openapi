import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { EntityParser } from '../../parsers/EntityParser';
import { MethodParser } from '../../parsers/MethodParser';

describe('OAuth Server Configuration Endpoint', () => {
  test('should properly define endpoint for /.well-known/oauth-authorization-server', () => {
    // Parse entities and methods
    const entityParser = new EntityParser();
    const entities = entityParser.parseAllEntities();

    const methodParser = new MethodParser();
    const methodFiles = methodParser.parseAllMethods();

    // Generate OpenAPI schema
    const generator = new OpenAPIGenerator();
    const spec = generator.generateSchema(entities, methodFiles);

    // Check that the endpoint exists
    const endpoint = spec.paths['/.well-known/oauth-authorization-server'];
    expect(endpoint).toBeDefined();
    expect(endpoint.get).toBeDefined();

    // Check that the endpoint has correct operation details
    expect(endpoint.get!.operationId).toBe('getWellKnownOauthAuthorizationServer');
    expect(endpoint.get!.summary).toBe('Discover OAuth Server Configuration');
    expect(endpoint.get!.description).toContain('OAuth 2 Authorization Server Metadata');
    expect(endpoint.get!.tags).toEqual(['oauth']);

    // Check that the 200 response exists with proper description
    const response200 = endpoint.get!.responses['200'];
    expect(response200).toBeDefined();
    expect(response200.description).toBe('JSON as per the above description');

    // Since there's no entity reference in the original documentation,
    // the response should not have structured content (this is the current behavior)
    // The endpoint is correctly parsed but without a specific schema reference
    expect(response200.content).toBeUndefined();
  });
});
