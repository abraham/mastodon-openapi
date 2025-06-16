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
import { ErrorExampleRegistry } from './ErrorExampleRegistry';
import { ResponseCodeParser } from '../parsers/ResponseCodeParser';
import {
  RateLimitHeaderParser,
  RateLimitHeader,
} from '../parsers/RateLimitHeaderParser';

/**
 * Interface for OAuth security configuration
 */
interface OAuthSecurityConfig {
  authType: 'public' | 'user' | 'app' | 'mixed' | 'unknown';
  scopes: string[];
  isOptional: boolean;
  supportsPublicAccess: boolean;
}

/**
 * Converter for transforming API methods to OpenAPI paths and operations
 */
class MethodConverter {
  private typeParser: TypeParser;
  private utilityHelpers: UtilityHelpers;
  private errorExampleRegistry: ErrorExampleRegistry;
  private responseCodes: Array<{ code: string; description: string }>;
  private rateLimitHeaders: RateLimitHeader[];

  constructor(
    typeParser: TypeParser,
    utilityHelpers: UtilityHelpers,
    errorExampleRegistry: ErrorExampleRegistry
  ) {
    this.typeParser = typeParser;
    this.utilityHelpers = utilityHelpers;
    this.errorExampleRegistry = errorExampleRegistry;
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
    const responseHeaders = this.generateResponseHeaders(method);

    for (const responseCode of this.responseCodes) {
      const isSuccessResponse = responseCode.code.startsWith('2');
      // First try to get method-specific example, then fall back to common error example
      let responseExample = method.responseExamples?.[responseCode.code];
      if (!responseExample && !isSuccessResponse) {
        responseExample = this.errorExampleRegistry.getErrorExample(
          responseCode.code
        );
      }

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
            headers: responseHeaders,
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
              headers: responseHeaders,
              content: {
                [contentType]: content,
              },
            };
          } else {
            responses[responseCode.code] = {
              description: method.returns || responseCode.description,
              headers: responseHeaders,
            };
          }
        }
      } else if (isSuccessResponse) {
        // Other 2xx responses also get rate limit headers
        const response: any = {
          description: responseCode.description,
          headers: responseHeaders,
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

        // Add example and potentially schema if available
        if (responseExample) {
          const errorSchema = this.generateErrorSchema(
            responseExample,
            responseCode.code,
            spec
          );
          const content: any = {
            example: responseExample,
          };

          if (errorSchema) {
            content.schema = errorSchema;
          }

          response.content = {
            'application/json': content,
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

    // Add security configuration based on OAuth requirements
    if (method.oauth) {
      const oauthConfig = this.parseOAuthConfig(method.oauth);
      operation.security = this.generateSecurityRequirement(oauthConfig);
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

        // Special handling for POST /api/v1/statuses endpoint
        // Split into different status types using oneOf with component references
        if (
          method.httpMethod === 'POST' &&
          path === '/api/v1/statuses' &&
          required.includes('status') &&
          required.includes('media_ids') &&
          required.includes('poll')
        ) {
          // Create status components for reusability
          this.createStatusComponents(properties, required, spec);

          operation.requestBody = {
            description:
              'JSON request body parameters for creating a status. Different types of statuses have different requirements.',
            required: true,
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { $ref: '#/components/schemas/TextStatus' },
                    { $ref: '#/components/schemas/MediaStatus' },
                    { $ref: '#/components/schemas/PollStatus' },
                  ],
                } as OpenAPIProperty,
              },
            },
          };
        } else if (
          method.httpMethod === 'POST' &&
          path === '/api/v1/apps' &&
          properties.redirect_uris
        ) {
          // Special handling for POST /api/v1/apps endpoint
          // Override redirect_uris to always be array of URIs instead of oneOf
          properties.redirect_uris = {
            type: 'array',
            items: {
              type: 'string',
              format: 'uri',
            },
            description: properties.redirect_uris.description,
          };

          // Override scopes to use format scopes without enum values
          if (properties.scopes) {
            properties.scopes = {
              type: 'string',
              format: 'scopes',
              description: properties.scopes.description,
              default: 'read',
            };
          }

          // Default behavior for createApp endpoint
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
        } else {
          // Default behavior for all other endpoints
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
   * Check if a method has pagination parameters (max_id, since_id, min_id)
   */
  private hasPaginationParameters(method: ApiMethod): boolean {
    if (!method.parameters) {
      return false;
    }

    const paginationParams = ['max_id', 'since_id', 'min_id'];
    return method.parameters.some((param) =>
      paginationParams.includes(param.name)
    );
  }

  /**
   * Generate Link header for pagination
   */
  private generateLinkHeader(): OpenAPIHeader {
    return {
      description:
        'Pagination links for browsing older or newer results. Format: <https://mastodon.example/api/v1/endpoint?max_id=123456>; rel="next", <https://mastodon.example/api/v1/endpoint?min_id=789012>; rel="prev"',
      schema: {
        type: 'string',
      },
    };
  }

  /**
   * Generate combined headers for 2xx responses (rate limit + Link if applicable)
   */
  private generateResponseHeaders(
    method: ApiMethod
  ): Record<string, OpenAPIHeader> {
    const headers: Record<string, OpenAPIHeader> = {
      ...this.generateRateLimitHeaders(),
    };

    // Add Link header for methods with pagination parameters
    if (this.hasPaginationParameters(method)) {
      headers['Link'] = this.generateLinkHeader();
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
   * Parse OAuth configuration from OAuth text
   * Handles various patterns like:
   * - "Public"
   * - "Public (for public statuses only), or user token + `read:statuses`"
   * - "User token + `write:blocks`"
   * - "App token + `write:accounts`"
   * - "User token + `read` or App token + `read`"
   */
  private parseOAuthConfig(oauthText: string): OAuthSecurityConfig {
    if (!oauthText || oauthText.trim() === '') {
      return {
        authType: 'unknown',
        scopes: [],
        isOptional: false,
        supportsPublicAccess: false,
      };
    }

    const text = oauthText.toLowerCase().trim();

    // Check for public access patterns
    const isPublicOnly = text === 'public';
    const hasPublicAccess = text.includes('public');
    const hasUserToken = text.includes('user token');
    const hasAppToken = text.includes('app token');

    // Extract scopes from backticks
    const scopes = this.extractOAuthScopes(oauthText);

    // Determine auth type and configuration
    if (isPublicOnly) {
      return {
        authType: 'public',
        scopes: [],
        isOptional: true,
        supportsPublicAccess: true,
      };
    }

    if (hasPublicAccess && hasUserToken) {
      // Pattern like "Public (for public statuses only), or user token + `read:statuses`"
      return {
        authType: 'user',
        scopes,
        isOptional: true,
        supportsPublicAccess: true,
      };
    }

    if (hasUserToken && hasAppToken) {
      // Pattern like "User token + `read` or App token + `read`"
      return {
        authType: 'mixed',
        scopes,
        isOptional: false,
        supportsPublicAccess: false,
      };
    }

    if (hasUserToken) {
      // Pattern like "User token + `write:blocks`"
      return {
        authType: 'user',
        scopes,
        isOptional: false,
        supportsPublicAccess: false,
      };
    }

    if (hasAppToken) {
      // Pattern like "App token + `write:accounts`"
      return {
        authType: 'app',
        scopes,
        isOptional: false,
        supportsPublicAccess: false,
      };
    }

    // Fallback for unrecognized patterns
    return {
      authType: 'unknown',
      scopes,
      isOptional: false,
      supportsPublicAccess: false,
    };
  }

  /**
   * Generate security requirements based on OAuth configuration
   */
  private generateSecurityRequirement(
    config: OAuthSecurityConfig
  ): Array<Record<string, string[]>> | undefined {
    const securityRequirements: Array<Record<string, string[]>> = [];

    switch (config.authType) {
      case 'public':
        // Public endpoints with no authentication required
        return undefined;

      case 'user':
        if (config.supportsPublicAccess) {
          // Optional authentication: public access + optional user token
          securityRequirements.push({}); // No authentication
          securityRequirements.push({ OAuth2: config.scopes }); // Optional user token
        } else {
          // Required user token
          securityRequirements.push({ OAuth2: config.scopes });
        }
        break;

      case 'app':
        // Required app token (client credentials flow)
        securityRequirements.push({ OAuth2ClientCredentials: config.scopes });
        break;

      case 'mixed':
        // Supports both user and app tokens
        securityRequirements.push({ OAuth2: config.scopes }); // User token
        securityRequirements.push({ OAuth2ClientCredentials: config.scopes }); // App token
        break;

      case 'unknown':
      default:
        // Fallback to basic OAuth with extracted scopes
        if (config.scopes.length > 0 || !config.supportsPublicAccess) {
          securityRequirements.push({ OAuth2: config.scopes });
        }
        break;
    }

    return securityRequirements.length > 0 ? securityRequirements : undefined;
  }

  /**
   * Extract OAuth scopes from OAuth text
   * Parses strings like "User token + `write:blocks`" to extract ["write:blocks"]
   */
  private extractOAuthScopes(oauthText: string): string[] {
    const scopeSet = new Set<string>();

    // Match scope patterns in backticks, e.g., `write:blocks`, `read:accounts`, `read`
    const scopeMatches = oauthText.match(/`([^`]+)`/g);

    if (scopeMatches) {
      for (const match of scopeMatches) {
        const scope = match.slice(1, -1); // Remove backticks
        if (scope) {
          scopeSet.add(scope);
        }
      }
    }

    return Array.from(scopeSet);
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
    return `${componentName}${statusCode}Example`;
  }

  /**
   * Generate an error schema for custom error response formats
   * Returns a schema reference if a custom schema is created, or null for simple errors
   */
  private generateErrorSchema(
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

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  /**
   * Create status components for the POST /api/v1/statuses endpoint
   * Creates BaseStatus, TextStatus, MediaStatus, and PollStatus components
   */
  private createStatusComponents(
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

export { MethodConverter };
