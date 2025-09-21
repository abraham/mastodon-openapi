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

    // Check that source object exists
    const sourceProperty = requestBodySchema.properties.source;
    expect(sourceProperty).toBeDefined();
    expect(sourceProperty.type).toBe('object');
    expect(sourceProperty.properties).toBeDefined();

    // Check that privacy property now references a shared enum component
    const privacyProperty = sourceProperty.properties.privacy;
    expect(privacyProperty).toBeDefined();
    expect(privacyProperty.type).toBe('string');

    // CHANGED: Now privacy enum should be extracted to a schema reference
    expect(privacyProperty.$ref).toBeDefined();
    expect(privacyProperty.$ref).toMatch(/^#\/components\/schemas\/.+Enum$/);

    // Verify the referenced enum component exists
    const refMatch = privacyProperty.$ref.match(
      /^#\/components\/schemas\/(.+)$/
    );
    expect(refMatch).toBeTruthy();

    const enumComponentName = refMatch![1];
    expect(schema.components?.schemas?.[enumComponentName]).toBeDefined();

    const enumComponent = schema.components!.schemas![enumComponentName] as any;
    expect(enumComponent.type).toBe('string');
    expect(enumComponent.enum).toBeDefined();
    expect(enumComponent.enum).toContain('public');
    expect(enumComponent.enum).toContain('unlisted');
    expect(enumComponent.enum).toContain('private');
  });
});
