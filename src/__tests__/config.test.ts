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

  it('should have the initial SHA set correctly', () => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(config.mastodonDocsCommit).toBe(
      '2e1395e401e70921c154bdda3e4f4973a01b1f7d'
    );
  });
});
