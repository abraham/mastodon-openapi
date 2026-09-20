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
import { ResponseEmitter } from './ResponseEmitter';
import { RequestBodyEmitter } from './RequestBodyEmitter';

/**
 * Converter for transforming API methods to OpenAPI paths and operations
 */
class MethodConverter {
  private typeParser: TypeParser;
  private utilityHelpers: UtilityHelpers;
  private operationIds: OperationIdBuilder;
  private security: SecurityEmitter;
  private sorting: SchemaSorting;
  private components: ComponentEmitter;
  private responses: ResponseEmitter;
  private requestBodies: RequestBodyEmitter;

  constructor(
    typeParser: TypeParser,
    utilityHelpers: UtilityHelpers,
    errorExampleRegistry: ErrorExampleRegistry,
    context: PipelineContext = createPipelineContext()
  ) {
    this.typeParser = typeParser;
    this.utilityHelpers = utilityHelpers;
    this.operationIds = new OperationIdBuilder(utilityHelpers);
    this.security = new SecurityEmitter();
    this.sorting = new SchemaSorting();
    this.components = new ComponentEmitter(this.sorting);
    this.responses = new ResponseEmitter(
      typeParser,
      errorExampleRegistry,
      this.components,
      ResponseCodeParser.parseResponseCodes(context.source),
      HeaderParser.parseRateLimitHeaders(context.source)
    );
    this.requestBodies = new RequestBodyEmitter(
      typeParser,
      this.sorting,
      this.components
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

    const operation: OpenAPIOperation = {
      operationId: this.generateOperationId(method.httpMethod, path),
      summary: method.name,
      description: this.buildDescriptionWithVersionHistory(method),
      tags: [this.extractTagFromEndpoint(method.endpoint)],
      responses: this.responses.build(method, path, spec),
      externalDocs: this.generateMethodExternalDocs(method, category),
    };

    if (method.deprecated) {
      operation.deprecated = true;
    }

    if (method.version && VersionParser.isOperationUnreleased(method.version)) {
      (operation as any)['x-badges'] = [{ name: 'Unreleased' }];
    }

    if (method.oauth) {
      const oauthConfig = this.parseOAuthConfig(method.oauth);
      operation.security = this.generateSecurityRequirement(oauthConfig);
    }

    if (method.parameters && method.parameters.length > 0) {
      const bodyParams = this.collectParameters(method, httpMethod, operation);

      const requestBody = this.requestBodies.build(
        method,
        path,
        bodyParams,
        spec
      );
      if (requestBody) {
        operation.requestBody = requestBody;
      }
    }

    this.addPathParameters(path, operation);

    spec.paths[path][httpMethod] = operation;
  }

  /**
   * Splits declared parameters into the operation's own parameter list and the
   * form-data parameters that become a request body.
   */
  private collectParameters(
    method: ApiMethod,
    httpMethod: keyof OpenAPIPath,
    operation: OpenAPIOperation
  ): ApiParameter[] {
    operation.parameters = [];
    const bodyParams: ApiParameter[] = [];

    for (const param of method.parameters || []) {
      const location =
        param.in === 'query' || param.in === 'path' || param.in === 'header'
          ? param.in
          : param.in === 'formData'
            ? 'body'
            : // Undeclared location: GET takes a query parameter, anything
              // else takes a body field.
              httpMethod === 'get'
              ? 'query'
              : 'body';

      if (location === 'body') {
        bodyParams.push(param);
        continue;
      }

      operation.parameters.push({
        name: param.name,
        in: location,
        required: param.required,
        description: param.description,
        schema: this.typeParser.convertParameterToSchema(param),
      });
    }

    if (operation.parameters.length > 0) {
      operation.parameters = this.sorting.sortParameters(operation.parameters);
    }

    return bodyParams;
  }

  private addPathParameters(path: string, operation: OpenAPIOperation): void {
    const pathParams = this.extractPathParameters(path);
    if (pathParams.length === 0) {
      return;
    }

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

    operation.parameters = this.sorting.sortParameters(operation.parameters);
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
