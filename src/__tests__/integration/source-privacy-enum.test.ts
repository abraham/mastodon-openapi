import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { MethodParser } from '../../parsers/MethodParser';
import { EntityParser } from '../../parsers/EntityParser';

describe('Integration: source[privacy] enum support', () => {
  it('should generate correct enum values for source[privacy] in update_credentials endpoint', () => {
    const methodParser = new MethodParser();
    const entityParser = new EntityParser();
    const generator = new OpenAPIGenerator();

    // Parse all methods to get the actual update_credentials method
    const methodFiles = methodParser.parseAllMethods();
    const entities = entityParser.parseAllEntities();

    // Generate the OpenAPI schema
    const schema = generator.generateSchema(entities, methodFiles);

    // Check that the update_credentials endpoint exists
    expect(schema.paths['/api/v1/accounts/update_credentials']).toBeDefined();
    expect(schema.paths['/api/v1/accounts/update_credentials'].patch).toBeDefined();

    const operation = schema.paths['/api/v1/accounts/update_credentials'].patch!;
    expect(operation.requestBody).toBeDefined();

    const requestBodySchema = operation.requestBody!.content!['application/json'].schema as any;
    expect(requestBodySchema.properties).toBeDefined();

    // Check that source object exists
    const sourceProperty = requestBodySchema.properties.source;
    expect(sourceProperty).toBeDefined();
    expect(sourceProperty.type).toBe('object');
    expect(sourceProperty.properties).toBeDefined();

    // Check that privacy property has the correct enum values
    const privacyProperty = sourceProperty.properties.privacy;
    expect(privacyProperty).toBeDefined();
    expect(privacyProperty.type).toBe('string');
    expect(privacyProperty.enum).toEqual(['public', 'unlisted', 'private']);
  });
});