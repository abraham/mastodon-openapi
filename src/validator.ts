import { Validator } from '@seriousme/openapi-schema-validator';
import * as fs from 'fs';

export async function validateSchema(schemaPath: string, exitOnError: boolean = true): Promise<boolean> {
  console.log('Validating OpenAPI schema...');

  try {
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(schemaContent);

    const validator = new Validator();
    const result = await validator.validate(schema);

    if (result.valid) {
      console.log('✅ Schema validation passed');
      return true;
    } else {
      console.error('❌ Schema validation failed with the following errors:');
      const errors = result.errors;
      if (Array.isArray(errors)) {
        errors.forEach((error: any, index: number) => {
          console.error(`  ${index + 1}. ${error.instancePath}: ${error.message}`);
        });
        if (exitOnError) {
          throw new Error(`Schema validation failed with ${errors.length} error(s)`);
        }
      } else if (typeof errors === 'string') {
        console.error(`  1. ${errors}`);
        if (exitOnError) {
          throw new Error(`Schema validation failed: ${errors}`);
        }
      } else {
        console.error('Unknown error format:', errors);
        if (exitOnError) {
          throw new Error('Schema validation failed with unknown errors');
        }
      }
      return false;
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Schema validation failed: ${String(error)}`);
  }
}