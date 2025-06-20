import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { EntityParser } from '../../parsers/EntityParser';
import { MethodParser } from '../../parsers/MethodParser';

describe('OAuth Server Configuration Endpoint', () => {
  test('should properly define response schema for /.well-known/oauth-authorization-server', () => {
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

    // Check that the 200 response has proper content
    const response200 = endpoint.get!.responses['200'];
    expect(response200).toBeDefined();
    expect(response200.content).toBeDefined();
    expect(response200.content!['application/json']).toBeDefined();
    expect(response200.content!['application/json'].schema).toBeDefined();
    expect(response200.content!['application/json'].schema.$ref).toBe(
      '#/components/schemas/OAuthServerConfiguration'
    );

    // Check that the OAuthServerConfiguration schema exists
    const schema = spec.components!.schemas!.OAuthServerConfiguration as any;
    expect(schema).toBeDefined();
    expect(schema.type).toBe('object');
    expect(schema.description).toBe(
      'Represents OAuth 2 Authorization Server Metadata for the Mastodon server.'
    );

    // Check that all required properties are present
    const expectedProperties = [
      'issuer',
      'service_documentation',
      'authorization_endpoint',
      'token_endpoint',
      'app_registration_endpoint',
      'revocation_endpoint',
      'scopes_supported',
      'response_types_supported',
      'response_modes_supported',
      'code_challenge_methods_supported',
      'grant_types_supported',
      'token_endpoint_auth_methods_supported',
    ];

    expectedProperties.forEach((property) => {
      expect(schema.properties![property]).toBeDefined();
    });

    // Check that URL properties have the correct format
    const urlProperties = [
      'issuer',
      'service_documentation',
      'authorization_endpoint',
      'token_endpoint',
      'app_registration_endpoint',
      'revocation_endpoint',
    ];

    urlProperties.forEach((property) => {
      expect(schema.properties![property].type).toBe('string');
      expect(schema.properties![property].format).toBe('uri');
    });

    // Check that array properties have the correct type
    const arrayProperties = [
      'scopes_supported',
      'response_types_supported',
      'response_modes_supported',
      'code_challenge_methods_supported',
      'grant_types_supported',
      'token_endpoint_auth_methods_supported',
    ];

    arrayProperties.forEach((property) => {
      expect(schema.properties![property].type).toBe('array');
      expect(schema.properties![property].items!.type).toBe('string');
    });

    // Check that all properties are required
    expect(schema.required).toEqual(expectedProperties);

    // Check that an example is provided
    expect(schema.example).toBeDefined();
    expect(schema.example.issuer).toBeDefined();
    expect(schema.example.scopes_supported).toBeDefined();
    expect(Array.isArray(schema.example.scopes_supported)).toBe(true);

    // Check that the response example is also created
    const responseExample = spec.components!.examples!
      .OAuthServerConfiguration200Example as any;
    expect(responseExample).toBeDefined();
    expect(responseExample.value).toBeDefined();
    expect(responseExample.value.issuer).toBeDefined();
  });
});
