import { VersionParser } from '../../parsers/VersionParser';

// Mock the config.json to return mastodon version 4.3.0 and minimum version 4.2.0
jest.mock('fs', () => ({
  readFileSync: jest.fn((filePath: string) => {
    if (filePath === 'config.json') {
      return JSON.stringify({
        mastodonDocsCommit: 'mock-commit',
        mastodonVersion: '4.3.0',
        minimumMastodonVersion: '4.2.0',
      });
    }
    return '';
  }),
}));

describe('VersionParser', () => {
  describe('extractVersionNumbers', () => {
    it('should extract single version number', () => {
      const versionHistory = '0.0.0 - added';
      const versions = VersionParser.extractVersionNumbers(versionHistory);
      expect(versions).toEqual(['0.0.0']);
    });

    it('should extract multiple version numbers', () => {
      const versionHistory = `0.0.0 - added
2.7.0 - scheduled_at added
2.8.0 - poll added`;
      const versions = VersionParser.extractVersionNumbers(versionHistory);
      expect(versions).toEqual(['0.0.0', '2.7.0', '2.8.0']);
    });

    it('should handle complex version history with additional text', () => {
      const versionHistory =
        '4.4.0 (`mastodon` API version 4) - added `delete_media` optional parameter';
      const versions = VersionParser.extractVersionNumbers(versionHistory);
      expect(versions).toEqual(['4.4.0']);
    });

    it('should handle backslash line breaks', () => {
      const versionHistory =
        '0.0.0 - added\\n2.7.0 - `scheduled_at` added\\n2.8.0 - `poll` added';
      const versions = VersionParser.extractVersionNumbers(versionHistory);
      expect(versions).toEqual(['0.0.0', '2.7.0', '2.8.0']);
    });

    it('should handle empty or null input', () => {
      expect(VersionParser.extractVersionNumbers('')).toEqual([]);
      expect(VersionParser.extractVersionNumbers(null as any)).toEqual([]);
      expect(VersionParser.extractVersionNumbers(undefined as any)).toEqual([]);
    });

    it('should remove duplicates', () => {
      const versionHistory = `0.0.0 - added
0.0.0 - modified
2.7.0 - new feature`;
      const versions = VersionParser.extractVersionNumbers(versionHistory);
      expect(versions).toEqual(['0.0.0', '2.7.0']);
    });

    it('should handle version numbers with mixed formatting', () => {
      const versionHistory = `3.3.0 - both min_id and max_id can be used at the same time now
4.0.0 - limit unauthenticated requests`;
      const versions = VersionParser.extractVersionNumbers(versionHistory);
      expect(versions).toEqual(['3.3.0', '4.0.0']);
    });
  });

  describe('compareVersions', () => {
    it('should compare versions correctly', () => {
      expect(VersionParser.compareVersions('1.0.0', '2.0.0')).toBe('2.0.0');
      expect(VersionParser.compareVersions('2.0.0', '1.0.0')).toBe('2.0.0');
      expect(VersionParser.compareVersions('1.0.0', '1.0.0')).toBe('1.0.0');
    });

    it('should handle different version formats', () => {
      expect(VersionParser.compareVersions('1.5.0', '1.10.0')).toBe('1.10.0');
      expect(VersionParser.compareVersions('2.1.5', '2.1.10')).toBe('2.1.10');
      expect(VersionParser.compareVersions('10.0.0', '9.5.0')).toBe('10.0.0');
    });

    it('should handle major version differences', () => {
      expect(VersionParser.compareVersions('4.2.0', '3.5.0')).toBe('4.2.0');
      expect(VersionParser.compareVersions('0.9.9', '1.0.0')).toBe('1.0.0');
    });
  });

  describe('findMaxVersion', () => {
    it('should find the maximum version from array', () => {
      const versions = ['0.0.0', '2.7.0', '2.8.0', '1.5.0'];
      expect(VersionParser.findMaxVersion(versions)).toBe('2.8.0');
    });

    it('should handle array with single version', () => {
      const versions = ['3.5.0'];
      expect(VersionParser.findMaxVersion(versions)).toBe('3.5.0');
    });

    it('should return fallback for empty array', () => {
      expect(VersionParser.findMaxVersion([])).toBe('4.2.0');
      expect(VersionParser.findMaxVersion(null as any)).toBe('4.2.0');
      expect(VersionParser.findMaxVersion(undefined as any)).toBe('4.2.0');
    });

    it('should handle complex version scenarios', () => {
      const versions = ['0.1.0', '4.4.0', '3.5.0', '2.9.0', '10.0.0'];
      expect(VersionParser.findMaxVersion(versions)).toBe('10.0.0');
    });
  });

  describe('hasNewerVersion', () => {
    it('should return true when array contains version newer than supported', () => {
      const versions = ['4.0.0', '4.4.0', '3.5.0'];
      expect(VersionParser.hasNewerVersion(versions, '4.3.0')).toBe(true);
    });

    it('should return false when all versions are older than or equal to supported', () => {
      const versions = ['4.0.0', '4.3.0', '3.5.0'];
      expect(VersionParser.hasNewerVersion(versions, '4.3.0')).toBe(false);
    });

    it('should return false when array contains only older versions', () => {
      const versions = ['4.0.0', '4.2.0', '3.5.0'];
      expect(VersionParser.hasNewerVersion(versions, '4.3.0')).toBe(false);
    });

    it('should use default supported version 4.3.0 when not specified', () => {
      const versions = ['4.4.0'];
      expect(VersionParser.hasNewerVersion(versions)).toBe(true);
    });

    it('should return false for empty or null arrays', () => {
      expect(VersionParser.hasNewerVersion([])).toBe(false);
      expect(VersionParser.hasNewerVersion(null as any)).toBe(false);
      expect(VersionParser.hasNewerVersion(undefined as any)).toBe(false);
    });

    it('should handle multiple newer versions', () => {
      const versions = ['4.4.0', '4.5.0', '5.0.0'];
      expect(VersionParser.hasNewerVersion(versions, '4.3.0')).toBe(true);
    });

    it('should handle exact version match correctly', () => {
      const versions = ['4.3.0'];
      expect(VersionParser.hasNewerVersion(versions, '4.3.0')).toBe(false);
    });
  });

  describe('withinOneMinorVersion', () => {
    it('should return true when array contains version within one minor version', () => {
      const versions = ['4.2.0', '4.4.0', '3.5.0'];
      expect(VersionParser.withinOneMinorVersion(versions, '4.3.0')).toBe(true);
    });

    it('should return false when no versions are within one minor version', () => {
      const versions = ['4.0.0', '4.5.0', '5.0.0'];
      expect(VersionParser.withinOneMinorVersion(versions, '4.3.0')).toBe(
        false
      );
    });

    it('should return true for exact version match', () => {
      const versions = ['4.3.0'];
      expect(VersionParser.withinOneMinorVersion(versions, '4.3.0')).toBe(true);
    });

    it('should handle multiple versions with mixed minor versions', () => {
      const versions = ['4.1.0', '4.4.0', '5.0.0'];
      expect(VersionParser.withinOneMinorVersion(versions, '4.3.0')).toBe(true);
    });

    it('should use default supported version 4.3.0 when not specified', () => {
      const versions = ['4.2.0'];
      expect(VersionParser.withinOneMinorVersion(versions)).toBe(true);
    });

    it('should return false for empty or null arrays', () => {
      expect(VersionParser.withinOneMinorVersion([])).toBe(false);
      expect(VersionParser.withinOneMinorVersion(null as any)).toBe(false);
      expect(VersionParser.withinOneMinorVersion(undefined as any)).toBe(false);
    });

    it('should handle single digit minor versions', () => {
      const versions = ['1.1.0', '2.0.0'];
      expect(VersionParser.withinOneMinorVersion(versions, '1.0.0')).toBe(true);
    });
  });

  describe('isVersionSupported', () => {
    it('should return true when version is within supported range', () => {
      const versions = ['4.2.0', '4.3.0'];
      expect(VersionParser.isVersionSupported(versions, '4.2.0', '4.3.0')).toBe(
        true
      );
    });

    it('should return true when version equals minimum', () => {
      const versions = ['4.2.0'];
      expect(VersionParser.isVersionSupported(versions, '4.2.0', '4.3.0')).toBe(
        true
      );
    });

    it('should return true when version equals maximum', () => {
      const versions = ['4.3.0'];
      expect(VersionParser.isVersionSupported(versions, '4.2.0', '4.3.0')).toBe(
        true
      );
    });

    it('should return false when all versions are below minimum', () => {
      const versions = ['4.0.0', '4.1.0'];
      expect(VersionParser.isVersionSupported(versions, '4.2.0', '4.3.0')).toBe(
        false
      );
    });

    it('should return false when all versions are above maximum', () => {
      const versions = ['4.4.0', '4.5.0'];
      expect(VersionParser.isVersionSupported(versions, '4.2.0', '4.3.0')).toBe(
        false
      );
    });

    it('should return true when at least one version is supported', () => {
      const versions = ['4.0.0', '4.2.0', '4.5.0'];
      expect(VersionParser.isVersionSupported(versions, '4.2.0', '4.3.0')).toBe(
        true
      );
    });

    it('should use default minimum and maximum versions when not specified', () => {
      const versions = ['4.2.0'];
      expect(VersionParser.isVersionSupported(versions)).toBe(true);
    });

    it('should return false for empty or null arrays', () => {
      expect(VersionParser.isVersionSupported([])).toBe(false);
      expect(VersionParser.isVersionSupported(null as any)).toBe(false);
      expect(VersionParser.isVersionSupported(undefined as any)).toBe(false);
    });

    it('should handle complex version numbers', () => {
      const versions = ['4.2.1', '4.2.5'];
      expect(VersionParser.isVersionSupported(versions, '4.2.0', '4.3.0')).toBe(
        true
      );
    });
  });
});
