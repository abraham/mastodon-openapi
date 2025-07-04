import { OpenAPISpec } from '../interfaces/OpenAPISchema';
import { OAuthScopeParser } from '../parsers/OAuthScopeParser';
import { SUPPORTED_VERSION } from '../parsers/VersionParser';

/**
 * Builder for OpenAPI specification with authentication setup
 */
class SpecBuilder {
  /**
   * Build initial OpenAPI specification with OAuth configuration
   */
  public buildInitialSpec(): OpenAPISpec {
    // Parse OAuth scopes from documentation
    const oauthParser = new OAuthScopeParser();
    const oauthScopes = oauthParser.parseOAuthScopes();

    // Convert scopes to the format needed for OpenAPI
    const scopesObject: Record<string, string> = {};
    for (const scope of oauthScopes.scopes) {
      scopesObject[scope.name] = scope.description;
    }

    // Filter scopes for clientCredentials flow (typically only read/write scopes)
    const clientCredentialsScopes: Record<string, string> = {};
    for (const scope of oauthScopes.scopes) {
      // Include high-level scopes and non-user-specific scopes for client credentials
      if (
        ['read', 'write'].includes(scope.name) ||
        (scope.name.startsWith('read:') &&
          !scope.name.includes('notifications')) ||
        (scope.name.startsWith('write:') &&
          !scope.name.includes('notifications'))
      ) {
        clientCredentialsScopes[scope.name] = scope.description;
      }
    }

    return {
      openapi: '3.1.0',
      info: {
        title: 'Mastodon API',
        version: SUPPORTED_VERSION,
        description:
          'Unofficial documentation for the Mastodon API. [Parsed](https://github.com/abraham/mastodon-openapi) from the documentation.',
        license: {
          name: 'GFDL-1.3',
          url: 'https://www.gnu.org/licenses/fdl-1.3.en.html',
        },
        'x-logo': {
          url: 'https://github.com/abraham/mastodon-openapi/blob/main/mastodon-logo.webp?raw=true',
          altText: 'Mastodon logo',
        },
      },
      externalDocs: {
        url: 'https://docs.joinmastodon.org/api/',
        description: 'Official Mastodon API documentation',
      },
      servers: [
        {
          url: 'https://{hostname}',
          description: 'Mastodon instance',
          variables: {
            hostname: {
              default: 'mastodon.example',
              description: 'Hostname of the Mastodon instance',
            },
          },
        },
      ],
      security: [],
      paths: {},
      components: {
        schemas: {
          OAuthScope: {
            type: 'string',
            description: 'OAuth scope for API access',
            enum: oauthScopes.scopes.map((scope) => scope.name),
          } as any,
          OAuthScopes: {
            type: 'array',
            description: 'Array of OAuth scopes',
            items: {
              $ref: '#/components/schemas/OAuthScope',
            },
          } as any,
        },
        securitySchemes: {
          OAuth2: {
            type: 'oauth2',
            description:
              'OAuth 2.0 authentication for user tokens (authorization code flow)',
            flows: {
              authorizationCode: {
                authorizationUrl: 'https://mastodon.example/oauth/authorize',
                tokenUrl: 'https://mastodon.example/oauth/token',
                scopes: scopesObject,
              },
            },
          },
          OAuth2ClientCredentials: {
            type: 'oauth2',
            description:
              'OAuth 2.0 authentication for app tokens (client credentials flow)',
            flows: {
              clientCredentials: {
                tokenUrl: 'https://mastodon.example/oauth/token',
                scopes: clientCredentialsScopes,
              },
            },
          },
        },
      },
    };
  }
}

export { SpecBuilder };
