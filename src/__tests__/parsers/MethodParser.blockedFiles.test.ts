import { MethodParser } from '../../parsers/MethodParser';
import * as fs from 'fs';
import * as path from 'path';
import { Config, getConfig } from '../../config';

// Mock fs to control the documentation tree
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock only getConfig so path helpers keep working
jest.mock('../../config', () => ({
  ...jest.requireActual('../../config'),
  getConfig: jest.fn(),
}));
const mockGetConfig = getConfig as jest.MockedFunction<typeof getConfig>;

const baseConfig: Config = {
  mastodonDocsCommit: 'abc123',
  mastodonSecurityCommit: 'def456',
  blockedFiles: [],
  overridesRepository: 'https://github.com/example/documentation',
  overrideCommits: [],
};

const methodFileContent = `---
title: Test API methods
---

## Test Method {#test-method}

Test method content`;

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
    mockGetConfig.mockReturnValue({
      ...baseConfig,
      blockedFiles: [
        'methods/notifications_alpha.md',
        'methods/test_blocked.md',
      ],
    });

    mockFs.readFileSync.mockReturnValue(methodFileContent);

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
    const readFileCalls = mockFs.readFileSync.mock.calls.map((call) =>
      path.basename(call[0] as string)
    );

    expect(readFileCalls).not.toContain('notifications_alpha.md');
    expect(readFileCalls).not.toContain('test_blocked.md');
    expect(readFileCalls).toContain('accounts.md');
    expect(readFileCalls).toContain('statuses.md');

    // Should have 2 method files (accounts.md and statuses.md)
    expect(methodFiles).toHaveLength(2);

    consoleSpy.mockRestore();
  });

  test('should throw when the methods directory is missing', () => {
    mockGetConfig.mockReturnValue(baseConfig);
    mockFs.existsSync.mockReturnValue(false);

    expect(() => methodParser.parseAllMethods()).toThrow(
      /Methods path does not exist/
    );
  });

  test('should handle empty blockedFiles array', () => {
    mockGetConfig.mockReturnValue(baseConfig);
    mockFs.readFileSync.mockReturnValue(methodFileContent);
    mockFs.readdirSync.mockReturnValue(['accounts.md', 'statuses.md'] as any);

    const methodFiles = methodParser.parseAllMethods();

    // Should parse all files when blockedFiles is empty
    expect(methodFiles).toHaveLength(2);
  });

  test('should use correct relative path format for blocking', () => {
    mockGetConfig.mockReturnValue({
      ...baseConfig,
      blockedFiles: ['methods/notifications_alpha.md'],
    });

    mockFs.readFileSync.mockReturnValue(methodFileContent);

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
