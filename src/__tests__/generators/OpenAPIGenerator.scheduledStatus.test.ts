import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';
import { EntityClass } from '../../interfaces/EntityClass';

describe('OpenAPIGenerator - Scheduled Status Support', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  describe('createStatus request body handling', () => {
    it('should generate oneOf request body schemas for createStatus endpoint', () => {
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
              parameters: [
                {
                  name: 'status',
                  description: 'String. The text content of the status.',
                  required: false,
                  in: 'formData',
                },
                {
                  name: 'media_ids',
                  description:
                    'Array of String. Include Attachment IDs to be attached as media.',
                  required: false,
                  in: 'formData',
                },
                {
                  name: 'scheduled_at',
                  description:
                    'String. Datetime at which to schedule a status.',
                  required: false,
                  in: 'formData',
                },
              ],
            },
          ],
        },
      ];

      const spec = generator.generateSchema(entities, methodFiles);

      const operation = spec.paths['/api/v1/statuses']?.post;
      expect(operation).toBeDefined();
      expect(operation?.requestBody).toBeDefined();

      // Should use oneOf with two schemas
      const requestBodySchema = operation?.requestBody?.content?.[
        'application/json'
      ].schema as any;
      expect(requestBodySchema).toHaveProperty('oneOf');
      expect(requestBodySchema?.oneOf).toHaveLength(2);

      // Check StatusRequest schema (without scheduled_at)
      const statusRequestRef = requestBodySchema?.oneOf?.[0];
      expect(statusRequestRef).toEqual({
        $ref: '#/components/schemas/StatusRequest',
      });

      // Check ScheduledStatusRequest schema (with required scheduled_at)
      const scheduledStatusRequestRef = requestBodySchema?.oneOf?.[1];
      expect(scheduledStatusRequestRef).toEqual({
        $ref: '#/components/schemas/ScheduledStatusRequest',
      });

      // Verify the component schemas were created
      expect(spec.components?.schemas?.['StatusRequest']).toBeDefined();
      expect(
        spec.components?.schemas?.['ScheduledStatusRequest']
      ).toBeDefined();

      // StatusRequest should NOT have scheduled_at
      const statusRequest = spec.components?.schemas?.['StatusRequest'];
      expect(statusRequest?.properties).toBeDefined();
      expect(statusRequest?.properties?.['scheduled_at']).toBeUndefined();
      expect(statusRequest?.properties?.['status']).toBeDefined();
      expect(statusRequest?.properties?.['media_ids']).toBeDefined();

      // ScheduledStatusRequest should have scheduled_at as required
      const scheduledStatusRequest =
        spec.components?.schemas?.['ScheduledStatusRequest'];
      expect(scheduledStatusRequest?.properties).toBeDefined();
      expect(
        scheduledStatusRequest?.properties?.['scheduled_at']
      ).toBeDefined();
      expect(scheduledStatusRequest?.properties?.['status']).toBeDefined();
      expect(scheduledStatusRequest?.properties?.['media_ids']).toBeDefined();
      expect(scheduledStatusRequest?.required).toContain('scheduled_at');
    });

    it('should not affect other POST endpoints', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'accounts',
          description: 'Account methods',
          methods: [
            {
              name: 'Register account',
              httpMethod: 'POST',
              endpoint: '/api/v1/accounts',
              description: 'Register a new account.',
              parameters: [
                {
                  name: 'username',
                  description: 'String. The username for the account.',
                  required: true,
                  in: 'formData',
                },
                {
                  name: 'scheduled_at',
                  description: 'String. Some other scheduled parameter.',
                  required: false,
                  in: 'formData',
                },
              ],
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation = spec.paths['/api/v1/accounts']?.post;
      expect(operation).toBeDefined();
      expect(operation?.requestBody).toBeDefined();

      // Should NOT use oneOf - should use the regular object schema
      const requestBodySchema = operation?.requestBody?.content?.[
        'application/json'
      ].schema as any;
      expect(requestBodySchema).not.toHaveProperty('oneOf');
      expect(requestBodySchema?.type).toBe('object');
      expect(requestBodySchema?.properties).toBeDefined();
      expect(requestBodySchema?.properties?.['username']).toBeDefined();
      expect(requestBodySchema?.properties?.['scheduled_at']).toBeDefined();
    });

    it('should maintain response handling unchanged', () => {
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
              parameters: [
                {
                  name: 'status',
                  description: 'String. The text content of the status.',
                  required: false,
                  in: 'formData',
                },
                {
                  name: 'scheduled_at',
                  description:
                    'String. Datetime at which to schedule a status.',
                  required: false,
                  in: 'formData',
                },
              ],
            },
          ],
        },
      ];

      const spec = generator.generateSchema(entities, methodFiles);

      // Response should still use the existing StatusOrScheduledStatus pattern
      const operation = spec.paths['/api/v1/statuses']?.post;
      expect(operation?.responses['200']).toBeDefined();
      expect(
        operation?.responses['200'].content?.['application/json'].schema
      ).toEqual({
        $ref: '#/components/schemas/StatusOrScheduledStatus',
      });

      // The synthetic response schema should still be created
      expect(
        spec.components?.schemas?.['StatusOrScheduledStatus']
      ).toBeDefined();
    });
  });
});
