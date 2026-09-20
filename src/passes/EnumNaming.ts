/**
 * Naming and set helpers for enum hoisting.
 *
 * Component names are derived from the context an enum was found in, so these
 * are pure string/array functions kept apart from the pass that walks the spec.
 */
/**
 * Convert strings to PascalCase, handling both underscore-separated and already-PascalCase strings
 */
export function toPascalCase(input: string): string {
  // If the string contains underscores, split on them and capitalize each word
  if (input.includes('_')) {
    return input
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  // If it's already in PascalCase (starts with uppercase), return as-is
  if (/^[A-Z]/.test(input)) {
    return input;
  }

  // Otherwise, just capitalize the first letter
  return input.charAt(0).toUpperCase() + input.slice(1);
}

/**
 * Generate a unique name for an entity enum component
 */
export function generateEntityEnumComponentName(
  entityName: string,
  propertyName: string,
  enumValues: any[]
): string {
  // Sanitize property name to remove invalid characters
  const sanitizedPropName = propertyName.replace(/[^a-zA-Z0-9_]/g, '_');

  // Convert both entity name and property name to PascalCase
  const pascalEntityName = toPascalCase(entityName);
  const pascalPropName = toPascalCase(sanitizedPropName);

  // Create the enum name using the pattern: {Entity}{Attribute}Enum
  return `${pascalEntityName}${pascalPropName}Enum`;
}

/**
 * Create a short hash from a string
 */
export function createShortHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).slice(0, 6);
}

/**
 * Check if a context name indicates this is a method parameter enum
 */
export function isMethodParameterContext(contextName: string): boolean {
  // Method parameter contexts have these patterns:
  // - {method}_{path}_param_{paramName} (e.g., "get_api_v1_notifications_param_types")
  // - {method}_{path}_requestBody (e.g., "post_api_v2_filters_requestBody")
  // Entity contexts are just the entity name (e.g., "Filter", "Notification")
  return (
    contextName.includes('_param_') || contextName.includes('_requestBody')
  );
}

/**
 * Find an existing entity enum that contains all the values in the given subset
 */
export function findExistingEntityEnumForSubset(
  subsetValues: any[],
  enumPatterns: Map<string, string>,
  enumSignatureToOriginalValues: Map<string, any[]>
): string | null {
  // Look through existing entity enum patterns to find one that contains all our values
  for (const [signature, componentName] of enumPatterns.entries()) {
    // Only consider entity enums (those that already have component names)
    if (componentName && !componentName.includes('_')) {
      const existingValues = enumSignatureToOriginalValues.get(signature);
      if (existingValues && isSubsetOf(subsetValues, existingValues)) {
        return componentName;
      }
    }
  }
  return null;
}

/**
 * Check if subset is completely contained within superset
 */
export function isSubsetOf(subset: any[], superset: any[]): boolean {
  return subset.every((value) => superset.includes(value));
}

/**
 * Generate a name for a shared enum component
 */
export function generateSharedEnumComponentName(
  contextName: string,
  enumValues: any[]
): string {
  // Sanitize context name to remove invalid characters
  const sanitizedContext = contextName.replace(/[^a-zA-Z0-9_]/g, '_');

  // Extract entity and property names from context (format: EntityName_PropertyName)
  const parts = sanitizedContext.split('_');
  const propertyName = parts[parts.length - 1];
  const entityParts = parts.slice(0, -1);
  const entityName = entityParts.join('_');

  // Convert both to PascalCase
  const pascalEntityName = toPascalCase(entityName);
  const pascalPropName = toPascalCase(propertyName);

  // Create the enum name using the pattern: {Entity}{Attribute}Enum
  return `${pascalEntityName}${pascalPropName}Enum`;
}
