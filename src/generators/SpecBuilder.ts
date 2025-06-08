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
      openapi: '3.0.3',
      info: {
        title: 'Mastodon API',
        version: '4.2.0',
        description: 'Documentation for the Mastodon API',
      },
      servers: [
        {
          url: 'https://mastodon.example',
          description: 'Production server',
        },
      ],
      paths: {},
      components: {
        schemas: {},
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
