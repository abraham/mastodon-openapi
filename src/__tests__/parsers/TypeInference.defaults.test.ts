import { TypeInference } from '../../parsers/TypeInference';

describe('TypeInference Default Value Extraction', () => {
  describe('extractDefaultValueFromDescription', () => {
    it('should extract default value from "Defaults to X" pattern', () => {
      const description =
        'String. One of followed, list, or none. Defaults to list.';
      const defaultValue =
        TypeInference.extractDefaultValueFromDescription(description);
      expect(defaultValue).toBe('list');
    });

    it('should extract default value from "Default to X" pattern', () => {
      const description = 'String. Some parameter. Default to public.';
      const defaultValue =
        TypeInference.extractDefaultValueFromDescription(description);
      expect(defaultValue).toBe('public');
    });

    it('should handle mixed case default pattern', () => {
      const description = 'String. DEFAULTS TO private.';
      const defaultValue =
        TypeInference.extractDefaultValueFromDescription(description);
      expect(defaultValue).toBe('private');
    });

    it('should return undefined when no default pattern is found', () => {
      const description = 'String. One of followed, list, or none.';
      const defaultValue =
        TypeInference.extractDefaultValueFromDescription(description);
      expect(defaultValue).toBeUndefined();
    });

    it('should handle underscore values', () => {
      const description = 'String. Defaults to admin_sign_up.';
      const defaultValue =
        TypeInference.extractDefaultValueFromDescription(description);
      expect(defaultValue).toBe('admin_sign_up');
    });

    it('should handle values with backticks', () => {
      const description =
        'String. One of `followed`, `list`, or `none`. Defaults to `list`.';
      const defaultValue =
        TypeInference.extractDefaultValueFromDescription(description);
      expect(defaultValue).toBe('list');
    });

    it('should handle numeric values', () => {
      const description = 'Integer. Defaults to 20.';
      const defaultValue =
        TypeInference.extractDefaultValueFromDescription(description);
      expect(defaultValue).toBe('20');
    });

    it('should return undefined for invalid default patterns', () => {
      const description = 'String. Something defaults to.';
      const defaultValue =
        TypeInference.extractDefaultValueFromDescription(description);
      expect(defaultValue).toBeUndefined();
    });

    it('should not match descriptive phrases as default values', () => {
      const description =
        "The status content will be translated into this language. Defaults to the user's current locale.";
      const defaultValue =
        TypeInference.extractDefaultValueFromDescription(description);
      expect(defaultValue).toBeUndefined();
    });

    it('should handle numbers in middle of descriptive phrases', () => {
      const description =
        'Some parameter. Defaults to 20 statuses or 40 accounts.';
      const defaultValue =
        TypeInference.extractDefaultValueFromDescription(description);
      expect(defaultValue).toBe('20');
    });

    it('should handle words that are followed by periods', () => {
      const description = 'Some parameter. Defaults to value.';
      const defaultValue =
        TypeInference.extractDefaultValueFromDescription(description);
      expect(defaultValue).toBe('value');
    });
  });
});
