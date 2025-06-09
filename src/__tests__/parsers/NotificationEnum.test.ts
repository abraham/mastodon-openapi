import { EntityParser } from '../../parsers/EntityParser';

describe('Notification Entity Enum Parsing', () => {
  it('should correctly parse Notification type enum values', () => {
    const entityParser = new EntityParser();
    const entities = entityParser.parseAllEntities();

    // Find the Notification entity
    const notification = entities.find((e) => e.name === 'Notification');
    expect(notification).toBeDefined();

    // Find the type attribute
    const typeAttribute = notification?.attributes.find(
      (attr) => attr.name === 'type'
    );
    expect(typeAttribute).toBeDefined();
    expect(typeAttribute?.type).toBe('String (Enumerable oneOf)');

    // Check that enum values are properly extracted
    expect(typeAttribute?.enumValues).toEqual([
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
    ]);
  });

  it('should correctly parse Status visibility enum values', () => {
    const entityParser = new EntityParser();
    const entities = entityParser.parseAllEntities();

    // Find the Status entity
    const status = entities.find((e) => e.name === 'Status');
    expect(status).toBeDefined();

    // Find the visibility attribute
    const visibilityAttribute = status?.attributes.find(
      (attr) => attr.name === 'visibility'
    );
    expect(visibilityAttribute).toBeDefined();
    expect(visibilityAttribute?.type).toBe('String (Enumerable oneOf)');

    // Check that enum values are properly extracted
    expect(visibilityAttribute?.enumValues).toEqual([
      'public',
      'unlisted',
      'private',
      'direct',
    ]);
  });
});
