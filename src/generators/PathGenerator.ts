import { ApiMethodsFile } from '../interfaces/ApiMethodsFile';
import { ApiMethod } from '../interfaces/ApiMethod';
import { ApiParameter } from '../interfaces/ApiParameter';
import {
  OpenAPISpec,
  OpenAPIProperty,
  OpenAPIOperation,
  OpenAPIPath,
} from '../interfaces/OpenAPISchema';
import { SchemaGenerator } from './SchemaGenerator';

/**
 * Handles conversion of API methods to OpenAPI paths and operations
 */
export class PathGenerator {
  private schemaGenerator: SchemaGenerator;

  constructor(schemaGenerator: SchemaGenerator) {
    this.schemaGenerator = schemaGenerator;
  }

  /**
   * Convert method files to OpenAPI paths and add them to spec
   */
  public convertMethods(
    methodFiles: ApiMethodsFile[],
    spec: OpenAPISpec
  ): void {
    for (const methodFile of methodFiles) {
      for (const method of methodFile.methods) {
        this.convertMethod(method, methodFile.name, spec);
      }
    }
  }

  /**
   * Convert a single API method to OpenAPI operation
   */
  private convertMethod(
    method: ApiMethod,
    category: string,
    spec: OpenAPISpec
  ): void {
    const path = this.normalizePath(method.endpoint);
    const httpMethod = method.httpMethod.toLowerCase() as keyof OpenAPIPath;

    if (!spec.paths[path]) {
      spec.paths[path] = {};
    }

    // Parse response schema from returns field
    const responseSchema = this.parseResponseSchemaWithSynthetics(
      method.returns,
      spec
    );
    const response200 = responseSchema
      ? {
          description: method.returns || 'Success',
          content: {
            'application/json': {
              schema: responseSchema,
            },
          },
        }
      : {
          description: method.returns || 'Success',
        };

    const operation: OpenAPIOperation = {
      operationId: this.generateOperationId(method.httpMethod, path),
      summary: method.name,
      description: method.description,
      tags: [category],
      responses: {
        '200': response200,
      },
    };

    // Add deprecated flag if method is deprecated
    if (method.deprecated) {
      operation.deprecated = true;
    }

    // Add security if OAuth is required
    if (method.oauth && method.oauth !== 'Public') {
      operation.security = [{ OAuth2: [] }];
    }

    // Add parameters
    if (method.parameters && method.parameters.length > 0) {
      operation.parameters = [];
      const bodyParams: ApiParameter[] = [];

      for (const param of method.parameters) {
        // Use the 'in' property to determine parameter location
        if (
          param.in === 'query' ||
          param.in === 'path' ||
          param.in === 'header'
        ) {
          operation.parameters.push({
            name: param.name,
            in: param.in,
            required: param.required,
            description: param.description,
            schema: this.convertParameterToSchema(param),
          });
        } else if (param.in === 'formData') {
          // Form data parameters go in request body
          bodyParams.push(param);
        } else {
          // Fallback to old behavior for backwards compatibility
          if (httpMethod === 'get') {
            operation.parameters.push({
              name: param.name,
              in: 'query',
              required: param.required,
              description: param.description,
              schema: this.convertParameterToSchema(param),
            });
          } else {
            bodyParams.push(param);
          }
        }
      }

      // Add request body for form data parameters
      if (bodyParams.length > 0) {
        const properties: Record<string, OpenAPIProperty> = {};
        const required: string[] = [];

        for (const param of bodyParams) {
          properties[param.name] = this.convertParameterToSchema(param);
          if (param.required) {
            required.push(param.name);
          }
        }

        operation.requestBody = {
          description: 'JSON request body parameters',
          required: required.length > 0,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties,
                required: required.length > 0 ? required : undefined,
              } as OpenAPIProperty,
            },
          },
        };
      }
    }

    // Extract path parameters
    const pathParams = this.extractPathParameters(path);
    if (pathParams.length > 0) {
      if (!operation.parameters) {
        operation.parameters = [];
      }
      for (const pathParam of pathParams) {
        operation.parameters.push({
          name: pathParam,
          in: 'path',
          required: true,
          description: `${pathParam} parameter`,
          schema: { type: 'string' },
        });
      }
    }

    spec.paths[path][httpMethod] = operation;
  }

  /**
   * Parse response schema
   */
  private parseResponseSchemaWithSynthetics(
    returns?: string,
    spec?: OpenAPISpec
  ): OpenAPIProperty | null {
    return this.schemaGenerator.parseResponseSchema(returns, spec);
  }

  /**
   * Generate operation ID for the method
   */
  private generateOperationId(httpMethod: string, endpoint: string): string {
    // Convert HTTP method to lowercase
    const method = httpMethod.toLowerCase();

    // Extract API version and path
    const versionMatch = endpoint.match(
      /^\/api\/(v\d+(?:\.\d+)?(?:_alpha)?)\/(.*)$/
    );
    if (!versionMatch) {
      // Fallback if no version found
      const path = endpoint.replace(/^\/api\//, '');
      return method + this.toPascalCase(path);
    }

    const [, version, pathAfterVersion] = versionMatch;
    const segments = pathAfterVersion
      .split('/')
      .filter((segment) => segment.length > 0);

    if (segments.length === 0) {
      return method;
    }

    // Generate base operation name
    let baseOperationId = this.generateBaseOperationId(method, segments);

    // Add version suffix if it's not v1 or if there might be conflicts
    if (version !== 'v1' || this.hasVersionConflicts(pathAfterVersion)) {
      const versionSuffix = this.normalizeVersion(version);
      baseOperationId += versionSuffix;
    }

    return baseOperationId;
  }

  /**
   * Generate base operation ID from method and path segments
   */
  private generateBaseOperationId(method: string, segments: string[]): string {
    // Map HTTP methods to more semantic operation names
    const getSemanticMethod = (
      httpMethod: string,
      segments: string[]
    ): string => {
      const hasPathParams = segments.some(
        (segment) => segment.startsWith('{') && segment.endsWith('}')
      );

      switch (httpMethod.toLowerCase()) {
        case 'post':
          // POST to collection endpoints -> create
          if (!hasPathParams) {
            return 'create';
          }
          // POST to item endpoints -> keep 'post' for actions like follow, etc.
          return 'post';
        case 'put':
        case 'patch':
          // PUT/PATCH to item endpoints -> update
          if (hasPathParams) {
            return 'update';
          }
          // PUT/PATCH to collection endpoints -> keep original method
          return httpMethod.toLowerCase();
        default:
          return httpMethod.toLowerCase();
      }
    };

    const semanticMethod = getSemanticMethod(method, segments);

    // Handle different patterns
    if (segments.length === 1) {
      // Simple resource: /accounts -> getAccounts, /statuses + POST -> createStatus
      const resource = segments[0];
      if (semanticMethod === 'create') {
        // For create operations, use singular form
        return semanticMethod + this.toPascalCase(this.toSingular(resource));
      }
      // For other operations like GET, use plural form
      return semanticMethod + this.toPascalCase(resource);
    }

    // Check for path parameters
    const hasPathParams = segments.some(
      (segment) => segment.startsWith('{') && segment.endsWith('}')
    );

    if (hasPathParams) {
      // Handle path parameters
      if (segments.length === 2 && segments[1] === '{id}') {
        // Pattern like /accounts/{id} -> getAccount, updateList, etc.
        const resource = segments[0];
        const singular = this.toSingular(resource);
        return semanticMethod + this.toPascalCase(singular);
      } else {
        // Check for common nested resource pattern: /resource1/{id}/resource2/{param}
        if (
          segments.length === 4 &&
          segments[1].startsWith('{') &&
          segments[1].endsWith('}') &&
          segments[3].startsWith('{') &&
          segments[3].endsWith('}')
        ) {
          // Pattern like /announcements/{id}/reactions/{name}
          // Generate: updateAnnouncementReaction (not updateAnnouncementsByIdReactionsByName)
          const resource1 = this.toSingular(segments[0]); // announcements -> announcement
          const resource2 = this.toSingular(segments[2]); // reactions -> reaction
          return (
            semanticMethod +
            this.toPascalCase(resource1) +
            this.toPascalCase(resource2)
          );
        }

        // Check for 3-segment pattern: /resource/{id}/sub-resource
        if (
          segments.length === 3 &&
          segments[1].startsWith('{') &&
          segments[1].endsWith('}')
        ) {
          // Pattern like /accounts/{id}/endorsements
          // Generate: getAccountEndorsements (not getAccountsByIdEndorsements)
          const mainResource = this.toSingular(segments[0]); // accounts -> account
          const subResource = segments[2]; // endorsements (keep as is, could be plural or singular)
          return (
            semanticMethod +
            this.toPascalCase(mainResource) +
            this.toPascalCase(subResource)
          );
        }

        // More complex path with parameters - fallback to original logic
        const pathParts: string[] = [];
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          if (segment.startsWith('{') && segment.endsWith('}')) {
            const paramName = segment.slice(1, -1);
            pathParts.push('By' + this.toPascalCase(paramName));
          } else {
            pathParts.push(this.toPascalCase(segment));
          }
        }
        return semanticMethod + pathParts.join('');
      }
    } else {
      // No path parameters
      const lastSegment = segments[segments.length - 1];

      // For specific actions like familiar_followers, check if we need context to avoid conflicts
      if (segments.length >= 2 && lastSegment.includes('_')) {
        const action = this.toPascalCase(lastSegment);

        // Special case for familiar_followers since it's unique and the issue specifically requested it
        if (lastSegment === 'familiar_followers') {
          return semanticMethod + action;
        }

        // Always include context for other actions to avoid conflicts
        const context = segments
          .slice(0, -1)
          .map((s) => this.toPascalCase(s))
          .join('');
        return semanticMethod + context + action;
      }

      // For multi-segment paths, prefer the last segment if it makes sense
      if (segments.length === 2) {
        const [firstSegment, lastSegment] = segments;

        // List of specific terms that don't need context
        const specificTerms = ['avatar'];

        // If the last segment is specific, use just the last segment
        if (specificTerms.includes(lastSegment)) {
          return semanticMethod + this.toPascalCase(lastSegment);
        }

        // By default, combine both segments for better context
        return (
          semanticMethod +
          this.toPascalCase(this.toSingular(firstSegment)) +
          this.toPascalCase(lastSegment)
        );
      }

      // Default: combine all segments
      return (
        semanticMethod + segments.map((s) => this.toPascalCase(s)).join('')
      );
    }
  }

  /**
   * Normalize version string for operation ID
   */
  private normalizeVersion(version: string): string {
    // Convert version string to PascalCase suffix
    if (version === 'v1') return '';
    if (version === 'v2') return 'V2';
    if (version === 'v2_alpha') return 'V2Alpha';
    // Handle other versions generically
    return this.toPascalCase(version);
  }

  /**
   * Check if path has version conflicts
   */
  private hasVersionConflicts(pathAfterVersion: string): boolean {
    // Common paths that appear in multiple API versions
    const conflictingPaths = [
      'notifications',
      'filters',
      'accounts',
      'statuses',
    ];

    const firstSegment = pathAfterVersion.split('/')[0];
    return conflictingPaths.includes(firstSegment);
  }

  /**
   * Convert string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split(/[_-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Convert plural to singular
   */
  private toSingular(word: string): string {
    // Handle common plural forms
    if (word.endsWith('ies')) {
      return word.slice(0, -3) + 'y'; // stories -> story
    } else if (word.endsWith('es')) {
      return word.slice(0, -2); // statuses -> status
    } else if (word.endsWith('s')) {
      return word.slice(0, -1); // accounts -> account
    }
    return word;
  }

  /**
   * Convert parameter to OpenAPI schema
   */
  public convertParameterToSchema(param: ApiParameter): OpenAPIProperty {
    // If parameter has a complex schema, use it
    if (param.schema) {
      const schema: OpenAPIProperty = {
        type: param.schema.type,
        description: param.description,
      };

      if (param.schema.type === 'array' && param.schema.items) {
        schema.items = {
          type: param.schema.items.type,
        };
      } else if (param.schema.type === 'object' && param.schema.properties) {
        const properties: Record<string, OpenAPIProperty> = {};
        for (const [propName, propSchema] of Object.entries(
          param.schema.properties
        )) {
          const property: OpenAPIProperty = {
            type: propSchema.type,
          };

          if (propSchema.description) {
            property.description = propSchema.description;
          }

          if (propSchema.items) {
            property.items = {
              type: propSchema.items.type,
            };
          }

          properties[propName] = property;
        }
        schema.properties = properties;
      }

      return schema;
    }

    // Fallback to simple string schema
    const schema: OpenAPIProperty = {
      type: 'string',
      description: param.description,
    };

    // Add enum values if available
    if (param.enumValues && param.enumValues.length > 0) {
      schema.enum = param.enumValues;
    }

    return schema;
  }

  /**
   * Normalize path by converting :param to {param} format
   */
  private normalizePath(endpoint: string): string {
    // Convert :param to {param} format for OpenAPI
    return endpoint.replace(/:([^/]+)/g, '{$1}');
  }

  /**
   * Extract path parameters from path
   */
  private extractPathParameters(path: string): string[] {
    const matches = path.match(/\{([^}]+)\}/g);
    return matches ? matches.map((match) => match.slice(1, -1)) : [];
  }
}
