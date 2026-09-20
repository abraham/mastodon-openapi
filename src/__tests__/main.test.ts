import { main } from '../index';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('main', () => {
  let distDir: string;
  let schemaPath: string;

  beforeEach(() => {
    // Write to a scratch directory so parallel suites reading the committed
    // dist/schema.json are not racing this one
    distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mastodon-openapi-'));
    schemaPath = path.join(distDir, 'schema.json');
  });

  afterEach(() => {
    fs.rmSync(distDir, { recursive: true, force: true });
  });

  it('should generate and write schema.json to dist directory', () => {
    // Run the main function
    main(distDir);

    // Check that the file was created
    expect(fs.existsSync(schemaPath)).toBe(true);

    // Check that the file contains valid JSON
    const content = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);

    // Verify basic structure
    expect(schema.openapi).toBe('3.1.0');
    expect(schema.info).toBeDefined();
    expect(schema.info.title).toBe('Mastodon API');
    expect(schema.paths).toBeDefined();
    expect(schema.components).toBeDefined();
    expect(schema.components.schemas).toBeDefined();
  });
});
