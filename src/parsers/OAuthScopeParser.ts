import { OAuthScope, OAuthScopeCollection } from '../interfaces/OAuthScope';
import { DocumentSource } from '../source/DocumentSource';
import { defaultSource } from '../source/FileSystemSource';
import { MarkdownDocument } from '../document/MarkdownDocument';
import { parseTables } from '../document/tables';

class OAuthScopeParser {
  constructor(private readonly source: DocumentSource = defaultSource()) {}

  public parseOAuthScopes(): OAuthScopeCollection {
    const scopes: OAuthScope[] = [];

    const document = MarkdownDocument.parse(
      this.source.readGuide('api/oauth-scopes.md'),
      'api/oauth-scopes.md'
    );

    // Extract scopes from the markdown content
    const extractedScopes = this.extractScopesFromMarkdown(document.body);
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

    const table = parseTables(content).find(
      (candidate) =>
        candidate.headers[0] === 'Scope' &&
        candidate.headers[1] === 'Granular Scopes'
    );

    if (!table) {
      return scopes;
    }

    for (const row of table.rows) {
      for (const cell of row) {
        for (const match of cell.matchAll(/`([^`]+)`/g)) {
          const scopeName = match[1];

          // Only granular scopes; the high-level ones are described by hand
          if (scopeName.includes(':') && !this.isHighLevelScope(scopeName)) {
            scopes.push({
              name: scopeName,
              description: this.generateScopeDescription(scopeName),
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
