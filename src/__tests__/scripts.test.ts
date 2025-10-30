import * as fs from 'fs';
import * as path from 'path';

describe('Scripts', () => {
  const scriptsDir = path.join(__dirname, '..', '..', 'scripts');

  it('should have setup-docs.ts script', () => {
    const setupDocsPath = path.join(scriptsDir, 'setup-docs.ts');
    expect(fs.existsSync(setupDocsPath)).toBe(true);
  });

  it('should have update-docs.ts script', () => {
    const updateShaPath = path.join(scriptsDir, 'update-docs.ts');
    expect(fs.existsSync(updateShaPath)).toBe(true);
  });

  it('should export setupMastodonDocs function', async () => {
    const { setupMastodonDocs } = await import('../../scripts/setup-docs');
    expect(typeof setupMastodonDocs).toBe('function');
  });

  it('should export updateDocsCommit function', async () => {
    const { updateDocsCommit } = await import('../../scripts/update-docs');
    expect(typeof updateDocsCommit).toBe('function');
  });
});
