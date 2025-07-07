import { EntityParser } from '../../parsers/EntityParser';
import { EntityConverter } from '../../generators/EntityConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('Integration - Application redirect_uris URI format', () => {
  test('should apply URI format to redirect_uris array items in Application entity', () => {
    // Parse actual entities from documentation
    const entityParser = new EntityParser();
    const entities = entityParser.parseAllEntities();

    // Find the Application entity
    const applicationEntity = entities.find(
      (entity) => entity.name === 'Application'
    );
    expect(applicationEntity).toBeDefined();

    // Find the redirect_uris attribute
    const redirectUrisAttr = applicationEntity!.attributes.find(
      (attr) => attr.name === 'redirect_uris'
    );
    expect(redirectUrisAttr).toBeDefined();
    expect(redirectUrisAttr!.type).toContain('Array of String (URLs');

    // Convert to OpenAPI schema
    const utilityHelpers = new UtilityHelpers();
    const typeParser = new TypeParser(utilityHelpers);
    const entityConverter = new EntityConverter(typeParser, utilityHelpers);

    // Create minimal spec
    const spec: OpenAPISpec = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
      components: { schemas: {} },
    };

    // Convert all entities to populate the spec
    entityConverter.convertEntities(entities, spec);

    // Verify the redirect_uris attribute has URI format on items
    const applicationSchema = spec.components!.schemas!['Application'];
    expect(applicationSchema).toBeDefined();
    expect(applicationSchema.properties?.redirect_uris).toEqual({
      description: 'The registered redirection URI(s) for the application.',
      type: 'array',
      items: {
        type: 'string',
        format: 'uri',
      },
    });
  });
});
