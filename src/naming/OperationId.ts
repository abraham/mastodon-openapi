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
