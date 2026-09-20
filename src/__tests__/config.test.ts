import * as fs from 'fs';
import * as path from 'path';
import {
  CONFIG_PATH,
  getConfig,
  parseConfig,
  resetConfigCache,
} from '../config';

describe('Configuration', () => {
  const configPath = path.join(__dirname, '..', '..', 'config.json');

  it('should have a valid config.json file', () => {
    expect(fs.existsSync(configPath)).toBe(true);
  });

  it('should have mastodonDocsCommit property', () => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(config).toHaveProperty('mastodonDocsCommit');
    expect(typeof config.mastodonDocsCommit).toBe('string');
    expect(config.mastodonDocsCommit).toMatch(/^[a-f0-9]{40}$/); // Valid git SHA
  });

  it('should have mastodonSecurityCommit property', () => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(config).toHaveProperty('mastodonSecurityCommit');
    expect(typeof config.mastodonSecurityCommit).toBe('string');
    expect(config.mastodonSecurityCommit).toMatch(/^[a-f0-9]{40}$/); // Valid git SHA
  });

  it('should have blockedFiles property as array', () => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(config).toHaveProperty('blockedFiles');
    expect(Array.isArray(config.blockedFiles)).toBe(true);

    // Verify that all blocked files are strings with proper format
    for (const blockedFile of config.blockedFiles) {
      expect(typeof blockedFile).toBe('string');
      expect(blockedFile).toMatch(/^methods\/[a-zA-Z0-9_-]+\.md$/);
    }
  });

  it('should contain notifications_alpha.md in blockedFiles', () => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(config.blockedFiles).toContain('methods/notifications_alpha.md');
  });

  describe('getConfig', () => {
    it('should resolve config.json independently of process.cwd()', () => {
      expect(CONFIG_PATH).toBe(configPath);
      expect(getConfig().mastodonDocsCommit).toMatch(/^[a-f0-9]{40}$/);
    });

    it('should memoize the loaded config', () => {
      resetConfigCache();
      expect(getConfig()).toBe(getConfig());
    });
  });

  describe('parseConfig', () => {
    const valid = {
      mastodonDocsCommit: 'a',
      mastodonSecurityCommit: 'b',
      overridesRepository: 'c',
      blockedFiles: [],
      overrideCommits: [],
    };

    it('should accept a well-formed config', () => {
      expect(parseConfig(JSON.stringify(valid))).toEqual(valid);
    });

    it('should throw when a required string key is missing', () => {
      expect(() => parseConfig(JSON.stringify({ blockedFiles: [] }))).toThrow(
        /"mastodonDocsCommit" must be a non-empty string/
      );
    });

    it('should throw when a required string key is empty', () => {
      expect(() =>
        parseConfig(JSON.stringify({ ...valid, mastodonSecurityCommit: '' }))
      ).toThrow(/"mastodonSecurityCommit" must be a non-empty string/);
    });

    it('should throw when a required array key is not an array', () => {
      expect(() =>
        parseConfig(JSON.stringify({ ...valid, blockedFiles: 'nope' }))
      ).toThrow(/"blockedFiles" must be an array/);
    });

    it('should report every problem at once', () => {
      expect(() => parseConfig('{}')).toThrow(/overrideCommits/);
    });

    it('should throw on malformed JSON', () => {
      expect(() => parseConfig('not json')).toThrow(/Could not parse/);
    });

    it('should throw when the root is not an object', () => {
      expect(() => parseConfig('[]')).toThrow(/must contain a JSON object/);
    });
  });
});
