import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiParameter } from '../../interfaces/ApiParameter';

describe('OpenAPIGenerator Complex Parameters', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  describe('Complex parameter schema conversion', () => {
    it('should convert array parameters to correct OpenAPI schema', () => {
      const arrayParam: ApiParameter = {
        name: 'media_ids',
        description:
          'Array of String. Include Attachment IDs to be attached as media.',
        required: true,
        in: 'formData',
        schema: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      };

      const schema = (generator as any).convertParameterToSchema(arrayParam);

      expect(schema).toEqual({
        type: 'array',
        description:
          'Include Attachment IDs to be attached as media.',
        items: {
          type: 'string',
        },
      });
    });

    it('should convert object parameters to correct OpenAPI schema', () => {
      const objectParam: ApiParameter = {
        name: 'poll',
        description: 'Object containing the following properties:',
        required: true,
        in: 'formData',
        schema: {
          type: 'object',
          properties: {
            options: {
              type: 'array',
              description: 'Array of String. Possible answers to the poll.',
              items: { type: 'string' },
            },
            expires_in: {
              type: 'integer',
              description:
                'Integer. Duration that the poll should be open, in seconds.',
            },
            multiple: {
              type: 'boolean',
              description:
                'Boolean. Allow multiple choices? Defaults to false.',
            },
          },
        },
      };

      const schema = (generator as any).convertParameterToSchema(objectParam);

      expect(schema).toEqual({
        type: 'object',
        description: 'Object containing the following properties:',
        properties: {
          options: {
            type: 'array',
            description: 'Array of String. Possible answers to the poll.',
            items: {
              type: 'string',
            },
          },
          expires_in: {
            type: 'integer',
            description:
              'Integer. Duration that the poll should be open, in seconds.',
          },
          multiple: {
            type: 'boolean',
            description: 'Boolean. Allow multiple choices? Defaults to false.',
          },
        },
      });
    });

    it('should handle simple parameters without schema (backwards compatibility)', () => {
      const simpleParam: ApiParameter = {
        name: 'status',
        description: 'String. The text content of the status.',
        required: true,
        in: 'formData',
        enumValues: ['public', 'unlisted', 'private'],
      };

      const schema = (generator as any).convertParameterToSchema(simpleParam);

      expect(schema).toEqual({
        type: 'string',
        description: 'The text content of the status.',
        enum: ['public', 'unlisted', 'private'],
      });
    });

    it('should handle parameters without schema or enum values', () => {
      const basicParam: ApiParameter = {
        name: 'in_reply_to_id',
        description: 'String. ID of the status being replied to.',
        in: 'formData',
      };

      const schema = (generator as any).convertParameterToSchema(basicParam);

      expect(schema).toEqual({
        type: 'string',
        description: 'ID of the status being replied to.',
      });
    });
  });
});
