import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { MethodParser } from '../../parsers/MethodParser';
import { EntityParser } from '../../parsers/EntityParser';

describe('Error Response Examples End-to-End', () => {
  it('should collect and reuse error examples from accounts.md for 429 errors', () => {
    // Parse real data from the documentation
    const methodParser = new MethodParser();
    const entityParser = new EntityParser();

    const entities = entityParser.parseAllEntities();
    const methodFiles = methodParser.parseAllMethods();

    // Generate the OpenAPI schema
    const generator = new OpenAPIGenerator();
    const spec = generator.generateSchema(entities, methodFiles);

    // Check that 429 error example from accounts.md is collected
    expect(spec.components?.examples?.Error429Example).toBeDefined();
    expect(spec.components?.examples?.Error429Example?.value).toEqual({
      error: 'Too many requests',
    });

    // Find some endpoints that should have 429 responses
    const accountsEndpoint = spec.paths['/api/v1/accounts']?.post;
    const statusesEndpoint = spec.paths['/api/v1/statuses']?.post;

    expect(accountsEndpoint).toBeDefined();
    expect(statusesEndpoint).toBeDefined();

    // Both should reference the same 429 error example
    expect(
      accountsEndpoint?.responses['429']?.content?.['application/json']
        ?.examples?.Error429Example
    ).toBeDefined();
    expect(
      statusesEndpoint?.responses['429']?.content?.['application/json']
        ?.examples?.Error429Example
    ).toBeDefined();

    // Both should reference the same shared component
    expect(
      (
        accountsEndpoint?.responses['429']?.content?.['application/json']
          ?.examples?.Error429Example as any
      )?.$ref
    ).toBe('#/components/examples/Error429Example');
    expect(
      (
        statusesEndpoint?.responses['429']?.content?.['application/json']
          ?.examples?.Error429Example as any
      )?.$ref
    ).toBe('#/components/examples/Error429Example');
  });

  it('should collect and reuse error examples for 401 errors', () => {
    const methodParser = new MethodParser();
    const entityParser = new EntityParser();

    const entities = entityParser.parseAllEntities();
    const methodFiles = methodParser.parseAllMethods();

    const generator = new OpenAPIGenerator();
    const spec = generator.generateSchema(entities, methodFiles);

    // Check that 401 error example is collected
    expect(spec.components?.examples?.Error401Example).toBeDefined();
    expect(spec.components?.examples?.Error401Example?.value).toEqual({
      error: 'The access token is invalid',
    });

    // Find some endpoints that should have 401 responses
    const accountsEndpoint = spec.paths['/api/v1/accounts']?.post;
    const statusesEndpoint = spec.paths['/api/v1/statuses']?.post;

    expect(accountsEndpoint).toBeDefined();
    expect(statusesEndpoint).toBeDefined();

    // Both should reference the same 401 error example
    expect(
      accountsEndpoint?.responses['401']?.content?.['application/json']
        ?.examples?.Error401Example
    ).toBeDefined();
    expect(
      statusesEndpoint?.responses['401']?.content?.['application/json']
        ?.examples?.Error401Example
    ).toBeDefined();
  });

  it('should demonstrate significant reuse of error examples', () => {
    const methodParser = new MethodParser();
    const entityParser = new EntityParser();

    const entities = entityParser.parseAllEntities();
    const methodFiles = methodParser.parseAllMethods();

    const generator = new OpenAPIGenerator();
    const spec = generator.generateSchema(entities, methodFiles);

    // Count how many times each error example is referenced
    const schemaJson = JSON.stringify(spec);

    const error401Count = (schemaJson.match(/Error401Example/g) || []).length;
    const error422Count = (schemaJson.match(/Error422Example/g) || []).length;
    const error429Count = (schemaJson.match(/Error429Example/g) || []).length;

    // These should be referenced many times throughout the API
    expect(error401Count).toBeGreaterThan(100);
    expect(error422Count).toBeGreaterThan(100);
    expect(error429Count).toBeGreaterThan(100);

    console.log(`Error examples reuse statistics:`);
    console.log(`  401 errors: ${error401Count} references`);
    console.log(`  422 errors: ${error422Count} references`);
    console.log(`  429 errors: ${error429Count} references`);
  });
});
