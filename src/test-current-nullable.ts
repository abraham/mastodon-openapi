import { EntityConverter } from './generators/EntityConverter';
import { TypeParser } from './generators/TypeParser';
import { UtilityHelpers } from './generators/UtilityHelpers';
import { EntityClass } from './interfaces/EntityClass';
import { OpenAPISpec } from './interfaces/OpenAPISchema';

const utilityHelpers = new UtilityHelpers();
const typeParser = new TypeParser(utilityHelpers);
const entityConverter = new EntityConverter(typeParser, utilityHelpers);

const mockEntity: EntityClass = {
  name: 'TestEntity',
  description: 'Test entity with nullable properties',
  attributes: [
    {
      name: 'regular_field',
      type: 'String',
      description: 'A regular field',
    },
    {
      name: 'nullable_field',
      type: 'String',
      description: 'A nullable field',
      nullable: true,
    },
  ],
};

const spec: OpenAPISpec = {
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {},
  components: { schemas: {} },
};

entityConverter.convertEntities([mockEntity], spec);

console.log('Current schema generation:');
console.log(JSON.stringify(spec.components?.schemas?.TestEntity, null, 2));