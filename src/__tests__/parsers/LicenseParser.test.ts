import { LicenseParser } from '../../parsers/LicenseParser';

describe('LicenseParser', () => {
  let parser: LicenseParser;

  beforeEach(() => {
    parser = new LicenseParser();
  });

  describe('parseLicense', () => {
    it('should parse MIT license from LICENSE file', () => {
      const license = parser.parseLicense();

      expect(license).toBeDefined();
      expect(license?.name).toBe('MIT');
      expect(license?.identifier).toBe('MIT');
    });

    it('should return license information when LICENSE file exists', () => {
      const license = parser.parseLicense();

      expect(license).not.toBeUndefined();
      expect(license?.name).toBeTruthy();
    });
  });

  describe('extractLicenseFromContent', () => {
    it('should extract MIT license from content', () => {
      // Access the private method for testing using any type
      const extractMethod = (parser as any).extractLicenseFromContent.bind(
        parser
      );
      const content = 'MIT License\n\nCopyright (c) 2025 abraham';

      const license = extractMethod(content);

      expect(license).toBeDefined();
      expect(license.name).toBe('MIT');
      expect(license.identifier).toBe('MIT');
    });

    it('should extract Apache license from content', () => {
      const extractMethod = (parser as any).extractLicenseFromContent.bind(
        parser
      );
      const content = 'Apache License\nVersion 2.0, January 2004';

      const license = extractMethod(content);

      expect(license).toBeDefined();
      expect(license.name).toBe('Apache 2.0');
      expect(license.identifier).toBe('Apache-2.0');
    });

    it('should handle unknown license types', () => {
      const extractMethod = (parser as any).extractLicenseFromContent.bind(
        parser
      );
      const content = 'Custom License\nSome custom terms';

      const license = extractMethod(content);

      expect(license).toBeDefined();
      expect(license.name).toBe('Custom License');
      expect(license.identifier).toBeUndefined();
    });

    it('should return undefined for empty content', () => {
      const extractMethod = (parser as any).extractLicenseFromContent.bind(
        parser
      );
      const content = '';

      const license = extractMethod(content);

      expect(license).toBeUndefined();
    });
  });
});
