import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { EntityClass } from '../../interfaces/EntityClass';

describe('OpenAPIGenerator Enum Refactor', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  describe('Default enum naming', () => {
    it('should use EntityAttributeEnum format by default', () => {
      const entities: EntityClass[] = [
        {
          name: 'AccountWarning',
          description: 'A warning applied to an account',
          attributes: [
            {
              name: 'action',
              type: 'String (Enumerable oneOf)',
              description: 'Action that was taken',
              enumValues: ['none', 'disable', 'mark_statuses_as_sensitive', 'delete_statuses', 'sensitive', 'silence', 'suspend'],
            },
          ],
        },
        {
          name: 'Notification',
          description: 'A notification',
          attributes: [
            {
              name: 'type',
              type: 'String (Enumerable oneOf)',
              description: 'Type of the notification',
              enumValues: ['mention', 'status', 'reblog', 'follow', 'follow_request', 'favourite', 'poll', 'update', 'admin.sign_up', 'admin.report'],
            },
          ],
        },
        {
          name: 'NotificationGroup',
          description: 'A group of notifications',
          attributes: [
            {
              name: 'type',
              type: 'String (Enumerable oneOf)',
              description: 'Type of the notification group',
              enumValues: ['mention', 'status', 'reblog', 'follow', 'follow_request', 'favourite', 'poll', 'update', 'admin.sign_up', 'admin.report'],
            },
          ],
        },
      ];

      const spec = generator.generateSchema(entities, []);

      // Check proper PascalCase handling for AccountWarning
      expect(spec.components?.schemas?.['AccountWarningActionEnum']).toBeDefined();
      const accountWarningActionEnum = spec.components!.schemas!['AccountWarningActionEnum'] as any;
      expect(accountWarningActionEnum.enum).toEqual(['none', 'disable', 'mark_statuses_as_sensitive', 'delete_statuses', 'sensitive', 'silence', 'suspend']);

      // Check that Notification and NotificationGroup type enums are consolidated into NotificationTypeEnum
      expect(spec.components?.schemas?.['NotificationTypeEnum']).toBeDefined();
      expect(spec.components?.schemas?.['NotificationGroupTypeEnum']).toBeUndefined();

      // Both entities should reference the consolidated enum
      const notificationSchema = spec.components!.schemas!.Notification;
      const notificationGroupSchema = spec.components!.schemas!.NotificationGroup;
      expect(notificationSchema.properties?.type.$ref).toBe('#/components/schemas/NotificationTypeEnum');
      expect(notificationGroupSchema.properties?.type.$ref).toBe('#/components/schemas/NotificationTypeEnum');

      // Check the consolidated enum has the correct values
      const notificationTypeEnum = spec.components!.schemas!['NotificationTypeEnum'] as any;
      expect(notificationTypeEnum.enum).toEqual(['mention', 'status', 'reblog', 'follow', 'follow_request', 'favourite', 'poll', 'update', 'admin.sign_up', 'admin.report']);
    });

    it('should consolidate enums with identical values to common names', () => {
      const entities: EntityClass[] = [
        {
          name: 'Notification',
          description: 'A notification',
          attributes: [
            {
              name: 'type',
              type: 'String (Enumerable oneOf)',
              description: 'Type of the notification',
              enumValues: ['mention', 'status', 'reblog', 'follow'],
            },
          ],
        },
        {
          name: 'NotificationGroup',
          description: 'A group of notifications',
          attributes: [
            {
              name: 'type',
              type: 'String (Enumerable oneOf)',
              description: 'Type of the notification group',
              enumValues: ['mention', 'status', 'reblog', 'follow'],
            },
          ],
        },
      ];

      const spec = generator.generateSchema(entities, []);

      // After consolidation, should have only NotificationTypeEnum (common name)
      expect(spec.components?.schemas?.['NotificationTypeEnum']).toBeDefined();
      expect(spec.components?.schemas?.['NotificationGroupTypeEnum']).toBeUndefined();

      // Both entities should reference the consolidated enum
      const notificationSchema = spec.components!.schemas!.Notification;
      const notificationGroupSchema = spec.components!.schemas!.NotificationGroup;

      expect(notificationSchema.properties?.type.$ref).toBe('#/components/schemas/NotificationTypeEnum');
      expect(notificationGroupSchema.properties?.type.$ref).toBe('#/components/schemas/NotificationTypeEnum');
    });

    it('should handle different casing scenarios correctly', () => {
      const entities: EntityClass[] = [
        {
          name: 'PreviewCard',
          description: 'A preview card',
          attributes: [
            {
              name: 'type',
              type: 'String (Enumerable oneOf)',
              description: 'Type of the preview card',
              enumValues: ['link', 'photo', 'video', 'rich'],
            },
          ],
        },
        {
          name: 'OAuth_Application',
          description: 'An OAuth application',
          attributes: [
            {
              name: 'scopes',
              type: 'Array of String (Enumerable anyOf)',
              description: 'OAuth scopes',
              enumValues: ['read', 'write', 'follow', 'push'],
            },
          ],
        },
      ];

      const spec = generator.generateSchema(entities, []);

      // Should properly handle PascalCase conversion
      expect(spec.components?.schemas?.['PreviewCardTypeEnum']).toBeDefined();
      // Note: OAuth_Application scopes are handled by existing OAuth scope system
      // so this test needs to be adjusted to work with that system
      expect(spec.components?.schemas?.['OAuthScope']).toBeDefined();
    });
  });
});