const { Validator } = require('@seriousme/openapi-schema-validator');
const fs = require('fs');

// Read the generated schema
const schemaPath = './dist/schema.json';
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

// Create validator and test
const validator = new Validator();

validator.validate(schema)
  .then(result => {
    console.log('Validation result:', result);
    console.log('Is valid:', result.valid);
    if (!result.valid) {
      console.log('Errors:', result.errors);
    }
  })
  .catch(error => {
    console.error('Validation error:', error);
  });