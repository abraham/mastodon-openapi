import { main } from '../main';
import * as fs from 'fs';
import * as path from 'path';

describe('main', () => {
  const schemaPath = path.join(__dirname, '..', '..', 'dist', 'schema.json');

  beforeEach(() => {
    // Clean up the schema file if it exists
    if (fs.existsSync(schemaPath)) {
      fs.unlinkSync(schemaPath);
    }
  });

  it('should generate and write schema.json to dist directory', () => {
    // Run the main function
    main();

    // Check that the file was created
    expect(fs.existsSync(schemaPath)).toBe(true);

    // Check that the file contains valid JSON
    const content = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);

    // Verify basic structure
    expect(schema.openapi).toBe('3.0.3');
    expect(schema.info).toBeDefined();
    expect(schema.info.title).toBe('Mastodon API');
    expect(schema.paths).toBeDefined();
    expect(schema.components).toBeDefined();
    expect(schema.components.schemas).toBeDefined();
  });
});
