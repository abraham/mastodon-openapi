import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { EntityClass } from '../../interfaces/EntityClass';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('OpenAPIGenerator global enum deduplication', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  it('should deduplicate enums across entities and method parameters', () => {
    // Entity with context enum
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

    // Method with same context enum in request body
    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'filters',
        description: 'Filter endpoints',
        methods: [
          {
            name: 'createFilter',
            httpMethod: 'POST',
            endpoint: '/api/v2/filters',
            description: 'Create a filter',
            parameters: [
              {
                name: 'context',
                description: 'Where the filter should be applied.',
                required: false,
                in: 'formData',
                enumValues: [
                  'home',
                  'notifications',
                  'public',
                  'thread',
                  'account',
                ],
                schema: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            ],
          },
        ],
      },
    ];

    const schema = generator.generateSchema(entities, methodFiles);

    expect(schema.components?.schemas?.FilterContextEnum).toBeDefined();
    const filterContext = schema.components!.schemas!.FilterContextEnum as any;
    expect(filterContext.type).toBe('string');
    expect(filterContext.enum.sort()).toEqual([
      'account',
      'home',
      'notifications',
      'public',
      'thread',
    ]);

    // Entity should reference shared component
    const filterSchema = schema.components!.schemas!.Filter;
    const entityContextProp = filterSchema.properties!.context;
    expect(entityContextProp.type).toBe('array');
    expect(entityContextProp.items?.$ref).toBe(
      '#/components/schemas/FilterContextEnum'
    );

    // Method parameter should also reference shared component
    const postOperation = schema.paths['/api/v2/filters']?.post;
    expect(postOperation).toBeDefined();
    const requestBody = postOperation!.requestBody;
    expect(requestBody).toBeDefined();
    const requestBodySchema = requestBody!.content!['application/json']!
      .schema as any;
    expect(requestBodySchema.properties?.context).toBeDefined();
    const methodContextProp = requestBodySchema.properties!.context;
    expect(methodContextProp.type).toBe('array');
    expect(methodContextProp.items?.$ref).toBe(
      '#/components/schemas/FilterContextEnum'
    );
  });

  it('should not deduplicate different enum values', () => {
    // Entity with context enum
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
    ];

    // Method with different context enum values in request body
    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'filters',
        description: 'Filter endpoints',
        methods: [
          {
            name: 'createFilter',
            httpMethod: 'POST',
            endpoint: '/api/v2/filters',
            description: 'Create a filter',
            parameters: [
              {
                name: 'context',
                description: 'Where the filter should be applied.',
                required: false,
                in: 'formData',
                enumValues: ['home', 'notifications', 'different'],
                schema: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            ],
          },
        ],
      },
    ];

    const schema = generator.generateSchema(entities, methodFiles);

    // Entity should now have extracted enum (new behavior)
    const filterSchema = schema.components!.schemas!.Filter;
    const entityContextProp = filterSchema.properties!.context;
    expect(entityContextProp.type).toBe('array');
    // Entity should get entity-specific enum name due to clash with method parameter
    expect(entityContextProp.items?.$ref).toBe(
      '#/components/schemas/FilterContextEnum'
    );

    // Should have created the FilterContextEnum component
    expect(schema.components?.schemas?.FilterContextEnum).toBeDefined();
    const enumComponent = schema.components!.schemas!.FilterContextEnum as any;
    expect(enumComponent.enum).toEqual(['home', 'notifications', 'public']);

    // Method parameter should still have inline enum since it's not an entity enum
    const postOperation = schema.paths['/api/v2/filters']?.post;
    const requestBody = postOperation!.requestBody;
    const requestBodySchema = requestBody!.content!['application/json']!
      .schema as any;
    const methodContextProp = requestBodySchema.properties!.context;
    expect(methodContextProp.type).toBe('array');
    expect(methodContextProp.items?.enum).toEqual([
      'home',
      'notifications',
      'different',
    ]);
  });
});
