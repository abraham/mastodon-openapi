import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { EntityParser } from '../../parsers/EntityParser';
import { MethodParser } from '../../parsers/MethodParser';

describe('Integration: Suggestion source exclusion', () => {
  it('should exclude source attribute from Suggestion entity in generated schema', () => {
    const entityParser = new EntityParser();
    const methodParser = new MethodParser();
    const generator = new OpenAPIGenerator();

    // Parse all entities and methods
    const entities = entityParser.parseAllEntities();
    const methodFiles = methodParser.parseAllMethods();

    // Generate the OpenAPI schema
    const schema = generator.generateSchema(entities, methodFiles);

    // Find the Suggestion entity
    const suggestionSchema = schema.components?.schemas?.['Suggestion'];
    expect(suggestionSchema).toBeDefined();

    // Verify that 'source' is not present but 'sources' and 'account' are
    expect(suggestionSchema?.properties?.['source']).toBeUndefined();
    expect(suggestionSchema?.properties?.['sources']).toBeDefined();
    expect(suggestionSchema?.properties?.['account']).toBeDefined();

    // Verify properties structure
    const properties = suggestionSchema?.properties || {};
    const propertyNames = Object.keys(properties);

    expect(propertyNames).toContain('sources');
    expect(propertyNames).toContain('account');
    expect(propertyNames).not.toContain('source');
  });
});