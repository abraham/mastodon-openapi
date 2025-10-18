import { EntityParser } from '../../parsers/EntityParser';

describe('EntityParser - MetaDetails Entity', () => {
  let parser: EntityParser;

  beforeEach(() => {
    parser = new EntityParser();
  });

  test('should parse MetaDetails entity', () => {
    const entities = parser.parseAllEntities();
    const metaDetails = entities.find((e) => e.name === 'MetaDetails');

    expect(metaDetails).toBeDefined();
    expect(metaDetails?.description).toBe(
      'Metadata details about a media attachment.'
    );
  });

  test('MetaDetails should have all required properties', () => {
    const entities = parser.parseAllEntities();
    const metaDetails = entities.find((e) => e.name === 'MetaDetails');

    expect(metaDetails).toBeDefined();
    expect(metaDetails?.attributes).toBeDefined();

    const attributeNames = metaDetails?.attributes.map((attr) => attr.name);
    expect(attributeNames).toContain('width');
    expect(attributeNames).toContain('height');
    expect(attributeNames).toContain('frame_rate');
    expect(attributeNames).toContain('duration');
    expect(attributeNames).toContain('bitrate');
    expect(attributeNames).toContain('aspect');
  });

  test('MetaDetails properties should be nullable', () => {
    const entities = parser.parseAllEntities();
    const metaDetails = entities.find((e) => e.name === 'MetaDetails');

    expect(metaDetails).toBeDefined();
    expect(metaDetails?.attributes).toBeDefined();

    // All properties should be nullable
    metaDetails?.attributes.forEach((attr) => {
      expect(attr.nullable).toBe(true);
    });
  });

  test('MediaAttachment should have meta[small] and meta[original] properties', () => {
    const entities = parser.parseAllEntities();
    const mediaAttachment = entities.find((e) => e.name === 'MediaAttachment');

    expect(mediaAttachment).toBeDefined();
    expect(mediaAttachment?.attributes).toBeDefined();

    const attributeNames = mediaAttachment?.attributes.map((attr) => attr.name);
    expect(attributeNames).toContain('meta[small]');
    expect(attributeNames).toContain('meta[original]');
  });

  test('MediaAttachment meta[small] should reference MetaDetails', () => {
    const entities = parser.parseAllEntities();
    const mediaAttachment = entities.find((e) => e.name === 'MediaAttachment');

    expect(mediaAttachment).toBeDefined();

    const metaSmall = mediaAttachment?.attributes.find(
      (attr) => attr.name === 'meta[small]'
    );
    expect(metaSmall).toBeDefined();
    expect(metaSmall?.type).toContain('MetaDetails');
    expect(metaSmall?.optional).toBe(true);
    expect(metaSmall?.nullable).toBe(true);
  });

  test('MediaAttachment meta[original] should reference MetaDetails', () => {
    const entities = parser.parseAllEntities();
    const mediaAttachment = entities.find((e) => e.name === 'MediaAttachment');

    expect(mediaAttachment).toBeDefined();

    const metaOriginal = mediaAttachment?.attributes.find(
      (attr) => attr.name === 'meta[original]'
    );
    expect(metaOriginal).toBeDefined();
    expect(metaOriginal?.type).toContain('MetaDetails');
    expect(metaOriginal?.optional).toBe(true);
    expect(metaOriginal?.nullable).toBe(true);
  });
});
