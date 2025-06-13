import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';
import { ParameterParser } from '../../parsers/ParameterParser';

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
      expect(requestBodySchema.properties).toBeDefined();

      // Check visibility parameter has enum values
      const visibilityProperty = requestBodySchema.properties!['visibility'];
      expect(visibilityProperty).toBeDefined();
      expect(visibilityProperty.type).toBe('string');
      expect(visibilityProperty.enum).toEqual([
        'public',
        'unlisted',
        'private',
        'direct',
      ]);

      // Check status parameter does not have enum values
      const statusProperty = requestBodySchema.properties!['status'];
      expect(statusProperty).toBeDefined();
      expect(statusProperty.type).toBe('string');
      expect(statusProperty.enum).toBeUndefined();
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

    it('should handle array parameters with enum values for items', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'notifications',
          description: 'Notification API methods',
          methods: [
            {
              name: 'Get grouped notifications',
              httpMethod: 'GET',
              endpoint: '/api/v2/notifications',
              description: 'Get grouped notifications',
              parameters: [
                {
                  name: 'grouped_types',
                  description: 'Array of notification types',
                  in: 'query',
                  enumValues: ['mention', 'reblog', 'favourite'],
                  schema: {
                    type: 'array',
                    items: {
                      type: 'string',
                      enum: ['mention', 'reblog', 'favourite'],
                    },
                  },
                },
              ],
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      expect(spec.paths).toBeDefined();
      expect(spec.paths['/api/v2/notifications']).toBeDefined();
      expect(spec.paths['/api/v2/notifications'].get).toBeDefined();

      const operation = spec.paths['/api/v2/notifications'].get!;
      expect(operation.parameters).toBeDefined();
      expect(operation.parameters).toHaveLength(1);

      // Check grouped_types parameter has enum values on items
      const groupedTypesParam = operation.parameters!.find(
        (p) => p.name === 'grouped_types'
      );
      expect(groupedTypesParam).toBeDefined();
      expect(groupedTypesParam!.schema!.type).toBe('array');
      expect(groupedTypesParam!.schema!.items).toBeDefined();
      expect(groupedTypesParam!.schema!.items!.enum).toEqual([
        'mention',
        'reblog',
        'favourite',
      ]);
    });

    it('should generate enum values for formData parameters with "One of" pattern', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'lists',
          description: 'List API methods',
          methods: [
            {
              name: 'Update a list',
              httpMethod: 'PUT',
              endpoint: '/api/v1/lists/{id}',
              description: 'Update a list',
              parameters: [
                {
                  name: 'replies_policy',
                  description:
                    'String. One of followed, list, or none. Defaults to list.',
                  in: 'formData',
                  enumValues: ['followed', 'list', 'none'], // Simulate what would be extracted during parsing
                  defaultValue: 'list', // Simulate what would be extracted during parsing
                },
                {
                  name: 'title',
                  description: 'String. The title of the list.',
                  in: 'formData',
                },
              ],
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      expect(spec.paths).toBeDefined();
      expect(spec.paths['/api/v1/lists/{id}']).toBeDefined();
      expect(spec.paths['/api/v1/lists/{id}'].put).toBeDefined();

      const operation = spec.paths['/api/v1/lists/{id}'].put!;
      expect(operation.requestBody).toBeDefined();

      const requestBodySchema = operation.requestBody!.content![
        'application/json'
      ].schema as any;
      expect(requestBodySchema.properties).toBeDefined();

      // Check replies_policy parameter has enum values
      const repliesPolicyProperty =
        requestBodySchema.properties!['replies_policy'];
      expect(repliesPolicyProperty).toBeDefined();
      expect(repliesPolicyProperty.type).toBe('string');
      expect(repliesPolicyProperty.enum).toEqual(['followed', 'list', 'none']);
      expect(repliesPolicyProperty.default).toBe('list');

      // Check title parameter does not have enum values or default
      const titleProperty = requestBodySchema.properties!['title'];
      expect(titleProperty).toBeDefined();
      expect(titleProperty.type).toBe('string');
      expect(titleProperty.enum).toBeUndefined();
      expect(titleProperty.default).toBeUndefined();
    });

    it('should correctly parse enum values from ParameterParser integration', () => {
      // Test the full flow from documentation parsing to schema generation
      const mockSection = `
## Update a list {#update}

\`\`\`http
PUT /api/v1/lists/{id} HTTP/1.1
\`\`\`

Update a list.

##### Form data parameters

replies_policy
: String. One of followed, list, or none. Defaults to list.

title
: String. The title of the list.
`;

      // Use ParameterParser to parse the section (simulating real parsing)
      const parameters = ParameterParser.parseParametersByType(
        mockSection,
        'Form data parameters',
        'formData'
      );

      // Verify that enum values were extracted correctly
      const repliesPolicyParam = parameters.find(
        (p) => p.name === 'replies_policy'
      );
      expect(repliesPolicyParam).toBeDefined();
      expect(repliesPolicyParam!.enumValues).toEqual([
        'followed',
        'list',
        'none',
      ]);
      expect(repliesPolicyParam!.defaultValue).toBe('list');

      const titleParam = parameters.find((p) => p.name === 'title');
      expect(titleParam).toBeDefined();
      expect(titleParam!.enumValues).toBeUndefined();
      expect(titleParam!.defaultValue).toBeUndefined();

      // Now test that these parameters flow through to OpenAPI generation
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'lists',
          description: 'List API methods',
          methods: [
            {
              name: 'Update a list',
              httpMethod: 'PUT',
              endpoint: '/api/v1/lists/{id}',
              description: 'Update a list',
              parameters: parameters,
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);
      const operation = spec.paths['/api/v1/lists/{id}'].put!;
      const requestBodySchema = operation.requestBody!.content![
        'application/json'
      ].schema as any;

      // Verify enum values made it through to the final schema
      const repliesPolicyProperty =
        requestBodySchema.properties!['replies_policy'];
      expect(repliesPolicyProperty.enum).toEqual(['followed', 'list', 'none']);
      expect(repliesPolicyProperty.default).toBe('list');
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
