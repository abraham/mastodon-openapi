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
});
