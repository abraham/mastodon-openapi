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
  });
});
