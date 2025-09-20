import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { EntityClass } from '../../interfaces/EntityClass';

describe('OpenAPIGenerator notification enum issue', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  it('should debug real entity parsing', () => {
    const { EntityFileParser } = require('../../parsers/EntityFileParser');
    const { MethodEntityParser } = require('../../parsers/MethodEntityParser');
    
    // Parse real entities
    const notificationEntities = EntityFileParser.parseEntityFile('mastodon-documentation/content/en/entities/Notification.md');
    const methodEntities = MethodEntityParser.parseEntitiesFromMethodFile('mastodon-documentation/content/en/methods/grouped_notifications.md');
    
    const notification = notificationEntities.find((e: any) => e.name === 'Notification');
    const notificationGroup = methodEntities.find((e: any) => e.name === 'NotificationGroup');
    
    const nType = notification.attributes.find((a: any) => a.name === 'type');
    const ngType = notificationGroup.attributes.find((a: any) => a.name === 'type');
    
    console.log('Notification type enum:', nType.enumValues);
    console.log('NotificationGroup type enum:', ngType.enumValues);
    
    expect(nType.enumValues).toHaveLength(14);
    expect(ngType.enumValues).toHaveLength(14);
    expect(nType.enumValues).toContain('quote');
    expect(nType.enumValues).toContain('quoted_update');
    expect(ngType.enumValues).toContain('quote');
    expect(ngType.enumValues).toContain('quoted_update');
    
    // Now test with the real parsed data
    const schema = generator.generateSchema([notification, notificationGroup], []);
    
    console.log('Generated components:', Object.keys(schema.components?.schemas || {}).filter(k => k.includes('Enum')));
  });

  it('should include all enum values in notification enums after deduplication', () => {
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
      {
        name: 'NotificationGroup',
        description: 'A notification group',
        attributes: [
          {
            name: 'type',
            type: 'String (Enumerable oneOf)',
            description: 'The type of event that resulted in the notifications in this group.',
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

    const schema = generator.generateSchema(entities, []);

    // Since both enums are identical, they should be deduplicated into a single component
    expect(schema.components?.schemas?.NotificationTypeEnum).toBeDefined();
    
    // NotificationGroupTypeEnum should NOT exist because it was deduplicated
    expect(schema.components?.schemas?.NotificationGroupTypeEnum).toBeUndefined();

    // Check NotificationTypeEnum has all values
    const notificationTypeEnum = schema.components!.schemas!.NotificationTypeEnum as any;
    expect(notificationTypeEnum.type).toBe('string');
    expect(notificationTypeEnum.enum).toHaveLength(14);
    expect(notificationTypeEnum.enum).toContain('quote');
    expect(notificationTypeEnum.enum).toContain('quoted_update');

    // Both entities should reference the same shared enum component
    const notificationSchema = schema.components!.schemas!.Notification;
    const notificationTypeProp = notificationSchema.properties!.type;
    
    const notificationGroupSchema = schema.components!.schemas!.NotificationGroup;
    const notificationGroupTypeProp = notificationGroupSchema.properties!.type;

    // Both should reference NotificationTypeEnum
    expect(notificationTypeProp.$ref).toBe('#/components/schemas/NotificationTypeEnum');
    expect(notificationGroupTypeProp.$ref).toBe('#/components/schemas/NotificationTypeEnum');
  });
});