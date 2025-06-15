import { MethodParser } from '../../parsers/MethodParser';
import { EntityParser } from '../../parsers/EntityParser';
import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';

describe('CreateApp redirect_uris override', () => {
  test('should always output redirect_uris as array of URIs for createApp operation', () => {
    const methodParser = new MethodParser();
    const entityParser = new EntityParser();

    const entities = entityParser.parseAllEntities();
    const methodFiles = methodParser.parseAllMethods();

    const generator = new OpenAPIGenerator();
    const spec = generator.generateSchema(entities, methodFiles);

    // Find the createApp operation (POST /api/v1/apps)
    const appsPath = spec.paths['/api/v1/apps'];
    expect(appsPath).toBeDefined();
    expect(appsPath.post).toBeDefined();

    // Check the request body schema
    const requestBody = appsPath.post!.requestBody as any;
    expect(requestBody).toBeDefined();
    expect(requestBody.content).toBeDefined();
    expect(requestBody.content['application/json']).toBeDefined();

    const schema = requestBody.content['application/json'].schema as any;
    expect(schema).toBeDefined();
    expect(schema.properties).toBeDefined();

    // Verify redirect_uris is always an array of URIs, not oneOf
    const redirectUrisProperty = schema.properties.redirect_uris;
    expect(redirectUrisProperty).toBeDefined();
    expect(redirectUrisProperty.type).toBe('array');
    expect(redirectUrisProperty.items).toEqual({
      type: 'string',
      format: 'uri',
    });

    // Ensure it's NOT using oneOf pattern
    expect(redirectUrisProperty.oneOf).toBeUndefined();

    // Verify the description is preserved
    expect(redirectUrisProperty.description).toContain(
      'String or Array of Strings'
    );
  });
});
