import { OAuthScopeParser } from '../../parsers/OAuthScopeParser';

describe('OAuthScopeParser', () => {
  let parser: OAuthScopeParser;

  beforeEach(() => {
    parser = new OAuthScopeParser();
  });

  test('should parse OAuth scopes from markdown file', () => {
    const result = parser.parseOAuthScopes();

    expect(result.scopes).toBeDefined();
    expect(result.scopes.length).toBeGreaterThan(0);
  });

  test('should include high-level scopes', () => {
    const result = parser.parseOAuthScopes();
    const scopeNames = result.scopes.map((s) => s.name);

    expect(scopeNames).toContain('profile');
    expect(scopeNames).toContain('read');
    expect(scopeNames).toContain('write');
    expect(scopeNames).toContain('push');
    expect(scopeNames).toContain('follow');
    expect(scopeNames).toContain('admin:read');
    expect(scopeNames).toContain('admin:write');
  });

  test('should include granular scopes', () => {
    const result = parser.parseOAuthScopes();
    const scopeNames = result.scopes.map((s) => s.name);

    // Test for some expected granular scopes
    expect(scopeNames).toContain('read:accounts');
    expect(scopeNames).toContain('write:accounts');
    expect(scopeNames).toContain('read:statuses');
    expect(scopeNames).toContain('write:statuses');
  });

  test('should mark follow scope as deprecated', () => {
    const result = parser.parseOAuthScopes();
    const followScope = result.scopes.find((s) => s.name === 'follow');

    expect(followScope).toBeDefined();
    expect(followScope?.deprecated).toBe(true);
  });

  test('should generate appropriate descriptions', () => {
    const result = parser.parseOAuthScopes();

    const readAccountsScope = result.scopes.find(
      (s) => s.name === 'read:accounts'
    );
    expect(readAccountsScope?.description).toBe('Read access to accounts');

    const writeStatusesScope = result.scopes.find(
      (s) => s.name === 'write:statuses'
    );
    expect(writeStatusesScope?.description).toBe('Write access to statuses');
  });

  test('should include admin scopes', () => {
    const result = parser.parseOAuthScopes();
    const scopeNames = result.scopes.map((s) => s.name);

    // Test for admin scopes
    expect(scopeNames).toContain('admin:read:accounts');
    expect(scopeNames).toContain('admin:write:accounts');
  });
});
