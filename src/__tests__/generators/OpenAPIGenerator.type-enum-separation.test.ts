import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { EntityClass } from '../../interfaces/EntityClass';

describe('OpenAPIGenerator type enum separation', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  it('should create separate enums for notification type and preview card type', () => {
    // Entities with different type enums that should not conflict
    const entities: EntityClass[] = [
      {
        name: 'Notification',
        description: 'A notification',
        attributes: [
          {
            name: 'type',
            type: 'String (Enumerable oneOf)',
            description: 'The type of event that resulted in the notification.',
            enumValues: [
              'admin.report',
              'admin.sign_up',
              'favourite',
              'follow',
              'follow_request',
              'mention',
              'poll',
              'reblog',
              'status',
              'update',
            ],
          },
        ],
      },
      {
        name: 'NotificationGroup',
        description: 'A notification group',
        attributes: [
          {
            name: 'type',
            type: 'String (Enumerable oneOf)',
            description:
              'The type of event that resulted in the notifications in this group.',
            enumValues: [
              'admin.report',
              'admin.sign_up',
              'favourite',
              'follow',
              'follow_request',
              'mention',
              'poll',
              'reblog',
              'status',
              'update',
            ],
          },
        ],
      },
      {
        name: 'PreviewCard',
        description: 'A preview card',
        attributes: [
          {
            name: 'type',
            type: 'String (Enumerable oneOf)',
            description: 'The type of the preview card.',
            enumValues: ['link', 'photo', 'rich', 'video'],
          },
        ],
      },
      {
        name: 'Trends_Link',
        description: 'A trends link (inherits from PreviewCard)',
        attributes: [
          {
            name: 'type',
            type: 'String (Enumerable oneOf)',
            description: 'The type of the preview card.',
            enumValues: ['link', 'photo', 'rich', 'video'],
          },
          {
            name: 'history',
            type: 'Array of Hash',
            description: 'Usage statistics for given days.',
          },
        ],
      },
    ];

    const schema = generator.generateSchema(entities, []);

    // Should create separate shared TypeEnum components for different type enums
    const typeEnums = Object.keys(schema.components?.schemas || {}).filter(
      (name) => name.startsWith('Type') && name.endsWith('Enum')
    );
    expect(typeEnums).toHaveLength(2); // Should have two different type enums

    // Find notification type enum (should be simple TypeEnum since it's processed first)
    // Find preview type enum (should have hash since it conflicts)
    let notificationTypeEnumName = '';
    let previewTypeEnumName = '';

    for (const enumName of typeEnums) {
      if (enumName === 'TypeEnum') {
        notificationTypeEnumName = enumName;
      } else if (enumName.startsWith('Type') && enumName !== 'TypeEnum') {
        previewTypeEnumName = enumName;
      }
    }

    expect(notificationTypeEnumName).toBe('TypeEnum');
    expect(previewTypeEnumName).toBeTruthy();
    expect(previewTypeEnumName).not.toBe('TypeEnum');

    // Check notification type enum (simple TypeEnum)
    const notificationTypeEnum = schema.components!.schemas!.TypeEnum as any;
    expect(notificationTypeEnum.type).toBe('string');
    expect(notificationTypeEnum.enum).toContain('favourite');
    expect(notificationTypeEnum.enum).toContain('follow');
    expect(notificationTypeEnum.enum).toContain('admin.report');

    // Check PreviewCard enum
    const previewTypeEnum = schema.components!.schemas![
      previewTypeEnumName
    ] as any;
    expect(previewTypeEnum.type).toBe('string');
    expect(previewTypeEnum.enum).toEqual(['link', 'photo', 'rich', 'video']);

    // Check that Notification uses shared notification TypeEnum
    const notificationSchema = schema.components!.schemas!.Notification;
    const notificationTypeProp = notificationSchema.properties!.type;
    expect(notificationTypeProp.$ref).toBe('#/components/schemas/TypeEnum');

    // Check that NotificationGroup also uses shared notification TypeEnum
    const notificationGroupSchema =
      schema.components!.schemas!.NotificationGroup;
    const notificationGroupTypeProp = notificationGroupSchema.properties!.type;
    expect(notificationGroupTypeProp.$ref).toBe(
      '#/components/schemas/TypeEnum'
    );

    // Check that PreviewCard uses shared preview card TypeEnum
    const previewCardSchema = schema.components!.schemas!.PreviewCard;
    const previewCardTypeProp = previewCardSchema.properties!.type;
    expect(previewCardTypeProp.$ref).toBe(
      `#/components/schemas/${previewTypeEnumName}`
    );

    // Check that Trends_Link also uses shared preview card TypeEnum
    const trendsLinkSchema = schema.components!.schemas!.Trends_Link;
    const trendsLinkTypeProp = trendsLinkSchema.properties!.type;
    expect(trendsLinkTypeProp.$ref).toBe(
      `#/components/schemas/${previewTypeEnumName}`
    );
  });

  it('should still use generic TypeEnum for other contexts', () => {
    // Entity with type enum that doesn't match special cases
    const entities: EntityClass[] = [
      {
        name: 'SomeOtherEntity',
        description: 'Some other entity',
        attributes: [
          {
            name: 'type',
            type: 'String (Enumerable oneOf)',
            description: 'Some other type.',
            enumValues: ['typeA', 'typeB'],
          },
        ],
      },
      {
        name: 'AnotherEntity',
        description: 'Another entity',
        attributes: [
          {
            name: 'type',
            type: 'String (Enumerable oneOf)',
            description: 'Another type.',
            enumValues: ['typeA', 'typeB'],
          },
        ],
      },
    ];

    const schema = generator.generateSchema(entities, []);

    // Should create shared TypeEnum for identical values
    const typeEnums = Object.keys(schema.components?.schemas || {}).filter(
      (name) => name.startsWith('Type') && name.endsWith('Enum')
    );
    expect(typeEnums).toHaveLength(1); // Should have only one type enum since values are identical

    const typeEnumName = typeEnums[0];
    expect(typeEnumName).toBeTruthy();

    const typeEnum = schema.components!.schemas![typeEnumName] as any;
    expect(typeEnum.type).toBe('string');
    expect(typeEnum.enum).toEqual(['typeA', 'typeB']);

    // Both entities should reference the shared TypeEnum
    const someOtherEntitySchema = schema.components!.schemas!.SomeOtherEntity;
    expect(someOtherEntitySchema.properties!.type.$ref).toBe(
      `#/components/schemas/${typeEnumName}`
    );

    const anotherEntitySchema = schema.components!.schemas!.AnotherEntity;
    expect(anotherEntitySchema.properties!.type.$ref).toBe(
      `#/components/schemas/${typeEnumName}`
    );
  });
});
