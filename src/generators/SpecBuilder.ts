import { OpenAPISpec } from '../interfaces/OpenAPISchema';
import { OAuthScopeParser } from '../parsers/OAuthScopeParser';

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
        version: '4.2.0',
        description:
          'Unofficial documentation for the Mastodon API. [Parsed](https://github.com/abraham/mastodon-openapi) from the documentation.',
      },
      externalDocs: {
        url: 'https://docs.joinmastodon.org/api/',
        description: 'Official Mastodon API documentation',
      },
      servers: [
        {
          url: 'https://mastodon.example',
          description: 'Production server',
        },
      ],
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
                authorizationUrl: 'https://mastodon.example/oauth/authorize',
                tokenUrl: 'https://mastodon.example/oauth/token',
                scopes: scopesObject,
              },
              clientCredentials: {
                tokenUrl: 'https://mastodon.example/oauth/token',
                scopes: clientCredentialsScopes,
              },
            },
          },
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Bearer token authentication',
          },
        },
      },
    };
  }
}

export { SpecBuilder };
