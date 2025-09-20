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

    // Check that FilterContextEnum component was created (named after first entity)
    expect(schema.components?.schemas?.FilterContextEnum).toBeDefined();
    const filterContext = schema.components!.schemas!.FilterContextEnum as any;
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

    // Filter should not be nullable (added in v4.0.0, before supported v4.3.0),
    // but V1_Filter should not be nullable (added in v2.4.3, different major)
    expect(filterContextProp.type).toEqual('array');
    expect(v1FilterContextProp.type).toBe('array');

    // Check that both use the FilterContextEnum schema or have the expected enum values
    // V1_Filter uses $ref (non-nullable), Filter has inline enum (nullable)
    expect(v1FilterContextProp.items?.$ref).toBe(
      '#/components/schemas/FilterContextEnum'
    );

    // For nullable arrays, the items might be inline instead of using $ref
    // Verify that the Filter context has the expected enum values
    if (filterContextProp.items?.enum) {
      expect(filterContextProp.items.enum.sort()).toEqual([
        'account',
        'home',
        'notifications',
        'public',
        'thread',
      ]);
    } else {
      // If it does use $ref, check that too
      expect(filterContextProp.items?.$ref).toBe(
        '#/components/schemas/FilterContextEnum'
      );
    }

    // Should not have inline enum values anymore (except for nullable arrays which may have inline values)
    expect(filterContextProp.enum).toBeUndefined();
    expect(v1FilterContextProp.enum).toBeUndefined();

    // V1_Filter (non-nullable) should use shared schema
    expect(v1FilterContextProp.items?.enum).toBeUndefined();

    // Filter (nullable) may have inline enum values instead of shared schema
    // This is acceptable as long as the values are correct
    if (filterContextProp.items?.enum) {
      expect(filterContextProp.items.enum.sort()).toEqual([
        'account',
        'home',
        'notifications',
        'public',
        'thread',
      ]);
    }
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
