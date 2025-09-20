import { EntityClass } from '../interfaces/EntityClass';
import { EntityAttribute } from '../interfaces/EntityAttribute';
import {
  OpenAPIProperty,
  OpenAPISchema,
  OpenAPISpec,
} from '../interfaces/OpenAPISchema';
import { TypeParser } from './TypeParser';
import { UtilityHelpers } from './UtilityHelpers';

/**
 * Converter for transforming entity classes to OpenAPI schemas
 */
class EntityConverter {
  private typeParser: TypeParser;
  private utilityHelpers: UtilityHelpers;

  constructor(typeParser: TypeParser, utilityHelpers: UtilityHelpers) {
    this.typeParser = typeParser;
    this.utilityHelpers = utilityHelpers;
  }

  /**
   * Convert entities to OpenAPI schemas and add them to the spec
   */
  public convertEntities(entities: EntityClass[], spec: OpenAPISpec): void {
    if (!spec.components?.schemas) {
      spec.components = { schemas: {} };
    }

    // First pass: collect all entities and their schemas
    const entitySchemas = new Map<string, OpenAPISchema>();

    for (const entity of entities) {
      let allAttributes = entity.attributes;

      // Special handling for entity inheritance
      if (entity.name === 'CredentialApplication') {
        // Find the Application entity to inherit from
        const applicationEntity = entities.find(
          (e) => e.name === 'Application'
        );
        if (applicationEntity) {
          // Combine Application attributes with CredentialApplication attributes
          allAttributes = [
            ...applicationEntity.attributes,
            ...entity.attributes,
          ];
        }
      } else if (entity.name === 'CredentialAccount') {
        // Find the Account entity to inherit from
        const accountEntity = entities.find((e) => e.name === 'Account');
        if (accountEntity) {
          // Combine Account attributes with CredentialAccount attributes
          allAttributes = [...accountEntity.attributes, ...entity.attributes];
        }
      } else if (entity.name === 'MutedAccount') {
        // Find the Account entity to inherit from
        const accountEntity = entities.find((e) => e.name === 'Account');
        if (accountEntity) {
          // Combine Account attributes with MutedAccount attributes
          allAttributes = [...accountEntity.attributes, ...entity.attributes];
        }
      } else if (entity.name === 'Trends::Link') {
        // Find the PreviewCard entity to inherit from
        const previewCardEntity = entities.find(
          (e) => e.name === 'PreviewCard'
        );
        if (previewCardEntity) {
          // Combine PreviewCard attributes with Trends::Link attributes
          allAttributes = [
            ...previewCardEntity.attributes,
            ...entity.attributes,
          ];
        }
      }

      const schema: OpenAPISchema = {
        type: 'object',
        description: entity.description,
        properties: {},
        required: [],
        externalDocs: this.generateEntityExternalDocs(entity),
      };

      // Add example if available
      if (entity.example) {
        schema.example = entity.example;
      }

      // Process attributes to build nested structure
      this.processAttributesRecursively(allAttributes, schema);

      // Sort properties by required first, then alphabetically
      this.sortSchemaProperties(schema);

      // Remove empty required array
      if (schema.required && schema.required.length === 0) {
        delete schema.required;
      }

      const sanitizedName = this.utilityHelpers.sanitizeSchemaName(entity.name);
      entitySchemas.set(sanitizedName, schema);
    }

    // Second pass: detect and deduplicate identical enums
    // NOTE: This is now handled globally in OpenAPIGenerator.deduplicateEnumsGlobally()
    // this.deduplicateEnums(entitySchemas, spec);

    // Add all schemas to the spec
    for (const [name, schema] of entitySchemas) {
      if (spec.components?.schemas) {
        spec.components.schemas[name] = schema;
      }
    }
  }

  /**
   * Sort properties in a schema by required status first, then alphabetically
   */
  private sortSchemaProperties(schema: OpenAPISchema): void {
    if (!schema.properties || Object.keys(schema.properties).length === 0) {
      return;
    }

    const requiredFields = schema.required || [];

    // Create array of property entries with required status
    const propertyEntries = Object.entries(schema.properties).map(
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
    const sortedProperties: Record<string, any> = {};
    const sortedRequired: string[] = [];

    for (const entry of propertyEntries) {
      sortedProperties[entry.name] = entry.property;
      if (entry.required) {
        sortedRequired.push(entry.name);
      }
    }

    // Update schema with sorted properties
    schema.properties = sortedProperties;
    schema.required = sortedRequired.length > 0 ? sortedRequired : undefined;

    // Recursively sort nested object properties
    for (const property of Object.values(schema.properties)) {
      if (property && typeof property === 'object') {
        if (property.type === 'object' && property.properties) {
          // Direct nested object
          this.sortSchemaProperties(property as OpenAPISchema);
        } else if (
          property.type === 'array' &&
          property.items &&
          typeof property.items === 'object' &&
          property.items.type === 'object' &&
          property.items.properties
        ) {
          // Array of objects
          this.sortSchemaProperties(property.items as OpenAPISchema);
        }
      }
    }
  }

  /**
   * Detect and deduplicate identical enums across entities
   */
  private deduplicateEnums(
    entitySchemas: Map<string, OpenAPISchema>,
    spec: OpenAPISpec
  ): void {
    // Track enum patterns: key = enum signature, value = shared component name
    const enumPatterns = new Map<string, string>();

    // First pass: identify all enum patterns
    const enumSignatureToOriginalValues = new Map<string, any[]>();

    for (const [entityName, schema] of entitySchemas) {
      this.collectEnumPatterns(
        schema,
        entityName,
        enumPatterns,
        enumSignatureToOriginalValues
      );
    }

    // Create shared components for patterns that appear in multiple entities
    for (const [enumSignature, componentName] of enumPatterns) {
      if (componentName) {
        const originalValues = enumSignatureToOriginalValues.get(enumSignature);

        if (spec.components?.schemas) {
          spec.components.schemas[componentName] = {
            type: 'string',
            enum: originalValues || JSON.parse(enumSignature),
          } as any;
        }
      }
    }

    // Second pass: replace inline enums with references to shared components
    for (const [entityName, schema] of entitySchemas) {
      this.replaceEnumsWithReferences(schema, enumPatterns);
    }
  }

  /**
   * Collect all enum patterns from a schema
   */
  private collectEnumPatterns(
    schema: OpenAPISchema,
    entityName: string,
    enumPatterns: Map<string, string>,
    enumSignatureToOriginalValues: Map<string, any[]>
  ): void {
    if (!schema.properties) return;

    for (const [propName, property] of Object.entries(schema.properties)) {
      // Look for array properties with enum values on items
      if (
        property.type === 'array' &&
        property.items &&
        typeof property.items === 'object' &&
        property.items.enum &&
        Array.isArray(property.items.enum)
      ) {
        const enumSignature = JSON.stringify(property.items.enum.sort());

        if (!enumPatterns.has(enumSignature)) {
          // First occurrence - save original values and mark it
          enumPatterns.set(enumSignature, '');
          enumSignatureToOriginalValues.set(enumSignature, property.items.enum);
        } else if (enumPatterns.get(enumSignature) === '') {
          // Second occurrence - create shared component
          const componentName = this.generateSharedEnumComponentName(
            propName,
            property.items.enum
          );
          enumPatterns.set(enumSignature, componentName);
        }
      }
      // Also look for direct enum properties (non-arrays)
      else if (property.enum && Array.isArray(property.enum)) {
        const enumSignature = JSON.stringify(property.enum.sort());

        if (!enumPatterns.has(enumSignature)) {
          // First occurrence - save original values and mark it
          enumPatterns.set(enumSignature, '');
          enumSignatureToOriginalValues.set(enumSignature, property.enum);
        } else if (enumPatterns.get(enumSignature) === '') {
          // Second occurrence - create shared component
          const componentName = this.generateSharedEnumComponentName(
            propName,
            property.enum
          );
          enumPatterns.set(enumSignature, componentName);
        }
      }
    }
  }

  /**
   * Replace inline enums with references to shared components
   */
  private replaceEnumsWithReferences(
    schema: OpenAPISchema,
    enumPatterns: Map<string, string>
  ): void {
    if (!schema.properties) return;

    for (const [propName, property] of Object.entries(schema.properties)) {
      // Handle array properties with enum items
      if (
        property.type === 'array' &&
        property.items &&
        typeof property.items === 'object' &&
        property.items.enum &&
        Array.isArray(property.items.enum)
      ) {
        const enumSignature = JSON.stringify(property.items.enum.sort());
        const componentName = enumPatterns.get(enumSignature);

        if (componentName) {
          // Replace with reference to shared component
          property.items = {
            $ref: `#/components/schemas/${componentName}`,
          };
        }
      }
      // Handle direct enum properties (non-arrays)
      else if (property.enum && Array.isArray(property.enum)) {
        const enumSignature = JSON.stringify(property.enum.sort());
        const componentName = enumPatterns.get(enumSignature);

        if (componentName) {
          // Replace with reference to shared component
          delete property.enum;
          property.$ref = `#/components/schemas/${componentName}`;
        }
      }
    }
  }

  /**
   * Generate a name for a shared enum component
   */
  private generateSharedEnumComponentName(
    propertyName: string,
    enumValues: any[]
  ): string {
    // Create a descriptive name based on property name
    const capitalizedName =
      propertyName.charAt(0).toUpperCase() + propertyName.slice(1);

    // Use consistent naming pattern for shared enums
    return `${capitalizedName}Enum`;
  }

  /**
   * Convert entity attribute to OpenAPI property
   */
  public convertAttribute(attribute: EntityAttribute): OpenAPIProperty {
    const property: OpenAPIProperty = {
      description: attribute.description,
    };

    if (attribute.deprecated) {
      property.deprecated = true;
    }

    // Parse type information to determine OpenAPI type
    const type = this.typeParser.parseType(attribute.type);

    if (type.type) {
      property.type = type.type;
    }
    if (type.format) {
      property.format = type.format;
    }
    if (type.items) {
      property.items = type.items;
    }
    if (type.$ref) {
      property.$ref = type.$ref;
    }
    if (type.oneOf) {
      property.oneOf = type.oneOf;
    }

    // Special handling for client_secret_expires_at: should be integer (always returns 0)
    if (attribute.name === 'client_secret_expires_at') {
      property.type = 'integer';
      // Remove any format that might have been set
      delete property.format;
    }

    // Special handling for _at properties that should be date-time format
    // Exception: client_secret_expires_at always returns 0 (not a real date)
    if (
      attribute.name.endsWith('_at') &&
      attribute.name !== 'client_secret_expires_at' &&
      property.type === 'string' &&
      !property.format
    ) {
      property.format = 'date-time';
    }

    // Check for email format - only for actual email fields, not descriptions mentioning email
    const isEmailField =
      attribute.name.toLowerCase() === 'email' ||
      (attribute.name.toLowerCase().endsWith('_email') &&
        !attribute.name.toLowerCase().includes('hash')) ||
      (attribute.name.toLowerCase().startsWith('email_') &&
        !attribute.name.toLowerCase().includes('hash')) ||
      (attribute.description &&
        !attribute.description.toLowerCase().includes('hash') &&
        !attribute.description.toLowerCase().includes('sha') &&
        !attribute.description.toLowerCase().includes(' id ') &&
        !attribute.description.toLowerCase().includes('the id of') &&
        !attribute.description.toLowerCase().includes('domain') &&
        !attribute.description.toLowerCase().includes('count') &&
        !attribute.description.toLowerCase().includes('confirmation email') &&
        !attribute.description
          .toLowerCase()
          .includes('email that will be sent') &&
        (attribute.description.toLowerCase().includes('email address') ||
          attribute.description.toLowerCase().includes('e-mail address') ||
          attribute.description.toLowerCase().includes('email')));

    if (isEmailField && property.type === 'string' && !property.format) {
      property.format = 'email';
    }

    // Special handling for OAuth scopes properties
    if (
      this.isOAuthScopeProperty(attribute.name) &&
      property.type === 'array'
    ) {
      // Use the common OAuthScopes schema component for OAuth scopes
      if (attribute.nullable) {
        return {
          description: attribute.description,
          oneOf: [
            { $ref: '#/components/schemas/OAuthScopes' },
            { type: 'null' },
          ],
          ...(attribute.deprecated && { deprecated: true }),
        };
      }

      return {
        description: attribute.description,
        $ref: '#/components/schemas/OAuthScopes',
        ...(attribute.deprecated && { deprecated: true }),
      };
    }

    // Use enum values from attribute if available, otherwise from type parsing
    if (attribute.enumValues && attribute.enumValues.length > 0) {
      if (property.type === 'array') {
        // For arrays, enum values should be on items, not on the array itself
        if (property.items && typeof property.items === 'object') {
          property.items.enum = attribute.enumValues;
        }
      } else {
        property.enum = attribute.enumValues;
      }
    } else if (type.enum) {
      if (property.type === 'array') {
        // For arrays, enum values should be on items, not on the array itself
        if (property.items && typeof property.items === 'object') {
          property.items.enum = type.enum;
        }
      } else {
        property.enum = type.enum;
      }
    }

    // Handle nullable fields
    if (attribute.nullable) {
      if (property.$ref) {
        // For $ref properties, use oneOf to include null
        return {
          description: property.description,
          oneOf: [{ $ref: property.$ref }, { type: 'null' }],
          ...(property.deprecated && { deprecated: true }),
        };
      } else if (property.oneOf) {
        // For properties that already have oneOf (e.g., multiple entity references), add null to the oneOf array
        property.oneOf.push({ type: 'null' });
      } else if (property.type && typeof property.type === 'string') {
        // For regular type properties, convert type to an array that includes null
        property.type = [property.type, 'null'];
        // Preserve format property for nullable fields
        // Note: format should still apply to the non-null value
      }
    }

    return property;
  }

  /**
   * Process attributes recursively to build nested object structures
   */
  private processAttributesRecursively(
    attributes: EntityAttribute[],
    schema: OpenAPISchema
  ): void {
    // Group attributes by their structure
    const flatAttributes: EntityAttribute[] = [];
    const nestedGroups = new Map<string, EntityAttribute[]>();
    const arrayItemGroups = new Map<string, EntityAttribute[]>();

    for (const attribute of attributes) {
      // Check if this is a nested attribute pattern
      const nestedMatch = this.parseNestedAttributeName(attribute.name);

      if (nestedMatch) {
        const { parentName, fullPath, arrayPositions } = nestedMatch;

        // Check if this is an array item property (e.g., "poll.options[].title")
        // Look for array positions and check if we have properties after an array
        let isArrayItemProperty = false;
        let arrayPath = '';

        for (const arrayPos of arrayPositions) {
          if (arrayPos < fullPath.length - 1) {
            // There are properties after this array position
            isArrayItemProperty = true;
            arrayPath = fullPath.slice(0, arrayPos + 1).join('.');
            break;
          }
        }

        if (isArrayItemProperty && arrayPath) {
          // This is a property of array items
          const propertyName = fullPath[fullPath.length - 1];

          if (!arrayItemGroups.has(arrayPath)) {
            arrayItemGroups.set(arrayPath, []);
          }

          // Create an attribute for the array item property
          const arrayItemAttr: EntityAttribute = {
            ...attribute,
            name: propertyName,
          };
          arrayItemGroups.get(arrayPath)!.push(arrayItemAttr);
        } else {
          // Regular nested structure
          if (!nestedGroups.has(parentName)) {
            nestedGroups.set(parentName, []);
          }
          nestedGroups.get(parentName)!.push(attribute);
        }
      } else {
        flatAttributes.push(attribute);
      }
    }

    // Process flat attributes first
    for (const attribute of flatAttributes) {
      const property = this.convertAttribute(attribute);
      if (schema.properties) {
        schema.properties[attribute.name] = property;
      }

      // Add to required array if not optional and not nullable
      if (!attribute.optional && !attribute.nullable && schema.required) {
        schema.required.push(attribute.name);
      }
    }

    // Process nested groups
    for (const [parentName, groupAttributes] of nestedGroups.entries()) {
      this.processNestedGroup(parentName, groupAttributes, schema);
    }

    // Process array item groups
    for (const [arrayPath, itemProperties] of arrayItemGroups.entries()) {
      this.processArrayItemGroup(arrayPath, itemProperties, schema);
    }
  }

  /**
   * Parse nested attribute name to extract parent and path information
   */
  private parseNestedAttributeName(name: string): {
    parentName: string;
    fullPath: string[];
    arrayPositions: number[];
  } | null {
    // Handle dotted patterns like "poll.options[]" or "poll.options[].title"
    if (name.includes('.')) {
      const parts = name.split('.');
      if (parts.length >= 2) {
        // Check if this is a bracket pattern with dots inside
        const bracketMatch = name.match(/^([^[]+)(\[.+\])$/);
        if (bracketMatch) {
          // This is a bracket pattern like "alerts[admin.sign_up]"
          // Don't split on dots, handle as bracket pattern
          // Fall through to bracket parsing logic below
        } else {
          // This is a regular dotted pattern like "poll.options[]"
          const parentName = parts[0];
          const fullPath = [parentName];
          const arrayPositions: number[] = [];

          for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            // Handle array notation in dotted paths
            if (part.endsWith('[]')) {
              fullPath.push(part.slice(0, -2)); // Remove []
              arrayPositions.push(fullPath.length - 1); // Mark this position as an array
            } else {
              fullPath.push(part);
            }
          }

          return { parentName, fullPath, arrayPositions };
        }
      }
    }

    // Match patterns like "parent[child]" or "parent[child][grandchild]"
    const match = name.match(/^([^[]+)(\[.+\])$/);
    if (!match) {
      return null;
    }

    const parentName = match[1];
    const bracketPart = match[2];

    // Parse bracket segments manually to handle nested brackets properly
    const fullPath = [parentName];
    const arrayPositions: number[] = [];
    let i = 0;

    while (i < bracketPart.length) {
      if (bracketPart[i] === '[') {
        // Find the matching closing bracket
        let depth = 0;
        let j = i;
        let segmentContent = '';

        // Skip the opening bracket
        j++;

        while (j < bracketPart.length) {
          const char = bracketPart[j];
          if (char === '[') {
            depth++;
            segmentContent += char;
          } else if (char === ']') {
            if (depth === 0) {
              // Found the matching closing bracket
              break;
            } else {
              depth--;
              segmentContent += char;
            }
          } else {
            segmentContent += char;
          }
          j++;
        }

        // Process the segment content
        if (segmentContent === '') {
          // Empty brackets indicate the previous element is an array
          if (fullPath.length > 0) {
            arrayPositions.push(fullPath.length - 1);
          }
        } else if (segmentContent.endsWith('[]')) {
          // Handle patterns like "options[]" - extract the name and mark as array
          const arrayName = segmentContent.slice(0, -2);
          fullPath.push(arrayName);
          arrayPositions.push(fullPath.length - 1);
        } else {
          // Regular nested property
          fullPath.push(segmentContent);
        }

        // Move to the next segment
        i = j + 1;
      } else {
        i++;
      }
    }

    return { parentName, fullPath, arrayPositions };
  }

  /**
   * Process a group of nested attributes for a parent property
   */
  private processNestedGroup(
    parentName: string,
    attributes: EntityAttribute[],
    parentSchema: OpenAPISchema
  ): void {
    // Find or create the parent property
    if (!parentSchema.properties) {
      parentSchema.properties = {};
    }

    let parentProperty = parentSchema.properties[parentName];
    if (!parentProperty) {
      // Find the parent attribute definition
      const parentAttr = attributes.find((attr) => attr.name === parentName);
      if (parentAttr) {
        parentProperty = this.convertAttribute(parentAttr);
      } else {
        // Create a default object property for the parent
        parentProperty = {
          type: 'object',
          description: `${parentName} object`,
        };
      }
      parentSchema.properties[parentName] = parentProperty;
    }

    // Ensure parent is an object with properties
    const isObjectType =
      parentProperty.type === 'object' ||
      (Array.isArray(parentProperty.type) &&
        parentProperty.type.includes('object'));

    if (isObjectType) {
      if (!parentProperty.properties) {
        parentProperty.properties = {};
      }
      if (!parentProperty.required) {
        parentProperty.required = [];
      }

      // Build nested structure
      const nestedAttributes: EntityAttribute[] = [];
      const directProperties = new Map<string, EntityAttribute>();

      for (const attr of attributes) {
        if (attr.name === parentName) {
          // Skip the parent definition itself
          continue;
        }

        const parsed = this.parseNestedAttributeName(attr.name);
        if (parsed && parsed.fullPath.length > 1) {
          const newPath = parsed.fullPath.slice(1); // Remove parent name

          // If the new path has only one element, treat it as a direct property
          // This handles cases like alerts[admin.sign_up] where admin.sign_up should be a single property
          if (newPath.length === 1) {
            directProperties.set(newPath[0], attr);
          } else {
            // For complex nested structures, reconstruct the name
            const newName =
              newPath[0] + '[' + newPath.slice(1).join('][') + ']';
            const nestedAttr: EntityAttribute = {
              ...attr,
              name: newName,
            };
            nestedAttributes.push(nestedAttr);
          }
        }
      }

      // Process direct properties first (these should not be parsed further)
      for (const [propName, attr] of directProperties.entries()) {
        const property = this.convertAttribute(attr);
        parentProperty.properties[propName] = property;

        if (!attr.optional && !attr.nullable && parentProperty.required) {
          parentProperty.required.push(propName);
        }
      }

      // Clean up empty required array after processing direct properties
      if (parentProperty.required && parentProperty.required.length === 0) {
        delete parentProperty.required;
      }

      // Recursively process nested attributes only if there are any
      if (nestedAttributes.length > 0) {
        const nestedSchema: OpenAPISchema = {
          type: 'object',
          properties: parentProperty.properties,
          required: parentProperty.required,
        };

        this.processAttributesRecursively(nestedAttributes, nestedSchema);

        // Update parent property with processed nested structure
        parentProperty.properties = nestedSchema.properties;
        if (nestedSchema.required && nestedSchema.required.length > 0) {
          parentProperty.required = nestedSchema.required;
        } else {
          delete parentProperty.required;
        }
      } else {
        // No nested attributes to process, just clean up empty required array
        if (parentProperty.required && parentProperty.required.length === 0) {
          delete parentProperty.required;
        }
      }
    }

    // Check if parent should be required
    // Only consider parent required if it's explicitly not optional and not nullable
    // Having required children doesn't make an optional parent required
    const parentAttr = attributes.find((attr) => attr.name === parentName);
    const parentIsRequired =
      parentAttr && !parentAttr.optional && !parentAttr.nullable;

    if (
      parentIsRequired &&
      parentSchema.required &&
      !parentSchema.required.includes(parentName)
    ) {
      parentSchema.required.push(parentName);
    }
  }

  /**
   * Process array item properties to update array item schemas
   */
  private processArrayItemGroup(
    arrayPath: string,
    itemProperties: EntityAttribute[],
    schema: OpenAPISchema
  ): void {
    // Parse the array path to find the array property
    const pathParts = arrayPath.split('.');
    let currentProperty = schema.properties;

    if (!currentProperty) {
      return;
    }

    // Navigate to the array property
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      const cleanPart = part.replace('[]', ''); // Remove array notation for property lookup

      if (!currentProperty || !currentProperty[cleanPart]) {
        // Array property doesn't exist yet, skip
        return;
      }

      if (i === pathParts.length - 1) {
        // This is the array property
        const arrayProperty = currentProperty[cleanPart];

        if (arrayProperty.type === 'array' && arrayProperty.items) {
          // Update the array items schema with the properties
          if (
            typeof arrayProperty.items === 'object' &&
            !Array.isArray(arrayProperty.items)
          ) {
            if (!arrayProperty.items.properties) {
              arrayProperty.items.properties = {};
            }
            if (!arrayProperty.items.required) {
              arrayProperty.items.required = [];
            }

            // Add each property to the array items schema
            for (const prop of itemProperties) {
              const propertySchema = this.convertAttribute(prop);
              arrayProperty.items.properties[prop.name] = propertySchema;

              // Add to required if not optional and not nullable
              if (
                !prop.optional &&
                !prop.nullable &&
                !arrayProperty.items.required.includes(prop.name)
              ) {
                arrayProperty.items.required.push(prop.name);
              }
            }

            // Clean up empty required array
            if (arrayProperty.items.required.length === 0) {
              delete arrayProperty.items.required;
            }
          }
        }
      } else {
        // Navigate deeper into the structure
        const nextProperty: any = currentProperty[cleanPart];
        if (nextProperty && nextProperty.properties) {
          currentProperty = nextProperty.properties;
        } else {
          // Can't navigate further, skip
          return;
        }
      }
    }
  }

  /**
   * Checks if a property name indicates it contains OAuth scopes
   */
  private isOAuthScopeProperty(propertyName: string): boolean {
    // Property names that should reference OAuth scopes
    const oauthScopeProperties = ['scopes', 'scopes_supported'];

    return oauthScopeProperties.includes(propertyName);
  }

  /**
   * Generate external documentation for an entity
   */
  private generateEntityExternalDocs(entity: EntityClass): any {
    const entityName = entity.name;
    const sourceFile = entity.sourceFile;

    // Define known sub-entities and their parent entities (for entities without source file info)
    const subEntityMap: Record<string, { parent: string; anchor: string }> = {
      // Account sub-entities
      CredentialAccount: { parent: 'Account', anchor: 'CredentialAccount' },
      MutedAccount: { parent: 'Account', anchor: 'MutedAccount' },
      Field: { parent: 'Account', anchor: 'Field' },
      Source: { parent: 'Account', anchor: 'source' },

      // Admin_Cohort sub-entities
      CohortData: { parent: 'Admin_Cohort', anchor: 'CohortData' },

      // PreviewCard sub-entities
      Trends_Link: { parent: 'PreviewCard', anchor: 'trends-link' },
      'Trends::Link': { parent: 'PreviewCard', anchor: 'trends-link' },
    };

    // Special handling for known data sub-entities
    if (
      entityName === 'Admin::DimensionData' ||
      entityName === 'Admin_DimensionData'
    ) {
      return {
        url: `https://docs.joinmastodon.org/entities/Admin_Dimension/#data-attributes`,
        description: 'Official Mastodon API documentation',
      };
    }

    // Check if this is a main entity that corresponds to a source file
    // For entities like "Admin::Dimension" with sourceFile "Admin_Dimension", they should use #attributes
    if (sourceFile && entityName.includes('::')) {
      const [namespace, baseName] = entityName.split('::');
      const expectedSourceFile = `${namespace}_${baseName}`;

      // If this is the main entity for the source file (name matches the file), use #attributes
      if (sourceFile === expectedSourceFile) {
        return {
          url: `https://docs.joinmastodon.org/entities/${sourceFile}/#attributes`,
          description: 'Official Mastodon API documentation',
        };
      } else {
        // Otherwise, this is a sub-entity, use the namespace as anchor
        const anchor = namespace.toLowerCase();
        return {
          url: `https://docs.joinmastodon.org/entities/${sourceFile}/#${anchor}`,
          description: 'Official Mastodon API documentation',
        };
      }
    }

    // Check if this is a known sub-entity (for backward compatibility)
    const subEntity = subEntityMap[entityName];
    if (subEntity) {
      return {
        url: `https://docs.joinmastodon.org/entities/${subEntity.parent}/#${subEntity.anchor}`,
        description: 'Official Mastodon API documentation',
      };
    }

    // For main entities with source file information, use the source file name with #attributes
    if (sourceFile) {
      return {
        url: `https://docs.joinmastodon.org/entities/${sourceFile}/#attributes`,
        description: 'Official Mastodon API documentation',
      };
    }

    // Fallback: use entity name with :: replaced by _ and #attributes for primary entities
    const urlEntityName = entityName.replace(/::/g, '_');
    return {
      url: `https://docs.joinmastodon.org/entities/${urlEntityName}/#attributes`,
      description: 'Official Mastodon API documentation',
    };
  }
}

export { EntityConverter };
