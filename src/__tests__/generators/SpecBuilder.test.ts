import { SpecBuilder } from '../../generators/SpecBuilder';
import { readFileSync } from 'fs';

// Mock fs to control config.json content
jest.mock('fs');
const mockReadFileSync = readFileSync as jest.MockedFunction<
  typeof readFileSync
>;

// Mock VersionParser to control SUPPORTED_VERSION and MINIMUM_VERSION
jest.mock('../../parsers/VersionParser', () => ({
  SUPPORTED_VERSION: '4.3.0',
  MINIMUM_VERSION: '4.2.0',
  VersionParser: class {
    static extractVersionNumbers = jest.fn();
    static compareVersions = jest.fn();
    static findMaxVersion = jest.fn();
    static hasNewerVersion = jest.fn();
    static isOperationUnreleased = jest.fn();
  },
}));

// Mock OAuthScopeParser to avoid file system dependencies
jest.mock('../../parsers/OAuthScopeParser', () => {
  return {
    OAuthScopeParser: jest.fn().mockImplementation(() => ({
      parseOAuthScopes: jest.fn().mockReturnValue({
        scopes: [
          { name: 'read', description: 'Read access' },
          { name: 'write', description: 'Write access' },
        ],
      }),
    })),
  };
});

describe('SpecBuilder', () => {
  let specBuilder: SpecBuilder;

  beforeEach(() => {
    specBuilder = new SpecBuilder();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('buildInitialSpec', () => {
    it('should include commit SHA in the description', () => {
      // Mock config.json with a test commit SHA
      const testCommitSha = 'abc123def456789';
      const mockConfig = {
        mastodonDocsCommit: testCommitSha,
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const spec = specBuilder.buildInitialSpec();

      // Check that the description contains the commit SHA
      expect(spec.info.description).toContain(testCommitSha.substring(0, 7));
      expect(spec.info.description).toContain(
        `https://github.com/mastodon/documentation/commit/${testCommitSha}`
      );
    });

    it('should truncate commit SHA to 7 characters in description', () => {
      // Mock config.json with a full commit SHA
      const fullCommitSha = 'cae24a64155b75631b5ad37029c2d9747ffc1c43';
      const expectedTruncated = 'cae24a6';
      const mockConfig = {
        mastodonDocsCommit: fullCommitSha,
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const spec = specBuilder.buildInitialSpec();

      // Check that the description contains the truncated SHA
      expect(spec.info.description).toContain(expectedTruncated);
      expect(spec.info.description).toContain(`[${expectedTruncated}]`);
    });

    it('should include full commit SHA in the link URL', () => {
      // Mock config.json with a test commit SHA
      const testCommitSha = 'abcdef1234567890abcdef1234567890abcdef12';
      const mockConfig = {
        mastodonDocsCommit: testCommitSha,
        mastodonVersion: '4.3.0',
        minimumMastodonVersion: '4.3.0',
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const spec = specBuilder.buildInitialSpec();

      // Check that the full commit SHA is used in the URL
      expect(spec.info.description).toContain(
        `https://github.com/mastodon/documentation/commit/${testCommitSha}`
      );
    });

    it('should have a well-formed description with commit reference', () => {
      // Mock config.json
      const testCommitSha = 'test123commit456';
      const mockConfig = {
        mastodonDocsCommit: testCommitSha,
        mastodonVersion: '4.3.0',
        minimumMastodonVersion: '4.3.0',
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const spec = specBuilder.buildInitialSpec();

      // Check the structure of the description
      const description = spec.info.description;
      expect(description).toMatch(
        /^Unofficial documentation for the Mastodon API\./
      );
      expect(description).toMatch(/Generated with \[mastodon-openapi\]/);
      expect(description).toMatch(/from \[test123\]/);
      expect(description).toMatch(
        /\(https:\/\/github\.com\/mastodon\/documentation\/commit\/test123commit456\)\./
      );
    });

    it('should have a single OAuth2 security scheme with both flows', () => {
      const mockConfig = {
        mastodonDocsCommit: 'test123commit456',
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const spec = specBuilder.buildInitialSpec();

      // Check that there is only one OAuth2 security scheme
      expect(spec.components?.securitySchemes).toBeDefined();
      expect(spec.components?.securitySchemes?.OAuth2).toBeDefined();
      expect(
        spec.components?.securitySchemes?.OAuth2ClientCredentials
      ).toBeUndefined();

      // Check the OAuth2 security scheme has both flows
      const oauth2 = spec.components?.securitySchemes?.OAuth2 as any;
      expect(oauth2.type).toBe('oauth2');
      expect(oauth2.description).toBe('OAuth 2.0 authentication');
      expect(oauth2.flows?.authorizationCode).toBeDefined();
      expect(oauth2.flows?.clientCredentials).toBeDefined();
    });

    it('should use path-only URLs for OAuth2 flows', () => {
      const mockConfig = {
        mastodonDocsCommit: 'test123commit456',
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const spec = specBuilder.buildInitialSpec();

      const oauth2 = spec.components?.securitySchemes?.OAuth2 as any;

      // Check authorizationCode flow URLs are path-only
      expect(oauth2.flows?.authorizationCode?.authorizationUrl).toBe(
        '/oauth/authorize'
      );
      expect(oauth2.flows?.authorizationCode?.tokenUrl).toBe('/oauth/token');

      // Check clientCredentials flow URL is path-only
      expect(oauth2.flows?.clientCredentials?.tokenUrl).toBe('/oauth/token');
    });

    it('should include scopes for both OAuth2 flows', () => {
      const mockConfig = {
        mastodonDocsCommit: 'test123commit456',
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const spec = specBuilder.buildInitialSpec();

      const oauth2 = spec.components?.securitySchemes?.OAuth2 as any;

      // Check authorizationCode flow has scopes (from mock: read, write)
      expect(oauth2.flows?.authorizationCode?.scopes).toBeDefined();
      expect(oauth2.flows?.authorizationCode?.scopes.read).toBe('Read access');
      expect(oauth2.flows?.authorizationCode?.scopes.write).toBe(
        'Write access'
      );

      // Check clientCredentials flow has scopes
      expect(oauth2.flows?.clientCredentials?.scopes).toBeDefined();
      expect(oauth2.flows?.clientCredentials?.scopes.read).toBe('Read access');
      expect(oauth2.flows?.clientCredentials?.scopes.write).toBe(
        'Write access'
      );
    });
  });
});
