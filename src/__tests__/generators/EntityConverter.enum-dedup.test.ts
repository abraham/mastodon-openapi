import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { EntityClass } from '../../interfaces/EntityClass';

describe('EntityConverter enum deduplication', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  it('should consolidate identical context enums from different entities', () => {
    const entities: EntityClass[] = [
      {
        name: 'Filter',
        description: 'A filter',
        attributes: [
          {
            name: 'context',
            type: 'Array of String (Enumerable, anyOf)',
            description: 'The contexts in which the filter should be applied.',
            enumValues: [
              'home',
              'notifications',
              'public',
              'thread',
              'account',
            ],
          },
        ],
      },
      {
        name: 'V1_Filter',
        description: 'A V1 filter',
        attributes: [
          {
            name: 'context',
            type: 'Array of String (Enumerable anyOf)',
            description: 'The contexts in which the filter should be applied.',
            enumValues: [
              'home',
              'notifications',
              'public',
              'thread',
              'account',
            ],
          },
        ],
      },
    ];

    const spec = generator.generateSchema(entities, []);

    // Check that both entities exist
    expect(spec.components?.schemas?.Filter).toBeDefined();
    expect(spec.components?.schemas?.V1_Filter).toBeDefined();

    // With consolidation enabled, identical enums should be merged
    const filterContextExists = !!spec.components?.schemas?.FilterContextEnum;
    const v1FilterContextExists = !!spec.components?.schemas?.V1FilterContextEnum;
    
    // Exactly one should exist (consolidated)
    expect(filterContextExists || v1FilterContextExists).toBe(true);
    expect(filterContextExists && v1FilterContextExists).toBe(false);

    // Find which one exists (should be the more generic one)
    const consolidatedEnumName = filterContextExists 
      ? 'FilterContextEnum' 
      : 'V1FilterContextEnum';

    // Check enum values are correct
    const consolidatedEnum = spec.components!.schemas![consolidatedEnumName] as any;
    expect(consolidatedEnum.type).toBe('string');
    expect(consolidatedEnum.enum).toEqual([
      'home',
      'notifications',
      'public',
      'thread',
      'account',
    ]);

    // Check that both entities reference the same consolidated component
    const filterSchema = spec.components!.schemas!.Filter;
    const v1FilterSchema = spec.components!.schemas!.V1_Filter;

    const filterContext1 = filterSchema.properties!.context;
    const filterContext2 = v1FilterSchema.properties!.context;

    expect(filterContext1.type).toBe('array');
    expect(filterContext2.type).toBe('array');
    
    // Both should reference the same consolidated enum
    expect(filterContext1.items?.$ref).toBe(`#/components/schemas/${consolidatedEnumName}`);
    expect(filterContext2.items?.$ref).toBe(`#/components/schemas/${consolidatedEnumName}`);
  });

  it('should consolidate identical enum patterns with common naming', () => {
    const entities: EntityClass[] = [
      {
        name: 'StatusOne',
        description: 'A status',
        attributes: [
          {
            name: 'visibility',
            type: 'Array of String (Enumerable, anyOf)',
            description: 'The visibility settings.',
            enumValues: ['public', 'unlisted', 'private', 'direct'],
          },
        ],
      },
      {
        name: 'StatusTwo',
        description: 'Another status',
        attributes: [
          {
            name: 'visibility',
            type: 'Array of String (Enumerable anyOf)',
            description: 'The visibility settings.',
            enumValues: ['public', 'unlisted', 'private', 'direct'],
          },
        ],
      },
    ];

    const spec = generator.generateSchema(entities, []);

    // Check that both entities exist
    expect(spec.components?.schemas?.StatusOne).toBeDefined();
    expect(spec.components?.schemas?.StatusTwo).toBeDefined();

    // With consolidation enabled, should consolidate identical enums
    // One should exist (the consolidated one), the other should be removed
    const statusOneVisibilityExists = !!spec.components?.schemas?.StatusOneVisibilityEnum;
    const statusTwoVisibilityExists = !!spec.components?.schemas?.StatusTwoVisibilityEnum;
    
    // Exactly one should exist (consolidated)
    expect(statusOneVisibilityExists || statusTwoVisibilityExists).toBe(true);
    expect(statusOneVisibilityExists && statusTwoVisibilityExists).toBe(false);

    // Find which one exists
    const consolidatedEnumName = statusOneVisibilityExists 
      ? 'StatusOneVisibilityEnum' 
      : 'StatusTwoVisibilityEnum';

    // Check enum values are correct
    const consolidatedEnum = spec.components!.schemas![consolidatedEnumName] as any;
    expect(consolidatedEnum.type).toBe('string');
    expect(consolidatedEnum.enum.sort()).toEqual([
      'direct',
      'private',
      'public',
      'unlisted',
    ]);

    // Check that both entities reference the same consolidated component
    const status1Schema = spec.components!.schemas!.StatusOne;
    const status2Schema = spec.components!.schemas!.StatusTwo;

    const visibility1 = status1Schema.properties!.visibility;
    const visibility2 = status2Schema.properties!.visibility;

    expect(visibility1.type).toBe('array');
    expect(visibility2.type).toBe('array');
    
    // Both should reference the same consolidated enum
    expect(visibility1.items?.$ref).toBe(`#/components/schemas/${consolidatedEnumName}`);
    expect(visibility2.items?.$ref).toBe(`#/components/schemas/${consolidatedEnumName}`);

    // Should not have inline enum values
    expect(visibility1.enum).toBeUndefined();
    expect(visibility2.enum).toBeUndefined();
  });

  it('should create separate entity-specific components for different enum values', () => {
    const entities: EntityClass[] = [
      {
        name: 'Filter',
        description: 'A filter',
        attributes: [
          {
            name: 'context',
            type: 'Array of String (Enumerable, anyOf)',
            description: 'The contexts in which the filter should be applied.',
            enumValues: ['home', 'notifications', 'public'],
          },
        ],
      },
      {
        name: 'V1_Filter',
        description: 'A V1 filter',
        attributes: [
          {
            name: 'context',
            type: 'Array of String (Enumerable anyOf)',
            description: 'The contexts in which the filter should be applied.',
            enumValues: ['home', 'notifications', 'different'],
          },
        ],
      },
    ];

    const spec = generator.generateSchema(entities, []);

    // Should create entity-specific context components with different enum values
    expect(spec.components?.schemas?.FilterContextEnum).toBeDefined();
    expect(spec.components?.schemas?.V1FilterContextEnum).toBeDefined();

    const filterSchema = spec.components!.schemas!.Filter;
    const v1FilterSchema = spec.components!.schemas!.V1_Filter;

    const filterContext1 = filterSchema.properties!.context;
    const filterContext2 = v1FilterSchema.properties!.context;

    // Both should reference their entity-specific components
    expect(filterContext1.type).toBe('array');
    expect(filterContext2.type).toBe('array');
    expect(filterContext1.items?.$ref).toBe('#/components/schemas/FilterContextEnum');
    expect(filterContext2.items?.$ref).toBe('#/components/schemas/V1FilterContextEnum');

    // The components should exist and have the correct enum values
    const filterContextEnum = spec.components!.schemas!.FilterContextEnum as any;
    const v1FilterContextEnum = spec.components!.schemas!.V1FilterContextEnum as any;

    expect(filterContextEnum.enum).toEqual(['home', 'notifications', 'public']);
    expect(v1FilterContextEnum.enum).toEqual(['home', 'notifications', 'different']);
  });

  it('should handle single entity with context enum using new naming', () => {
    const entities: EntityClass[] = [
      {
        name: 'Filter',
        description: 'A filter',
        attributes: [
          {
            name: 'context',
            type: 'Array of String (Enumerable, anyOf)',
            description: 'The contexts in which the filter should be applied.',
            enumValues: [
              'home',
              'notifications',
              'public',
              'thread',
              'account',
            ],
          },
        ],
      },
    ];

    const spec = generator.generateSchema(entities, []);

    // Should create FilterContextEnum component with new EntityAttributeEnum naming
    const filterSchema = spec.components!.schemas!.Filter;
    const filterContext = filterSchema.properties!.context;

    expect(filterContext.type).toBe('array');
    expect(filterContext.items?.$ref).toBe(
      '#/components/schemas/FilterContextEnum'
    );

    // Should have created the FilterContextEnum component
    expect(spec.components?.schemas?.FilterContextEnum).toBeDefined();
    const enumComponent = spec.components!.schemas!.FilterContextEnum as any;
    expect(enumComponent.enum).toEqual([
      'home',
      'notifications',
      'public',
      'thread',
      'account',
    ]);
  });
});
