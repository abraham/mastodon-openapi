import { EntityParser } from './parsers/EntityParser';
import { MethodParser } from './parsers/MethodParser';
import { OpenAPIGenerator } from './generators/OpenAPIGenerator';

function main() {
  console.log('Parsing Mastodon entity files...');
  
  const parser = new EntityParser();
  const entities = parser.parseAllEntities();
  
  console.log(`Found ${entities.length} entities`);

  console.log('Parsing Mastodon API method files...');
  
  const methodParser = new MethodParser();
  const methodFiles = methodParser.parseAllMethods();
  
  console.log(`Found ${methodFiles.length} method files`);
  
  const totalMethods = methodFiles.reduce((sum, file) => sum + file.methods.length, 0);
  console.log(`Total API methods parsed: ${totalMethods}`);

  console.log('Generating OpenAPI schema...');
  
  const generator = new OpenAPIGenerator();
  const schema = generator.generateSchema(entities, methodFiles);
  
  console.log('OpenAPI schema generated successfully');
  console.log(generator.toJSON());
}

if (require.main === module) {
  main();
}

export { main };