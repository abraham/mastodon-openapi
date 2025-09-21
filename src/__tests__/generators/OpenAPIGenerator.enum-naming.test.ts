import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { EntityClass } from '../../interfaces/EntityClass';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('OpenAPIGenerator enum naming improvements', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  it('should avoid ugly enum names for method parameters that create their own shared enums', () => {
    // This test reproduces the exact issue: when method parameters with the same enum values
    // are encountered multiple times, they create a shared enum with an ugly name based on
    // the method path like "GetApiV1NotificationsParamTypesEnum"

    const entities: EntityClass[] = [
      {
        name: 'Notification',
        description: 'A notification',
        attributes: [
          {
            name: 'type',
            type: 'String (Enumerable)',
            description: 'The type of notification',
            enumValues: [
              'mention',
              'status',
              'reblog',
              'follow',
              'follow_request',
              'favourite',
              'poll',
              'update',
              'admin.sign_up',
              'admin.report',
              'severed_relationships',
              'moderation_warning',
              'quote',
              'quoted_update',
            ],
          },
        ],
      },
    ];

    // Create MULTIPLE methods/parameters that share the same subset of enum values
    // This should trigger the deduplication logic and create a shared enum
    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'notifications',
        description: 'Notification API methods',
        methods: [
          {
            name: 'Get notifications',
            httpMethod: 'GET',
            endpoint: '/api/v1/notifications',
            description: 'Get notifications',
            parameters: [
              {
                name: 'types',
                description: 'Types to include in the result.',
                in: 'query',
                enumValues: [
                  'mention',
                  'status',
                  'reblog',
                  'follow',
                  'follow_request',
                  'favourite',
                  'poll',
                  'update',
                  'admin.sign_up',
                  'admin.report',
                ], // This subset appears multiple times
                schema: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              {
                name: 'exclude_types',
                description: 'Types to exclude from the results.',
                in: 'query',
                enumValues: [
                  'mention',
                  'status',
                  'reblog',
                  'follow',
                  'follow_request',
                  'favourite',
                  'poll',
                  'update',
                  'admin.sign_up',
                  'admin.report',
                ], // Same values again - should trigger deduplication
                schema: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            ],
          },
        ],
      },
      {
        name: 'notifications2',
        description: 'More notification endpoints',
        methods: [
          {
            name: 'Get grouped notifications',
            httpMethod: 'GET',
            endpoint: '/api/v2/notifications',
            description: 'Get grouped notifications',
            parameters: [
              {
                name: 'grouped_types',
                description:
                  'Restrict which notification types can be grouped.',
                in: 'query',
                enumValues: [
                  'mention',
                  'status',
                  'reblog',
                  'follow',
                  'follow_request',
                  'favourite',
                  'poll',
                  'update',
                  'admin.sign_up',
                  'admin.report',
                ], // Same values again - should definitely trigger shared enum
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

    const spec = generator.generateSchema(entities, methodFiles);

    console.log(
      'All generated components:',
      Object.keys(spec.components?.schemas || {})
    );

    // Should create NotificationTypeEnum from entity
    expect(spec.components?.schemas?.NotificationTypeEnum).toBeDefined();

    // The multiple method parameters should have triggered creation of a shared enum
    // But it should NOT use the ugly naming pattern like GetApiV1NotificationsParamTypesEnum
    const componentNames = Object.keys(spec.components?.schemas || {});
    const uglyEnumNames = componentNames.filter((name) =>
      name.match(
        /Get.*Api.*V[0-9].*Notifications.*Param.*Enum|Get.*Api.*V[0-9].*Notifications.*Enum/
      )
    );
    console.log('Ugly enum names found:', uglyEnumNames);
    expect(uglyEnumNames).toHaveLength(0);

    // If a shared enum was created for the method parameters, it should have a reasonable name
    // not based on the HTTP method and path
    const methodEnumNames = componentNames.filter(
      (name) =>
        name.includes('Enum') &&
        name !== 'NotificationTypeEnum' &&
        !name.includes('OAuth')
    );
    console.log('Method-generated enums:', methodEnumNames);

    // Check what the parameters reference
    const v1Operation = spec.paths['/api/v1/notifications']?.get;
    const v2Operation = spec.paths['/api/v2/notifications']?.get;

    const typesParam = v1Operation!.parameters!.find((p) => p.name === 'types');
    const excludeTypesParam = v1Operation!.parameters!.find(
      (p) => p.name === 'exclude_types'
    );
    const groupedTypesParam = v2Operation!.parameters!.find(
      (p) => p.name === 'grouped_types'
    );

    console.log('V1 types param:', JSON.stringify(typesParam?.schema, null, 2));
    console.log(
      'V1 exclude_types param:',
      JSON.stringify(excludeTypesParam?.schema, null, 2)
    );
    console.log(
      'V2 grouped_types param:',
      JSON.stringify(groupedTypesParam?.schema, null, 2)
    );

    // Main requirement: no ugly enum names should be used
    [typesParam, excludeTypesParam, groupedTypesParam].forEach((param) => {
      if (param?.schema?.items?.$ref) {
        const refName = param.schema.items.$ref.split('/').pop();
        expect(refName).not.toMatch(
          /Get.*Api.*V[0-9].*Notifications.*Param.*Enum/
        );
        expect(refName).not.toMatch(/Get.*Api.*V[0-9].*Notifications.*Enum/);
      }
    });
  });

  it('should create new enum when values do not match existing entity enums', () => {
    const entities: EntityClass[] = [
      {
        name: 'Status',
        description: 'A status',
        attributes: [
          {
            name: 'visibility',
            type: 'String (Enumerable)',
            description: 'The visibility level',
            enumValues: ['public', 'unlisted', 'private', 'direct'],
          },
        ],
      },
    ];

    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'notifications',
        description: 'Notification API methods',
        methods: [
          {
            name: 'Get notifications',
            httpMethod: 'GET',
            endpoint: '/api/v1/notifications',
            description: 'Get notifications',
            parameters: [
              {
                name: 'types',
                description: 'Types to include in the result.',
                in: 'query',
                enumValues: ['mention', 'reblog', 'favourite'], // Different values
                schema: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
              },
            ],
          },
        ],
      },
    ];

    const spec = generator.generateSchema(entities, methodFiles);

    // Debug: log the generated components to understand current behavior
    console.log(
      'Generated schema components:',
      Object.keys(spec.components?.schemas || {})
    );

    // Should create StatusVisibilityEnum from entity
    expect(spec.components?.schemas?.StatusVisibilityEnum).toBeDefined();

    // Should also create a new enum for the parameter (since values don't match)
    // But it should NOT use the ugly naming pattern
    const componentNames = Object.keys(spec.components?.schemas || {});
    const uglyEnumNames = componentNames.filter((name) =>
      name.match(/Get.*Api.*V1.*Notifications.*Param.*Enum/)
    );
    expect(uglyEnumNames).toHaveLength(0);

    // Debug: check the parameter structure
    const operation = spec.paths['/api/v1/notifications']?.get;
    const typesParam = operation!.parameters!.find((p) => p.name === 'types');
    console.log(
      'Types param schema:',
      JSON.stringify(typesParam?.schema, null, 2)
    );

    // For now, just check that the parameter has some reference (we'll improve this after fixing)
    if (typesParam!.schema!.items?.$ref) {
      expect(typesParam!.schema!.items?.$ref).toMatch(
        /#\/components\/schemas\/[A-Za-z]+Enum/
      );
      expect(typesParam!.schema!.items?.$ref).not.toBe(
        '#/components/schemas/StatusVisibilityEnum'
      );
    } else {
      // If there's no $ref yet, that's also part of what we need to fix
      expect(typesParam!.schema!.items?.enum).toEqual([
        'mention',
        'reblog',
        'favourite',
      ]);
    }
  });

  it('should handle request body enums similarly', () => {
    const entities: EntityClass[] = [
      {
        name: 'List',
        description: 'A list',
        attributes: [
          {
            name: 'replies_policy',
            type: 'String (Enumerable)',
            description: 'The replies policy',
            enumValues: ['followed', 'list', 'none'],
          },
        ],
      },
    ];

    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'lists',
        description: 'List API methods',
        methods: [
          {
            name: 'Update a list',
            httpMethod: 'PUT',
            endpoint: '/api/v1/lists/{id}',
            description: 'Update a list',
            parameters: [
              {
                name: 'replies_policy',
                description: 'String. One of followed, list, or none.',
                in: 'formData',
                enumValues: ['followed', 'list', 'none'], // Same values as entity
                schema: {
                  type: 'string',
                },
              },
            ],
          },
        ],
      },
    ];

    const spec = generator.generateSchema(entities, methodFiles);

    // Should create ListRepliesPolicyEnum from entity
    expect(spec.components?.schemas?.ListRepliesPolicyEnum).toBeDefined();

    // Should NOT create ugly request body enum names
    const componentNames = Object.keys(spec.components?.schemas || {});
    const uglyEnumNames = componentNames.filter((name) =>
      name.match(/Put.*Api.*V1.*Lists.*RequestBody.*Enum/)
    );
    expect(uglyEnumNames).toHaveLength(0);

    // Request body should reference the existing ListRepliesPolicyEnum
    const operation = spec.paths['/api/v1/lists/{id}']?.put;
    expect(operation?.requestBody).toBeDefined();
    const requestBodySchema = operation!.requestBody!.content![
      'application/json'
    ].schema as any;
    expect(requestBodySchema.properties?.replies_policy?.$ref).toBe(
      '#/components/schemas/ListRepliesPolicyEnum'
    );
  });
});
