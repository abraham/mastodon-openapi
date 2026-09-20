import {
  OpenAPIParameter,
  OpenAPIProperty,
  OpenAPISpec,
} from '../interfaces/OpenAPISchema';

/**
 * Deterministic ordering helpers. Property and parameter order is part of the
 * generated artifact, so these must stay stable.
 */
export class SchemaSorting {
  /**
   * Sort parameters by required status first, then alphabetically
   */
  public sortParameters(parameters: OpenAPIParameter[]): OpenAPIParameter[] {
    return [...parameters].sort((a, b) => {
      // Required parameters first
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      // Then alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Sort properties object keys by required status first, then alphabetically
   * Returns sorted property names and required array
   */
  public sortPropertiesAndRequired(
    properties: Record<string, OpenAPIProperty>,
    requiredFields: string[]
  ): {
    sortedProperties: Record<string, OpenAPIProperty>;
    sortedRequired: string[];
  } {
    // Create array of property entries with required status
    const propertyEntries = Object.entries(properties).map(
      ([name, property]) => ({
        name,
        property,
        required: requiredFields.includes(name),
      })
    );

    // Sort: required first, then alphabetically
    propertyEntries.sort((a, b) => {
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      return a.name.localeCompare(b.name);
    });

    // Rebuild sorted objects
    const sortedProperties: Record<string, OpenAPIProperty> = {};
    const sortedRequired: string[] = [];

    for (const entry of propertyEntries) {
      sortedProperties[entry.name] = entry.property;
      if (entry.required) {
        sortedRequired.push(entry.name);
      }
    }

    return { sortedProperties, sortedRequired };
  }

  /**
   * Sort paths in the OpenAPI spec by their tags alphabetically
   */
  public sortPathsByTags(spec: OpenAPISpec): void {
    // Get all paths with their primary tags for sorting
    const pathEntries = Object.entries(spec.paths).map(([path, pathItem]) => {
      // Get the first operation's first tag as the primary tag for sorting
      let primaryTag = 'unknown';
      for (const [httpMethod, operation] of Object.entries(pathItem)) {
        if (
          typeof operation === 'object' &&
          operation !== null &&
          operation.tags
        ) {
          primaryTag = operation.tags[0] || 'unknown';
          break;
        }
      }
      return { path, pathItem, primaryTag };
    });

    // Sort by primary tag alphabetically, then by path
    pathEntries.sort((a, b) => {
      const tagComparison = a.primaryTag.localeCompare(b.primaryTag);
      if (tagComparison !== 0) {
        return tagComparison;
      }
      return a.path.localeCompare(b.path);
    });

    // Create new sorted paths object
    const sortedPaths: typeof spec.paths = {};
    for (const { path, pathItem } of pathEntries) {
      sortedPaths[path] = pathItem;
    }

    // Replace the original paths with sorted ones
    spec.paths = sortedPaths;
  }
}
