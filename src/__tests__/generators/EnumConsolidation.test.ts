import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { EntityClass } from '../../interfaces/EntityClass';

describe('Enum consolidation with common names', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  it('should consolidate NotificationTypeEnum and NotificationGroupTypeEnum', () => {
    const entities: EntityClass[] = [
      {
        name: 'Notification',
        description: 'A notification',
        attributes: [
          {
            name: 'type',
            type: 'String (Enumerable oneOf)',
            description: 'The type of event that resulted in the notification.',
            enumValues: ['favourite', 'follow', 'mention'],
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
            enumValues: ['favourite', 'follow', 'mention'],
          },
        ],
      },
    ];

    const spec = generator.generateSchema(entities, []);

    console.log('Generated enum components:');
    Object.keys(spec.components?.schemas || {}).forEach(key => {
      if (key.includes('Enum') || key.includes('Type')) {
        console.log(`- ${key}`);
      }
    });

    // Should consolidate to NotificationTypeEnum (shorter/more generic)
    expect(spec.components?.schemas?.NotificationTypeEnum).toBeDefined();
    expect(spec.components?.schemas?.NotificationGroupTypeEnum).toBeUndefined();

    // Both entities should reference the consolidated enum
    const notificationSchema = spec.components!.schemas!.Notification;
    const notificationGroupSchema = spec.components!.schemas!.NotificationGroup;

    expect(notificationSchema.properties!.type.$ref).toBe('#/components/schemas/NotificationTypeEnum');
    expect(notificationGroupSchema.properties!.type.$ref).toBe('#/components/schemas/NotificationTypeEnum');

    // Check the enum values are correct
    const notificationTypeEnum = spec.components!.schemas!.NotificationTypeEnum as any;
    expect(notificationTypeEnum.type).toBe('string');
    expect(notificationTypeEnum.enum).toEqual(['favourite', 'follow', 'mention']);
  });

  it('should consolidate enums with same values and find common name', () => {
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

    console.log('\nGenerated visibility enum components:');
    Object.keys(spec.components?.schemas || {}).forEach(key => {
      if (key.includes('Visibility')) {
        console.log(`- ${key}`);
      }
    });

    // Should consolidate to the shorter name
    const consolidatedEnumExists = 
      spec.components?.schemas?.StatusOneVisibilityEnum || 
      spec.components?.schemas?.StatusTwoVisibilityEnum;
    
    expect(consolidatedEnumExists).toBeDefined();
    
    // Both entities should reference the same consolidated enum
    const status1Schema = spec.components!.schemas!.StatusOne;
    const status2Schema = spec.components!.schemas!.StatusTwo;

    const visibility1Ref = status1Schema.properties!.visibility.items?.$ref;
    const visibility2Ref = status2Schema.properties!.visibility.items?.$ref;

    expect(visibility1Ref).toBeDefined();
    expect(visibility2Ref).toBeDefined();
    expect(visibility1Ref).toBe(visibility2Ref); // Both should reference the same component
  });
});