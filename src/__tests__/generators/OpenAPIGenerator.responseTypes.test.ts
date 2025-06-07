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
      expect(operation?.responses['200'].description).toBe('Success');
    });

    it('should generate oneOf schema for multiple return types', () => {
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

      // Should have content with application/json schema using oneOf
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
  });
});
