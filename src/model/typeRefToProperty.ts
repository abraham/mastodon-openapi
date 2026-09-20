import { OpenAPIProperty } from '../interfaces/OpenAPISchema';
import { UtilityHelpers } from '../generators/UtilityHelpers';
import { TypeRef } from './TypeRef';

/** Render a resolved type as an OpenAPI property. */
export function typeRefToProperty(
  ref: TypeRef,
  utilityHelpers: UtilityHelpers
): OpenAPIProperty {
  switch (ref.kind) {
    case 'array':
      return ref.items
        ? { type: 'array', items: typeRefToProperty(ref.items, utilityHelpers) }
        : { type: 'array' };

    case 'entity':
      return {
        $ref: `#/components/schemas/${utilityHelpers.sanitizeSchemaName(ref.name)}`,
      };

    case 'union':
      return {
        oneOf: ref.options.map((option) =>
          typeRefToProperty(option, utilityHelpers)
        ),
      };

    case 'primitive': {
      const property: OpenAPIProperty = { type: ref.type };
      if (ref.format) {
        property.format = ref.format;
      }
      if (ref.html) {
        property.description = ' (HTML content)';
      }
      return property;
    }

    case 'enumerable':
      return {
        type: 'string',
        description: ref.labelled ? 'Enumerable value' : '',
      };

    case 'unknown':
      return { type: 'string', description: `Original type: ${ref.raw}` };
  }
}
