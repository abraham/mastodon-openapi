import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { EntityClass } from '../../interfaces/EntityClass';

describe('OpenAPIGenerator type enum separation', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  it('should consolidate identical type enums with common naming', () => {
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

    // Should consolidate identical enum components with common naming
    // NotificationTypeEnum and NotificationGroupTypeEnum -> NotificationTypeEnum (per issue requirements)
    expect(schema.components?.schemas?.NotificationTypeEnum).toBeDefined();
    expect(schema.components?.schemas?.NotificationGroupTypeEnum).toBeUndefined(); // Should be consolidated

    // PreviewCard and TrendsLink should consolidate to one
    const previewCardTypeExists = !!schema.components?.schemas?.PreviewCardTypeEnum;
    const trendsLinkTypeExists = !!schema.components?.schemas?.TrendsLinkTypeEnum;
    expect(previewCardTypeExists || trendsLinkTypeExists).toBe(true);
    expect(previewCardTypeExists && trendsLinkTypeExists).toBe(false);

    // Check NotificationTypeEnum
    const notificationTypeEnum = schema.components!.schemas!
      .NotificationTypeEnum as any;
    expect(notificationTypeEnum.type).toBe('string');
    expect(notificationTypeEnum.enum).toContain('favourite');
    expect(notificationTypeEnum.enum).toContain('follow');
    expect(notificationTypeEnum.enum).toContain('admin.report');

    // Find consolidated preview type enum name
    const consolidatedPreviewTypeName = previewCardTypeExists ? 'PreviewCardTypeEnum' : 'TrendsLinkTypeEnum';
    const consolidatedPreviewTypeEnum = schema.components!.schemas![consolidatedPreviewTypeName] as any;
    expect(consolidatedPreviewTypeEnum.type).toBe('string');
    expect(consolidatedPreviewTypeEnum.enum).toEqual(['link', 'photo', 'rich', 'video']);

    // Check that Notification uses NotificationTypeEnum
    const notificationSchema = schema.components!.schemas!.Notification;
    const notificationTypeProp = notificationSchema.properties!.type;
    expect(notificationTypeProp.$ref).toBe(
      '#/components/schemas/NotificationTypeEnum'
    );

    // Check that NotificationGroup also uses NotificationTypeEnum (consolidated)
    const notificationGroupSchema =
      schema.components!.schemas!.NotificationGroup;
    const notificationGroupTypeProp = notificationGroupSchema.properties!.type;
    expect(notificationGroupTypeProp.$ref).toBe(
      '#/components/schemas/NotificationTypeEnum'
    );

    // Check that PreviewCard and Trends_Link use the consolidated enum
    const previewCardSchema = schema.components!.schemas!.PreviewCard;
    const trendsLinkSchema = schema.components!.schemas!.Trends_Link;

    const previewCardTypeProp = previewCardSchema.properties!.type;
    const trendsLinkTypeProp = trendsLinkSchema.properties!.type;

    expect(previewCardTypeProp.$ref).toBe(`#/components/schemas/${consolidatedPreviewTypeName}`);
    expect(trendsLinkTypeProp.$ref).toBe(`#/components/schemas/${consolidatedPreviewTypeName}`);
  });

  it('should create entity-specific type enums for other contexts', () => {
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

    // Should consolidate entity-specific TypeEnums with identical values
    const someOtherEntityExists = !!schema.components?.schemas?.SomeOtherEntityTypeEnum;
    const anotherEntityExists = !!schema.components?.schemas?.AnotherEntityTypeEnum;
    
    // Exactly one should exist (consolidated)
    expect(someOtherEntityExists || anotherEntityExists).toBe(true);
    expect(someOtherEntityExists && anotherEntityExists).toBe(false);

    const consolidatedEnumName = someOtherEntityExists ? 'SomeOtherEntityTypeEnum' : 'AnotherEntityTypeEnum';
    const consolidatedEnum = schema.components!.schemas![consolidatedEnumName] as any;
    expect(consolidatedEnum.type).toBe('string');
    expect(consolidatedEnum.enum).toEqual(['typeA', 'typeB']);

    // Both entities should reference the same consolidated type enum
    const someOtherEntitySchema = schema.components!.schemas!.SomeOtherEntity;
    expect(someOtherEntitySchema.properties!.type.$ref).toBe(
      `#/components/schemas/${consolidatedEnumName}`
    );

    const anotherEntitySchema = schema.components!.schemas!.AnotherEntity;
    expect(anotherEntitySchema.properties!.type.$ref).toBe(
      `#/components/schemas/${consolidatedEnumName}`
    );
  });
});
