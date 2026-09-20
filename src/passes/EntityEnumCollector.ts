import {
  OpenAPISpec,
  OpenAPISchema,
  OpenAPIProperty,
} from '../interfaces/OpenAPISchema';
import { generateEntityEnumComponentName } from './EnumNaming';

/**
 * Collects the enums declared on entity schemas and promotes them to shared
 * components. Entity enums are named first so that operation-level enums can
 * reuse them rather than minting a parallel component.
 */
/**
 * Select the best occurrence from multiple entities sharing the same enum
 * Prioritizes shorter entity names and more canonical entity names
 */
export function selectBestEnumOccurrence(
  occurrences: { entityName: string; propName: string; enumValues: any[] }[]
): { entityName: string; propName: string; enumValues: any[] } {
  if (occurrences.length === 1) {
    return occurrences[0];
  }

  // Priority rules:
  // 1. Prefer certain canonical entities like "Status" over others
  // 2. Prefer shorter entity names (more likely to be canonical)
  // 3. As fallback, use alphabetical order

  const canonicalEntities = ['Status', 'Account', 'Notification', 'User'];

  // First, try to find a canonical entity
  for (const canonicalEntity of canonicalEntities) {
    const match = occurrences.find((occ) => occ.entityName === canonicalEntity);
    if (match) {
      return match;
    }
  }

  // Then, prefer shorter entity names
  occurrences.sort((a, b) => {
    const lengthDiff = a.entityName.length - b.entityName.length;
    if (lengthDiff !== 0) {
      return lengthDiff;
    }
    // If same length, use alphabetical order
    return a.entityName.localeCompare(b.entityName);
  });

  return occurrences[0];
}

/**
 * Recursively collect enum properties from nested object structures
 */
export function collectEnumsFromProperties(
  properties: Record<string, any>,
  entityName: string,
  parentPath: string,
  enumOccurrences: Map<
    string,
    { entityName: string; propName: string; enumValues: any[] }[]
  >
): void {
  for (const [propName, property] of Object.entries(properties)) {
    const fullPropName = parentPath ? `${parentPath}.${propName}` : propName;

    // Check for direct enum properties
    if (property.enum && Array.isArray(property.enum)) {
      const enumSignature = JSON.stringify([...property.enum].sort());

      if (!enumOccurrences.has(enumSignature)) {
        enumOccurrences.set(enumSignature, []);
      }
      enumOccurrences.get(enumSignature)!.push({
        entityName,
        propName: fullPropName,
        enumValues: property.enum,
      });
    }

    // Check for array properties with enum items
    if (
      property.type === 'array' &&
      property.items &&
      typeof property.items === 'object' &&
      property.items.enum &&
      Array.isArray(property.items.enum)
    ) {
      const enumSignature = JSON.stringify([...property.items.enum].sort());

      if (!enumOccurrences.has(enumSignature)) {
        enumOccurrences.set(enumSignature, []);
      }
      enumOccurrences.get(enumSignature)!.push({
        entityName,
        propName: fullPropName,
        enumValues: property.items.enum,
      });
    }

    // Recursively process nested object properties
    if (
      property.type === 'object' &&
      property.properties &&
      typeof property.properties === 'object'
    ) {
      collectEnumsFromProperties(
        property.properties,
        entityName,
        fullPropName,
        enumOccurrences
      );
    }
  }
}

/**
 * Extract ALL entity enums into their own components
 */
export function extractEntityEnumsToComponents(
  spec: OpenAPISpec,
  enumPatterns: Map<string, string>,
  enumSignatureToOriginalValues: Map<string, any[]>
): void {
  if (!spec.components?.schemas) return;

  // First pass: collect all enum occurrences to detect sharing opportunities
  const enumOccurrences = new Map<
    string,
    { entityName: string; propName: string; enumValues: any[] }[]
  >();

  for (const [entityName, schema] of Object.entries(spec.components.schemas)) {
    const openAPISchema = schema as OpenAPISchema;
    if (!openAPISchema.properties) continue;

    // Use recursive helper to collect all enums including nested ones
    collectEnumsFromProperties(
      openAPISchema.properties,
      entityName,
      '',
      enumOccurrences
    );
  }

  // Second pass: create enum components based on best occurrence
  for (const [enumSignature, occurrences] of enumOccurrences) {
    if (occurrences.length === 0) continue;

    // Choose the best occurrence to determine the component name
    const bestOccurrence = selectBestEnumOccurrence(occurrences);
    const componentName = generateEntityEnumComponentName(
      bestOccurrence.entityName,
      bestOccurrence.propName,
      bestOccurrence.enumValues
    );

    // Store the mapping and original values
    enumPatterns.set(enumSignature, componentName);
    enumSignatureToOriginalValues.set(enumSignature, bestOccurrence.enumValues);

    // Create the enum component
    spec.components.schemas[componentName] = {
      type: 'string',
      enum: bestOccurrence.enumValues,
    } as any;
  }
}
