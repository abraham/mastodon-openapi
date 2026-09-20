import { UtilityHelpers } from '../generators/UtilityHelpers';
import { hasVersionConflict } from '../overrides/overrides';

/**
 * Derives operationIds and normalized paths from documented endpoints. Pure
 * naming logic: no spec mutation, no documentation access.
 */
export class OperationIdBuilder {
  constructor(private readonly utilityHelpers: UtilityHelpers) {}

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
    const isParam = (segment: string) =>
      segment.startsWith('{') && segment.endsWith('}');
    const singularizes = (segment: string) =>
      this.utilityHelpers.toSingular(segment) !== segment;

    let lastLiteralIndex = -1;
    segments.forEach((segment, index) => {
      if (!isParam(segment)) {
        lastLiteralIndex = index;
      }
    });

    const nameParts = segments.map((segment, index) => {
      const previous = index > 0 ? segments[index - 1] : undefined;

      if (isParam(segment)) {
        const paramName = segment.slice(1, -1);
        // A parameter that selects one item out of a collection adds nothing
        // to the name: either it is a plain identifier, or the collection it
        // follows already went singular. `/accounts/{id}` reads `getAccount`
        // and `/media/{id}` reads `getMedia`. Anything else still has to be
        // named, which is what keeps `/instance/terms_of_service/{date}`
        // distinct from its own parent path.
        const selectsOneItem =
          /^(.*_)?id$/.test(paramName) ||
          (previous !== undefined &&
            !isParam(previous) &&
            singularizes(previous));
        if (selectsOneItem) {
          return '';
        }
        return 'By' + this.utilityHelpers.toPascalCase(paramName);
      }

      const qualifiedByParam =
        index + 1 < segments.length && isParam(segments[index + 1]);
      // A bare collection POST names the thing it creates: `/statuses` ->
      // `createStatus`. A trailing segment of a longer path is an action or a
      // sub-collection, so it keeps its documented form.
      const createsThisResource =
        semanticMethod === 'create' && segments.length === 1;
      const singularize =
        qualifiedByParam || index !== lastLiteralIndex || createsThisResource;

      return this.utilityHelpers.toPascalCase(
        singularize ? this.utilityHelpers.toSingular(segment) : segment
      );
    });

    return semanticMethod + nameParts.join('');
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
    return hasVersionConflict(pathAfterVersion.split('/')[0]);
  }

  /**
   * Normalize endpoint path to OpenAPI format
   */
  public normalizePath(endpoint: string): string {
    // Strip query parameters from path
    const pathWithoutQuery = endpoint.split('?')[0];
    // Convert :param to {param} format for OpenAPI
    return pathWithoutQuery.replace(/:([^/]+)/g, '{$1}');
  }

  /**
   * Extract path parameters from OpenAPI path
   */
  public extractPathParameters(path: string): string[] {
    const matches = path.match(/\{([^}]+)\}/g);
    return matches ? matches.map((match) => match.slice(1, -1)) : [];
  }
}
