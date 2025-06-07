import { EntityParser } from './parsers/EntityParser';
import { MethodParser } from './parsers/MethodParser';
import { OpenAPIGenerator } from './generators/OpenAPIGenerator';
import * as fs from 'fs';
import * as path from 'path';

async function validateSchemaIfEnabled(schemaPath: string): Promise<void> {
  const shouldSkipValidation = process.env.SKIP_VALIDATION === 'true';
  if (shouldSkipValidation) {
    console.log('⏭️  Schema validation skipped (SKIP_VALIDATION=true)');
    return;
  }

  try {
    // Dynamic import to avoid Jest ES module issues
    const { validateSchema } = await import('./validator');
    await validateSchema(schemaPath, true);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Schema validation failed: ${String(error)}`);
  }
}

async function main() {
  console.log('Parsing Mastodon entity files...');

  const parser = new EntityParser();
  const entities = parser.parseAllEntities();

  console.log(`Found ${entities.length} entities`);

  console.log('Parsing Mastodon API method files...');

  const methodParser = new MethodParser();
  const methodFiles = methodParser.parseAllMethods();

  console.log(`Found ${methodFiles.length} method files`);

  const totalMethods = methodFiles.reduce(
    (sum, file) => sum + file.methods.length,
    0
  );
  console.log(`Total API methods parsed: ${totalMethods}`);

  console.log('Generating OpenAPI schema...');

  const generator = new OpenAPIGenerator();
  const schema = generator.generateSchema(entities, methodFiles);

  console.log('OpenAPI schema generated successfully');

  // Write schema to file
  const distDir = path.join(__dirname, '..', 'dist');
  const schemaPath = path.join(distDir, 'schema.json');

  // Ensure dist directory exists
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Write schema to file
  fs.writeFileSync(schemaPath, generator.toJSON());
  console.log(`Schema written to ${schemaPath}`);

  // Validate the generated schema
  await validateSchemaIfEnabled(schemaPath);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

export { main };
