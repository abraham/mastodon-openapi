const { OpenAPIGenerator } = require('./dist/generators/OpenAPIGenerator');

const generator = new OpenAPIGenerator();

// Test case: different enum values should NOT be deduplicated  
const entities = [
  {
    name: 'Filter',
    description: 'A filter',
    attributes: [
      {
        name: 'context',
        type: 'Array of String (Enumerable, anyOf)',
        description: 'The contexts in which the filter should be applied.',
        enumValues: ['home', 'notifications', 'public'],
      },
    ],
  },
  {
    name: 'V1_Filter',
    description: 'A V1 filter',
    attributes: [
      {
        name: 'context',
        type: 'Array of String (Enumerable anyOf)',
        description: 'The contexts in which the filter should be applied.',
        enumValues: ['home', 'notifications', 'different'],
      },
    ],
  },
];

console.log('Filter enum values:', JSON.stringify(['home', 'notifications', 'public'].sort()));
console.log('V1_Filter enum values:', JSON.stringify(['home', 'notifications', 'different'].sort()));
console.log('Are they equal?', JSON.stringify(['home', 'notifications', 'public'].sort()) === JSON.stringify(['home', 'notifications', 'different'].sort()));

const spec = generator.generateSchema(entities, []);

console.log('Generated schema components:');
console.log(Object.keys(spec.components.schemas).sort());

console.log('\nComponent details:');
for (const [name, schema] of Object.entries(spec.components.schemas)) {
  if (name.includes('Context') || name.includes('Enum')) {
    console.log(`${name}:`, JSON.stringify(schema, null, 2));
  }
}