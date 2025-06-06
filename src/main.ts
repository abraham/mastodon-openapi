import { EntityParser } from './parsers/EntityParser';
import { MethodParser } from './parsers/MethodParser';

function main() {
  console.log('Parsing Mastodon entity files...');
  
  const parser = new EntityParser();
  const entities = parser.parseAllEntities();
  
  console.log(`\nFound ${entities.length} entities:\n`);
  
  for (const entity of entities) {
    console.log(`Class: ${entity.name}`);
    console.log(`Description: ${entity.description}`);
    console.log(`Attributes (${entity.attributes.length}):`);
    
    for (const attr of entity.attributes) {
      const modifiers = [];
      if (attr.optional) modifiers.push('optional');
      if (attr.deprecated) modifiers.push('deprecated');
      const modifierText = modifiers.length > 0 ? ` [${modifiers.join(', ')}]` : '';
      
      console.log(`  - ${attr.name}: ${attr.type}${modifierText}`);
    }
    console.log('');
  }
  
  console.log(`Total entities parsed: ${entities.length}`);

  console.log('\nParsing Mastodon API method files...');
  
  const methodParser = new MethodParser();
  const methodFiles = methodParser.parseAllMethods();
  
  console.log(`\nFound ${methodFiles.length} method files:\n`);
  
  for (const methodFile of methodFiles) {
    console.log(`File: ${methodFile.name}`);
    console.log(`Description: ${methodFile.description}`);
    console.log(`Methods (${methodFile.methods.length}):`);
    
    for (const method of methodFile.methods) {
      console.log(`  - ${method.httpMethod} ${method.endpoint}`);
      console.log(`    Name: ${method.name}`);
      console.log(`    Description: ${method.description}`);
      if (method.returns) console.log(`    Returns: ${method.returns}`);
      if (method.oauth) console.log(`    OAuth: ${method.oauth}`);
      if (method.parameters && method.parameters.length > 0) {
        console.log(`    Parameters (${method.parameters.length}):`);
        for (const param of method.parameters) {
          const reqText = param.required ? ' [required]' : '';
          console.log(`      - ${param.name}: ${param.description}${reqText}`);
        }
      }
    }
    console.log('');
  }
  
  console.log(`Total method files parsed: ${methodFiles.length}`);
  const totalMethods = methodFiles.reduce((sum, file) => sum + file.methods.length, 0);
  console.log(`Total API methods parsed: ${totalMethods}`);
}

if (require.main === module) {
  main();
}

export { main };