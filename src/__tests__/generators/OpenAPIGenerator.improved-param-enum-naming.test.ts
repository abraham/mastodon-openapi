import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';
import { EntityClass } from '../../interfaces/EntityClass';

describe('OpenAPIGenerator improved parameter enum naming', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  it('should use entity-attribute pattern for parameter enums', () => {
    // Create entity with enum attribute
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
              'quoted_update'
            ],
          },
        ],
      },
    ];

    // Create method with parameter that has enum values (different from entity)
    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'notifications',
        description: 'Notification endpoints',
        methods: [
          {
            name: 'Get notifications',
            httpMethod: 'GET',
            endpoint: '/api/v1/notifications',
            description: 'Get notifications',
            parameters: [
              {
                name: 'types',
                description: 'Types to include in the result',
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
                  'admin.report'
                ],
                schema: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              {
                name: 'exclude_types',
                description: 'Types to exclude from the results',
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
                  'admin.report'
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

    const spec = generator.generateSchema(entities, methodFiles);

    // Should have entity enum with all values
    expect(spec.components?.schemas?.NotificationTypeEnum).toBeDefined();
    const entityEnum = spec.components!.schemas!.NotificationTypeEnum as any;
    expect(entityEnum.enum.length).toBe(14); // Entity has all 14 types

    // Should have parameter enum with subset of values and better naming
    expect(spec.components?.schemas?.NotificationTypeParameterEnum).toBeDefined();
    const paramEnum = spec.components!.schemas!.NotificationTypeParameterEnum as any;
    expect(paramEnum.enum.length).toBe(10); // Parameter has only 10 types
    expect(paramEnum.enum).toEqual([
      'mention',
      'status', 
      'reblog',
      'follow',
      'follow_request',
      'favourite',
      'poll',
      'update',
      'admin.sign_up',
      'admin.report'
    ]);

    // Check that the old problematic naming is not used
    expect(spec.components?.schemas?.GetApiV1NotificationsParamTypesEnum).toBeUndefined();

    // Check that parameters reference the new parameter enum
    const operation = spec.paths?.['/api/v1/notifications']?.get;
    const typesParam = operation?.parameters?.find((p: any) => p.name === 'types');
    const excludeTypesParam = operation?.parameters?.find((p: any) => p.name === 'exclude_types');
    
    expect(typesParam?.schema?.items?.$ref).toBe('#/components/schemas/NotificationTypeParameterEnum');
    expect(excludeTypesParam?.schema?.items?.$ref).toBe('#/components/schemas/NotificationTypeParameterEnum');

    // Check that entity still uses entity enum
    const notificationSchema = spec.components?.schemas?.Notification as any;
    expect(notificationSchema?.properties?.type?.$ref).toBe('#/components/schemas/NotificationTypeEnum');
  });

  it('should improve naming compared to old problematic patterns', () => {
    const methodFiles: ApiMethodsFile[] = [
      {
        name: 'notifications',
        description: 'Notification endpoints',
        methods: [
          {
            name: 'Get notifications v1',
            httpMethod: 'GET',
            endpoint: '/api/v1/notifications',
            description: 'Get notifications v1',
            parameters: [
              {
                name: 'types',
                description: 'Types to include',
                in: 'query',
                enumValues: ['mention', 'reblog', 'favourite'],
                schema: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            ],
          },
          {
            name: 'Get notifications v2',
            httpMethod: 'GET', 
            endpoint: '/api/v2/notifications',
            description: 'Get notifications v2',
            parameters: [
              {
                name: 'grouped_types',
                description: 'Types that can be grouped',
                in: 'query',
                enumValues: ['mention', 'reblog', 'favourite'],
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

    const spec = generator.generateSchema([], methodFiles);

    // Should not have the old problematic naming pattern
    const enumNames = Object.keys(spec.components?.schemas || {});
    
    const hasProblematicNaming = enumNames.some(name => 
      name.includes('GetApiV1NotificationsParamTypesEnum') ||
      name.includes('GetApiV2NotificationsParamGroupedTypesEnum') ||
      name.match(/^[A-Z][a-z]+Api[VR][0-9]+.*Enum$/)
    );
    
    expect(hasProblematicNaming).toBe(false);
    
    // Should have better naming that follows entity-attribute pattern
    const hasNotificationTypeParameterEnum = enumNames.includes('NotificationTypeParameterEnum');
    expect(hasNotificationTypeParameterEnum).toBe(true);
  });
});