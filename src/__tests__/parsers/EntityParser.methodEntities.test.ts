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
    }
  });
});
