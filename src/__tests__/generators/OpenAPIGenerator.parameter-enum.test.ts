import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('OpenAPIGenerator Parameter Enum Support', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  describe('Parameter enum handling', () => {
    it('should generate enum values for form data parameters with enumValues', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'statuses',
          description: 'Status API methods',
          methods: [
            {
              name: 'Post a new status',
              httpMethod: 'POST',
              endpoint: '/api/v1/statuses',
              description: 'Publish a status',
              parameters: [
                {
                  name: 'status',
                  description: 'The text content of the status',
                  in: 'formData',
                },
                {
                  name: 'visibility',
                  description: 'Sets the visibility of the posted status',
                  in: 'formData',
                  enumValues: ['public', 'unlisted', 'private', 'direct'],
                },
              ],
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      expect(spec.paths).toBeDefined();
      expect(spec.paths['/api/v1/statuses']).toBeDefined();
      expect(spec.paths['/api/v1/statuses'].post).toBeDefined();

      const operation = spec.paths['/api/v1/statuses'].post!;
      expect(operation.requestBody).toBeDefined();

      const requestBodySchema = operation.requestBody!.content![
        'application/json'
      ].schema as any;

      // The createStatus endpoint now uses oneOf, so we need to check the component schemas
      expect(requestBodySchema.oneOf).toBeDefined();
      expect(requestBodySchema.oneOf).toHaveLength(2);

      // Check that both StatusRequest and ScheduledStatusRequest schemas exist
      expect(spec.components?.schemas?.['StatusRequest']).toBeDefined();
      expect(
        spec.components?.schemas?.['ScheduledStatusRequest']
      ).toBeDefined();

      // Check visibility parameter has enum values in StatusRequest
      const statusRequestSchema = spec.components!.schemas![
        'StatusRequest'
      ] as any;
      expect(statusRequestSchema.properties).toBeDefined();

      const visibilityProperty = statusRequestSchema.properties!['visibility'];
      expect(visibilityProperty).toBeDefined();
      expect(visibilityProperty.type).toBe('string');
      expect(visibilityProperty.enum).toEqual([
        'public',
        'unlisted',
        'private',
        'direct',
      ]);

      // Check status parameter does not have enum values in StatusRequest
      const statusProperty = statusRequestSchema.properties!['status'];
      expect(statusProperty).toBeDefined();
      expect(statusProperty.type).toBe('string');
      expect(statusProperty.enum).toBeUndefined();

      // Also check ScheduledStatusRequest has the same enum values
      const scheduledStatusRequestSchema = spec.components!.schemas![
        'ScheduledStatusRequest'
      ] as any;
      expect(scheduledStatusRequestSchema.properties).toBeDefined();

      const scheduledVisibilityProperty =
        scheduledStatusRequestSchema.properties!['visibility'];
      expect(scheduledVisibilityProperty).toBeDefined();
      expect(scheduledVisibilityProperty.type).toBe('string');
      expect(scheduledVisibilityProperty.enum).toEqual([
        'public',
        'unlisted',
        'private',
        'direct',
      ]);
    });

    it('should generate enum values for query parameters with enumValues', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'markers',
          description: 'Marker API methods',
          methods: [
            {
              name: 'Get saved timeline position',
              httpMethod: 'GET',
              endpoint: '/api/v1/markers',
              description: 'Get current position in timelines',
              parameters: [
                {
                  name: 'timeline[]',
                  description: 'Array of timeline names',
                  in: 'query',
                  enumValues: ['home', 'notifications'],
                },
                {
                  name: 'limit',
                  description: 'Maximum number of results',
                  in: 'query',
                },
              ],
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      expect(spec.paths).toBeDefined();
      expect(spec.paths['/api/v1/markers']).toBeDefined();
      expect(spec.paths['/api/v1/markers'].get).toBeDefined();

      const operation = spec.paths['/api/v1/markers'].get!;
      expect(operation.parameters).toBeDefined();
      expect(operation.parameters).toHaveLength(2);

      // Check timeline parameter has enum values
      const timelineParam = operation.parameters!.find(
        (p) => p.name === 'timeline[]'
      );
      expect(timelineParam).toBeDefined();
      expect(timelineParam!.schema!.type).toBe('string');
      expect((timelineParam!.schema as any).enum).toEqual([
        'home',
        'notifications',
      ]);

      // Check limit parameter does not have enum values
      const limitParam = operation.parameters!.find((p) => p.name === 'limit');
      expect(limitParam).toBeDefined();
      expect(limitParam!.schema!.type).toBe('string');
      expect((limitParam!.schema as any).enum).toBeUndefined();
    });

    it('should handle parameters without enum values gracefully', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'test',
          description: 'Test methods',
          methods: [
            {
              name: 'Test method',
              httpMethod: 'POST',
              endpoint: '/api/v1/test',
              description: 'Test endpoint',
              parameters: [
                {
                  name: 'regular_param',
                  description: 'A regular parameter without enum values',
                  in: 'formData',
                  // No enumValues property
                },
              ],
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation = spec.paths['/api/v1/test'].post!;
      const requestBodySchema = operation.requestBody!.content![
        'application/json'
      ].schema as any;
      const paramProperty = requestBodySchema.properties!['regular_param'];

      expect(paramProperty.type).toBe('string');
      expect(paramProperty.enum).toBeUndefined();
    });
  });
});
