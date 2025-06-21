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
              description: 'The ID of the entity',
            },
            {
              name: 'name',
              type: 'String',
              description: 'The name of the entity',
              optional: true,
            },
            {
              name: 'active',
              type: 'Boolean',
              description: 'Whether the entity is active',
              deprecated: true,
            },
          ],
        },
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
              oauth: 'User token + read',
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
                  required: true,
                },
                {
                  name: 'active',
                  description: 'Whether entity is active',
                },
              ],
              oauth: 'User token + write',
            },
          ],
        },
      ];

      const spec = generator.generateSchema(entities, methodFiles);

      // Check basic structure
      expect(spec.openapi).toBe('3.1.0');
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
      expect(getOp.tags).toEqual(['test']);
      expect(getOp.security).toEqual([{ OAuth2: [] }]);
      expect(getOp.parameters).toBeDefined();
      expect(getOp.parameters![0].name).toBe('id');
      expect(getOp.parameters![0].in).toBe('path');
      expect(getOp.parameters![0].required).toBe(true);

      // Check POST operation
      const postOp = spec.paths['/api/v1/test'].post!;
      expect(postOp.summary).toBe('Create test entity');
      expect(postOp.requestBody).toBeDefined();
      expect(postOp.requestBody?.content['application/json']).toBeDefined();
    });

    it('should handle empty inputs', () => {
      const spec = generator.generateSchema([], []);

      expect(spec.openapi).toBe('3.1.0');
      expect(spec.paths).toEqual({});
      // With empty inputs, the schema should only contain the OAuth scope schemas
      expect(spec.components?.schemas).toHaveProperty('OAuthScope');
      expect(spec.components?.schemas).toHaveProperty('OAuthScopes');
      expect(Object.keys(spec.components?.schemas || {}).length).toBe(2);
    });

    it('should sanitize schema names with :: characters', () => {
      const entities: EntityClass[] = [
        {
          name: 'Admin::DomainAllow',
          description: 'Admin domain allow entity',
          attributes: [
            {
              name: 'id',
              type: 'Integer',
              description: 'The ID',
            },
            {
              name: 'domain',
              type: 'String',
              description: 'The domain',
            },
          ],
        },
        {
          name: 'Status::Mention',
          description: 'Status mention entity',
          attributes: [
            {
              name: 'id',
              type: 'Integer',
              description: 'The ID',
            },
            {
              name: 'user',
              type: '[Admin::DomainAllow]',
              description: 'Reference to admin domain allow',
            },
          ],
        },
        {
          name: 'Field entity',
          description: 'Field entity with spaces',
          attributes: [
            {
              name: 'name',
              type: 'String',
              description: 'The name',
            },
          ],
        },
      ];

      const spec = generator.generateSchema(entities, []);

      // Check that schema names are sanitized (:: replaced with _, spaces replaced with _)
      expect(spec.components?.schemas?.['Admin_DomainAllow']).toBeDefined();
      expect(spec.components?.schemas?.['Status_Mention']).toBeDefined();
      expect(spec.components?.schemas?.['Field_entity']).toBeDefined();

      // Check that original names with :: and spaces are not present
      expect(spec.components?.schemas?.['Admin::DomainAllow']).toBeUndefined();
      expect(spec.components?.schemas?.['Status::Mention']).toBeUndefined();
      expect(spec.components?.schemas?.['Field entity']).toBeUndefined();

      // Check that references are also sanitized
      const statusMentionSchema = spec.components!.schemas!['Status_Mention'];
      expect(statusMentionSchema.properties?.['user']?.$ref).toBe(
        '#/components/schemas/Admin_DomainAllow'
      );

      // Verify all schema names match OpenAPI regex ^[a-zA-Z0-9\.\-_]+$
      const schemaNames = Object.keys(spec.components?.schemas || {});
      const openApiNameRegex = /^[a-zA-Z0-9\.\-_]+$/;

      for (const name of schemaNames) {
        expect(name).toMatch(openApiNameRegex);
      }
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
      expect(parsed.openapi).toBe('3.1.0');
    });
  });

  describe('externalDocs', () => {
    it('should include externalDocs section in the generated schema', () => {
      const entities: EntityClass[] = [];
      const methodFiles: ApiMethodsFile[] = [];

      const spec = generator.generateSchema(entities, methodFiles);

      expect(spec.externalDocs).toBeDefined();
      expect(spec.externalDocs?.url).toBe('https://docs.joinmastodon.org/api/');
      expect(spec.externalDocs?.description).toBe(
        'Official Mastodon API documentation'
      );
    });
  });
});
