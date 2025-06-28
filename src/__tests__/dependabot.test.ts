import * as fs from 'fs';
import * as path from 'path';

describe('Dependabot Configuration', () => {
  const dependabotPath = path.join(
    __dirname,
    '..',
    '..',
    '.github',
    'dependabot.yml'
  );

  it('should have a valid dependabot.yml file', () => {
    expect(fs.existsSync(dependabotPath)).toBe(true);
  });

  it('should contain npm package ecosystem configuration', () => {
    const content = fs.readFileSync(dependabotPath, 'utf8');
    expect(content).toContain("package-ecosystem: 'npm'");
    expect(content).toContain("directory: '/'");
    expect(content).toContain("interval: 'weekly'");
  });

  it('should contain github-actions package ecosystem configuration', () => {
    const content = fs.readFileSync(dependabotPath, 'utf8');
    expect(content).toContain("package-ecosystem: 'github-actions'");
    expect(content).toContain("directory: '/'");
    expect(content).toContain("interval: 'weekly'");
  });

  it('should have version 2 configuration', () => {
    const content = fs.readFileSync(dependabotPath, 'utf8');
    expect(content).toContain('version: 2');
  });

  it('should have updates section', () => {
    const content = fs.readFileSync(dependabotPath, 'utf8');
    expect(content).toContain('updates:');
  });
});
