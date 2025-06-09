import { EntityParser } from '../../parsers/EntityParser';

describe('EntityParser - Array of Hash Extraction', () => {
  let parser: EntityParser;

  beforeEach(() => {
    parser = new EntityParser();
  });

  test('should extract Array of Hash fields into separate models', () => {
    const entities = parser.parseAllEntities();

    // Find the Tag entity which contains Array of Hash history
    const tagEntity = entities.find((e) => e.name === 'Tag');
    expect(tagEntity).toBeDefined();

    if (tagEntity) {
      // Check that the history attribute exists and is properly typed
      const historyAttr = tagEntity.attributes.find(
        (attr) => attr.name === 'history'
      );
      expect(historyAttr).toBeDefined();
      // After the fix, this should reference the TagHistory entity
      expect(historyAttr?.type).toBe('Array of TagHistory');

      // The individual hash fields should NOT be direct attributes of Tag
      const historyDayAttr = tagEntity.attributes.find(
        (attr) => attr.name === 'history[][day]'
      );
      const historyUsesAttr = tagEntity.attributes.find(
        (attr) => attr.name === 'history[][uses]'
      );
      const historyAccountsAttr = tagEntity.attributes.find(
        (attr) => attr.name === 'history[][accounts]'
      );

      expect(historyDayAttr).toBeUndefined();
      expect(historyUsesAttr).toBeUndefined();
      expect(historyAccountsAttr).toBeUndefined();
    }

    // Check that TagHistory entity has been created
    const historyEntity = entities.find((e) => e.name === 'TagHistory');
    expect(historyEntity).toBeDefined();

    if (historyEntity) {
      // Check that TagHistory has the correct attributes
      expect(historyEntity.attributes).toHaveLength(3);

      const dayAttr = historyEntity.attributes.find(
        (attr) => attr.name === 'day'
      );
      expect(dayAttr).toBeDefined();
      expect(dayAttr?.type).toBe('String (UNIX timestamp)');
      expect(dayAttr?.description).toBe(
        'UNIX timestamp on midnight of the given day.'
      );

      const usesAttr = historyEntity.attributes.find(
        (attr) => attr.name === 'uses'
      );
      expect(usesAttr).toBeDefined();
      expect(usesAttr?.type).toBe('String (cast from an integer)');
      expect(usesAttr?.description).toBe(
        'The counted usage of the tag within that day.'
      );

      const accountsAttr = historyEntity.attributes.find(
        (attr) => attr.name === 'accounts'
      );
      expect(accountsAttr).toBeDefined();
      expect(accountsAttr?.type).toBe('String (cast from an integer)');
      expect(accountsAttr?.description).toBe(
        'The total of accounts using the tag within that day.'
      );
    }
  });

  test('should handle the updated history attribute type correctly', () => {
    const entities = parser.parseAllEntities();

    const tagEntity = entities.find((e) => e.name === 'Tag');
    if (tagEntity) {
      const historyAttr = tagEntity.attributes.find(
        (attr) => attr.name === 'history'
      );
      expect(historyAttr).toBeDefined();
      // After the fix, this should reference the TagHistory entity
      expect(historyAttr?.type).toBe('Array of TagHistory');
    }
  });
});
