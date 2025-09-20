import { EntityConverter } from '../../generators/EntityConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { EntityClass } from '../../interfaces/EntityClass';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('TrendsLink Entity Inheritance', () => {
  let entityConverter: EntityConverter;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    const typeParser = new TypeParser(utilityHelpers);
    entityConverter = new EntityConverter(typeParser, utilityHelpers);
  });

  test('Trends::Link should inherit all PreviewCard attributes plus its own', () => {
    // Mock PreviewCard entity with core attributes
    const previewCardEntity: EntityClass = {
      name: 'PreviewCard',
      description: 'PreviewCard entity',
      attributes: [
        {
          name: 'url',
          type: 'String (URL)',
          description: 'Location of linked resource',
        },
        {
          name: 'title',
          type: 'String',
          description: 'Title of linked resource',
        },
        {
          name: 'description',
          type: 'String',
          description: 'Description of preview',
        },
        {
          name: 'type',
          type: 'String (Enumerable, oneOf)',
          description: 'The type of the preview card',
        },
        {
          name: 'authors',
          type: 'Array of [PreviewCardAuthor]()',
          description: 'Fediverse account of the authors',
        },
        {
          name: 'author_name',
          type: 'String',
          description: 'The author of the original resource',
        },
        {
          name: 'author_url',
          type: 'String (URL)',
          description: 'A link to the author',
        },
        {
          name: 'provider_name',
          type: 'String',
          description: 'The provider of the original resource',
        },
        {
          name: 'provider_url',
          type: 'String (URL)',
          description: 'A link to the provider',
        },
        {
          name: 'html',
          type: 'String (HTML)',
          description: 'HTML to be used for generating the preview card',
        },
        {
          name: 'width',
          type: 'Integer',
          description: 'Width of preview, in pixels',
        },
        {
          name: 'height',
          type: 'Integer',
          description: 'Height of preview, in pixels',
        },
        {
          name: 'image',
          type: 'String (URL)',
          description: 'Preview thumbnail',
          nullable: true,
        },
        {
          name: 'embed_url',
          type: 'String (URL)',
          description: 'Used for photo embeds',
        },
        {
          name: 'blurhash',
          type: 'String',
          description: 'A hash computed by the BlurHash algorithm',
          nullable: true,
        },
      ],
    };

    // Mock Trends::Link entity with specific attributes
    const trendsLinkEntity: EntityClass = {
      name: 'Trends::Link',
      description: 'Trends::Link entity',
      attributes: [
        {
          name: 'history',
          type: 'Array of Hash',
          description: 'Usage statistics for given days',
        },
      ],
    };

    const entities = [previewCardEntity, trendsLinkEntity];

    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: { schemas: {} },
    };

    entityConverter.convertEntities(entities, spec);

    // Verify Trends::Link has all PreviewCard properties plus its own
    const trendsLinkSchema = spec.components?.schemas?.TrendsLink;
    expect(trendsLinkSchema).toBeDefined();
    expect(trendsLinkSchema?.properties).toBeDefined();

    const properties = Object.keys(trendsLinkSchema!.properties!);

    // Should have PreviewCard properties
    expect(properties).toContain('url');
    expect(properties).toContain('title');
    expect(properties).toContain('description');
    expect(properties).toContain('type');
    expect(properties).toContain('authors');
    expect(properties).toContain('author_name');
    expect(properties).toContain('author_url');
    expect(properties).toContain('provider_name');
    expect(properties).toContain('provider_url');
    expect(properties).toContain('html');
    expect(properties).toContain('width');
    expect(properties).toContain('height');
    expect(properties).toContain('image');
    expect(properties).toContain('embed_url');
    expect(properties).toContain('blurhash');

    // Should have Trends::Link properties
    expect(properties).toContain('history');

    // Should have 16 total properties (15 from PreviewCard + 1 from Trends::Link)
    expect(properties).toHaveLength(16);
  });

  test('PreviewCard entity should not be affected by inheritance logic', () => {
    // Mock PreviewCard entity
    const previewCardEntity: EntityClass = {
      name: 'PreviewCard',
      description: 'PreviewCard entity',
      attributes: [
        {
          name: 'url',
          type: 'String (URL)',
          description: 'Location of linked resource',
        },
        {
          name: 'title',
          type: 'String',
          description: 'Title of linked resource',
        },
        {
          name: 'description',
          type: 'String',
          description: 'Description of preview',
        },
      ],
    };

    const entities = [previewCardEntity];

    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: { schemas: {} },
    };

    entityConverter.convertEntities(entities, spec);

    // Verify PreviewCard has only its own properties
    const previewCardSchema = spec.components?.schemas?.PreviewCard;
    expect(previewCardSchema).toBeDefined();
    expect(previewCardSchema?.properties).toBeDefined();

    const properties = Object.keys(previewCardSchema!.properties!);

    // Should have only PreviewCard properties
    expect(properties).toContain('url');
    expect(properties).toContain('title');
    expect(properties).toContain('description');

    // Should have exactly 3 properties
    expect(properties).toHaveLength(3);
  });
});
