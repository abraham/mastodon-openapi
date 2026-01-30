import { MethodParser } from '../../parsers/MethodParser';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs to control config.json content
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock VersionParser to avoid config.json dependency
jest.mock('../../parsers/VersionParser', () => ({
  SUPPORTED_VERSION: '4.4.0',
  MINIMUM_VERSION: '4.3.0',
  VersionParser: class {
    static extractVersionNumbers = jest.fn();
    static compareVersions = jest.fn();
    static findMaxVersion = jest.fn();
    static hasNewerVersion = jest.fn();
    static isOperationUnreleased = jest.fn();
  },
}));

describe('MethodParser - Blocked Files Feature', () => {
  let methodParser: MethodParser;

  beforeEach(() => {
    methodParser = new MethodParser();
    jest.clearAllMocks();

    // Mock existsSync to return true for methods path
    mockFs.existsSync.mockImplementation((pathArg) => {
      const pathStr = pathArg.toString();
      return (
        pathStr.includes('methods') ||
        pathStr.includes('mastodon-documentation')
      );
    });

    // Mock statSync to return file stats
    mockFs.statSync.mockReturnValue({
      isFile: () => true,
    } as any);
  });

  test('should skip blocked files during parsing', () => {
    // Mock config.json with blocked files
    const mockConfig = {
      mastodonDocsCommit: 'abc123',
      mastodonVersion: '4.4.0',
      minimumMastodonVersion: '4.3.0',
      blockedFiles: [
        'methods/notifications_alpha.md',
        'methods/test_blocked.md',
      ],
    };

    // Mock readFileSync for config.json
    mockFs.readFileSync.mockImplementation((filePath) => {
      if (filePath === 'config.json') {
        return JSON.stringify(mockConfig);
      }
      // Mock method file content
      return `---
title: Test API methods
---

## Test Method {#test-method}

Test method content`;
    });

    // Mock readdirSync to return test files including blocked ones
    mockFs.readdirSync.mockReturnValue([
      'accounts.md',
      'notifications_alpha.md', // This should be blocked
      'statuses.md',
      'test_blocked.md', // This should be blocked
    ] as any);

    // Spy on console.log to verify blocked file message
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const methodFiles = methodParser.parseAllMethods();

    // Verify that blocked files are skipped
    expect(consoleSpy).toHaveBeenCalledWith(
      'Skipping blocked file: methods/notifications_alpha.md'
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      'Skipping blocked file: methods/test_blocked.md'
    );

    // Verify that readFileSync was not called for blocked files
    const readFileCalls = mockFs.readFileSync.mock.calls
      .filter((call) => call[0] !== 'config.json')
      .map((call) => path.basename(call[0] as string));

    expect(readFileCalls).not.toContain('notifications_alpha.md');
    expect(readFileCalls).not.toContain('test_blocked.md');
    expect(readFileCalls).toContain('accounts.md');
    expect(readFileCalls).toContain('statuses.md');

    // Should have 2 method files (accounts.md and statuses.md)
    expect(methodFiles).toHaveLength(2);

    consoleSpy.mockRestore();
  });

  test('should handle missing blockedFiles in config gracefully', () => {
    // Mock config.json without blockedFiles property
    const mockConfig = {
      mastodonDocsCommit: 'abc123',
      mastodonVersion: '4.4.0',
      minimumMastodonVersion: '4.3.0',
      // No blockedFiles property
    };

    mockFs.readFileSync.mockImplementation((filePath) => {
      if (filePath === 'config.json') {
        return JSON.stringify(mockConfig);
      }
      return `---
title: Test API methods
---

## Test Method {#test-method}

Test method content`;
    });

    mockFs.readdirSync.mockReturnValue(['accounts.md', 'statuses.md'] as any);

    const methodFiles = methodParser.parseAllMethods();

    // Should not throw error and should parse all files
    expect(methodFiles).toHaveLength(2);
  });

  test('should handle missing config.json gracefully', () => {
    // Mock readFileSync to throw error for config.json
    mockFs.readFileSync.mockImplementation((filePath) => {
      if (filePath === 'config.json') {
        throw new Error('ENOENT: no such file or directory');
      }
      return `---
title: Test API methods
---

## Test Method {#test-method}

Test method content`;
    });

    mockFs.readdirSync.mockReturnValue(['accounts.md', 'statuses.md'] as any);

    // Spy on console.warn to verify warning message
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const methodFiles = methodParser.parseAllMethods();

    // Should not throw error and should parse all files
    expect(methodFiles).toHaveLength(2);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Could not load blockedFiles from config.json:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  test('should handle empty blockedFiles array', () => {
    // Mock config.json with empty blockedFiles array
    const mockConfig = {
      mastodonDocsCommit: 'abc123',
      mastodonVersion: '4.4.0',
      minimumMastodonVersion: '4.3.0',
      blockedFiles: [],
    };

    mockFs.readFileSync.mockImplementation((filePath) => {
      if (filePath === 'config.json') {
        return JSON.stringify(mockConfig);
      }
      return `---
title: Test API methods
---

## Test Method {#test-method}

Test method content`;
    });

    mockFs.readdirSync.mockReturnValue(['accounts.md', 'statuses.md'] as any);

    const methodFiles = methodParser.parseAllMethods();

    // Should parse all files when blockedFiles is empty
    expect(methodFiles).toHaveLength(2);
  });

  test('should use correct relative path format for blocking', () => {
    // Mock config.json with blocked file using methods/ prefix
    const mockConfig = {
      mastodonDocsCommit: 'abc123',
      mastodonVersion: '4.4.0',
      minimumMastodonVersion: '4.3.0',
      blockedFiles: ['methods/notifications_alpha.md'],
    };

    mockFs.readFileSync.mockImplementation((filePath) => {
      if (filePath === 'config.json') {
        return JSON.stringify(mockConfig);
      }
      return `---
title: Test API methods
---

## Test Method {#test-method}

Test method content`;
    });

    mockFs.readdirSync.mockReturnValue([
      'accounts.md',
      'notifications_alpha.md',
    ] as any);

    // Spy on console.log to verify the exact path format used
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    methodParser.parseAllMethods();

    // Verify the exact path format: "methods/filename.md"
    expect(consoleSpy).toHaveBeenCalledWith(
      'Skipping blocked file: methods/notifications_alpha.md'
    );

    consoleSpy.mockRestore();
  });
});
