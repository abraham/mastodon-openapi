import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { MethodParser } from '../../parsers/MethodParser';
import { EntityParser } from '../../parsers/EntityParser';

describe('Integration: Filter context deduplication', () => {
  it.skip('should consolidate filter context enums with new EntityAttributeEnum naming', () => {
    const methodParser = new MethodParser();
    const entityParser = new EntityParser();
    const generator = new OpenAPIGenerator();

    // Parse all entities and methods
    const entities = entityParser.parseAllEntities();
    const methodFiles = methodParser.parseAllMethods();

    // Generate the OpenAPI schema
    const schema = generator.generateSchema(entities, methodFiles);

    console.log('Generated filter-related enum components:');
    Object.keys(schema.components?.schemas || {}).forEach(key => {
      if (key.includes('Filter') && key.includes('Enum')) {
        console.log(`- ${key}`);
      }
    });

    // With the new EntityAttributeEnum naming and consolidation, 
    // should create consolidated context enum components
    // FilterContextEnum or V1FilterContextEnum (one of them, consolidated)
    const filterContextExists = !!schema.components?.schemas?.FilterContextEnum;
    const v1FilterContextExists = !!schema.components?.schemas?.V1FilterContextEnum;
    
    // At least one should exist
    expect(filterContextExists || v1FilterContextExists).toBe(true);
    
    const consolidatedEnumName = filterContextExists ? 'FilterContextEnum' : 'V1FilterContextEnum';
    const consolidatedEnum = schema.components!.schemas![consolidatedEnumName] as any;
    expect(consolidatedEnum.type).toBe('string');
    expect(consolidatedEnum.enum).toBeDefined();
    expect(Array.isArray(consolidatedEnum.enum)).toBe(true);
    expect(consolidatedEnum.enum.length).toBe(5);

    // Check that it contains the expected context values (order may vary)
    const contextValues = consolidatedEnum.enum.sort();
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

    // Check that both use the FilterContext schema or have the expected enum values
    // V1_Filter uses $ref (non-nullable), Filter has inline enum (nullable)
    expect(v1FilterContextProp.items?.$ref).toBe(
      '#/components/schemas/FilterContext'
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
    }

    // Verify that both Filter and V1_Filter entities reference the consolidated enum
    const filterEntity = schema.components?.schemas?.Filter;
    const v1FilterEntity = schema.components?.schemas?.V1_Filter;
    
    if (filterEntity?.properties?.context) {
      expect(filterEntity.properties.context.items?.$ref).toBe(`#/components/schemas/${consolidatedEnumName}`);
    }
    
    if (v1FilterEntity?.properties?.context) {
      expect(v1FilterEntity.properties.context.items?.$ref).toBe(`#/components/schemas/${consolidatedEnumName}`);
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
