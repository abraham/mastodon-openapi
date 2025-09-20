import { EntityParser } from '../../parsers/EntityParser';
import { EntityConverter } from '../../generators/EntityConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('TrendsLink Entity Integration Test', () => {
  let entityParser: EntityParser;
  let entityConverter: EntityConverter;

  beforeEach(() => {
    entityParser = new EntityParser();
    const utilityHelpers = new UtilityHelpers();
    const typeParser = new TypeParser(utilityHelpers);
    entityConverter = new EntityConverter(typeParser, utilityHelpers);
  });

  test('should parse and convert Trends::Link entity with PreviewCard inheritance', () => {
    // Parse all entities from the actual documentation
    const entities = entityParser.parseAllEntities();

    // Find the relevant entities
    const previewCardEntity = entities.find((e) => e.name === 'PreviewCard');
    const trendsLinkEntity = entities.find((e) => e.name === 'Trends::Link');

    // Verify entities exist
    expect(previewCardEntity).toBeDefined();
    expect(trendsLinkEntity).toBeDefined();

    // Verify PreviewCard has expected attributes
    expect(previewCardEntity!.attributes.length).toBeGreaterThan(0);

    // Verify Trends::Link has its own attributes
    expect(trendsLinkEntity!.attributes.length).toBeGreaterThan(0);
    const historyAttribute = trendsLinkEntity!.attributes.find(
      (attr) => attr.name === 'history'
    );
    expect(historyAttribute).toBeDefined();

    // Convert entities to OpenAPI spec
    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: { schemas: {} },
    };

    entityConverter.convertEntities(entities, spec);

    // Verify both schemas exist
    const previewCardSchema = spec.components?.schemas?.PreviewCard;
    const trendsLinkSchema = spec.components?.schemas?.TrendsLink;

    expect(previewCardSchema).toBeDefined();
    expect(trendsLinkSchema).toBeDefined();
    expect(previewCardSchema?.properties).toBeDefined();
    expect(trendsLinkSchema?.properties).toBeDefined();

    const previewCardProperties = Object.keys(previewCardSchema!.properties!);
    const trendsLinkProperties = Object.keys(trendsLinkSchema!.properties!);

    // Verify Trends::Link has more properties than PreviewCard
    expect(trendsLinkProperties.length).toBeGreaterThan(
      previewCardProperties.length
    );

    // Verify all PreviewCard properties exist in Trends::Link
    for (const property of previewCardProperties) {
      expect(trendsLinkProperties).toContain(property);
    }

    // Verify Trends::Link has its own specific properties
    expect(trendsLinkProperties).toContain('history');

    // Verify the inheritance worked: Trends::Link should have all PreviewCard properties + 1 (history)
    // Note: The nested history[][] attributes are converted into a single history property
    expect(trendsLinkProperties.length).toBe(previewCardProperties.length + 1);
  });

  test('should verify specific PreviewCard attributes are inherited by Trends::Link', () => {
    const entities = entityParser.parseAllEntities();

    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: { schemas: {} },
    };

    entityConverter.convertEntities(entities, spec);

    const trendsLinkSchema = spec.components?.schemas?.TrendsLink;
    expect(trendsLinkSchema?.properties).toBeDefined();

    const properties = Object.keys(trendsLinkSchema!.properties!);

    // Verify key PreviewCard attributes are present
    const expectedPreviewCardAttributes = [
      'url',
      'title',
      'description',
      'type',
      'image',
      'author_name',
      'provider_name',
    ];

    for (const attr of expectedPreviewCardAttributes) {
      expect(properties).toContain(attr);
    }

    // Verify Trends::Link specific attributes
    expect(properties).toContain('history');
  });
});
