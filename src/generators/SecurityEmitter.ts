import { ApiMethodsFile } from '../interfaces/ApiMethodsFile';

/**
 * Interface for OAuth security configuration
 */
export interface OAuthSecurityConfig {
  authType: 'public' | 'user' | 'app' | 'mixed' | 'unknown';
  scopes: string[];
  isOptional: boolean;
  supportsPublicAccess: boolean;
}

/**
 * Interprets the prose in a method's **OAuth:** line and turns it into
 * OpenAPI security requirements.
 */
export class SecurityEmitter {
  /**
   * Parse OAuth configuration from OAuth text
   * Handles various patterns like:
   * - "Public"
   * - "Public (for public statuses only), or user token + `read:statuses`"
   * - "User token + `write:blocks`"
   * - "App token + `write:accounts`"
   * - "User token + `read` or App token + `read`"
   */
  public parseOAuthConfig(oauthText: string): OAuthSecurityConfig {
    if (!oauthText || oauthText.trim() === '') {
      return {
        authType: 'unknown',
        scopes: [],
        isOptional: false,
        supportsPublicAccess: false,
      };
    }

    const text = oauthText.toLowerCase().trim();

    // Check for public access patterns
    const isPublicOnly = text === 'public';
    const hasPublicAccess = text.includes('public');
    const hasUserToken = text.includes('user token');
    const hasAppToken = text.includes('app token');

    // Extract scopes from backticks
    const scopes = this.extractOAuthScopes(oauthText);

    // Determine auth type and configuration
    if (isPublicOnly) {
      return {
        authType: 'public',
        scopes: [],
        isOptional: true,
        supportsPublicAccess: true,
      };
    }

    if (hasPublicAccess && hasUserToken) {
      // Pattern like "Public (for public statuses only), or user token + `read:statuses`"
      return {
        authType: 'user',
        scopes,
        isOptional: true,
        supportsPublicAccess: true,
      };
    }

    if (hasUserToken && hasAppToken) {
      // Pattern like "User token + `read` or App token + `read`"
      return {
        authType: 'mixed',
        scopes,
        isOptional: false,
        supportsPublicAccess: false,
      };
    }

    if (hasUserToken) {
      // Pattern like "User token + `write:blocks`"
      return {
        authType: 'user',
        scopes,
        isOptional: false,
        supportsPublicAccess: false,
      };
    }

    if (hasAppToken) {
      // Pattern like "App token + `write:accounts`"
      return {
        authType: 'app',
        scopes,
        isOptional: false,
        supportsPublicAccess: false,
      };
    }

    // Fallback for unrecognized patterns
    return {
      authType: 'unknown',
      scopes,
      isOptional: false,
      supportsPublicAccess: false,
    };
  }

  /**
   * Generate security requirements based on OAuth configuration
   */
  public generateSecurityRequirement(
    config: OAuthSecurityConfig
  ): Array<Record<string, string[]>> | undefined {
    const securityRequirements: Array<Record<string, string[]>> = [];

    switch (config.authType) {
      case 'public':
        // Public endpoints with no authentication required
        return undefined;

      case 'user':
        if (config.supportsPublicAccess) {
          // Optional authentication: only show the optional user token
          // Remove empty object {} to clean up security requirements
          securityRequirements.push({ OAuth2: config.scopes }); // Optional user token
        } else {
          // Required user token
          securityRequirements.push({ OAuth2: config.scopes });
        }
        break;

      case 'app':
        // Required app token (client credentials flow)
        securityRequirements.push({ OAuth2: config.scopes });
        break;

      case 'mixed':
        // Supports both user and app tokens - both use the same OAuth2 security scheme
        // with different flows (authorizationCode for user tokens, clientCredentials for app tokens)
        securityRequirements.push({ OAuth2: config.scopes });
        break;

      case 'unknown':
      default:
        // Fallback to basic OAuth with extracted scopes
        if (config.scopes.length > 0 || !config.supportsPublicAccess) {
          securityRequirements.push({ OAuth2: config.scopes });
        }
        break;
    }

    return securityRequirements.length > 0 ? securityRequirements : undefined;
  }

  /**
   * Extract OAuth scopes from OAuth text
   * Parses strings like "User token + `write:blocks`" to extract ["write:blocks"]
   * Only returns valid OAuth scopes, filters out query parameters mentioned in backticks
   */
  private extractOAuthScopes(oauthText: string): string[] {
    const scopeSet = new Set<string>();

    // Match scope patterns in backticks, e.g., `write:blocks`, `read:accounts`, `read`
    const scopeMatches = oauthText.match(/`([^`]+)`/g);

    if (scopeMatches) {
      for (const match of scopeMatches) {
        const scope = match.slice(1, -1); // Remove backticks
        if (scope && this.isValidOAuthScope(scope)) {
          scopeSet.add(scope);
        }
      }
    }

    return Array.from(scopeSet);
  }

  /**
   * Collect app token scopes from all API methods
   * These are scopes that should be available in the clientCredentials OAuth flow
   * @returns Set of scope names that are used with App token authentication
   */
  public collectAppTokenScopes(methodFiles: ApiMethodsFile[]): Set<string> {
    const appTokenScopes = new Set<string>();

    for (const methodFile of methodFiles) {
      for (const method of methodFile.methods) {
        if (method.oauth) {
          const scopes = this.extractAppTokenScopes(method.oauth);
          for (const scope of scopes) {
            appTokenScopes.add(scope);
          }
        }
      }
    }

    return appTokenScopes;
  }

  /**
   * Extract scopes that are specifically associated with App token authentication
   * Handles patterns like:
   * - "App token + `write:accounts`" -> ["write:accounts"]
   * - "App token" -> ["read"] (default)
   * - "User token + `read` or App token + `read`" -> ["read"]
   * - "User token + `write:blocks`" -> [] (not app token)
   */
  private extractAppTokenScopes(oauthText: string): string[] {
    const text = oauthText.toLowerCase().trim();

    // Check if this method supports App token
    if (!text.includes('app token')) {
      return [];
    }

    // Extract scopes from the OAuth text
    const scopes = this.extractOAuthScopes(oauthText);

    // If App token is mentioned but no scopes are specified, default to 'read'
    // Pattern: "App token" or "App token\n"
    if (scopes.length === 0) {
      return ['read'];
    }

    return scopes;
  }

  /**
   * Check if a string is a valid OAuth scope
   * Valid scopes are either high-level scopes or granular scopes with colons
   */
  private isValidOAuthScope(scope: string): boolean {
    // High-level scopes
    const highLevelScopes = [
      'profile',
      'read',
      'write',
      'push',
      'follow', // deprecated but still valid
      'admin:read',
      'admin:write',
    ];

    if (highLevelScopes.includes(scope)) {
      return true;
    }

    // Granular scopes must contain colons and follow known patterns
    if (scope.includes(':')) {
      // Valid granular scope prefixes
      const validPrefixes = ['read:', 'write:', 'admin:read:', 'admin:write:'];

      return validPrefixes.some((prefix) => scope.startsWith(prefix));
    }

    return false;
  }
}
