import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { MethodParser } from '../../parsers/MethodParser';
import { EntityParser } from '../../parsers/EntityParser';

describe('Integration: fields_attributes object type', () => {
  it('should generate correct object type for fields_attributes in update_credentials endpoint', () => {
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
    expect(
      schema.paths['/api/v1/accounts/update_credentials'].patch
    ).toBeDefined();

    const operation =
      schema.paths['/api/v1/accounts/update_credentials'].patch!;
    expect(operation.requestBody).toBeDefined();

    const requestBodySchema = operation.requestBody!.content![
      'application/json'
    ].schema as any;
    expect(requestBodySchema.properties).toBeDefined();

    // Check that fields_attributes exists and is an object
    const fieldsAttributesProperty =
      requestBodySchema.properties.fields_attributes;
    expect(fieldsAttributesProperty).toBeDefined();
    expect(fieldsAttributesProperty.type).toBe('object');
    expect(fieldsAttributesProperty.description).toContain('profile fields');
  });
});
