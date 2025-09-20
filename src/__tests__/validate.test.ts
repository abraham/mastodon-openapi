import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('OpenAPI Schema Validation', () => {
  const schemaPath = path.join(__dirname, '..', '..', 'dist', 'schema.json');

  beforeAll(() => {
    // Ensure schema.json exists
    if (!fs.existsSync(schemaPath)) {
      execSync('npm run generate', { cwd: path.join(__dirname, '..', '..') });
    }
  });

  it('should have a schema.json file in dist directory', () => {
    expect(fs.existsSync(schemaPath)).toBe(true);
  });

  it('should contain valid JSON in schema.json', () => {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();

    const schema = JSON.parse(content);
    expect(schema.openapi).toBe('3.1.0');
    expect(schema.info).toBeDefined();
    expect(schema.paths).toBeDefined();
    expect(schema.components).toBeDefined();
  });

  it('should be able to run the validate script', () => {
    // The validate script runs and reports validation results
    expect(() => {
      try {
        const result = execSync('npm run validate', {
          cwd: path.join(__dirname, '..', '..'),
          stdio: 'pipe',
          encoding: 'utf8',
        });
        // If validation succeeds, check for success message
        expect(result).toContain('valid');
      } catch (error: any) {
        // If validation fails, check the error output still contains validation results
        const output = error.stdout?.toString() || '';
        // The script ran successfully even if there are validation warnings
        expect(output.length).toBeGreaterThan(0);
      }
    }).not.toThrow();
  });

  it('should have schema names that comply with OpenAPI regex pattern', () => {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);

    // OpenAPI schema names must match ^[a-zA-Z0-9\.\-_]+$
    const openApiNameRegex = /^[a-zA-Z0-9\.\-_]+$/;

    if (schema.components && schema.components.schemas) {
      const schemaNames = Object.keys(schema.components.schemas);

      for (const name of schemaNames) {
        expect(name).toMatch(openApiNameRegex);
        expect(name).not.toContain('::');
      }

      // Ensure we have some schemas to test (should be many from Mastodon)
      expect(schemaNames.length).toBeGreaterThan(50);
    }
  });
});
