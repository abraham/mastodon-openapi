import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { EntityClass } from '../../interfaces/EntityClass';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('OpenAPIGenerator', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  describe('generateSchema', () => {
    it('should generate a valid OpenAPI spec with entities and methods', () => {
      const entities: EntityClass[] = [
        {
          name: 'TestEntity',
          description: 'A test entity',
          attributes: [
            {
              name: 'id',
              type: 'Integer',
              description: 'The ID of the entity'
            },
            {
              name: 'name',
              type: 'String',
              description: 'The name of the entity',
              optional: true
            },
            {
              name: 'active',
              type: 'Boolean',
              description: 'Whether the entity is active',
              deprecated: true
            }
          ]
        }
      ];

      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'test API methods',
          description: 'Test API methods',
          methods: [
            {
              name: 'Get test entity',
              httpMethod: 'GET',
              endpoint: '/api/v1/test/:id',
              description: 'Retrieve a test entity',
              returns: 'TestEntity',
              oauth: 'User token + read'
            },
            {
              name: 'Create test entity',
              httpMethod: 'POST',
              endpoint: '/api/v1/test',
              description: 'Create a new test entity',
              parameters: [
                {
                  name: 'name',
                  description: 'Name of the entity',
                  required: true
                },
                {
                  name: 'active',
                  description: 'Whether entity is active'
                }
              ],
              oauth: 'User token + write'
            }
          ]
        }
      ];

      const spec = generator.generateSchema(entities, methodFiles);

      // Check basic structure
      expect(spec.openapi).toBe('3.0.3');
      expect(spec.info.title).toBe('Mastodon API');
      expect(spec.paths).toBeDefined();
      expect(spec.components?.schemas).toBeDefined();

      // Check entity conversion
      expect(spec.components?.schemas?.['TestEntity']).toBeDefined();
      const entitySchema = spec.components!.schemas!['TestEntity'];
      expect(entitySchema.type).toBe('object');
      expect(entitySchema.description).toBe('A test entity');
      expect(entitySchema.properties?.['id']).toBeDefined();
      expect(entitySchema.properties?.['id'].type).toBe('integer');
      expect(entitySchema.properties?.['name']).toBeDefined();
      expect(entitySchema.properties?.['name'].type).toBe('string');
      expect(entitySchema.properties?.['active']).toBeDefined();
      expect(entitySchema.properties?.['active'].deprecated).toBe(true);

      // Check required fields (should include non-optional fields)
      expect(entitySchema.required).toContain('id');
      expect(entitySchema.required).toContain('active');
      expect(entitySchema.required).not.toContain('name'); // optional

      // Check path conversion
      expect(spec.paths['/api/v1/test/{id}']).toBeDefined();
      expect(spec.paths['/api/v1/test/{id}'].get).toBeDefined();
      expect(spec.paths['/api/v1/test']).toBeDefined();
      expect(spec.paths['/api/v1/test'].post).toBeDefined();

      // Check GET operation
      const getOp = spec.paths['/api/v1/test/{id}'].get!;
      expect(getOp.summary).toBe('Get test entity');
      expect(getOp.description).toBe('Retrieve a test entity');
      expect(getOp.tags).toEqual(['test API methods']);
      expect(getOp.security).toEqual([{ OAuth2: [] }]);
      expect(getOp.parameters).toBeDefined();
      expect(getOp.parameters![0].name).toBe('id');
      expect(getOp.parameters![0].in).toBe('path');
      expect(getOp.parameters![0].required).toBe(true);

      // Check POST operation
      const postOp = spec.paths['/api/v1/test'].post!;
      expect(postOp.summary).toBe('Create test entity');
      expect(postOp.requestBody).toBeDefined();
      expect(postOp.requestBody?.content['application/x-www-form-urlencoded']).toBeDefined();
    });

    it('should handle empty inputs', () => {
      const spec = generator.generateSchema([], []);
      
      expect(spec.openapi).toBe('3.0.3');
      expect(spec.paths).toEqual({});
      expect(spec.components?.schemas).toEqual({});
    });
  });

  describe('toJSON', () => {
    it('should return valid JSON string', () => {
      const entities: EntityClass[] = [];
      const methodFiles: ApiMethodsFile[] = [];
      
      generator.generateSchema(entities, methodFiles);
      const json = generator.toJSON();
      
      expect(() => JSON.parse(json)).not.toThrow();
      const parsed = JSON.parse(json);
      expect(parsed.openapi).toBe('3.0.3');
    });
  });
});