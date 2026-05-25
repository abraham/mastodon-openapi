import { EntityParser } from '../../parsers/EntityParser';

describe('EntityParser - Draft File Handling', () => {
  let parser: EntityParser;

  beforeEach(() => {
    parser = new EntityParser();
  });

  test('should exclude draft entities from parsing', () => {
    const entities = parser.parseAllEntities();

    // EncryptedMessage.md has draft: true, so it should not be included
    const encryptedMessage = entities.find(
      (e) => e.name === 'EncryptedMessage'
    );
    expect(encryptedMessage).toBeUndefined();
  });

  test('should still include non-draft entities', () => {
    const entities = parser.parseAllEntities();

    // Should still find non-draft entities like Account
    const account = entities.find((e) => e.name === 'Account');
    expect(account).toBeDefined();

    // Should have a reasonable number of entities (but not including drafts)
    expect(entities.length).toBeGreaterThan(80); // Current count is ~90, but could vary
  });

  test('should handle files without draft property', () => {
    const entities = parser.parseAllEntities();

    // Files without draft property should be included (default behavior)
    // Most entities don't have draft property, so they should all be included
    expect(entities.length).toBeGreaterThan(5);
  });
});
