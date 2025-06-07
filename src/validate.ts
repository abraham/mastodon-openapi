import { validateSchema } from './validator';
import * as path from 'path';

async function main() {
  const schemaPath = path.join(__dirname, '..', 'dist', 'schema.json');
  await validateSchema(schemaPath, true);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}