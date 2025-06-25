import { EntityConverter } from '../../generators/EntityConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { EntityClass } from '../../interfaces/EntityClass';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('EntityConverter - OAuth Scopes Integration', () => {
  let entityConverter: EntityConverter;
  let spec: OpenAPISpec;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    const typeParser = new TypeParser(utilityHelpers);
    entityConverter = new EntityConverter(typeParser, utilityHelpers);

    // Create a minimal spec
    spec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          OAuthScope: {
            type: 'string',
            description: 'OAuth scope for API access',
            enum: ['read', 'write', 'profile'],
          } as any,
          OAuthScopes: {
            type: 'array',
            description: 'Array of OAuth scopes',
            items: {
              $ref: '#/components/schemas/OAuthScope',
            },
          } as any,
        },
      },
    };
  });

  test('should convert scopes_supported property to OAuthScopes reference', () => {
    const entities: EntityClass[] = [
      {
        name: 'DiscoverOauthServerConfigurationResponse',
        description: 'Response schema for Discover OAuth Server Configuration',
        attributes: [
          {
            name: 'scopes_supported',
            type: 'Array of String',
            description: 'Array of scopes_supported',
            optional: false,
            nullable: false,
          },
        ],
      },
    ];

    entityConverter.convertEntities(entities, spec);

    const schema = spec.components!.schemas![
      'DiscoverOauthServerConfigurationResponse'
    ] as any;

    expect(schema.properties.scopes_supported).toEqual({
      description: 'Array of scopes_supported',
      $ref: '#/components/schemas/OAuthScopes',
    });
  });

  test('should convert scopes property to OAuthScopes reference', () => {
    const entities: EntityClass[] = [
      {
        name: 'Application',
        description: 'Application entity',
        attributes: [
          {
            name: 'scopes',
            type: 'Array of String',
            description: 'The scopes for your application',
            optional: false,
            nullable: false,
          },
        ],
      },
    ];

    entityConverter.convertEntities(entities, spec);

    const schema = spec.components!.schemas!['Application'] as any;

    expect(schema.properties.scopes).toEqual({
      description: 'The scopes for your application',
      $ref: '#/components/schemas/OAuthScopes',
    });
  });

  test('should not convert non-OAuth scope arrays', () => {
    const entities: EntityClass[] = [
      {
        name: 'TestEntity',
        description: 'Test entity',
        attributes: [
          {
            name: 'tags',
            type: 'Array of String',
            description: 'Array of tags',
            optional: false,
            nullable: false,
          },
        ],
      },
    ];

    entityConverter.convertEntities(entities, spec);

    const schema = spec.components!.schemas!['TestEntity'] as any;

    expect(schema.properties.tags).toEqual({
      type: 'array',
      description: 'Array of tags',
      items: { type: 'string' },
    });
  });

  test('should handle nullable and deprecated OAuth scope properties', () => {
    const entities: EntityClass[] = [
      {
        name: 'TestEntity',
        description: 'Test entity',
        attributes: [
          {
            name: 'scopes_supported',
            type: 'Array of String',
            description: 'Array of scopes_supported',
            optional: true,
            nullable: true,
            deprecated: true,
          },
        ],
      },
    ];

    entityConverter.convertEntities(entities, spec);

    const schema = spec.components!.schemas!['TestEntity'] as any;

    expect(schema.properties.scopes_supported).toEqual({
      description: 'Array of scopes_supported',
      oneOf: [{ $ref: '#/components/schemas/OAuthScopes' }, { type: 'null' }],
      deprecated: true,
    });
  });
});
