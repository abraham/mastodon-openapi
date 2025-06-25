import * as fs from 'fs';
import * as path from 'path';

describe('Scripts', () => {
  const scriptsDir = path.join(__dirname, '..', '..', 'scripts');

  it('should have setup-docs.js script', () => {
    const setupDocsPath = path.join(scriptsDir, 'setup-docs.js');
    expect(fs.existsSync(setupDocsPath)).toBe(true);
  });

  it('should have update-docs-sha.js script', () => {
    const updateShaPath = path.join(scriptsDir, 'update-docs-sha.js');
    expect(fs.existsSync(updateShaPath)).toBe(true);
  });

  it('should export setupMastodonDocs function', () => {
    const setupDocsPath = path.join(scriptsDir, 'setup-docs.js');
    const { setupMastodonDocs } = require(setupDocsPath);
    expect(typeof setupMastodonDocs).toBe('function');
  });

  it('should export updateDocsCommit function', () => {
    const updateShaPath = path.join(scriptsDir, 'update-docs-sha.js');
    const { updateDocsCommit } = require(updateShaPath);
    expect(typeof updateDocsCommit).toBe('function');
  });
});
