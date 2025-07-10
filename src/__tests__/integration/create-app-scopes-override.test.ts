import { MethodParser } from '../../parsers/MethodParser';
import { EntityParser } from '../../parsers/EntityParser';
import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';

describe('CreateApp scopes override', () => {
  test('should override scopes property to use array of OAuth scope enums for createApp operation', () => {
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

    // Verify scopes property has the correct format
    const scopesProperty = schema.properties.scopes;
    expect(scopesProperty).toBeDefined();
    expect(scopesProperty.type).toBe('array');
    expect(scopesProperty.items.$ref).toBe('#/components/schemas/OAuthScope');

    // Verify the description is preserved
    expect(scopesProperty.description).toContain('scopes');

    // Verify the default value is set to ['read']
    expect(scopesProperty.default).toEqual(['read']);
  });
});
