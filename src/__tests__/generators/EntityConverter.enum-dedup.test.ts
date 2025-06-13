import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { EntityClass } from '../../interfaces/EntityClass';

describe('EntityConverter enum deduplication', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  it('should create shared FilterContext component for identical context enums', () => {
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

    // Check that FilterContext component is created
    expect(spec.components?.schemas?.FilterContext).toBeDefined();
    const filterContext = spec.components!.schemas!.FilterContext as any;
    expect(filterContext.type).toBe('string');
    expect(filterContext.enum).toEqual([
      'account',
      'home',
      'notifications',
      'public',
      'thread',
    ]);

    // Check that both entities reference the shared component
    const filterSchema = spec.components!.schemas!.Filter;
    const v1FilterSchema = spec.components!.schemas!.V1_Filter;

    // Both should have context property as array with items referencing FilterContext
    expect(filterSchema.properties?.context).toBeDefined();
    expect(v1FilterSchema.properties?.context).toBeDefined();

    const filterContext1 = filterSchema.properties!.context;
    const filterContext2 = v1FilterSchema.properties!.context;

    expect(filterContext1.type).toBe('array');
    expect(filterContext2.type).toBe('array');
    expect(filterContext1.items?.$ref).toBe(
      '#/components/schemas/FilterContext'
    );
    expect(filterContext2.items?.$ref).toBe(
      '#/components/schemas/FilterContext'
    );

    // Should not have inline enum values
    expect(filterContext1.enum).toBeUndefined();
    expect(filterContext2.enum).toBeUndefined();
  });

  it('should create shared components for any identical enum pattern (generic)', () => {
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

    // Check that VisibilityEnum component is created
    expect(spec.components?.schemas?.VisibilityEnum).toBeDefined();
    const visibilityEnum = spec.components!.schemas!.VisibilityEnum as any;
    expect(visibilityEnum.type).toBe('string');
    expect(visibilityEnum.enum.sort()).toEqual([
      'direct',
      'private',
      'public',
      'unlisted',
    ]);

    // Check that both entities reference the shared component
    const status1Schema = spec.components!.schemas!.StatusOne;
    const status2Schema = spec.components!.schemas!.StatusTwo;

    const visibility1 = status1Schema.properties!.visibility;
    const visibility2 = status2Schema.properties!.visibility;

    expect(visibility1.type).toBe('array');
    expect(visibility2.type).toBe('array');
    expect(visibility1.items?.$ref).toBe('#/components/schemas/VisibilityEnum');
    expect(visibility2.items?.$ref).toBe('#/components/schemas/VisibilityEnum');

    // Should not have inline enum values
    expect(visibility1.enum).toBeUndefined();
    expect(visibility2.enum).toBeUndefined();
  });

  it('should not create shared component for different enum values', () => {
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

    // Should not create FilterContext component for different enums
    expect(spec.components?.schemas?.FilterContext).toBeUndefined();

    // Both should have inline enums
    const filterSchema = spec.components!.schemas!.Filter;
    const v1FilterSchema = spec.components!.schemas!.V1_Filter;

    const filterContext1 = filterSchema.properties!.context;
    const filterContext2 = v1FilterSchema.properties!.context;

    // Should still have inline enums since they're different, preserving original order
    expect(filterContext1.type).toBe('array');
    expect(filterContext2.type).toBe('array');
    expect(filterContext1.items?.enum).toEqual([
      'home',
      'notifications',
      'public',
    ]);
    expect(filterContext2.items?.enum).toEqual([
      'home',
      'notifications',
      'different',
    ]);
  });

  it('should handle single entity with context enum normally', () => {
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

    // Should not create shared component for single entity
    expect(spec.components?.schemas?.FilterContext).toBeUndefined();

    // Should have inline enum on items with original order
    const filterSchema = spec.components!.schemas!.Filter;
    const filterContext = filterSchema.properties!.context;
    expect(filterContext.type).toBe('array');
    expect(filterContext.items?.enum).toEqual([
      'home',
      'notifications',
      'public',
      'thread',
      'account',
    ]);
  });
});
