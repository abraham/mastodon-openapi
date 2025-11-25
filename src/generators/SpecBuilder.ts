import { readFileSync } from 'fs';
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
    // load config.json
    const config = JSON.parse(readFileSync('config.json', 'utf8'));

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

    const description = `Unofficial documentation for the Mastodon API. Generated with [mastodon-openapi](https://github.com/abraham/mastodon-openapi) from [${config.mastodonDocsCommit.substring(0, 7)}](https://github.com/mastodon/documentation/commit/${config.mastodonDocsCommit}). Targets [supported](https://github.com/mastodon/mastodon/security/policy#supported-versions) Mastodon versions.`;

    return {
      openapi: '3.1.0',
      info: {
        title: 'Mastodon API',
        version: SUPPORTED_VERSION,
        description,
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
            description: 'OAuth 2.0 authentication',
            flows: {
              authorizationCode: {
                authorizationUrl: '/oauth/authorize',
                tokenUrl: '/oauth/token',
                scopes: scopesObject,
              },
              clientCredentials: {
                tokenUrl: '/oauth/token',
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
