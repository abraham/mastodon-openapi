import { EntityParser } from '../../parsers/EntityParser';

describe('EntityParser - Nested Attributes', () => {
  let parser: EntityParser;

  beforeEach(() => {
    parser = new EntityParser();
  });

  test('should parse double nested entity attributes correctly', () => {
    const entities = parser.parseAllEntities();

    // Find the Instance entity which contains double nested attributes
    const instanceEntity = entities.find((e) => e.name === 'Instance');
    expect(instanceEntity).toBeDefined();

    if (instanceEntity) {
      // Check that the thumbnail attribute exists
      const thumbnailAttr = instanceEntity.attributes.find(
        (attr) => attr.name === 'thumbnail'
      );
      expect(thumbnailAttr).toBeDefined();
      expect(thumbnailAttr?.type).toBe('Hash');

      // Check that nested thumbnail attributes exist
      const thumbnailUrlAttr = instanceEntity.attributes.find(
        (attr) => attr.name === 'thumbnail[url]'
      );
      expect(thumbnailUrlAttr).toBeDefined();
      expect(thumbnailUrlAttr?.type).toBe('String (URL)');

      // Check that previously missing nested attributes now exist
      const thumbnailBlurhashAttr = instanceEntity.attributes.find(
        (attr) => attr.name === 'thumbnail[blurhash]'
      );
      expect(thumbnailBlurhashAttr).toBeDefined();
      expect(thumbnailBlurhashAttr?.type).toBe('String (Blurhash)');
      expect(thumbnailBlurhashAttr?.optional).toBe(true);

      const thumbnailVersionsAttr = instanceEntity.attributes.find(
        (attr) => attr.name === 'thumbnail[versions]'
      );
      expect(thumbnailVersionsAttr).toBeDefined();
      expect(thumbnailVersionsAttr?.type).toBe('Hash');
      expect(thumbnailVersionsAttr?.optional).toBe(true);

      // Check double nested attributes (level 5 headings)
      const thumbnail1xAttr = instanceEntity.attributes.find(
        (attr) => attr.name === 'thumbnail[versions][@1x]'
      );
      expect(thumbnail1xAttr).toBeDefined();
      expect(thumbnail1xAttr?.type).toBe('String (URL)');
      expect(thumbnail1xAttr?.optional).toBe(true);

      const thumbnail2xAttr = instanceEntity.attributes.find(
        (attr) => attr.name === 'thumbnail[versions][@2x]'
      );
      expect(thumbnail2xAttr).toBeDefined();
      expect(thumbnail2xAttr?.type).toBe('String (URL)');
      expect(thumbnail2xAttr?.optional).toBe(true);
    }
  });

  test('should handle both {{%optional%}} and {{<optional>}} Hugo shortcode patterns', () => {
    const entities = parser.parseAllEntities();

    const instanceEntity = entities.find((e) => e.name === 'Instance');
    expect(instanceEntity).toBeDefined();

    if (instanceEntity) {
      // Find attributes with optional modifiers using different Hugo shortcode patterns
      const optionalAttrs = instanceEntity.attributes.filter(
        (attr) => attr.optional === true
      );

      // Should include the thumbnail nested attributes that use {{<optional>}}
      const thumbnailOptionalAttrs = optionalAttrs.filter(
        (attr) =>
          attr.name.includes('thumbnail[') && attr.name !== 'thumbnail[url]'
      );

      expect(thumbnailOptionalAttrs.length).toBeGreaterThanOrEqual(4); // blurhash, versions, @1x, @2x

      // Verify specific ones exist
      const expectedOptional = [
        'thumbnail[blurhash]',
        'thumbnail[versions]',
        'thumbnail[versions][@1x]',
        'thumbnail[versions][@2x]',
      ];

      expectedOptional.forEach((expectedName) => {
        const attr = instanceEntity.attributes.find(
          (a) => a.name === expectedName
        );
        expect(attr).toBeDefined();
        expect(attr?.optional).toBe(true);
      });
    }
  });
});
