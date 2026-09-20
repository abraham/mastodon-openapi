import {
  OpenAPIOperation,
  OpenAPIProperty,
  OpenAPISpec,
} from '../interfaces/OpenAPISchema';
import { SchemaSorting } from './SchemaSorting';

/**
 * Builds the component schemas and examples that operations reference:
 * hoisted response examples, error schemas, and the status request variants.
 */
export class ComponentEmitter {
  constructor(private readonly sorting: SchemaSorting = new SchemaSorting()) {}

  /**
   * Organize component examples by moving examples for component references
   * to the components/examples section and replacing inline examples with $refs
   */
  public organizeComponentExamples(spec: OpenAPISpec): void {
    if (!spec.components) {
      spec.components = {};
    }
    if (!spec.components.examples) {
      spec.components.examples = {};
    }

    // Track component examples to avoid duplicates
    const componentExamples = new Map<string, any>();

    // Process all paths and operations
    for (const [pathKey, pathItem] of Object.entries(spec.paths)) {
      for (const [methodKey, operation] of Object.entries(pathItem)) {
        if (
          typeof operation === 'object' &&
          operation !== null &&
          'responses' in operation
        ) {
          const typedOperation = operation as OpenAPIOperation;
          if (typedOperation.responses) {
            for (const [statusCode, response] of Object.entries(
              typedOperation.responses
            )) {
              if (
                response &&
                typeof response === 'object' &&
                'content' in response &&
                response.content
              ) {
                for (const [contentType, mediaType] of Object.entries(
                  response.content
                )) {
                  if (
                    mediaType &&
                    typeof mediaType === 'object' &&
                    'example' in mediaType &&
                    'schema' in mediaType
                  ) {
                    if (mediaType.example && mediaType.schema) {
                      const componentName = this.extractComponentName(
                        mediaType.schema
                      );
                      if (componentName) {
                        // This schema references a component, move example to components section
                        const exampleName = this.generateExampleComponentName(
                          componentName,
                          statusCode
                        );

                        // Store the example in components if not already present
                        if (!componentExamples.has(exampleName)) {
                          componentExamples.set(exampleName, mediaType.example);
                          spec.components!.examples![exampleName] = {
                            summary: `Example for ${componentName}`,
                            value: mediaType.example,
                          };
                        }

                        // Replace inline example with reference
                        delete mediaType.example;
                        if (!mediaType.examples) {
                          mediaType.examples = {};
                        }
                        mediaType.examples[exampleName] = {
                          $ref: `#/components/examples/${exampleName}`,
                        };
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Extract component name from a schema that might reference a component
   */
  private extractComponentName(schema: any): string | null {
    // Handle direct component reference
    if (schema.$ref && typeof schema.$ref === 'string') {
      const match = schema.$ref.match(/^#\/components\/schemas\/(.+)$/);
      return match ? match[1] : null;
    }

    // Handle array of components
    if (schema.type === 'array' && schema.items && schema.items.$ref) {
      const match = schema.items.$ref.match(/^#\/components\/schemas\/(.+)$/);
      return match ? match[1] : null;
    }

    return null;
  }

  /**
   * Generate a name for a component example
   */
  private generateExampleComponentName(
    componentName: string,
    statusCode: string
  ): string {
    return `${componentName}${statusCode}Example`;
  }

  /**
   * Generate an error schema for custom error response formats
   * Returns a schema reference if a custom schema is created, or null for simple errors
   */
  public generateErrorSchema(
    errorExample: any,
    statusCode: string,
    spec: OpenAPISpec
  ): any | null {
    // Ensure components section exists
    if (!spec.components) {
      spec.components = {};
    }
    if (!spec.components.schemas) {
      spec.components.schemas = {};
    }

    // Check if this is a simple error (basic Error schema pattern)
    const isBasicError =
      typeof errorExample === 'object' &&
      errorExample !== null &&
      typeof errorExample.error === 'string' &&
      (Object.keys(errorExample).length === 1 ||
        (Object.keys(errorExample).length === 2 &&
          typeof errorExample.error_description === 'string'));

    if (isBasicError) {
      // Use the existing Error schema for simple errors (with or without error_description)
      return { $ref: '#/components/schemas/Error' };
    }

    // Check if this is a validation error with details
    const isValidationError =
      typeof errorExample === 'object' &&
      errorExample !== null &&
      typeof errorExample.error === 'string' &&
      errorExample.details &&
      typeof errorExample.details === 'object';

    if (isValidationError) {
      // Create or reference a ValidationError schema
      const schemaName = 'ValidationError';

      if (!spec.components.schemas[schemaName]) {
        spec.components.schemas[schemaName] = {
          type: 'object',
          description:
            'Represents a validation error with field-specific details.',
          properties: {
            error: {
              type: 'string',
              description: 'The overall validation error message.',
            },
            details: {
              type: 'object',
              description: 'Detailed validation errors for each field.',
              additionalProperties: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'string',
                      description:
                        'The error code (e.g., ERR_BLANK, ERR_INVALID).',
                    },
                    description: {
                      type: 'string',
                      description: 'Human-readable description of the error.',
                    },
                  },
                  required: ['error', 'description'],
                },
              },
            },
          },
          required: ['error', 'details'],
        };
      }

      return { $ref: `#/components/schemas/${schemaName}` };
    }

    // For other complex error formats, create a generic custom error schema
    if (typeof errorExample === 'object' && errorExample !== null) {
      const schemaName = `CustomError${statusCode}`;

      if (!spec.components.schemas[schemaName]) {
        spec.components.schemas[schemaName] =
          this.generateSchemaFromExample(errorExample);
      }

      return { $ref: `#/components/schemas/${schemaName}` };
    }

    return null;
  }

  /**
   * Generate a schema definition from an example object
   */
  private generateSchemaFromExample(example: any): any {
    if (typeof example !== 'object' || example === null) {
      return { type: typeof example };
    }

    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(example)) {
      if (value !== null && value !== undefined) {
        required.push(key);
      }

      if (typeof value === 'string') {
        properties[key] = { type: 'string' };
      } else if (typeof value === 'number') {
        properties[key] = { type: 'number' };
      } else if (typeof value === 'boolean') {
        properties[key] = { type: 'boolean' };
      } else if (Array.isArray(value)) {
        properties[key] = {
          type: 'array',
          items:
            value.length > 0 ? this.generateSchemaFromExample(value[0]) : {},
        };
      } else if (typeof value === 'object') {
        properties[key] = this.generateSchemaFromExample(value);
      }
    }

    // Sort properties by required first, then alphabetically
    const { sortedProperties, sortedRequired } =
      this.sorting.sortPropertiesAndRequired(properties, required);

    return {
      type: 'object',
      properties: sortedProperties,
      required: sortedRequired.length > 0 ? sortedRequired : undefined,
    };
  }

  /**
   * Create status components for the POST /api/v1/statuses endpoint
   * Creates BaseStatus, TextStatus, MediaStatus, and PollStatus components
   */
  public createStatusComponents(
    properties: Record<string, OpenAPIProperty>,
    required: string[],
    spec: OpenAPISpec
  ): void {
    // Ensure components section exists
    if (!spec.components) {
      spec.components = {};
    }
    if (!spec.components.schemas) {
      spec.components.schemas = {};
    }

    // Extract common properties (exclude the conditional ones)
    const commonProperties = { ...properties };
    delete commonProperties.status;
    delete commonProperties.media_ids;
    delete commonProperties.poll;

    // Extract non-conditional required fields
    const conditionallyRequiredParams = ['status', 'media_ids', 'poll'];
    const commonRequired = required.filter(
      (param) => !conditionallyRequiredParams.includes(param)
    );

    // Create BaseStatus component with common fields
    spec.components.schemas['BaseStatus'] = {
      type: 'object',
      description: 'Common fields for all status creation requests',
      properties: commonProperties,
      required: commonRequired.length > 0 ? commonRequired : undefined,
    };

    // Create TextStatus component using allOf
    spec.components.schemas['TextStatus'] = {
      description: 'Create a text-only status',
      allOf: [
        { $ref: '#/components/schemas/BaseStatus' },
        {
          type: 'object',
          required: ['status'],
          properties: {
            status: properties.status,
          },
        },
      ],
    };

    // Create MediaStatus component using allOf
    spec.components.schemas['MediaStatus'] = {
      description:
        'Create a status with media attachments. Status text is optional.',
      allOf: [
        { $ref: '#/components/schemas/BaseStatus' },
        {
          type: 'object',
          required: ['media_ids'],
          properties: {
            media_ids: properties.media_ids,
            status: properties.status, // Optional for media posts
          },
        },
      ],
    };

    // Create PollStatus component using allOf
    spec.components.schemas['PollStatus'] = {
      description:
        'Create a status with a poll. Cannot be combined with media.',
      allOf: [
        { $ref: '#/components/schemas/BaseStatus' },
        {
          type: 'object',
          required: ['poll'],
          properties: {
            poll: properties.poll,
            status: properties.status, // Optional for poll posts
          },
        },
      ],
    };
  }
}
