const { OpenAPIGenerator } = require('./dist/generators/OpenAPIGenerator');

const generator = new OpenAPIGenerator();

const testMethods = [
  {
    name: 'timelines',
    description: 'Timeline methods',
    methods: [
      {
        name: 'View link timeline',
        httpMethod: 'GET',
        endpoint: '/api/v1/timelines/link?url={url}',
        description: 'View public statuses containing a link to the specified currently-trending article.',
      },
    ],
  },
];

const spec = generator.generateSchema([], testMethods);

console.log('Generated paths:');
console.log(Object.keys(spec.paths));

console.log('\nPath details:');
for (const [path, pathObj] of Object.entries(spec.paths)) {
  console.log(`Path: ${path}`);
  if (pathObj.get) {
    console.log(`  GET operationId: ${pathObj.get.operationId}`);
  }
}