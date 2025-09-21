import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';
import { EntityClass } from '../../interfaces/EntityClass';
import { EntityAttribute } from '../../interfaces/EntityAttribute';

describe('OpenAPIGenerator Request Body Enum Naming', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  describe('Request body enum naming improvements', () => {
    it('should use entity-based naming for request body enums that match entity attributes', () => {
      // Define a Notification entity with a type enum
      const entityClasses: EntityClass[] = [
        {
          name: 'Notification',
          description: 'Represents a notification',
          attributes: [
            {
              name: 'type',
              type: 'String',
              description: 'The type of notification',
              enumValues: [
                'mention',
                'status', 
                'reblog',
                'follow',
                'follow_request',
                'favourite',
                'poll',
                'update',
                'admin.sign_up',
                'admin.report'
              ],
            } as EntityAttribute,
          ],
        },
      ];

      // Define a method that uses the same enum values in a request parameter
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'notifications',
          description: 'Notification API methods',
          methods: [
            {
              name: 'Get notifications',
              httpMethod: 'GET',
              endpoint: '/api/v1/notifications',
              description: 'Get notifications',
              parameters: [
                {
                  name: 'types[]',
                  description: 'Array of notification types',
                  in: 'query',
                  enumValues: [
                    'mention',
                    'status',
                    'reblog', 
                    'follow',
                    'follow_request',
                    'favourite',
                    'poll',
                    'update',
                    'admin.sign_up',
                    'admin.report'
                  ],
                  schema: {
                    type: 'array',
                    items: {
                      type: 'string',
                      enum: [
                        'mention',
                        'status',
                        'reblog',
                        'follow', 
                        'follow_request',
                        'favourite',
                        'poll',
                        'update',
                        'admin.sign_up',
                        'admin.report'
                      ],
                    },
                  },
                },
              ],
            },
          ],
        },
      ];

      const spec = generator.generateSchema(entityClasses, methodFiles);

      // Check that the generated enum has a proper name
      expect(spec.components?.schemas?.NotificationTypeEnum).toBeDefined();
      expect(spec.components?.schemas?.NotificationTypeEnum).toEqual({
        type: 'string',
        enum: [
          'mention',
          'status',
          'reblog',
          'follow',
          'follow_request',
          'favourite',
          'poll',
          'update',
          'admin.sign_up',
          'admin.report'
        ],
      });

      // Check that the bad name is NOT generated
      expect(spec.components?.schemas?.GetApiV1NotificationsParamTypesEnum).toBeUndefined();
      
      // Check that the parameter references the correctly named enum
      const operation = spec.paths['/api/v1/notifications'].get!;
      const typesParam = operation.parameters?.find((p) => p.name === 'types[]');
      expect(typesParam?.schema?.items?.$ref).toBe('#/components/schemas/NotificationTypeEnum');
    });

    it('should fallback to property-based naming for request body enums with no entity match', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'custom',
          description: 'Custom API methods',
          methods: [
            {
              name: 'Create custom object',
              httpMethod: 'POST', 
              endpoint: '/api/v1/custom',
              description: 'Create a custom object',
              parameters: [
                {
                  name: 'priority',
                  description: 'Priority level',
                  in: 'formData',
                  enumValues: ['low', 'medium', 'high'],
                },
              ],
            },
            {
              name: 'Update custom object',
              httpMethod: 'PUT', 
              endpoint: '/api/v1/custom/{id}',
              description: 'Update a custom object',
              parameters: [
                {
                  name: 'priority',
                  description: 'Priority level',
                  in: 'formData',
                  enumValues: ['low', 'medium', 'high'], // Same enum, should be deduplicated
                },
              ],
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      // Debug: log all generated enum components
      console.log('All enum components:', Object.keys(spec.components?.schemas || {}).filter(key => key.includes('Enum')));

      // Since the same enum appears multiple times, it should be extracted and use better naming
      expect(spec.components?.schemas?.PriorityEnum).toBeDefined();
      expect(spec.components?.schemas?.PriorityEnum).toEqual({
        type: 'string',
        enum: ['low', 'medium', 'high'],
      });

      // Check that both endpoints reference the same enum component
      const createRequestBodySchema = spec.paths['/api/v1/custom'].post!.requestBody!
        .content!['application/json'].schema as any;
      const createPriorityProperty = createRequestBodySchema.properties!['priority'];
      expect(createPriorityProperty.$ref).toBe('#/components/schemas/PriorityEnum');

      const updateRequestBodySchema = spec.paths['/api/v1/custom/{id}'].put!.requestBody!
        .content!['application/json'].schema as any;
      const updatePriorityProperty = updateRequestBodySchema.properties!['priority'];
      expect(updatePriorityProperty.$ref).toBe('#/components/schemas/PriorityEnum');
    });
  });
});