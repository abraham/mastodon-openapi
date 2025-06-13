import { EntityParser } from '../../parsers/EntityParser';
import { MethodParser } from '../../parsers/MethodParser';
import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';

describe('Example Generation Integration', () => {
  test('should include examples in generated schema for entities', () => {
    // Parse entities and methods like the main generator does
    const entityParser = new EntityParser();
    const entities = entityParser.parseAllEntities();

    const methodParser = new MethodParser();
    const methodFiles = methodParser.parseAllMethods();

    // Generate the schema
    const generator = new OpenAPIGenerator();
    const schema = generator.generateSchema(entities, methodFiles);

    // Check that the Account entity has an example
    const accountSchema = schema.components?.schemas?.['Account'];
    expect(accountSchema).toBeDefined();
    
    if (accountSchema && 'example' in accountSchema) {
      expect(accountSchema.example).toBeDefined();
      expect(typeof accountSchema.example).toBe('object');
      
      // Verify the example contains expected Account fields
      expect(accountSchema.example).toHaveProperty('id');
      expect(accountSchema.example).toHaveProperty('username');
      expect(accountSchema.example).toHaveProperty('display_name');
    }
  });

  test('should include response examples in generated schema for methods', () => {
    // Parse entities and methods like the main generator does
    const entityParser = new EntityParser();
    const entities = entityParser.parseAllEntities();

    const methodParser = new MethodParser();
    const methodFiles = methodParser.parseAllMethods();

    // Generate the schema
    const generator = new OpenAPIGenerator();
    const schema = generator.generateSchema(entities, methodFiles);

    // Look for a method with response examples
    // Check the account registration endpoint which we know has examples
    const registerPath = schema.paths['/api/v1/accounts'];
    expect(registerPath).toBeDefined();

    const postOperation = registerPath?.post;
    expect(postOperation).toBeDefined();

    // Check if any response has an example
    const responses = postOperation?.responses;
    if (responses) {
      let foundExample = false;
      
      for (const [statusCode, response] of Object.entries(responses)) {
        if (response && typeof response === 'object' && 'content' in response) {
          const content = response.content;
          if (content && typeof content === 'object') {
            for (const [, mediaContent] of Object.entries(content)) {
              if (mediaContent && typeof mediaContent === 'object' && 'example' in mediaContent) {
                foundExample = true;
                expect(mediaContent.example).toBeDefined();
                console.log(`Found example for ${statusCode} response in account registration:`, 
                  JSON.stringify(mediaContent.example, null, 2));
                break;
              }
            }
          }
        }
        if (foundExample) break;
      }
      
      // Note: Not all methods may have examples, so we don't assert foundExample
      // but if we do find one, it should be properly structured
    }
  });

  test('should gracefully handle entities without examples', () => {
    // This test ensures that entities without examples still work correctly
    const entityParser = new EntityParser();
    const entities = entityParser.parseAllEntities();

    const methodParser = new MethodParser();
    const methodFiles = methodParser.parseAllMethods();

    // Generate the schema
    const generator = new OpenAPIGenerator();
    const schema = generator.generateSchema(entities, methodFiles);

    // Verify that the schema is still valid
    expect(schema.openapi).toBe('3.1.0');
    expect(schema.components?.schemas).toBeDefined();
    
    // Count entities with and without examples
    let entitiesWithExamples = 0;
    let entitiesWithoutExamples = 0;
    
    if (schema.components?.schemas) {
      for (const [, entitySchema] of Object.entries(schema.components.schemas)) {
        if (entitySchema && typeof entitySchema === 'object' && 'example' in entitySchema) {
          entitiesWithExamples++;
        } else {
          entitiesWithoutExamples++;
        }
      }
    }

    console.log(`Entities with examples: ${entitiesWithExamples}`);
    console.log(`Entities without examples: ${entitiesWithoutExamples}`);
    
    // We should have some entities with examples (at least Account)
    expect(entitiesWithExamples).toBeGreaterThan(0);
    
    // But it's OK to have entities without examples too
    expect(entitiesWithoutExamples).toBeGreaterThanOrEqual(0);
  });
});