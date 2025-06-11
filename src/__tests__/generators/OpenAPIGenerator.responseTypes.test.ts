import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';
import { EntityClass } from '../../interfaces/EntityClass';

describe('OpenAPIGenerator Response Types', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  describe('parsing returns field', () => {
    it('should generate response schema for single entity reference', () => {
      const entities: EntityClass[] = [
        {
          name: 'Account',
          description: 'Account entity',
          attributes: [
            {
              name: 'id',
              type: 'String',
              description: 'Account ID',
            },
          ],
        },
      ];

      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'accounts',
          description: 'Account methods',
          methods: [
            {
              name: 'Get account',
              httpMethod: 'GET',
              endpoint: '/api/v1/accounts/:id',
              description: 'View information about a profile.',
              returns: '[Account]({{< relref "entities/Account">}})',
            },
          ],
        },
      ];

      const spec = generator.generateSchema(entities, methodFiles);

      const operation = spec.paths['/api/v1/accounts/{id}']?.get;
      expect(operation).toBeDefined();
      expect(operation?.responses['200']).toBeDefined();

      // Should have content with application/json schema
      expect(operation?.responses['200'].content).toBeDefined();
      expect(
        operation?.responses['200'].content?.['application/json']
      ).toBeDefined();
      expect(
        operation?.responses['200'].content?.['application/json'].schema
      ).toEqual({
        $ref: '#/components/schemas/Account',
      });
    });

    it('should generate response schema for array of entities', () => {
      const entities: EntityClass[] = [
        {
          name: 'FamiliarFollowers',
          description: 'FamiliarFollowers entity',
          attributes: [
            {
              name: 'id',
              type: 'String',
              description: 'Account ID',
            },
          ],
        },
      ];

      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'accounts',
          description: 'Account methods',
          methods: [
            {
              name: 'Find familiar followers',
              httpMethod: 'GET',
              endpoint: '/api/v1/accounts/familiar_followers',
              description:
                'Obtain a list of all accounts that follow a given account.',
              returns:
                'Array of [FamiliarFollowers]({{< relref "entities/FamiliarFollowers">}})',
            },
          ],
        },
      ];

      const spec = generator.generateSchema(entities, methodFiles);

      const operation = spec.paths['/api/v1/accounts/familiar_followers']?.get;
      expect(operation).toBeDefined();
      expect(operation?.responses['200']).toBeDefined();

      // Should have content with application/json schema
      expect(operation?.responses['200'].content).toBeDefined();
      expect(
        operation?.responses['200'].content?.['application/json']
      ).toBeDefined();
      expect(
        operation?.responses['200'].content?.['application/json'].schema
      ).toEqual({
        type: 'array',
        items: {
          $ref: '#/components/schemas/FamiliarFollowers',
        },
      });
    });

    it('should fallback to description-only when returns field cannot be parsed', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'accounts',
          description: 'Account methods',
          methods: [
            {
              name: 'Some method',
              httpMethod: 'GET',
              endpoint: '/api/v1/accounts/test',
              description: 'Test method.',
              returns: 'Some complex description without entity reference',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation = spec.paths['/api/v1/accounts/test']?.get;
      expect(operation).toBeDefined();
      expect(operation?.responses['200']).toBeDefined();

      // Should fallback to description only
      expect(operation?.responses['200'].content).toBeUndefined();
      expect(operation?.responses['200'].description).toBe(
        'Some complex description without entity reference'
      );
    });

    it('should handle methods without returns field', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'accounts',
          description: 'Account methods',
          methods: [
            {
              name: 'Test method',
              httpMethod: 'GET',
              endpoint: '/api/v1/accounts/test',
              description: 'Test method.',
              // No returns field
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation = spec.paths['/api/v1/accounts/test']?.get;
      expect(operation).toBeDefined();
      expect(operation?.responses['200']).toBeDefined();

      // Should fallback to default description
      expect(operation?.responses['200'].content).toBeUndefined();
      expect(operation?.responses['200'].description).toBe('OK.');
    });

    it('should generate synthetic schema for multiple return types', () => {
      const entities: EntityClass[] = [
        {
          name: 'Status',
          description: 'Status entity',
          attributes: [
            {
              name: 'id',
              type: 'String',
              description: 'Status ID',
            },
          ],
        },
        {
          name: 'ScheduledStatus',
          description: 'ScheduledStatus entity',
          attributes: [
            {
              name: 'id',
              type: 'String',
              description: 'Scheduled status ID',
            },
          ],
        },
      ];

      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'statuses',
          description: 'Status methods',
          methods: [
            {
              name: 'Post a new status',
              httpMethod: 'POST',
              endpoint: '/api/v1/statuses',
              description: 'Publish a status with the given parameters.',
              returns:
                '[Status]. When scheduled_at is present, [ScheduledStatus] is returned instead.',
            },
          ],
        },
      ];

      const spec = generator.generateSchema(entities, methodFiles);

      const operation = spec.paths['/api/v1/statuses']?.post;
      expect(operation).toBeDefined();
      expect(operation?.responses['200']).toBeDefined();

      // Should have content with application/json schema referencing synthetic type
      expect(operation?.responses['200'].content).toBeDefined();
      expect(
        operation?.responses['200'].content?.['application/json']
      ).toBeDefined();
      expect(
        operation?.responses['200'].content?.['application/json'].schema
      ).toEqual({
        $ref: '#/components/schemas/StatusOrScheduledStatus',
      });

      // Check that the synthetic schema was created in components
      expect(
        spec.components?.schemas?.['StatusOrScheduledStatus']
      ).toBeDefined();
      expect(spec.components?.schemas?.['StatusOrScheduledStatus']).toEqual({
        type: 'object',
        properties: {
          status: { $ref: '#/components/schemas/Status' },
          scheduled_status: { $ref: '#/components/schemas/ScheduledStatus' },
        },
        description: 'Object containing one of: status, scheduled_status',
      });
    });

    it('should handle multiple return types with non-existent entities', () => {
      const entities: EntityClass[] = [
        {
          name: 'Status',
          description: 'Status entity',
          attributes: [
            {
              name: 'id',
              type: 'String',
              description: 'Status ID',
            },
          ],
        },
      ];

      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'statuses',
          description: 'Status methods',
          methods: [
            {
              name: 'Test method',
              httpMethod: 'POST',
              endpoint: '/api/v1/statuses/test',
              description: 'Test method.',
              returns:
                '[Status] or [NonExistentEntity] depending on conditions.',
            },
          ],
        },
      ];

      const spec = generator.generateSchema(entities, methodFiles);

      const operation = spec.paths['/api/v1/statuses/test']?.post;
      expect(operation).toBeDefined();
      expect(operation?.responses['200']).toBeDefined();

      // Should use single reference since only one entity exists
      expect(operation?.responses['200'].content).toBeDefined();
      expect(
        operation?.responses['200'].content?.['application/json']
      ).toBeDefined();
      expect(
        operation?.responses['200'].content?.['application/json'].schema
      ).toEqual({
        $ref: '#/components/schemas/Status',
      });
    });

    it('should fallback to description when no valid entities found in multiple references', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'statuses',
          description: 'Status methods',
          methods: [
            {
              name: 'Test method',
              httpMethod: 'POST',
              endpoint: '/api/v1/statuses/test',
              description: 'Test method.',
              returns:
                '[NonExistentEntityA] or [NonExistentEntityB] depending on conditions.',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation = spec.paths['/api/v1/statuses/test']?.post;
      expect(operation).toBeDefined();
      expect(operation?.responses['200']).toBeDefined();

      // Should fallback to description only
      expect(operation?.responses['200'].content).toBeUndefined();
      expect(operation?.responses['200'].description).toBe(
        '[NonExistentEntityA] or [NonExistentEntityB] depending on conditions.'
      );
    });

    it('should reuse synthetic schemas for identical entity combinations', () => {
      const entities: EntityClass[] = [
        {
          name: 'Status',
          description: 'Status entity',
          attributes: [
            {
              name: 'id',
              type: 'String',
              description: 'Status ID',
            },
          ],
        },
        {
          name: 'ScheduledStatus',
          description: 'ScheduledStatus entity',
          attributes: [
            {
              name: 'id',
              type: 'String',
              description: 'Scheduled status ID',
            },
          ],
        },
      ];

      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'statuses',
          description: 'Status methods',
          methods: [
            {
              name: 'Post a new status',
              httpMethod: 'POST',
              endpoint: '/api/v1/statuses',
              description: 'Publish a status with the given parameters.',
              returns:
                '[Status]. When scheduled_at is present, [ScheduledStatus] is returned instead.',
            },
            {
              name: 'Update a status',
              httpMethod: 'PUT',
              endpoint: '/api/v1/statuses/{id}',
              description: 'Update a status with the given parameters.',
              returns: '[Status] or [ScheduledStatus] depending on conditions.',
            },
          ],
        },
      ];

      const spec = generator.generateSchema(entities, methodFiles);

      // Both operations should reference the same synthetic schema
      const postOperation = spec.paths['/api/v1/statuses']?.post;
      const putOperation = spec.paths['/api/v1/statuses/{id}']?.put;

      expect(
        postOperation?.responses['200'].content?.['application/json'].schema
      ).toEqual({
        $ref: '#/components/schemas/StatusOrScheduledStatus',
      });

      expect(
        putOperation?.responses['200'].content?.['application/json'].schema
      ).toEqual({
        $ref: '#/components/schemas/StatusOrScheduledStatus',
      });

      // Should have created exactly one synthetic schema
      const synthetics = Object.keys(spec.components?.schemas || {}).filter(
        (name) => name.includes('Or')
      );
      expect(synthetics).toEqual(['StatusOrScheduledStatus']);
    });

    it('should generate different synthetic schemas for different entity combinations', () => {
      const entities: EntityClass[] = [
        {
          name: 'Status',
          description: 'Status entity',
          attributes: [
            { name: 'id', type: 'String', description: 'Status ID' },
          ],
        },
        {
          name: 'ScheduledStatus',
          description: 'ScheduledStatus entity',
          attributes: [
            { name: 'id', type: 'String', description: 'Scheduled status ID' },
          ],
        },
        {
          name: 'Account',
          description: 'Account entity',
          attributes: [
            { name: 'id', type: 'String', description: 'Account ID' },
          ],
        },
      ];

      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'mixed',
          description: 'Mixed methods',
          methods: [
            {
              name: 'Method returning Status or ScheduledStatus',
              httpMethod: 'POST',
              endpoint: '/api/v1/test1',
              description: 'Test method 1',
              returns: '[Status] or [ScheduledStatus]',
            },
            {
              name: 'Method returning Status or Account',
              httpMethod: 'POST',
              endpoint: '/api/v1/test2',
              description: 'Test method 2',
              returns: '[Status] or [Account]',
            },
          ],
        },
      ];

      const spec = generator.generateSchema(entities, methodFiles);

      // Should create two different synthetic schemas
      expect(
        spec.components?.schemas?.['StatusOrScheduledStatus']
      ).toBeDefined();
      expect(spec.components?.schemas?.['StatusOrAccount']).toBeDefined();

      // Check the structure of StatusOrScheduledStatus
      expect(spec.components?.schemas?.['StatusOrScheduledStatus']).toEqual({
        type: 'object',
        properties: {
          status: { $ref: '#/components/schemas/Status' },
          scheduled_status: { $ref: '#/components/schemas/ScheduledStatus' },
        },
        description: 'Object containing one of: status, scheduled_status',
      });

      // Check the structure of StatusOrAccount
      expect(spec.components?.schemas?.['StatusOrAccount']).toEqual({
        type: 'object',
        properties: {
          status: { $ref: '#/components/schemas/Status' },
          account: { $ref: '#/components/schemas/Account' },
        },
        description: 'Object containing one of: status, account',
      });

      const operation1 = spec.paths['/api/v1/test1']?.post;
      const operation2 = spec.paths['/api/v1/test2']?.post;

      expect(
        operation1?.responses['200'].content?.['application/json'].schema
      ).toEqual({
        $ref: '#/components/schemas/StatusOrScheduledStatus',
      });

      expect(
        operation2?.responses['200'].content?.['application/json'].schema
      ).toEqual({
        $ref: '#/components/schemas/StatusOrAccount',
      });
    });

    it('should correctly convert entity names to property names', () => {
      const entities: EntityClass[] = [
        {
          name: 'FamiliarFollowers',
          description: 'FamiliarFollowers entity',
          attributes: [{ name: 'id', type: 'String', description: 'ID' }],
        },
        {
          name: 'Account',
          description: 'Account entity',
          attributes: [
            { name: 'id', type: 'String', description: 'Account ID' },
          ],
        },
      ];

      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'test',
          description: 'Test methods',
          methods: [
            {
              name: 'Test method',
              httpMethod: 'POST',
              endpoint: '/api/v1/test',
              description: 'Test method',
              returns: '[FamiliarFollowers] or [Account]',
            },
          ],
        },
      ];

      const spec = generator.generateSchema(entities, methodFiles);

      // Check that PascalCase entity names are converted to snake_case property names
      expect(spec.components?.schemas?.['FamiliarFollowersOrAccount']).toEqual({
        type: 'object',
        properties: {
          familiar_followers: {
            $ref: '#/components/schemas/FamiliarFollowers',
          },
          account: { $ref: '#/components/schemas/Account' },
        },
        description: 'Object containing one of: familiar_followers, account',
      });
    });

    it('should include all HTTP response codes from intro.md', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'accounts',
          description: 'Account methods',
          methods: [
            {
              name: 'Test method',
              httpMethod: 'GET',
              endpoint: '/api/v1/accounts/test',
              description: 'Test method.',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation = spec.paths['/api/v1/accounts/test']?.get;
      expect(operation).toBeDefined();
      expect(operation?.responses).toBeDefined();

      // Should include 200 response
      expect(operation?.responses['200']).toBeDefined();
      expect(operation?.responses['200'].description).toBe('OK.');

      // Should include error response codes from intro.md
      expect(operation?.responses['401']).toBeDefined();
      expect(operation?.responses['401'].description).toBe('Unauthorized');

      expect(operation?.responses['404']).toBeDefined();
      expect(operation?.responses['404'].description).toBe('Not Found');

      expect(operation?.responses['410']).toBeDefined();
      expect(operation?.responses['410'].description).toBe('Gone');

      expect(operation?.responses['422']).toBeDefined();
      expect(operation?.responses['422'].description).toBe('Unprocessed');

      expect(operation?.responses['503']).toBeDefined();
      expect(operation?.responses['503'].description).toBe('Unavailable');

      // Error responses should not have content, only descriptions
      expect(operation?.responses['401'].content).toBeUndefined();
      expect(operation?.responses['404'].content).toBeUndefined();
      expect(operation?.responses['410'].content).toBeUndefined();
      expect(operation?.responses['422'].content).toBeUndefined();
      expect(operation?.responses['503'].content).toBeUndefined();
    });
  });
});
