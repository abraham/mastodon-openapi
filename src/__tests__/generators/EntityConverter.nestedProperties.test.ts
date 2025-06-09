import { EntityConverter } from '../../generators/EntityConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { EntityClass } from '../../interfaces/EntityClass';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('EntityConverter - Nested Properties', () => {
  let entityConverter: EntityConverter;
  let typeParser: TypeParser;
  let utilityHelpers: UtilityHelpers;

  beforeEach(() => {
    utilityHelpers = new UtilityHelpers();
    typeParser = new TypeParser(utilityHelpers);
    entityConverter = new EntityConverter(typeParser, utilityHelpers);
  });

  test('should convert nested hash properties to proper nested object structure', () => {
    const mockEntity: EntityClass = {
      name: 'TestInstance',
      description: 'Test instance with nested properties',
      attributes: [
        {
          name: 'domain',
          type: 'String',
          description: 'The domain name',
        },
        {
          name: 'configuration',
          type: 'Hash',
          description: 'Configuration object',
        },
        {
          name: 'configuration[accounts]',
          type: 'Hash',
          description: 'Account configuration',
        },
        {
          name: 'configuration[accounts][max_featured_tags]',
          type: 'Integer',
          description: 'Maximum featured tags',
        },
        {
          name: 'configuration[urls]',
          type: 'Hash',
          description: 'URL configuration',
        },
        {
          name: 'configuration[urls][streaming]',
          type: 'String (URL)',
          description: 'Streaming URL',
        },
        {
          name: 'thumbnail',
          type: 'Hash',
          description: 'Thumbnail object',
        },
        {
          name: 'thumbnail[url]',
          type: 'String (URL)',
          description: 'Thumbnail URL',
        },
        {
          name: 'thumbnail[versions]',
          type: 'Hash',
          description: 'Thumbnail versions',
          optional: true,
        },
        {
          name: 'thumbnail[versions][@1x]',
          type: 'String (URL)',
          description: 'Thumbnail 1x URL',
          optional: true,
        },
      ],
    };

    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: { schemas: {} },
    };

    entityConverter.convertEntities([mockEntity], spec);

    const schema = spec.components?.schemas?.TestInstance;
    expect(schema).toBeDefined();
    expect(schema?.type).toBe('object');

    // Check top-level properties
    expect(schema?.properties?.domain).toBeDefined();
    expect(schema?.properties?.domain?.type).toBe('string');

    // Check configuration is an object with nested properties
    expect(schema?.properties?.configuration).toBeDefined();
    expect(schema?.properties?.configuration?.type).toBe('object');
    expect(schema?.properties?.configuration?.properties).toBeDefined();

    // Check nested configuration.accounts structure
    const configProps = schema?.properties?.configuration?.properties;
    expect(configProps?.accounts).toBeDefined();
    expect(configProps?.accounts?.type).toBe('object');
    expect(configProps?.accounts?.properties).toBeDefined();
    expect(configProps?.accounts?.properties?.max_featured_tags).toBeDefined();
    expect(configProps?.accounts?.properties?.max_featured_tags?.type).toBe('integer');

    // Check nested configuration.urls structure
    expect(configProps?.urls).toBeDefined();
    expect(configProps?.urls?.type).toBe('object');
    expect(configProps?.urls?.properties).toBeDefined();
    expect(configProps?.urls?.properties?.streaming).toBeDefined();
    expect(configProps?.urls?.properties?.streaming?.type).toBe('string');

    // Check thumbnail structure
    expect(schema?.properties?.thumbnail).toBeDefined();
    expect(schema?.properties?.thumbnail?.type).toBe('object');
    expect(schema?.properties?.thumbnail?.properties).toBeDefined();

    const thumbnailProps = schema?.properties?.thumbnail?.properties;
    expect(thumbnailProps?.url).toBeDefined();
    expect(thumbnailProps?.url?.type).toBe('string');

    // Check nested thumbnail.versions structure
    expect(thumbnailProps?.versions).toBeDefined();
    expect(thumbnailProps?.versions?.type).toBe('object');
    expect(thumbnailProps?.versions?.properties).toBeDefined();
    expect(thumbnailProps?.versions?.properties?.['@1x']).toBeDefined();
    expect(thumbnailProps?.versions?.properties?.['@1x']?.type).toBe('string');

    // Check that flat properties with brackets don't exist
    expect(schema?.properties?.['configuration[accounts]']).toBeUndefined();
    expect(schema?.properties?.['configuration[accounts][max_featured_tags]']).toBeUndefined();
    expect(schema?.properties?.['thumbnail[url]']).toBeUndefined();
    expect(schema?.properties?.['thumbnail[versions][@1x]']).toBeUndefined();

    // Check required fields are properly handled
    expect(schema?.required).toContain('domain');
    expect(schema?.required).toContain('configuration');
    expect(schema?.required).toContain('thumbnail');
    expect(schema?.required).not.toContain('configuration[accounts]');
  });

  test('should handle optional nested properties correctly', () => {
    const mockEntity: EntityClass = {
      name: 'TestEntity',
      description: 'Test entity with optional nested properties',
      attributes: [
        {
          name: 'parent',
          type: 'Hash',
          description: 'Parent object',
        },
        {
          name: 'parent[required_child]',
          type: 'String',
          description: 'Required child property',
        },
        {
          name: 'parent[optional_child]',
          type: 'String',
          description: 'Optional child property',
          optional: true,
        },
      ],
    };

    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: { schemas: {} },
    };

    entityConverter.convertEntities([mockEntity], spec);

    const schema = spec.components?.schemas?.TestEntity;
    expect(schema).toBeDefined();

    const parentProps = schema?.properties?.parent?.properties;
    expect(parentProps?.required_child).toBeDefined();
    expect(parentProps?.optional_child).toBeDefined();

    // Check that parent is required
    expect(schema?.required).toContain('parent');
  });
});