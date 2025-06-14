import { TypeInference } from '../../parsers/TypeInference';
import { ParameterParser } from '../../parsers/ParameterParser';

describe('Parameter and Type Inference Support', () => {
  describe('Enum value extraction from parameter descriptions', () => {
    it('should extract enum values from visibility parameter description', () => {
      // Test the visibility parameter description format from the statuses API
      const description =
        'String. Sets the visibility of the posted status to `public`, `unlisted`, `private`, `direct`.';

      const enumValues =
        TypeInference.extractEnumValuesFromDescription(description);

      expect(enumValues).toEqual(['public', 'unlisted', 'private', 'direct']);
    });

    it('should extract enum values from category parameter description', () => {
      const description =
        'String. The type of the report to create to `spam`, `legal`.';

      const enumValues =
        TypeInference.extractEnumValuesFromDescription(description);

      expect(enumValues).toEqual(['spam', 'legal']);
    });

    it('should handle single enum value cases appropriately', () => {
      const description =
        'String. Set equal to `authorization_code` if code is provided in order to gain user-level access.';

      const enumValues =
        TypeInference.extractEnumValuesFromDescription(description);

      // Single values should not be extracted as enums (they're typically example values)
      expect(enumValues).toEqual([]);
    });

    it('should not extract enum values from descriptions without backtick patterns', () => {
      const description =
        'String. Some regular description without any specific values mentioned.';

      const enumValues =
        TypeInference.extractEnumValuesFromDescription(description);

      expect(enumValues).toEqual([]);
    });

    it('should not extract enum values from single backtick values', () => {
      const description = 'String. Set this to `true` for some option.';

      const enumValues =
        TypeInference.extractEnumValuesFromDescription(description);

      expect(enumValues).toEqual([]);
    });

    it('should handle values with alternative pattern format', () => {
      const description =
        'String. Choose from `option1`, `option2`, `option3`.';

      const enumValues =
        TypeInference.extractEnumValuesFromDescription(description);

      expect(enumValues).toEqual(['option1', 'option2', 'option3']);
    });

    it('should extract enum values from "Can be" pattern', () => {
      const description =
        'String. Default post privacy for authored statuses. Can be `public`, `unlisted`, or `private`.';

      const enumValues =
        TypeInference.extractEnumValuesFromDescription(description);

      expect(enumValues).toEqual(['public', 'unlisted', 'private']);
    });

    it('should extract enum values from "Can be" pattern with "or" variations', () => {
      const description =
        'String. Some parameter. Can be `value1`, `value2`, or `value3`.';

      const enumValues =
        TypeInference.extractEnumValuesFromDescription(description);

      expect(enumValues).toEqual(['value1', 'value2', 'value3']);
    });

    it('should extract enum values from "One of" pattern without backticks', () => {
      const description =
        'String. One of followed, list, or none. Defaults to list.';

      const enumValues =
        TypeInference.extractEnumValuesFromDescription(description);

      expect(enumValues).toEqual(['followed', 'list', 'none']);
    });

    it('should extract enum values from "One of" pattern with different formats', () => {
      const description = 'String. One of public, unlisted, private, direct.';

      const enumValues =
        TypeInference.extractEnumValuesFromDescription(description);

      expect(enumValues).toEqual(['public', 'unlisted', 'private', 'direct']);
    });

    it('should extract enum values from "One of" pattern with backticks', () => {
      const description =
        'String. One of `followed`, `list`, or `none`. Defaults to `list`.';

      const enumValues =
        TypeInference.extractEnumValuesFromDescription(description);

      expect(enumValues).toEqual(['followed', 'list', 'none']);
    });

    it('should extract enum values from complex "due to" pattern with mixed formatting', () => {
      // Test the exact description from POST /api/v1/reports category parameter
      const description =
        'String. Specify if the report is due to `spam`, `legal` (illegal content), `violation` of enumerated instance rules, or some `other` reason. Defaults to `other`. Will be set to `violation` if `rule_ids[]` is provided (regardless of any category value you provide).';

      const enumValues =
        TypeInference.extractEnumValuesFromDescription(description);

      expect(enumValues).toEqual(['spam', 'legal', 'violation', 'other']);
    });

    it('should still handle normal "to" patterns correctly', () => {
      // Make sure we didn't break existing functionality
      const description =
        'String. Sets the visibility of the posted status to `public`, `unlisted`, `private`, `direct`.';

      const enumValues =
        TypeInference.extractEnumValuesFromDescription(description);

      expect(enumValues).toEqual(['public', 'unlisted', 'private', 'direct']);
    });
  });

  describe('Parameter parsing with enum values', () => {
    it('should parse parameters with enum values in method sections', () => {
      const mockSection = `
## Post a new status {#create}

\`\`\`http
POST /api/v1/statuses HTTP/1.1
\`\`\`

Publish a status with the given parameters.

##### Form data parameters

status
: String. The text content of the status.

visibility
: String. Sets the visibility of the posted status to \`public\`, \`unlisted\`, \`private\`, \`direct\`.

category
: String. Report category to \`spam\`, \`legal\`.
`;

      const parameters = ParameterParser.parseParametersByType(
        mockSection,
        'Form data parameters',
        'formData'
      );

      expect(parameters).toHaveLength(3);

      const visibilityParam = parameters.find(
        (p: any) => p.name === 'visibility'
      );
      expect(visibilityParam).toBeDefined();
      expect(visibilityParam!.enumValues).toEqual([
        'public',
        'unlisted',
        'private',
        'direct',
      ]);

      const categoryParam = parameters.find((p: any) => p.name === 'category');
      expect(categoryParam).toBeDefined();
      expect(categoryParam!.enumValues).toEqual(['spam', 'legal']);

      const statusParam = parameters.find((p: any) => p.name === 'status');
      expect(statusParam).toBeDefined();
      expect(statusParam!.enumValues).toBeUndefined();
    });
  });
});
