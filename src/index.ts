import { EntityParser } from './parsers/EntityParser';
import { MethodParser } from './parsers/MethodParser';
import { OpenAPIGenerator } from './generators/OpenAPIGenerator';
import { VersionParser } from './parsers/VersionParser';
import * as fs from 'fs';
import * as path from 'path';

function main() {
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

  // Collect all version numbers from entities and methods
  console.log('Collecting version numbers...');
  const allVersions: string[] = [];

  // Collect versions from entities
  for (const entity of entities) {
    if (entity.versions) {
      allVersions.push(...entity.versions);
    }
    // Also collect from attributes
    for (const attr of entity.attributes) {
      if (attr.versions) {
        allVersions.push(...attr.versions);
      }
    }
  }

  // Collect versions from methods
  for (const methodFile of methodFiles) {
    for (const method of methodFile.methods) {
      if (method.versions) {
        allVersions.push(...method.versions);
      }
    }
  }

  // Find the maximum version
  const maxVersion = VersionParser.findMaxVersion(allVersions);
  console.log(
    `Found ${allVersions.length} version numbers, maximum version: ${maxVersion}`
  );

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

  // Generate ENUMS.md file
  console.log('Generating ENUMS.md...');
  const enumsMarkdown = generator
    .getEnumTallyGenerator()
    .generateEnumsMarkdown();
  const enumsPath = path.join(__dirname, '..', 'ENUMS.md');
  fs.writeFileSync(enumsPath, enumsMarkdown);
  console.log(`ENUMS.md written to ${enumsPath}`);
}

if (require.main === module) {
  main();
}

export { main };
