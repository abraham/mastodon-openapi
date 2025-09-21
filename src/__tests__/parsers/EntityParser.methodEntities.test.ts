import { EntityParser } from '../../parsers/EntityParser';

describe('EntityParser - Method Entity Extraction', () => {
  let parser: EntityParser;

  beforeEach(() => {
    parser = new EntityParser();
  });

  test('should extract entities from all files including method files', () => {
    const entities = parser.parseAllEntities();

    // Verify we can find entities that are defined in method files
    const groupedNotificationsResults = entities.find(
      (e) => e.name === 'GroupedNotificationsResults'
    );
    const partialAccountWithAvatar = entities.find(
      (e) => e.name === 'PartialAccountWithAvatar'
    );
    const notificationGroup = entities.find(
      (e) => e.name === 'NotificationGroup'
    );

    // These should be found once we extend the parser
    expect(groupedNotificationsResults).toBeDefined();
    expect(partialAccountWithAvatar).toBeDefined();
    expect(notificationGroup).toBeDefined();

    if (groupedNotificationsResults) {
      expect(groupedNotificationsResults.attributes.length).toBeGreaterThan(0);
      // Should have accounts, statuses, notification_groups attributes
      expect(
        groupedNotificationsResults.attributes.some(
          (a) => a.name === 'accounts'
        )
      ).toBe(true);
      expect(
        groupedNotificationsResults.attributes.some(
          (a) => a.name === 'statuses'
        )
      ).toBe(true);
      expect(
        groupedNotificationsResults.attributes.some(
          (a) => a.name === 'notification_groups'
        )
      ).toBe(true);
    }

    if (notificationGroup) {
      expect(notificationGroup.attributes.length).toBeGreaterThan(0);
      // Should have group_key, type, notifications_count etc.
      expect(
        notificationGroup.attributes.some((a) => a.name === 'group_key')
      ).toBe(true);
      expect(notificationGroup.attributes.some((a) => a.name === 'type')).toBe(
        true
      );

      // Check that type attribute has enum values including quote and quoted_update
      const typeAttribute = notificationGroup.attributes.find(
        (a) => a.name === 'type'
      );
      expect(typeAttribute).toBeDefined();
      if (typeAttribute) {
        expect(typeAttribute.enumValues).toBeDefined();
        expect(typeAttribute.enumValues).toContain('quote');
        expect(typeAttribute.enumValues).toContain('quoted_update');
        expect(typeAttribute.enumValues).toContain('mention');
        expect(typeAttribute.enumValues).toContain('favourite');
        // Should have all 14 values
        expect(typeAttribute.enumValues?.length).toBe(14);
      }
    }
  });

  test('should skip blocked method files for entity parsing', () => {
    const entities = parser.parseAllEntities();

    // Find all NotificationGroup entities
    const notificationGroups = entities.filter(
      (e) => e.name === 'NotificationGroup'
    );

    // Should only have one NotificationGroup entity (from grouped_notifications.md, not notifications_alpha.md)
    expect(notificationGroups).toHaveLength(1);

    // The single NotificationGroup should have complete enum values
    const notificationGroup = notificationGroups[0];
    const typeAttribute = notificationGroup.attributes.find(
      (a) => a.name === 'type'
    );
    expect(typeAttribute?.enumValues).toContain('quote');
    expect(typeAttribute?.enumValues).toContain('quoted_update');
    expect(typeAttribute?.enumValues?.length).toBe(14);
  });
});
