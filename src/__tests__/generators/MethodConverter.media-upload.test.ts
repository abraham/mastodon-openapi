import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('MethodConverter Media Upload Tests', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  describe('Media upload endpoints', () => {
    it('should use multipart/form-data for POST /api/v2/media endpoint', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'media',
          description: 'Media upload methods',
          methods: [
            {
              name: 'Upload media as an attachment (async)',
              httpMethod: 'POST',
              endpoint: '/api/v2/media',
              description:
                'Creates a media attachment to be used with a new status.',
              parameters: [
                {
                  name: 'file',
                  description:
                    'Object. The file to be attached, encoded using multipart form data. The file must have a MIME type.',
                  required: true,
                  in: 'formData',
                },
                {
                  name: 'thumbnail',
                  description:
                    'Object. The custom thumbnail of the media to be attached, encoded using multipart form data.',
                  in: 'formData',
                },
                {
                  name: 'description',
                  description:
                    'String. A plain-text description of the media, for accessibility purposes.',
                  in: 'formData',
                },
                {
                  name: 'focus',
                  description:
                    'String. Two floating points (x,y), comma-delimited, ranging from -1.0 to 1.0.',
                  in: 'formData',
                },
              ],
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      expect(spec.paths['/api/v2/media']).toBeDefined();
      const operation = spec.paths['/api/v2/media'].post!;
      expect(operation.requestBody).toBeDefined();

      // Should use multipart/form-data content type
      expect(operation.requestBody!.content).toHaveProperty(
        'multipart/form-data'
      );
      expect(operation.requestBody!.content).not.toHaveProperty(
        'application/json'
      );

      // Should have correct description
      expect(operation.requestBody!.description).toBe(
        'Multipart form data parameters'
      );

      const schema = operation.requestBody!.content!['multipart/form-data']
        .schema as any;

      // File parameter should have format: binary
      expect(schema.properties.file.type).toBe('string');
      expect(schema.properties.file.format).toBe('binary');

      // Thumbnail parameter should have format: binary
      expect(schema.properties.thumbnail.type).toBe('string');
      expect(schema.properties.thumbnail.format).toBe('binary');

      // Non-file parameters should not have format: binary
      expect(schema.properties.description.type).toBe('string');
      expect(schema.properties.description.format).toBeUndefined();

      expect(schema.properties.focus.type).toBe('string');
      expect(schema.properties.focus.format).toBeUndefined();

      // Required field should be present
      expect(schema.required).toEqual(['file']);
    });

    it('should use multipart/form-data for POST /api/v1/media endpoint', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'media',
          description: 'Media upload methods',
          methods: [
            {
              name: 'Upload media as an attachment (v1)',
              httpMethod: 'POST',
              endpoint: '/api/v1/media',
              description:
                'Creates an attachment to be used with a new status.',
              parameters: [
                {
                  name: 'file',
                  description:
                    'Object. The file to be attached, encoded using multipart form data. The file must have a MIME type.',
                  required: true,
                  in: 'formData',
                },
                {
                  name: 'thumbnail',
                  description:
                    'Object. The custom thumbnail of the media to be attached, encoded using multipart form data.',
                  in: 'formData',
                },
                {
                  name: 'description',
                  description:
                    'String. A plain-text description of the media, for accessibility purposes.',
                  in: 'formData',
                },
                {
                  name: 'focus',
                  description:
                    'String. Two floating points (x,y), comma-delimited, ranging from -1.0 to 1.0.',
                  in: 'formData',
                },
              ],
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation = spec.paths['/api/v1/media'].post!;
      expect(operation.requestBody!.content).toHaveProperty(
        'multipart/form-data'
      );
      expect(operation.requestBody!.content).not.toHaveProperty(
        'application/json'
      );

      const schema = operation.requestBody!.content!['multipart/form-data']
        .schema as any;
      expect(schema.properties.file.format).toBe('binary');
      expect(schema.properties.thumbnail.format).toBe('binary');
    });

    it('should use multipart/form-data for PUT /api/v1/media/{id} endpoint', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'media',
          description: 'Media upload methods',
          methods: [
            {
              name: 'Update media attachment',
              httpMethod: 'PUT',
              endpoint: '/api/v1/media/{id}',
              description:
                "Update a MediaAttachment's parameters, before it is attached to a status and posted.",
              parameters: [
                {
                  name: 'thumbnail',
                  description:
                    'Object. The custom thumbnail of the media to be attached, encoded using multipart form data.',
                  in: 'formData',
                },
                {
                  name: 'description',
                  description:
                    'String. A plain-text description of the media, for accessibility purposes.',
                  in: 'formData',
                },
                {
                  name: 'focus',
                  description:
                    'String. Two floating points (x,y), comma-delimited, ranging from -1.0 to 1.0.',
                  in: 'formData',
                },
              ],
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation = spec.paths['/api/v1/media/{id}'].put!;
      expect(operation.requestBody!.content).toHaveProperty(
        'multipart/form-data'
      );
      expect(operation.requestBody!.content).not.toHaveProperty(
        'application/json'
      );

      const schema = operation.requestBody!.content!['multipart/form-data']
        .schema as any;
      expect(schema.properties.thumbnail.format).toBe('binary');
      expect(schema.properties.description.format).toBeUndefined();
    });

    it('should not affect non-media endpoints without file parameters', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'accounts',
          description: 'Account methods',
          methods: [
            {
              name: 'Update credentials',
              httpMethod: 'PATCH',
              endpoint: '/api/v1/accounts/update_credentials',
              description: 'Update user account.',
              parameters: [
                {
                  name: 'display_name',
                  description:
                    'String. The display name to use for the profile.',
                  in: 'formData',
                },
                {
                  name: 'note',
                  description: 'String. The account bio.',
                  in: 'formData',
                },
              ],
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation =
        spec.paths['/api/v1/accounts/update_credentials'].patch!;

      // Should still use application/json for non-media endpoints
      expect(operation.requestBody!.content).toHaveProperty('application/json');
      expect(operation.requestBody!.content).not.toHaveProperty(
        'multipart/form-data'
      );

      const schema = operation.requestBody!.content!['application/json']
        .schema as any;
      expect(schema.properties.display_name.format).toBeUndefined();
      expect(schema.properties.note.format).toBeUndefined();
    });

    it('should handle endpoints with file parameters that are not media upload endpoints', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'accounts',
          description: 'Account methods',
          methods: [
            {
              name: 'Update credentials',
              httpMethod: 'PATCH',
              endpoint: '/api/v1/accounts/update_credentials',
              description: 'Update user account.',
              parameters: [
                {
                  name: 'avatar',
                  description:
                    'Object. Avatar image encoded using multipart form data.',
                  in: 'formData',
                },
                {
                  name: 'header',
                  description:
                    'Object. Header image encoded using multipart form data.',
                  in: 'formData',
                },
                {
                  name: 'display_name',
                  description:
                    'String. The display name to use for the profile.',
                  in: 'formData',
                },
              ],
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation =
        spec.paths['/api/v1/accounts/update_credentials'].patch!;

      // Should use multipart/form-data because it has file parameters
      expect(operation.requestBody!.content).toHaveProperty(
        'multipart/form-data'
      );
      expect(operation.requestBody!.content).not.toHaveProperty(
        'application/json'
      );

      const schema = operation.requestBody!.content!['multipart/form-data']
        .schema as any;
      expect(schema.properties.avatar.format).toBe('binary');
      expect(schema.properties.header.format).toBe('binary');
      expect(schema.properties.display_name.format).toBeUndefined();
    });
  });
});
