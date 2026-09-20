import { EntityClass } from '../interfaces/EntityClass';
import { EntityAttribute } from '../interfaces/EntityAttribute';
import {
  OpenAPIProperty,
  OpenAPISchema,
  OpenAPISpec,
} from '../interfaces/OpenAPISchema';
import { TypeParser } from './TypeParser';
import { UtilityHelpers } from './UtilityHelpers';
import { SchemaSorting } from './SchemaSorting';
import { NestedAttributeBuilder } from './NestedAttributeBuilder';
import { parentEntityOf } from '../overrides/overrides';

/**
 * Converter for transforming entity classes to OpenAPI schemas
 */
class EntityConverter {
  private typeParser: TypeParser;
  private utilityHelpers: UtilityHelpers;
  private schemaSorting: SchemaSorting;
  private nestedAttributes: NestedAttributeBuilder;

  constructor(typeParser: TypeParser, utilityHelpers: UtilityHelpers) {
    this.typeParser = typeParser;
    this.utilityHelpers = utilityHelpers;
    this.schemaSorting = new SchemaSorting();
    this.nestedAttributes = new NestedAttributeBuilder((attribute) =>
      this.convertAttribute(attribute)
    );
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

      // Entities documented as extensions of another entity list only their extras
      const parentName = parentEntityOf(entity.name);
      if (parentName) {
        const parent = entities.find((e) => e.name === parentName);
        if (parent) {
          allAttributes = [...parent.attributes, ...entity.attributes];
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
      this.nestedAttributes.build(allAttributes, schema);

      // Sort properties by required first, then alphabetically
      this.schemaSorting.sortSchemaProperties(schema);

      // Remove empty required array
      if (schema.required && schema.required.length === 0) {
        delete schema.required;
      }

      const sanitizedName = this.utilityHelpers.sanitizeSchemaName(entity.name);
      entitySchemas.set(sanitizedName, schema);
    }

    // Add all schemas to the spec
    for (const [name, schema] of entitySchemas) {
      if (spec.components?.schemas) {
        spec.components.schemas[name] = schema;
      }
    }
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
        // A type that is already `null` needs no widening
        if (property.type !== 'null') {
          property.type = [property.type, 'null'];
        }
        // Preserve format property for nullable fields
        // Note: format should still apply to the non-null value
      }
    }

    return property;
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
