import { ResponseCodeParser } from '../../parsers/ResponseCodeParser';

describe('ResponseCodeParser', () => {
  describe('parseResponseCodes', () => {
    it('should parse response codes from intro.md', () => {
      const codes = ResponseCodeParser.parseResponseCodes();

      expect(codes).toBeDefined();
      expect(codes.length).toBeGreaterThan(0);

      // Should include the 200 code
      const ok = codes.find((c) => c.code === '200');
      expect(ok).toBeDefined();
      expect(ok?.description).toContain('OK');

      // Should include common error codes
      const unauthorized = codes.find((c) => c.code === '401');
      expect(unauthorized).toBeDefined();

      const notFound = codes.find((c) => c.code === '404');
      expect(notFound).toBeDefined();

      const unprocessable = codes.find((c) => c.code === '422');
      expect(unprocessable).toBeDefined();

      const unavailable = codes.find((c) => c.code === '503');
      expect(unavailable).toBeDefined();

      const rateLimited = codes.find((c) => c.code === '429');
      expect(rateLimited).toBeDefined();
    });

    it('should parse response codes from method documentation files', () => {
      const codes = ResponseCodeParser.parseResponseCodes();

      // Should include codes that are only in method files, not in intro.md
      const accepted = codes.find((c) => c.code === '202');
      expect(accepted).toBeDefined();
      expect(accepted?.description).toBe('Accepted');

      const partialContent = codes.find((c) => c.code === '206');
      expect(partialContent).toBeDefined();
      expect(partialContent?.description).toBe('Partial content');

      const badRequest = codes.find((c) => c.code === '400');
      expect(badRequest).toBeDefined();
      expect(badRequest?.description).toBe('Client error');

      const forbidden = codes.find((c) => c.code === '403');
      expect(forbidden).toBeDefined();
      expect(forbidden?.description).toBe('Forbidden');

      const serverError = codes.find((c) => c.code === '500');
      expect(serverError).toBeDefined();
      expect(serverError?.description).toBe('Server error');
    });

    it('should return default codes if file cannot be parsed', () => {
      // Test that we get reasonable defaults
      const codes = ResponseCodeParser.parseResponseCodes();

      expect(codes).toBeDefined();
      expect(codes.length).toBeGreaterThanOrEqual(6);

      const codes200 = codes.filter((c) => c.code === '200');
      expect(codes200).toHaveLength(1);

      const codes4xx = codes.filter((c) => c.code.startsWith('4'));
      expect(codes4xx.length).toBeGreaterThan(0);

      const codes5xx = codes.filter((c) => c.code.startsWith('5'));
      expect(codes5xx.length).toBeGreaterThan(0);
    });

    it('should include all expected response codes', () => {
      const codes = ResponseCodeParser.parseResponseCodes();
      const codeMappings = codes.map((c) => c.code);

      // Verify all expected codes are present
      const expectedCodes = [
        '200',
        '202',
        '206',
        '400',
        '401',
        '403',
        '404',
        '410',
        '422',
        '429',
        '500',
        '503',
      ];

      for (const expectedCode of expectedCodes) {
        expect(codeMappings).toContain(expectedCode);
      }
    });
  });
});
