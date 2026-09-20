import { MethodParser } from '../../parsers/MethodParser';
import { Config } from '../../config';
import { InMemorySource } from '../../source/InMemorySource';
import { createPipelineContext } from '../../pipeline/PipelineContext';

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

// Mock VersionParser to avoid SECURITY.md dependency
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

function sourceWith(...ids: string[]): InMemorySource {
  const method: Record<string, string> = {};
  for (const id of ids) {
    method[id] = methodFileContent;
  }
  return new InMemorySource({ method });
}

function parserFor(source: InMemorySource, blockedFiles: string[] = []) {
  return new MethodParser(
    createPipelineContext({
      config: { ...baseConfig, blockedFiles },
      source,
    })
  );
}

describe('MethodParser - Blocked Files Feature', () => {
  test('should skip blocked files during parsing', () => {
    const source = sourceWith(
      'accounts.md',
      'notifications_alpha.md',
      'statuses.md',
      'test_blocked.md'
    );
    const readSpy = jest.spyOn(source, 'read');
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const methodFiles = parserFor(source, [
      'methods/notifications_alpha.md',
      'methods/test_blocked.md',
    ]).parseAllMethods();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Skipping blocked file: methods/notifications_alpha.md'
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      'Skipping blocked file: methods/test_blocked.md'
    );

    // Blocked documents must never be read
    const readIds = readSpy.mock.calls.map((call) => call[1]);
    expect(readIds).toEqual(['accounts.md', 'statuses.md']);

    expect(methodFiles).toHaveLength(2);

    consoleSpy.mockRestore();
  });

  test('should throw when a listed document cannot be read', () => {
    const source = sourceWith('accounts.md');
    jest.spyOn(source, 'read').mockImplementation(() => {
      throw new Error('ENOENT');
    });

    expect(() => parserFor(source).parseAllMethods()).toThrow(
      /Error parsing method file accounts\.md/
    );
  });

  test('should handle empty blockedFiles array', () => {
    const methodFiles = parserFor(
      sourceWith('accounts.md', 'statuses.md')
    ).parseAllMethods();

    expect(methodFiles).toHaveLength(2);
  });

  test('should use correct relative path format for blocking', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    parserFor(sourceWith('accounts.md', 'notifications_alpha.md'), [
      'methods/notifications_alpha.md',
    ]).parseAllMethods();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Skipping blocked file: methods/notifications_alpha.md'
    );

    consoleSpy.mockRestore();
  });
});
