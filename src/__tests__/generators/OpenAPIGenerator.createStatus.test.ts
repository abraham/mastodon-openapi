import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';
import { EntityClass } from '../../interfaces/EntityClass';

describe('OpenAPIGenerator createStatus splitting', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  it('should split POST /api/v1/statuses into createStatus and scheduleStatus methods', () => {
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
                  'String. Schedule the status to be posted at this time.',
                required: false,
                in: 'formData',
              },
            ],
          },
        ],
      },
    ];

    const spec = generator.generateSchema(entities, methodFiles);

    // Should have both paths defined
    const createStatusPath = spec.paths['/api/v1/statuses'];
    const scheduleStatusPath = spec.paths['/api/v1/statuses#schedule'];

    expect(createStatusPath).toBeDefined();
    expect(scheduleStatusPath).toBeDefined();

    // Check createStatus operation
    expect(createStatusPath?.post).toBeDefined();
    expect(createStatusPath?.post?.operationId).toBe('createStatus');
    expect(
      createStatusPath?.post?.responses['200'].content?.['application/json']
        .schema
    ).toEqual({
      $ref: '#/components/schemas/Status',
    });

    // Check scheduleStatus operation
    expect(scheduleStatusPath?.post).toBeDefined();
    expect(scheduleStatusPath?.post?.operationId).toBe('scheduleStatus');
    expect(
      scheduleStatusPath?.post?.responses['200'].content?.['application/json']
        .schema
    ).toEqual({
      $ref: '#/components/schemas/ScheduledStatus',
    });

    // Verify that StatusOrScheduledStatus is NOT created
    expect(
      spec.components?.schemas?.['StatusOrScheduledStatus']
    ).toBeUndefined();

    // And that we have the individual schemas
    expect(spec.components?.schemas?.['Status']).toBeDefined();
    expect(spec.components?.schemas?.['ScheduledStatus']).toBeDefined();

    // Check parameter differences
    const createStatusParams = createStatusPath?.post?.requestBody?.content?.[
      'application/json'
    ]?.schema as any;
    const scheduleStatusParams = scheduleStatusPath?.post?.requestBody
      ?.content?.['application/json']?.schema as any;

    // createStatus should not have scheduled_at parameter
    expect(createStatusParams?.properties?.scheduled_at).toBeUndefined();

    // scheduleStatus should have scheduled_at as required parameter
    expect(scheduleStatusParams?.properties?.scheduled_at).toBeDefined();
    expect(scheduleStatusParams?.required).toContain('scheduled_at');
  });
});
