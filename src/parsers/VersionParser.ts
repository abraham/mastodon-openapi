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
 * The currently supported Mastodon API version
 */
export const SUPPORTED_VERSION = getSupportedVersion();

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
      return '4.2.0'; // Fallback to current hardcoded version
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
}
