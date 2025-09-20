import * as fs from 'fs';
import * as path from 'path';

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

  it('should have mastodonVersion property', () => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(config).toHaveProperty('mastodonVersion');
    expect(typeof config.mastodonVersion).toBe('string');
    expect(config.mastodonVersion).toMatch(/^\d+\.\d+\.\d+$/); // Valid semantic version
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
});
