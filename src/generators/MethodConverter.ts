import { ApiMethodsFile } from '../interfaces/ApiMethodsFile';
import { ApiMethod } from '../interfaces/ApiMethod';
import { ApiParameter } from '../interfaces/ApiParameter';
import {
  OpenAPIOperation,
  OpenAPIPath,
  OpenAPIProperty,
  OpenAPISpec,
  OpenAPIHeader,
  OpenAPIExample,
} from '../interfaces/OpenAPISchema';
import { TypeParser } from './TypeParser';
import { UtilityHelpers } from './UtilityHelpers';
import { ResponseCodeParser } from '../parsers/ResponseCodeParser';
import {
  RateLimitHeaderParser,
  RateLimitHeader,
} from '../parsers/RateLimitHeaderParser';

/**
 * Converter for transforming API methods to OpenAPI paths and operations
 */
class MethodConverter {
  private typeParser: TypeParser;
  private utilityHelpers: UtilityHelpers;
  private responseCodes: Array<{ code: string; description: string }>;
  private rateLimitHeaders: RateLimitHeader[];

  constructor(typeParser: TypeParser, utilityHelpers: UtilityHelpers) {
    this.typeParser = typeParser;
    this.utilityHelpers = utilityHelpers;
    // Parse response codes once during initialization
    this.responseCodes = ResponseCodeParser.parseResponseCodes();
    // Parse rate limit headers once during initialization
    this.rateLimitHeaders = RateLimitHeaderParser.parseRateLimitHeaders();
  }

  /**
   * Convert methods to OpenAPI paths and add them to the spec
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

    // After all methods are converted, organize component examples
    this.organizeComponentExamples(spec);
  }

  /**
   * Convert a single API method to an OpenAPI operation
   */
  public convertMethod(
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
    const responseSchema = this.typeParser.parseResponseSchema(
      method.returns,
      spec,
      method.hashAttributes
    );

    // Build responses object with all available response codes
    const responses: Record<string, any> = {};
    const rateLimitHeaders = this.generateRateLimitHeaders();

    for (const responseCode of this.responseCodes) {
      const isSuccessResponse = responseCode.code.startsWith('2');
      const responseExample = method.responseExamples?.[responseCode.code];

      if (responseCode.code === '200') {
        // 200 response includes the schema from the returns field
        // For streaming endpoints, use text/event-stream content type
        const contentType = method.isStreaming
          ? 'text/event-stream'
          : 'application/json';

        if (method.isStreaming) {
          // Streaming endpoints always have content with text/event-stream
          // even if no specific schema is parsed from the returns field
          const content: any = responseSchema ? { schema: responseSchema } : {};
          if (responseExample) {
            content.example = responseExample;
          }
          responses[responseCode.code] = {
            description: method.returns || responseCode.description,
            headers: rateLimitHeaders,
            content: {
              [contentType]: content,
            },
          };
        } else {
          // Non-streaming endpoints use the existing logic
          if (responseSchema) {
            const content: any = { schema: responseSchema };
            if (responseExample) {
              content.example = responseExample;
            }
            responses[responseCode.code] = {
              description: method.returns || responseCode.description,
              headers: rateLimitHeaders,
              content: {
                [contentType]: content,
              },
            };
          } else {
            responses[responseCode.code] = {
              description: method.returns || responseCode.description,
              headers: rateLimitHeaders,
            };
          }
        }
      } else if (isSuccessResponse) {
        // Other 2xx responses also get rate limit headers
        const response: any = {
          description: responseCode.description,
          headers: rateLimitHeaders,
        };

        // Add example if available
        if (responseExample) {
          response.content = {
            'application/json': {
              example: responseExample,
            },
          };
        }

        responses[responseCode.code] = response;
      } else {
        // Other response codes are error responses with simple descriptions
        const response: any = {
          description: responseCode.description,
        };

        // Add example if available
        if (responseExample) {
          response.content = {
            'application/json': {
              example: responseExample,
            },
          };
        }

        responses[responseCode.code] = response;
      }
    }

    const operation: OpenAPIOperation = {
      operationId: this.generateOperationId(method.httpMethod, path),
      summary: method.name,
      description: method.description,
      tags: [category],
      responses,
    };

    // Add deprecated flag if method is deprecated
    if (method.deprecated) {
      operation.deprecated = true;
    }

    // Add security if OAuth is required
    if (method.oauth && method.oauth !== 'Public') {
      const scopes = this.extractOAuthScopes(method.oauth);
      operation.security = [{ OAuth2: scopes }];
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
            schema: this.typeParser.convertParameterToSchema(param),
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
              schema: this.typeParser.convertParameterToSchema(param),
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
          properties[param.name] =
            this.typeParser.convertParameterToSchema(param);
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
   * Generate rate limit headers for 2xx responses
   */
  private generateRateLimitHeaders(): Record<string, OpenAPIHeader> {
    const headers: Record<string, OpenAPIHeader> = {};

    for (const header of this.rateLimitHeaders) {
      let schema: { type: string; format?: string } = { type: 'string' };

      // Set appropriate schema types based on header name
      if (
        header.name === 'X-RateLimit-Limit' ||
        header.name === 'X-RateLimit-Remaining'
      ) {
        schema = { type: 'integer' };
      } else if (header.name === 'X-RateLimit-Reset') {
        schema = { type: 'string', format: 'date-time' };
      }

      headers[header.name] = {
        description: header.description,
        schema,
      };
    }

    return headers;
  }

  /**
   * Generate operation ID from HTTP method and endpoint
   */
  public generateOperationId(httpMethod: string, endpoint: string): string {
    // Strip query parameters before processing
    const pathWithoutQuery = endpoint.split('?')[0];

    // Convert HTTP method to lowercase
    const method = httpMethod.toLowerCase();

    // Extract API version and path
    const versionMatch = pathWithoutQuery.match(
      /^\/api\/(v\d+(?:\.\d+)?(?:_alpha)?)\/(.*)$/
    );
    if (!versionMatch) {
      // Fallback if no version found
      const path = pathWithoutQuery.replace(/^\/api\//, '');
      return method + this.utilityHelpers.toPascalCase(path);
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
   * Generate base operation ID from HTTP method and path segments
   */
  public generateBaseOperationId(method: string, segments: string[]): string {
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
        return (
          semanticMethod +
          this.utilityHelpers.toPascalCase(
            this.utilityHelpers.toSingular(resource)
          )
        );
      }
      // For other operations like GET, use plural form
      return semanticMethod + this.utilityHelpers.toPascalCase(resource);
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
        const singular = this.utilityHelpers.toSingular(resource);
        return semanticMethod + this.utilityHelpers.toPascalCase(singular);
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
          const resource1 = this.utilityHelpers.toSingular(segments[0]); // announcements -> announcement
          const resource2 = this.utilityHelpers.toSingular(segments[2]); // reactions -> reaction
          return (
            semanticMethod +
            this.utilityHelpers.toPascalCase(resource1) +
            this.utilityHelpers.toPascalCase(resource2)
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
          const mainResource = this.utilityHelpers.toSingular(segments[0]); // accounts -> account
          const subResource = segments[2]; // endorsements (keep as is, could be plural or singular)
          return (
            semanticMethod +
            this.utilityHelpers.toPascalCase(mainResource) +
            this.utilityHelpers.toPascalCase(subResource)
          );
        }

        // More complex path with parameters - fallback to original logic
        const pathParts: string[] = [];
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          if (segment.startsWith('{') && segment.endsWith('}')) {
            const paramName = segment.slice(1, -1);
            pathParts.push('By' + this.utilityHelpers.toPascalCase(paramName));
          } else {
            pathParts.push(this.utilityHelpers.toPascalCase(segment));
          }
        }
        return semanticMethod + pathParts.join('');
      }
    } else {
      // No path parameters
      const lastSegment = segments[segments.length - 1];

      // For specific actions like familiar_followers, check if we need context to avoid conflicts
      if (segments.length >= 2 && lastSegment.includes('_')) {
        const action = this.utilityHelpers.toPascalCase(lastSegment);

        // Special case for familiar_followers since it's unique and the issue specifically requested it
        if (lastSegment === 'familiar_followers') {
          return semanticMethod + action;
        }

        // Always include context for other actions to avoid conflicts
        const context = segments
          .slice(0, -1)
          .map((s) => this.utilityHelpers.toPascalCase(s))
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
          return semanticMethod + this.utilityHelpers.toPascalCase(lastSegment);
        }

        // By default, combine both segments for better context
        return (
          semanticMethod +
          this.utilityHelpers.toPascalCase(
            this.utilityHelpers.toSingular(firstSegment)
          ) +
          this.utilityHelpers.toPascalCase(lastSegment)
        );
      }

      // Default: combine all segments
      return (
        semanticMethod +
        segments.map((s) => this.utilityHelpers.toPascalCase(s)).join('')
      );
    }
  }

  /**
   * Normalize version string to PascalCase suffix
   */
  public normalizeVersion(version: string): string {
    // Convert version string to PascalCase suffix
    if (version === 'v1') return '';
    if (version === 'v2') return 'V2';
    if (version === 'v2_alpha') return 'V2Alpha';
    // Handle other versions generically
    return this.utilityHelpers.toPascalCase(version);
  }

  /**
   * Check if path has version conflicts
   */
  public hasVersionConflicts(pathAfterVersion: string): boolean {
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
   * Normalize endpoint path to OpenAPI format
   */
  public normalizePath(endpoint: string): string {
    // Convert :param to {param} format for OpenAPI
    return endpoint.replace(/:([^/]+)/g, '{$1}');
  }

  /**
   * Extract path parameters from OpenAPI path
   */
  public extractPathParameters(path: string): string[] {
    const matches = path.match(/\{([^}]+)\}/g);
    return matches ? matches.map((match) => match.slice(1, -1)) : [];
  }

  /**
   * Extract OAuth scopes from OAuth text
   * Parses strings like "User token + `write:blocks`" to extract ["write:blocks"]
   */
  private extractOAuthScopes(oauthText: string): string[] {
    const scopes: string[] = [];

    // Match scope patterns in backticks, e.g., `write:blocks`, `read:accounts`
    const scopeMatches = oauthText.match(/`([^`]+)`/g);

    if (scopeMatches) {
      for (const match of scopeMatches) {
        const scope = match.slice(1, -1); // Remove backticks
        if (scope && scope.includes(':')) {
          scopes.push(scope);
        }
      }
    }

    return scopes;
  }

  /**
   * Organize component examples by moving examples for component references
   * to the components/examples section and replacing inline examples with $refs
   */
  private organizeComponentExamples(spec: OpenAPISpec): void {
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
    return `${componentName}Example`;
  }
}

export { MethodConverter };
