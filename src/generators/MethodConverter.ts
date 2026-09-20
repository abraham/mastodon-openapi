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
import { HeaderParser, HttpHeader } from '../parsers/HeaderParser';
import { VersionParser } from '../parsers/VersionParser';
import {
  PipelineContext,
  createPipelineContext,
} from '../pipeline/PipelineContext';
import {
  extraResponseHeadersFor,
  requestBodyOverrideFor,
} from '../overrides/overrides';
import { OperationIdBuilder } from '../naming/OperationId';
import { OAuthSecurityConfig, SecurityEmitter } from './SecurityEmitter';
import { SchemaSorting } from './SchemaSorting';
import { ComponentEmitter } from './ComponentEmitter';

/**
 * Converter for transforming API methods to OpenAPI paths and operations
 */
class MethodConverter {
  private typeParser: TypeParser;
  private utilityHelpers: UtilityHelpers;
  private errorExampleRegistry: ErrorExampleRegistry;
  private responseCodes: Array<{ code: string; description: string }>;
  private rateLimitHeaders: HttpHeader[];
  private operationIds: OperationIdBuilder;
  private security: SecurityEmitter;
  private sorting: SchemaSorting;
  private components: ComponentEmitter;

  constructor(
    typeParser: TypeParser,
    utilityHelpers: UtilityHelpers,
    errorExampleRegistry: ErrorExampleRegistry,
    context: PipelineContext = createPipelineContext()
  ) {
    this.typeParser = typeParser;
    this.utilityHelpers = utilityHelpers;
    this.errorExampleRegistry = errorExampleRegistry;
    this.operationIds = new OperationIdBuilder(utilityHelpers);
    this.security = new SecurityEmitter();
    this.sorting = new SchemaSorting();
    this.components = new ComponentEmitter(this.sorting);
    // Parse response codes once during initialization
    this.responseCodes = ResponseCodeParser.parseResponseCodes(context.source);
    // Parse rate limit headers once during initialization
    this.rateLimitHeaders = HeaderParser.parseRateLimitHeaders(context.source);
  }

  /**
   * Check if a parameter is a file parameter based on its description
   */
  private isFileParameter(param: ApiParameter): boolean {
    return !!(
      param.description &&
      param.description.toLowerCase().includes('multipart form data')
    );
  }

  /**
   * Check if an endpoint is a media upload endpoint that should use multipart/form-data
   */
  private isMediaUploadEndpoint(method: ApiMethod, path: string): boolean {
    // Media upload endpoints
    return (
      (method.httpMethod === 'POST' &&
        (path === '/api/v1/media' || path === '/api/v2/media')) ||
      (method.httpMethod === 'PUT' && path === '/api/v1/media/{id}')
    );
  }

  /**
   * Check if method has any file parameters
   */
  private hasFileParameters(method: ApiMethod): boolean {
    return (
      method.parameters?.some((param) => this.isFileParameter(param)) || false
    );
  }

  /**
   * Build operation description with version history appended
   */
  private buildDescriptionWithVersionHistory(method: ApiMethod): string {
    let description = method.description || '';

    // Add version history if it exists
    if (method.version && method.version.trim()) {
      // Convert escaped newlines to actual newlines and clean up
      const versionHistory = method.version.replace(/\\n/g, '\n').trim();

      if (versionHistory) {
        if (description) {
          description += '\n\n';
        }
        description += `Version history:\n\n${versionHistory}`;
      }
    }

    return description;
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

    // Sort paths by their tags alphabetically
    this.sorting.sortPathsByTags(spec);

    // After all methods are converted, organize component examples
    this.components.organizeComponentExamples(spec);
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
      method.hashAttributes,
      method.name
    );

    // Build responses object with all available response codes
    const responses: Record<string, any> = {};
    const responseHeaders = this.generateResponseHeaders(method);

    // Merge method-specific response codes with global codes
    // Method-specific codes take precedence if there's a conflict
    const responseCodesToUse = this.mergeResponseCodes(
      this.responseCodes,
      method.responseCodes
    );

    for (const responseCode of responseCodesToUse) {
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

        // Parse schema from returnType if specified
        let schema = null;
        if (responseCode.returnType) {
          // Wrap in brackets to match the format expected by parseResponseSchema
          schema = this.typeParser.parseResponseSchema(
            `[${responseCode.returnType}]`,
            spec,
            undefined,
            method.name
          );
        }

        // Add content with schema and/or example if available
        if (schema || responseExample) {
          const content: any = {};
          if (schema) {
            content.schema = schema;
          }
          if (responseExample) {
            content.example = responseExample;
          }
          response.content = {
            'application/json': content,
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
          const errorSchema = this.components.generateErrorSchema(
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
      description: this.buildDescriptionWithVersionHistory(method),
      tags: [this.extractTagFromEndpoint(method.endpoint)],
      responses,
      externalDocs: this.generateMethodExternalDocs(method, category),
    };

    // Add deprecated flag if method is deprecated
    if (method.deprecated) {
      operation.deprecated = true;
    }

    // Add unreleased badge if method was added in a version newer than supported
    if (method.version && VersionParser.isOperationUnreleased(method.version)) {
      (operation as any)['x-badges'] = [{ name: 'Unreleased' }];
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

      // Sort parameters by required first, then alphabetically
      if (operation.parameters.length > 0) {
        operation.parameters = this.sorting.sortParameters(
          operation.parameters
        );
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

        // Sort properties by required first, then alphabetically
        const { sortedProperties, sortedRequired } =
          this.sorting.sortPropertiesAndRequired(properties, required);

        // Special handling for POST /api/v1/statuses endpoint
        // Split into different status types using oneOf with component references
        if (
          requestBodyOverrideFor(method.httpMethod, path) ===
            'status-variants' &&
          sortedRequired.includes('status') &&
          sortedRequired.includes('media_ids') &&
          sortedRequired.includes('poll')
        ) {
          // Create status components for reusability
          this.components.createStatusComponents(
            sortedProperties,
            sortedRequired,
            spec
          );

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
          requestBodyOverrideFor(method.httpMethod, path) === 'create-app' &&
          sortedProperties.redirect_uris
        ) {
          // redirect_uris is documented as "string or array"; always emit the array form
          sortedProperties.redirect_uris = {
            type: 'array',
            items: {
              type: 'string',
              format: 'uri',
            },
            description: sortedProperties.redirect_uris.description,
          };

          // Override scopes to use format scopes without enum values
          if (sortedProperties.scopes) {
            sortedProperties.scopes = {
              type: 'string',
              format: 'scopes',
              description: sortedProperties.scopes.description,
              default: 'read',
            };
          }

          // Default behavior for createApp endpoint
          operation.requestBody = {
            description: 'JSON request body parameters',
            required: sortedRequired.length > 0,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: sortedProperties,
                  required:
                    sortedRequired.length > 0 ? sortedRequired : undefined,
                } as OpenAPIProperty,
              },
            },
          };
        } else if (
          this.isMediaUploadEndpoint(method, path) ||
          this.hasFileParameters(method)
        ) {
          // Special handling for media upload endpoints with file parameters
          // Use multipart/form-data instead of application/json
          // Set file parameters to have format: binary
          const multipartProperties: Record<string, OpenAPIProperty> = {};

          for (const [name, property] of Object.entries(sortedProperties)) {
            const param = method.parameters?.find((p) => p.name === name);
            if (param && this.isFileParameter(param)) {
              // File parameters should have format: binary
              multipartProperties[name] = {
                ...property,
                type: 'string',
                format: 'binary',
              };
            } else {
              multipartProperties[name] = property;
            }
          }

          operation.requestBody = {
            description: 'Multipart form data parameters',
            required: sortedRequired.length > 0,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: multipartProperties,
                  required:
                    sortedRequired.length > 0 ? sortedRequired : undefined,
                } as OpenAPIProperty,
              },
            },
          };
        } else {
          // Default behavior for all other endpoints
          operation.requestBody = {
            description: 'JSON request body parameters',
            required: sortedRequired.length > 0,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: sortedProperties,
                  required:
                    sortedRequired.length > 0 ? sortedRequired : undefined,
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

      // Re-sort parameters after adding path parameters
      operation.parameters = this.sorting.sortParameters(operation.parameters);
    }

    spec.paths[path][httpMethod] = operation;
  }

  /**
   * Merge global response codes with method-specific codes
   * Method-specific codes take precedence if there's a conflict
   */
  private mergeResponseCodes(
    globalCodes: Array<{ code: string; description: string }>,
    methodCodes?: Array<{
      code: string;
      description: string;
      returnType?: string;
    }>
  ): Array<{ code: string; description: string; returnType?: string }> {
    if (!methodCodes || methodCodes.length === 0) {
      // Map global codes to include returnType field for consistent structure
      return globalCodes.map((code) => ({ ...code, returnType: undefined }));
    }

    // Create a map from code to method-specific code info
    const methodCodesMap = new Map<
      string,
      { description: string; returnType?: string }
    >();
    for (const methodCode of methodCodes) {
      methodCodesMap.set(methodCode.code, {
        description: methodCode.description,
        returnType: methodCode.returnType,
      });
    }

    // Start with global codes
    const mergedCodes: Array<{
      code: string;
      description: string;
      returnType?: string;
    }> = [];
    const addedCodes = new Set<string>();

    // Add global codes, but replace with method-specific if available
    for (const globalCode of globalCodes) {
      const methodCodeInfo = methodCodesMap.get(globalCode.code);
      if (methodCodeInfo) {
        mergedCodes.push({
          code: globalCode.code,
          description: methodCodeInfo.description,
          returnType: methodCodeInfo.returnType,
        });
      } else {
        // Add global code with explicit returnType: undefined for consistent structure
        mergedCodes.push({ ...globalCode, returnType: undefined });
      }
      addedCodes.add(globalCode.code);
    }

    // Add any method-specific codes that weren't in global codes
    for (const methodCode of methodCodes) {
      if (!addedCodes.has(methodCode.code)) {
        mergedCodes.push(methodCode);
      }
    }

    return mergedCodes;
  }

  /**
   * Generate rate limit headers for 2xx responses
   */
  private generateRateLimitHeaders(): Record<string, any> {
    const headers: Record<string, any> = {};

    for (const header of this.rateLimitHeaders) {
      // Reference the shared component
      headers[header.name] = {
        $ref: `#/components/headers/${header.name}`,
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
  private generateLinkHeader(): any {
    return {
      $ref: '#/components/headers/Link',
    };
  }

  /**
   * Generate combined headers for 2xx responses (rate limit + Link if applicable)
   */
  private generateResponseHeaders(method: ApiMethod): Record<string, any> {
    const headers: Record<string, any> = {
      ...this.generateRateLimitHeaders(),
    };

    // Add Link header for methods with pagination parameters
    if (this.hasPaginationParameters(method)) {
      headers['Link'] = this.generateLinkHeader();
    }

    for (const name of extraResponseHeadersFor(
      method.httpMethod,
      this.normalizePath(method.endpoint)
    )) {
      headers[name] = { $ref: `#/components/headers/${name}` };
    }

    return headers;
  }

  // Naming is delegated to OperationIdBuilder; these remain for callers and tests.
  public generateOperationId(httpMethod: string, endpoint: string): string {
    return this.operationIds.generateOperationId(httpMethod, endpoint);
  }

  public generateBaseOperationId(method: string, segments: string[]): string {
    return this.operationIds.generateBaseOperationId(method, segments);
  }

  public normalizeVersion(version: string): string {
    return this.operationIds.normalizeVersion(version);
  }

  public hasVersionConflicts(pathAfterVersion: string): boolean {
    return this.operationIds.hasVersionConflicts(pathAfterVersion);
  }

  public normalizePath(endpoint: string): string {
    return this.operationIds.normalizePath(endpoint);
  }

  public extractPathParameters(path: string): string[] {
    return this.operationIds.extractPathParameters(path);
  }

  // Security is delegated to SecurityEmitter.
  private parseOAuthConfig(oauthText: string): OAuthSecurityConfig {
    return this.security.parseOAuthConfig(oauthText);
  }

  private generateSecurityRequirement(
    config: OAuthSecurityConfig
  ): Array<Record<string, string[]>> | undefined {
    return this.security.generateSecurityRequirement(config);
  }

  public collectAppTokenScopes(methodFiles: ApiMethodsFile[]): Set<string> {
    return this.security.collectAppTokenScopes(methodFiles);
  }

  /**
   * Extract tag from endpoint path based on first important segment
   * Examples:
   * - /api/v1/accounts -> "accounts"
   * - /api/v1/accounts/:id/statuses -> "accounts"
   * - /api/v2/search -> "search"
   */
  private extractTagFromEndpoint(endpoint: string): string {
    // Normalize path by removing parameter notations
    const normalizedPath = endpoint.replace(/:([^/]+)/g, '{$1}');

    // Split path into segments
    const segments = normalizedPath
      .split('/')
      .filter((segment) => segment.length > 0);

    // For Mastodon API, the pattern is typically /api/vX/SEGMENT/...
    // Find the first segment after the version
    let tagSegment = '';
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      // Skip 'api' and version segments (v1, v2, etc.)
      if (segment === 'api' || /^v\d+(_\w+)?$/.test(segment)) {
        continue;
      }

      // This is the first important segment
      tagSegment = segment;
      break;
    }

    // Strip periods from the tag to make it cleaner
    const cleanTag = tagSegment.replace(/\./g, '');

    return cleanTag || 'unknown';
  }

  /**
   * Generate external documentation for a method
   */
  private generateMethodExternalDocs(method: ApiMethod, category: string): any {
    if (!method.anchor) {
      return undefined;
    }

    return {
      url: `https://docs.joinmastodon.org/methods/${category}/#${method.anchor}`,
      description: 'Official Mastodon API documentation',
    };
  }
}

export { MethodConverter };
