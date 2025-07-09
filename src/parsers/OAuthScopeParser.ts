import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { OAuthScope, OAuthScopeCollection } from '../interfaces/OAuthScope';

class OAuthScopeParser {
  private oauthScopesPath: string;

  constructor() {
    this.oauthScopesPath = path.join(
      __dirname,
      '../../mastodon-documentation/content/en/api/oauth-scopes.md'
    );
  }

  public parseOAuthScopes(): OAuthScopeCollection {
    const scopes: OAuthScope[] = [];

    const content = fs.readFileSync(this.oauthScopesPath, 'utf-8');
    const parsed = matter(content);

    // Extract scopes from the markdown content
    const extractedScopes = this.extractScopesFromMarkdown(parsed.content);
    scopes.push(...extractedScopes);

    return { scopes };
  }

  private extractScopesFromMarkdown(content: string): OAuthScope[] {
    const scopes: OAuthScope[] = [];

    // Add high-level scopes manually as they have specific descriptions in sections
    scopes.push({
      name: 'profile',
      description: 'Access to the current user profile information only',
    });
    scopes.push({ name: 'read', description: 'Read access' });
    scopes.push({ name: 'write', description: 'Write access' });
    scopes.push({ name: 'push', description: 'Push notifications' });
    scopes.push({
      name: 'follow',
      description: 'Follow/unfollow accounts',
      deprecated: true,
    });
    scopes.push({
      name: 'admin:read',
      description: 'Administrative read access',
    });
    scopes.push({
      name: 'admin:write',
      description: 'Administrative write access',
    });

    // Extract granular scopes from the table
    const granularScopes = this.parseGranularScopesTable(content);

    // Deduplicate scopes - prefer high-level scopes over granular ones with same name
    const scopeMap = new Map<string, OAuthScope>();

    // Add high-level scopes first
    for (const scope of scopes) {
      scopeMap.set(scope.name, scope);
    }

    // Add granular scopes only if not already present
    for (const scope of granularScopes) {
      if (!scopeMap.has(scope.name)) {
        scopeMap.set(scope.name, scope);
      }
    }

    return Array.from(scopeMap.values());
  }

  private parseGranularScopesTable(content: string): OAuthScope[] {
    const scopes: OAuthScope[] = [];

    // Find the granular scopes table
    const tableMatch = content.match(
      /\| Scope\s+\| Granular Scopes\s+\|([\s\S]*?)(?=\n##|\n\n#|$)/
    );
    if (!tableMatch) {
      return scopes;
    }

    const tableContent = tableMatch[1];

    // Parse table rows - look for lines that contain granular scope names
    const lines = tableContent.split('\n');

    for (const line of lines) {
      // Skip table separator lines and empty lines
      if (
        line.trim() === '' ||
        line.includes('---') ||
        line.includes('Scope')
      ) {
        continue;
      }

      // Look for lines that have granular scopes in backticks
      const scopeMatches = line.match(/`([^`]+)`/g);
      if (scopeMatches) {
        for (const match of scopeMatches) {
          const scopeName = match.slice(1, -1); // Remove backticks

          // Only process granular scopes (those with colons), skip high-level scopes
          if (scopeName.includes(':') && !this.isHighLevelScope(scopeName)) {
            // Generate description based on scope name
            const description = this.generateScopeDescription(scopeName);

            scopes.push({
              name: scopeName,
              description,
            });
          }
        }
      }
    }

    return scopes;
  }

  private isHighLevelScope(scopeName: string): boolean {
    const highLevelScopes = [
      'profile',
      'read',
      'write',
      'push',
      'follow',
      'admin:read',
      'admin:write',
    ];
    return highLevelScopes.includes(scopeName);
  }

  private generateScopeDescription(scopeName: string): string {
    // Generate descriptions based on scope patterns
    if (scopeName.startsWith('read:')) {
      const resource = scopeName.substring(5);
      return `Read access to ${resource}`;
    } else if (scopeName.startsWith('write:')) {
      const resource = scopeName.substring(6);
      return `Write access to ${resource}`;
    } else if (scopeName.startsWith('admin:read:')) {
      const resource = scopeName.substring(11);
      return `Administrative read access to ${resource}`;
    } else if (scopeName.startsWith('admin:write:')) {
      const resource = scopeName.substring(12);
      return `Administrative write access to ${resource}`;
    }

    return `Access to ${scopeName}`;
  }
}

export { OAuthScopeParser };
