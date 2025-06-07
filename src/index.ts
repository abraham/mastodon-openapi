import { EntityParser } from './parsers/EntityParser';
import { MethodParser } from './parsers/MethodParser';
import { OpenAPIGenerator } from './generators/OpenAPIGenerator';
import * as fs from 'fs';
import * as path from 'path';

function main() {
  console.log('Parsing Mastodon entity files...');

  const parser = new EntityParser();
  const entities = parser.parseAllEntities();

  console.log(`Found ${entities.length} entities`);

  console.log('Enriching entities with JSON examples...');
  const enrichedEntities = parser.enrichEntitiesWithExamples(entities);
  
  // Count how many entities were enriched
  const enrichedCount = enrichedEntities.reduce((count, entity, index) => {
    return entity.attributes.length > entities[index].attributes.length ? count + 1 : count;
  }, 0);
  console.log(`Enriched ${enrichedCount} entities with additional attributes from examples`);

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
  const schema = generator.generateSchema(enrichedEntities, methodFiles);

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
}

if (require.main === module) {
  main();
}

export { main };
