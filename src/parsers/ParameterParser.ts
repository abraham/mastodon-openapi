import { ApiParameter, ApiProperty } from '../interfaces/ApiParameter';
import { TextUtils } from './TextUtils';
import { TypeInference } from './TypeInference';
import { EntityParsingUtils } from './EntityParsingUtils';
import { OAuthScopeParser } from './OAuthScopeParser';
import { MarkdownDocument } from '../document/MarkdownDocument';
import { stripHtmlComments } from '../document/blocks';
import { parseDefinitionList } from '../document/definitionList';
import { processComplexParameters } from './ComplexParameters';

/** Terms shaped like `alerts[admin.sign_up]` or `Idempotency-Key`. */
const PARAMETER_NAME = /^[a-zA-Z_][a-zA-Z0-9_.:[\]-]*$/;

/**
 * Parsed parameter structure for nested objects
 */
export interface ParsedParameter {
  rootName: string;
  path: string[];
  isArray: boolean;
  description: string;
  originalDescription?: string;
  required?: boolean;
  enumValues?: string[];
}

/**
 * Handles parsing of API parameters from method documentation
 */
export class ParameterParser {
  /**
   * Extract notification types from "Types to filter include" section
   */
  static extractNotificationTypes(section: string): string[] {
    const typesSection = section.match(
      /Types to filter include:([\s\S]*?)(?=\n#{1,5}\s|\n\*\*Returns|\n\*\*OAuth|$)/i
    );

    if (!typesSection) return [];

    const types: string[] = [];
    const typePattern = /^\s*-\s*`([^`]+)`/gm;
    let match;

    while ((match = typePattern.exec(typesSection[1])) !== null) {
      const type = match[1].trim();
      if (type && !types.includes(type)) {
        types.push(type);
      }
    }

    return types;
  }

  /**
   * Parse all parameters from a method section
   */
  static parseAllParameters(section: string): ApiParameter[] {
    const parameters: ApiParameter[] = [];

    // Parse query parameters
    const queryParams = ParameterParser.parseParametersByType(
      section,
      'Query parameters',
      'query'
    );
    parameters.push(...queryParams);

    // Parse form data parameters
    const formParams = ParameterParser.parseParametersByType(
      section,
      'Form data parameters',
      'formData'
    );
    parameters.push(...formParams);

    // Parse header parameters, excluding Authorization headers (handled by OAuth)
    const headerParams = ParameterParser.parseParametersByType(
      section,
      'Headers',
      'header'
    ).filter((param) => param.name !== 'Authorization');
    parameters.push(...headerParams);

    // Apply special handling for notification type parameters
    const notificationTypes = ParameterParser.extractNotificationTypes(section);
    if (notificationTypes.length > 0) {
      for (const param of parameters) {
        if (
          (param.name === 'grouped_types' ||
            param.name === 'types' ||
            param.name === 'exclude_types') &&
          param.schema?.type === 'array'
        ) {
          // Apply notification types as enum values to array items
          if (param.schema.items && !param.schema.items.enum) {
            param.schema.items.enum = notificationTypes;
            param.enumValues = notificationTypes;
          }
        }
      }
    }

    // Apply special handling for OAuth scope parameters
    for (const param of parameters) {
      if (param.name === 'scopes' && param.schema?.type === 'string') {
        // Parse OAuth scopes and apply as enum values for the scopes parameter
        const oauthParser = new OAuthScopeParser();
        const oauthScopes = oauthParser.parseOAuthScopes();
        const scopeNames = oauthScopes.scopes.map((scope) => scope.name);

        if (scopeNames.length > 0) {
          param.schema.enum = scopeNames;
          param.enumValues = scopeNames;
        }
      }
    }

    return parameters;
  }

  /**
   * Parse a parameter name with nested brackets into a structured format
   * Examples:
   * - "subscription[keys][auth]" -> { rootName: "subscription", path: ["keys", "auth"], isArray: false }
   * - "data[alerts][mention]" -> { rootName: "data", path: ["alerts", "mention"], isArray: false }
   * - "poll[options][]" -> { rootName: "poll", path: ["options"], isArray: true }
   */
  static parseNestedParameter(name: string): ParsedParameter | null {
    // Check if it contains brackets
    if (!name.includes('[')) {
      return null;
    }

    // Parse the bracket structure
    const match = name.match(/^([a-zA-Z_][a-zA-Z0-9_]*)((\[.*?\])+)$/);
    if (!match) {
      return null;
    }

    const rootName = match[1];
    const bracketsPart = match[2];

    // Extract all bracket contents
    const bracketMatches = bracketsPart.match(/\[([^\]]*)\]/g);
    if (!bracketMatches) {
      return null;
    }

    const path: string[] = [];
    let isArray = false;

    for (const bracket of bracketMatches) {
      const content = bracket.slice(1, -1); // Remove [ and ]
      if (content === '') {
        // Empty brackets indicate array
        isArray = true;
      } else {
        path.push(content);
      }
    }

    return {
      rootName,
      path,
      isArray,
      description: '',
      required: undefined,
      enumValues: undefined,
    };
  }

  /**
   * Build nested object structure from parsed parameters
   */
  static buildNestedObject(
    parameters: Array<
      ParsedParameter & {
        description: string;
        inferredType?: string;
        required?: boolean;
        enumValues?: string[];
      }
    >
  ): ApiProperty {
    const root: ApiProperty = { type: 'object', properties: {} };

    for (const param of parameters) {
      let node = root;

      // Navigate through the path, creating nested objects as needed
      for (let i = 0; i < param.path.length - 1; i++) {
        node = ParameterParser.descendInto(node, param.path[i]);
      }

      const finalSegment = param.path[param.path.length - 1];
      const propType =
        param.inferredType ||
        TypeInference.inferTypeFromDescription(param.description);
      const enumValues = TypeInference.extractEnumValuesFromDescription(
        param.description
      );

      const property: ApiProperty = {
        type: propType,
        description: EntityParsingUtils.stripTypePrefix(param.description),
      };

      if (enumValues.length > 0) {
        property.enum = enumValues;
      }

      ParameterParser.assignInto(
        node,
        finalSegment,
        param.isArray
          ? {
              type: 'array',
              items: property,
              description: EntityParsingUtils.stripTypePrefix(
                param.description
              ),
            }
          : property
      );
    }

    return root;
  }

  /**
   * A `:name` path segment is a placeholder for an arbitrary key rather than a
   * literal property, e.g. `fields_attributes[:index][name]`.
   */
  private static isPlaceholder(segment: string): boolean {
    return segment.startsWith(':');
  }

  private static descendInto(node: ApiProperty, segment: string): ApiProperty {
    if (ParameterParser.isPlaceholder(segment)) {
      node.additionalProperties ??= { type: 'object', properties: {} };
      return node.additionalProperties;
    }

    node.properties ??= {};
    node.properties[segment] ??= { type: 'object', properties: {} };
    return node.properties[segment];
  }

  private static assignInto(
    node: ApiProperty,
    segment: string,
    value: ApiProperty
  ): void {
    if (ParameterParser.isPlaceholder(segment)) {
      node.additionalProperties = value;
      return;
    }

    node.properties ??= {};
    node.properties[segment] = value;
  }

  /**
   * Parse parameters by type (query or form data)
   */
  static parseParametersByType(
    section: string,
    sectionName: string,
    parameterLocation: string
  ): ApiParameter[] {
    const rawParameters: Array<{
      name: string;
      description: string;
      originalDescription?: string;
      inferredType?: string;
      required?: boolean;
      enumValues?: string[];
    }> = [];

    // Find all parameter sections with the given name. Section bounds come from
    // the heading tree, so a section cannot swallow the ones after it.
    const paramSections = MarkdownDocument.fromBody(section)
      .allSections()
      .filter(
        (candidate) =>
          candidate.heading.level === 5 &&
          candidate.heading.title === sectionName
      );

    if (paramSections.length === 0) return [];

    // Process each matching section
    for (const paramSectionNode of paramSections) {
      // Commented-out parameters are documentation notes, not request fields
      const paramSection = stripHtmlComments(paramSectionNode.body);

      // Skip empty sections (sections that don't contain any parameter definitions)
      const hasParams = /^[a-zA-Z_][a-zA-Z0-9_.:\[\]-]*\s*\n:\s*/m.test(
        paramSection
      );
      if (!hasParams) continue;

      for (const entry of parseDefinitionList(paramSection)) {
        // Prose lines can also form a definition list; only terms shaped like a
        // parameter name are request fields.
        if (!PARAMETER_NAME.test(entry.term)) {
          continue;
        }

        const name = entry.term;
        const originalDesc = entry.definition;
        const required = originalDesc.includes('{{<required>}}');
        const cleanDesc = TextUtils.cleanMarkdown(originalDesc);

        // Extract enum values from description
        const enumValues =
          TypeInference.extractEnumValuesFromDescription(cleanDesc);

        // Extract default value from description
        const defaultValue =
          TypeInference.extractDefaultValueFromDescription(cleanDesc);

        // Infer type from original description before cleaning
        const inferredType =
          TypeInference.inferTypeFromDescription(originalDesc);

        const rawParam = {
          name: name.trim(),
          description: cleanDesc.replace(/\{\{<required>\}\}\s*/g, ''),
          originalDescription: originalDesc, // Store original for type inference
          inferredType: inferredType, // Store pre-computed type
          required: required ? true : undefined,
          enumValues: enumValues.length > 0 ? enumValues : undefined,
          defaultValue: defaultValue,
        };

        rawParameters.push(rawParam);
      }
    }

    // Process raw parameters to handle complex types
    return processComplexParameters(rawParameters, parameterLocation);
  }
}
