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

    // Should create separate entity-specific components for each type enum due to clash
    expect(schema.components?.schemas?.NotificationTypeEnum).toBeDefined();
    expect(schema.components?.schemas?.PreviewCardTypeEnum).toBeDefined();

    // Check NotificationTypeEnum
    const notificationTypeEnum = schema.components!.schemas!
      .NotificationTypeEnum as any;
    expect(notificationTypeEnum.type).toBe('string');
    expect(notificationTypeEnum.enum).toContain('favourite');
    expect(notificationTypeEnum.enum).toContain('follow');
    expect(notificationTypeEnum.enum).toContain('admin.report');

    // Check PreviewCardTypeEnum (was PreviewTypeEnum)
    const previewTypeEnum = schema.components!.schemas!.PreviewCardTypeEnum as any;
    expect(previewTypeEnum.type).toBe('string');
    expect(previewTypeEnum.enum).toEqual(['link', 'photo', 'rich', 'video']);

    // Check that Notification uses NotificationTypeEnum
    const notificationSchema = schema.components!.schemas!.Notification;
    const notificationTypeProp = notificationSchema.properties!.type;
    expect(notificationTypeProp.$ref).toBe(
      '#/components/schemas/NotificationTypeEnum'
    );

    // Check that NotificationGroup also uses NotificationTypeEnum
    const notificationGroupSchema =
      schema.components!.schemas!.NotificationGroup;
    const notificationGroupTypeProp = notificationGroupSchema.properties!.type;
    expect(notificationGroupTypeProp.$ref).toBe(
      '#/components/schemas/NotificationTypeEnum'
    );

    // Check that PreviewCard uses PreviewTypeEnum
    const previewCardSchema = schema.components!.schemas!.PreviewCard;
    const previewCardTypeProp = previewCardSchema.properties!.type;
    expect(previewCardTypeProp.$ref).toBe(
      '#/components/schemas/PreviewTypeEnum'
    );

    // Check that Trends_Link also uses PreviewTypeEnum
    const trendsLinkSchema = schema.components!.schemas!.Trends_Link;
    const trendsLinkTypeProp = trendsLinkSchema.properties!.type;
    expect(trendsLinkTypeProp.$ref).toBe(
      '#/components/schemas/PreviewTypeEnum'
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

    // Should create generic TypeEnum for non-special cases
    expect(schema.components?.schemas?.TypeEnum).toBeDefined();
    const typeEnum = schema.components!.schemas!.TypeEnum as any;
    expect(typeEnum.type).toBe('string');
    expect(typeEnum.enum).toEqual(['typeA', 'typeB']);

    // Both entities should reference the generic TypeEnum
    const someOtherEntitySchema = schema.components!.schemas!.SomeOtherEntity;
    expect(someOtherEntitySchema.properties!.type.$ref).toBe(
      '#/components/schemas/TypeEnum'
    );

    const anotherEntitySchema = schema.components!.schemas!.AnotherEntity;
    expect(anotherEntitySchema.properties!.type.$ref).toBe(
      '#/components/schemas/TypeEnum'
    );
  });
});
