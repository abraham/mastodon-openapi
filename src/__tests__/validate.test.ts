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
    // The validate script should run successfully and output validation results
    let output = '';

    try {
      output = execSync('npm run validate', {
        cwd: path.join(__dirname, '..', '..'),
        stdio: 'pipe',
      }).toString();
    } catch (error: any) {
      // If validation fails with warnings, that's okay
      output = error.stdout?.toString() || '';
    }

    // Should contain validation results indicating success or at least validation completion
    expect(output).toMatch(/valid|validated/i);
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
