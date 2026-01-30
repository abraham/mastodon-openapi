import { UtilityHelpers } from '../generators/UtilityHelpers';
import { readFileSync } from 'fs';

/**
 * Get the currently supported Mastodon API version from config.json
 */
function getSupportedVersion(): string {
  const config = JSON.parse(readFileSync('config.json', 'utf8'));
  return config.mastodonVersion;
}

/**
 * Get the minimum supported Mastodon API version from config.json
 */
function getMinimumVersion(): string {
  const config = JSON.parse(readFileSync('config.json', 'utf8'));
  return config.minimumMastodonVersion;
}

/**
 * The currently supported Mastodon API version
 */
export const SUPPORTED_VERSION = getSupportedVersion();

/**
 * The minimum supported Mastodon API version
 */
export const MINIMUM_VERSION = getMinimumVersion();

/**
 * Utility class for parsing version numbers from version history strings
 */
export class VersionParser {
  /**
   * Extracts version numbers from a version history string
   * @param versionHistory The version history string (e.g., "0.0.0 - added\n2.7.0 - scheduled_at added")
   * @returns Array of version numbers found in the string
   */
  static extractVersionNumbers(versionHistory: string): string[] {
    if (!versionHistory) {
      return [];
    }

    const versions: string[] = [];

    // Replace literal \n with actual newlines to handle backslash-escaped newlines
    const normalizedHistory = versionHistory.replace(/\\n/g, '\n');

    // Match version numbers at the start of lines or after whitespace
    // Supports formats like: "0.0.0", "2.7.0", "4.4.0", etc.
    const versionRegex = /(?:^|\s)(\d+\.\d+\.\d+)(?:\s|-)/gm;

    let match;
    while ((match = versionRegex.exec(normalizedHistory)) !== null) {
      const version = match[1];
      if (!versions.includes(version)) {
        versions.push(version);
      }
    }

    return versions;
  }

  /**
   * Compares two version strings and returns the larger one
   * @param version1 First version string (e.g., "1.2.3")
   * @param version2 Second version string (e.g., "2.1.0")
   * @returns The larger version string, or version1 if they're equal
   */
  static compareVersions(version1: string, version2: string): string {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part > v2Part) {
        return version1;
      } else if (v2Part > v1Part) {
        return version2;
      }
    }

    return version1; // They are equal, return first one
  }

  /**
   * Finds the maximum version from an array of version strings
   * @param versions Array of version strings
   * @returns The maximum version, or "4.2.0" as fallback if no versions found
   */
  static findMaxVersion(versions: string[]): string {
    if (!versions || versions.length === 0) {
      return '4.3.0'; // Fallback to current hardcoded version
    }

    return versions.reduce((max, current) =>
      this.compareVersions(max, current) === max ? max : current
    );
  }

  /**
   * Checks if any version in the array is newer than the supported version
   * @param versions Array of version strings to check
   * @param supportedVersion The current supported version (default: SUPPORTED_VERSION)
   * @returns True if any version is newer than the supported version
   */
  static hasNewerVersion(
    versions: string[],
    supportedVersion: string = SUPPORTED_VERSION
  ): boolean {
    if (!versions || versions.length === 0) {
      return false;
    }

    return versions.some(
      (version) =>
        this.compareVersions(version, supportedVersion) === version &&
        version !== supportedVersion
    );
  }

  /**
   * Checks if any version in the array is within one minor version of the supported version
   * @param versions Array of version strings to check
   * @param supportedVersion The current supported version (default: SUPPORTED_VERSION)
   * @returns True if any version is within one minor version of the supported version
   */
  static withinOneMinorVersion(
    versions: string[],
    supportedVersion: string = SUPPORTED_VERSION
  ): boolean {
    if (!versions || versions.length === 0) {
      return false;
    }

    const supportedParts = supportedVersion.split('.').map(Number);
    const supportedMajor = supportedParts[0];
    const supportedMinor = supportedParts[1];

    return versions.some((version) => {
      const versionParts = version.split('.').map(Number);
      const versionMajor = versionParts[0];
      const versionMinor = versionParts[1];

      // Same major version and within one minor version
      return (
        versionMajor === supportedMajor &&
        Math.abs(versionMinor - supportedMinor) <= 1
      );
    });
  }

  /**
   * Checks if any version in the array is supported (within the configured version range)
   * @param versions Array of version strings to check
   * @param minimumVersion The minimum supported version (default: MINIMUM_VERSION)
   * @param maximumVersion The maximum supported version (default: SUPPORTED_VERSION)
   * @returns True if any version is within the supported version range
   */
  static isVersionSupported(
    versions: string[],
    minimumVersion: string = MINIMUM_VERSION,
    maximumVersion: string = SUPPORTED_VERSION
  ): boolean {
    if (!versions || versions.length === 0) {
      return false;
    }

    // Ensure we have valid version strings
    if (!minimumVersion || !maximumVersion) {
      return false;
    }

    return versions.some((version) => {
      if (!version) {
        return false;
      }
      // Check if version is >= minimum and <= maximum
      const isAboveMinimum =
        this.compareVersions(version, minimumVersion) === version ||
        version === minimumVersion;
      const isBelowMaximum =
        this.compareVersions(maximumVersion, version) === maximumVersion ||
        version === maximumVersion;
      return isAboveMinimum && isBelowMaximum;
    });
  }

  /**
   * Checks if an operation was added in a version newer than the supported version
   * by examining the raw version history text for " - added" entries
   * @param versionHistory The raw version history text
   * @param supportedVersion The current supported version (default: SUPPORTED_VERSION)
   * @returns True if the operation was added in a version newer than the supported version
   */
  static isOperationUnreleased(
    versionHistory: string,
    supportedVersion: string = SUPPORTED_VERSION
  ): boolean {
    if (!versionHistory) {
      return false;
    }

    // Replace literal \n with actual newlines to handle backslash-escaped newlines
    const normalizedHistory = versionHistory.replace(/\\n/g, '\n');

    // Look for lines that indicate the operation itself was added
    // Pattern: "version - added" (not "version - added parameter_name" or other modifications)
    const addedPattern = /(?:^|\s)(\d+\.\d+\.\d+)\s*-\s*added\s*$/gm;

    let match;
    while ((match = addedPattern.exec(normalizedHistory)) !== null) {
      const version = match[1];
      // Check if this "added" version is newer than supported version
      if (
        this.compareVersions(version, supportedVersion) === version &&
        version !== supportedVersion
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extracts the version when the property itself was added (not enum values)
   * by looking for lines like "version - added" without enum values in backticks
   * @param versionHistory The raw version history text
   * @returns The version when the property was added, or null if not found
   */
  static extractPropertyAddedVersion(versionHistory: string): string | null {
    if (!versionHistory) {
      return null;
    }

    // Replace literal \n with actual newlines to handle backslash-escaped newlines
    const normalizedHistory = versionHistory.replace(/\\n/g, '\n');

    // Look for lines that indicate the property itself was added
    // Pattern: "version - added" or "version (additional info) - added" (not "version - added `enum_value`" or other modifications)
    // This regex allows for optional text in parentheses between version and " - added"
    // Also handle trailing backslashes which are common in markdown
    const addedPattern =
      /(?:^|\s)(\d+\.\d+\.\d+)(?:\s*\([^)]*\))?\s*-\s*added\s*\\?\s*$/gm;

    const match = addedPattern.exec(normalizedHistory);
    return match ? match[1] : null;
  }

  /**
   * Extracts version numbers from version history, excluding "moved" operations
   * Only includes versions where the property was actually added, not moved
   * @param versionHistory The raw version history text
   * @returns Array of version numbers where the property was added (excluding moved operations)
   */
  static extractAddedVersionsOnly(versionHistory: string): string[] {
    if (!versionHistory) {
      return [];
    }

    const versions: string[] = [];

    // Replace literal \n with actual newlines to handle backslash-escaped newlines
    const normalizedHistory = versionHistory.replace(/\\n/g, '\n');

    // Split into lines and process each line
    const lines = normalizedHistory.split('\n');

    for (const line of lines) {
      // Match version numbers at the start of lines or after whitespace
      const versionMatch = line.match(/(?:^|\s)(\d+\.\d+\.\d+)/);
      if (versionMatch) {
        const version = versionMatch[1];

        // Only include this version if the line doesn't contain "moved"
        // This excludes lines like "4.3.0 - moved to CredentialApplication from Application"
        if (!line.toLowerCase().includes('moved')) {
          if (!versions.includes(version)) {
            versions.push(version);
          }
        }
      }
    }

    return versions;
  }
}
