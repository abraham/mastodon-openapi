import { SpecBuilder } from '../../generators/SpecBuilder';
import { readFileSync } from 'fs';

// Mock fs to control config.json content
jest.mock('fs');
const mockReadFileSync = readFileSync as jest.MockedFunction<
  typeof readFileSync
>;

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
  });
});
