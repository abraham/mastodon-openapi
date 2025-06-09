import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { MethodParser } from '../../parsers/MethodParser';
import { EntityParser } from '../../parsers/EntityParser';

describe('Integration: Filter context deduplication', () => {
  it('should create shared FilterContext component for real Filter and V1_Filter entities', () => {
    const methodParser = new MethodParser();
    const entityParser = new EntityParser();
    const generator = new OpenAPIGenerator();

    // Parse all entities and methods
    const entities = entityParser.parseAllEntities();
    const methodFiles = methodParser.parseAllMethods();

    // Generate the OpenAPI schema
    const schema = generator.generateSchema(entities, methodFiles);

    // Check that FilterContext component was created
    expect(schema.components?.schemas?.FilterContext).toBeDefined();
    const filterContext = schema.components!.schemas!.FilterContext as any;
    expect(filterContext.type).toBe('string');
    expect(filterContext.enum).toBeDefined();
    expect(Array.isArray(filterContext.enum)).toBe(true);
    expect(filterContext.enum.length).toBe(5);

    // Check that it contains the expected context values (order may vary)
    const contextValues = filterContext.enum.sort();
    expect(contextValues).toEqual([
      'account',
      'home',
      'notifications',
      'public',
      'thread',
    ]);

    // Check that both Filter and V1_Filter exist
    expect(schema.components?.schemas?.Filter).toBeDefined();
    expect(schema.components?.schemas?.V1_Filter).toBeDefined();

    // Check that both entities reference the shared FilterContext component
    const filterSchema = schema.components!.schemas!.Filter;
    const v1FilterSchema = schema.components!.schemas!.V1_Filter;

    expect(filterSchema.properties?.context).toBeDefined();
    expect(v1FilterSchema.properties?.context).toBeDefined();

    const filterContextProp = filterSchema.properties!.context;
    const v1FilterContextProp = v1FilterSchema.properties!.context;

    // Both should be arrays with items referencing FilterContext
    expect(filterContextProp.type).toBe('array');
    expect(v1FilterContextProp.type).toBe('array');

    expect(filterContextProp.items?.$ref).toBe(
      '#/components/schemas/FilterContext'
    );
    expect(v1FilterContextProp.items?.$ref).toBe(
      '#/components/schemas/FilterContext'
    );

    // Should not have inline enum values anymore
    expect(filterContextProp.enum).toBeUndefined();
    expect(v1FilterContextProp.enum).toBeUndefined();
    expect(filterContextProp.items?.enum).toBeUndefined();
    expect(v1FilterContextProp.items?.enum).toBeUndefined();
  });

  it('should not affect other filter-related entities that do not have context enums', () => {
    const methodParser = new MethodParser();
    const entityParser = new EntityParser();
    const generator = new OpenAPIGenerator();

    // Parse all entities and methods
    const entities = entityParser.parseAllEntities();
    const methodFiles = methodParser.parseAllMethods();

    // Generate the OpenAPI schema
    const schema = generator.generateSchema(entities, methodFiles);

    // Check that other filter entities still exist and were not affected
    expect(schema.components?.schemas?.FilterKeyword).toBeDefined();
    expect(schema.components?.schemas?.FilterStatus).toBeDefined();
    expect(schema.components?.schemas?.FilterResult).toBeDefined();

    // FilterKeyword should not have any context property
    const filterKeyword = schema.components!.schemas!.FilterKeyword;
    expect(filterKeyword.properties?.context).toBeUndefined();
  });
});
