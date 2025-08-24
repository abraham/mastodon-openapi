import { VersionParser } from '../../parsers/VersionParser';

describe('VersionParser - extractAddedVersionsOnly', () => {
  test('should extract only added versions, excluding moved operations', () => {
    const versionHistory = `0.9.9 - added\\
4.3.0 - moved to \`CredentialApplication\` from \`Application\``;

    const addedVersions =
      VersionParser.extractAddedVersionsOnly(versionHistory);

    // Should only include 0.9.9 (added), not 4.3.0 (moved)
    expect(addedVersions).toEqual(['0.9.9']);
    expect(addedVersions).not.toContain('4.3.0');
  });

  test('should include all versions when no moved operations', () => {
    const versionHistory = `0.9.9 - added\\
2.0.0 - updated\\
3.1.0 - changed format`;

    const addedVersions =
      VersionParser.extractAddedVersionsOnly(versionHistory);

    // Should include all versions since none are "moved"
    expect(addedVersions).toEqual(['0.9.9', '2.0.0', '3.1.0']);
  });

  test('should handle multiple moved operations', () => {
    const versionHistory = `0.9.9 - added\\
4.2.0 - moved to different location\\
4.3.0 - moved to \`CredentialApplication\` from \`Application\`\\
4.4.0 - updated description`;

    const addedVersions =
      VersionParser.extractAddedVersionsOnly(versionHistory);

    // Should exclude both moved operations
    expect(addedVersions).toEqual(['0.9.9', '4.4.0']);
    expect(addedVersions).not.toContain('4.2.0');
    expect(addedVersions).not.toContain('4.3.0');
  });

  test('should handle empty version history', () => {
    const versionHistory = '';
    const addedVersions =
      VersionParser.extractAddedVersionsOnly(versionHistory);
    expect(addedVersions).toEqual([]);
  });

  test('should handle case variations of moved', () => {
    const versionHistory = `0.9.9 - added\\
4.3.0 - Moved to new location\\
4.4.0 - MOVED from old place`;

    const addedVersions =
      VersionParser.extractAddedVersionsOnly(versionHistory);

    // Should exclude both moved operations regardless of case
    expect(addedVersions).toEqual(['0.9.9']);
  });
});
