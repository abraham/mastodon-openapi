import { VersionParser } from '../../parsers/VersionParser';

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
});
