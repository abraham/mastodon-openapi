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

    it('should generate response schema for array of string', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'instance',
          description: 'Instance methods',
          methods: [
            {
              name: 'View federated instances',
              httpMethod: 'GET',
              endpoint: '/api/v1/instance/peers',
              description:
                'Obtain a list of all domains that your instance knows about.',
              returns: 'Array of String',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation = spec.paths['/api/v1/instance/peers']?.get;
      expect(operation).toBeDefined();
      expect(operation?.responses['200']).toBeDefined();

      // Should have content with application/json schema for array of strings
      expect(operation?.responses['200'].content).toBeDefined();
      expect(
        operation?.responses['200'].content?.['application/json']
      ).toBeDefined();
      expect(
        operation?.responses['200'].content?.['application/json'].schema
      ).toEqual({
        type: 'array',
        items: {
          type: 'string',
        },
      });
    });

    it('should generate response schema for array of integer', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'test',
          description: 'Test methods',
          methods: [
            {
              name: 'Get numbers',
              httpMethod: 'GET',
              endpoint: '/api/v1/test/numbers',
              description: 'Get array of numbers.',
              returns: 'Array of Integer',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation = spec.paths['/api/v1/test/numbers']?.get;
      expect(operation).toBeDefined();
      expect(operation?.responses['200']).toBeDefined();

      // Should have content with application/json schema for array of integers
      expect(operation?.responses['200'].content).toBeDefined();
      expect(
        operation?.responses['200'].content?.['application/json']
      ).toBeDefined();
      expect(
        operation?.responses['200'].content?.['application/json'].schema
      ).toEqual({
        type: 'array',
        items: {
          type: 'integer',
        },
      });
    });

    it('should generate response schema for array of boolean', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'test',
          description: 'Test methods',
          methods: [
            {
              name: 'Get flags',
              httpMethod: 'GET',
              endpoint: '/api/v1/test/flags',
              description: 'Get array of flags.',
              returns: 'Array of Boolean',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation = spec.paths['/api/v1/test/flags']?.get;
      expect(operation).toBeDefined();
      expect(operation?.responses['200']).toBeDefined();

      // Should have content with application/json schema for array of booleans
      expect(operation?.responses['200'].content).toBeDefined();
      expect(
        operation?.responses['200'].content?.['application/json']
      ).toBeDefined();
      expect(
        operation?.responses['200'].content?.['application/json'].schema
      ).toEqual({
        type: 'array',
        items: {
          type: 'boolean',
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

    it('should generate oneOf response schema for multiple return types', () => {
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

      // Should have content with application/json schema using oneOf directly
      expect(operation?.responses['200'].content).toBeDefined();
      expect(
        operation?.responses['200'].content?.['application/json']
      ).toBeDefined();
      expect(
        operation?.responses['200'].content?.['application/json'].schema
      ).toEqual({
        oneOf: [
          { $ref: '#/components/schemas/Status' },
          { $ref: '#/components/schemas/ScheduledStatus' },
        ],
      });

      // Should not create synthetic schemas in components
      expect(
        spec.components?.schemas?.['StatusOrScheduledStatus']
      ).toBeUndefined();
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

    it('should use oneOf for identical entity combinations in different endpoints', () => {
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

      // Both operations should use oneOf directly
      const postOperation = spec.paths['/api/v1/statuses']?.post;
      const putOperation = spec.paths['/api/v1/statuses/{id}']?.put;

      const expectedOneOf = {
        oneOf: [
          { $ref: '#/components/schemas/Status' },
          { $ref: '#/components/schemas/ScheduledStatus' },
        ],
      };

      expect(
        postOperation?.responses['200'].content?.['application/json'].schema
      ).toEqual(expectedOneOf);

      expect(
        putOperation?.responses['200'].content?.['application/json'].schema
      ).toEqual(expectedOneOf);

      // Should not create synthetic schemas
      const synthetics = Object.keys(spec.components?.schemas || {}).filter(
        (name) => name.includes('Or')
      );
      expect(synthetics).toEqual([]);
    });

    it('should use oneOf for different entity combinations', () => {
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

      // Should not create synthetic schemas
      expect(
        spec.components?.schemas?.['StatusOrScheduledStatus']
      ).toBeUndefined();
      expect(spec.components?.schemas?.['StatusOrAccount']).toBeUndefined();

      const operation1 = spec.paths['/api/v1/test1']?.post;
      const operation2 = spec.paths['/api/v1/test2']?.post;

      expect(
        operation1?.responses['200'].content?.['application/json'].schema
      ).toEqual({
        oneOf: [
          { $ref: '#/components/schemas/Status' },
          { $ref: '#/components/schemas/ScheduledStatus' },
        ],
      });

      expect(
        operation2?.responses['200'].content?.['application/json'].schema
      ).toEqual({
        oneOf: [
          { $ref: '#/components/schemas/Status' },
          { $ref: '#/components/schemas/Account' },
        ],
      });
    });

    it('should use oneOf for entity names with mixed casing', () => {
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

      // Should not create synthetic schemas, even for PascalCase entity names
      expect(
        spec.components?.schemas?.['FamiliarFollowersOrAccount']
      ).toBeUndefined();

      const operation = spec.paths['/api/v1/test']?.post;
      expect(
        operation?.responses['200'].content?.['application/json'].schema
      ).toEqual({
        oneOf: [
          { $ref: '#/components/schemas/FamiliarFollowers' },
          { $ref: '#/components/schemas/Account' },
        ],
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
      expect(operation?.responses['422'].description).toBe(
        'Unprocessable Content'
      );

      expect(operation?.responses['503']).toBeDefined();
      expect(operation?.responses['503'].description).toBe('Unavailable');

      expect(operation?.responses['429']).toBeDefined();
      expect(operation?.responses['429'].description).toBe('Too Many Requests');

      // Error responses should not have content, only descriptions
      expect(operation?.responses['401'].content).toBeUndefined();
      expect(operation?.responses['404'].content).toBeUndefined();
      expect(operation?.responses['410'].content).toBeUndefined();
      expect(operation?.responses['422'].content).toBeUndefined();
      expect(operation?.responses['503'].content).toBeUndefined();
      expect(operation?.responses['429'].content).toBeUndefined();
    });
  });
});
