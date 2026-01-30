import { VersionParser } from '../../parsers/VersionParser';

// Mock the config.json to return mastodon version 4.3.0 and minimum version 4.3.0
jest.mock('fs', () => ({
  readFileSync: jest.fn((filePath: string) => {
    if (filePath === 'config.json') {
      return JSON.stringify({
        mastodonDocsCommit: 'mock-commit',
        mastodonVersion: '4.3.0',
        minimumMastodonVersion: '4.3.0',
      });
    }
    return '';
  }),
}));

describe('VersionParser.isOperationUnreleased', () => {
  describe('Operations added in unreleased versions', () => {
    test('should return true for operation added in 4.4.0', () => {
      const versionHistory = '4.4.0 - added';
      expect(VersionParser.isOperationUnreleased(versionHistory)).toBe(true);
    });

    test('should return true for operation added in 4.5.0', () => {
      const versionHistory = '4.5.0 - added';
      expect(VersionParser.isOperationUnreleased(versionHistory)).toBe(true);
    });

    test('should return true for operation added in newer version with complex history', () => {
      const versionHistory = '4.4.0 - added\\n4.5.0 - some parameter updated';
      expect(VersionParser.isOperationUnreleased(versionHistory)).toBe(true);
    });

    test('should return true for operation with newline-separated version history', () => {
      const versionHistory = '4.4.0 - added\n4.5.0 - parameter updated';
      expect(VersionParser.isOperationUnreleased(versionHistory)).toBe(true);
    });
  });

  describe('Operations added in released versions', () => {
    test('should return false for operation added in current supported version (4.3.0)', () => {
      const versionHistory = '4.3.0 - added';
      expect(VersionParser.isOperationUnreleased(versionHistory)).toBe(false);
    });

    test('should return false for operation added in older version (2.7.0)', () => {
      const versionHistory = '2.7.0 - added';
      expect(VersionParser.isOperationUnreleased(versionHistory)).toBe(false);
    });

    test('should return false for operation added in older version with newer parameter additions', () => {
      const versionHistory =
        '2.7.0 - added\\n3.0.0 - added reason parameter\\n3.4.0 - added details to failure response\\n4.4.0 - added date_of_birth parameter';
      expect(VersionParser.isOperationUnreleased(versionHistory)).toBe(false);
    });

    test('should return false for operation with only parameter additions in newer versions', () => {
      const versionHistory =
        '1.0.0 - added\\n4.4.0 - added some_parameter parameter\\n4.5.0 - updated another_field';
      expect(VersionParser.isOperationUnreleased(versionHistory)).toBe(false);
    });

    test('should return false for operation with complex version history but added in older version', () => {
      const versionHistory =
        '0.0.0 - added\\n2.7.0 - scheduled_at added\\n2.8.0 - poll added\\n4.4.0 - some update';
      expect(VersionParser.isOperationUnreleased(versionHistory)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    test('should return false for empty version history', () => {
      expect(VersionParser.isOperationUnreleased('')).toBe(false);
    });

    test('should return false for null version history', () => {
      expect(VersionParser.isOperationUnreleased(null as any)).toBe(false);
    });

    test('should return false for undefined version history', () => {
      expect(VersionParser.isOperationUnreleased(undefined as any)).toBe(false);
    });

    test('should return false for version history without "added" entries', () => {
      const versionHistory = '4.4.0 - updated\\n4.5.0 - modified';
      expect(VersionParser.isOperationUnreleased(versionHistory)).toBe(false);
    });

    test('should not match parameter additions that contain "added"', () => {
      const versionHistory =
        '2.0.0 - added\\n4.4.0 - added some_parameter parameter';
      expect(VersionParser.isOperationUnreleased(versionHistory)).toBe(false);
    });

    test('should handle version history with extra whitespace', () => {
      const versionHistory = '  4.4.0  -  added  ';
      expect(VersionParser.isOperationUnreleased(versionHistory)).toBe(true);
    });

    test('should handle complex API version notes', () => {
      const versionHistory =
        '4.4.0 (mastodon API version 4) - added delete_media optional parameter';
      expect(VersionParser.isOperationUnreleased(versionHistory)).toBe(false);
    });
  });

  describe('Custom supported version', () => {
    test('should use custom supported version when provided', () => {
      const versionHistory = '4.2.0 - added';
      expect(VersionParser.isOperationUnreleased(versionHistory, '4.1.0')).toBe(
        true
      );
      expect(VersionParser.isOperationUnreleased(versionHistory, '4.2.0')).toBe(
        false
      );
      expect(VersionParser.isOperationUnreleased(versionHistory, '4.3.0')).toBe(
        false
      );
    });
  });
});
