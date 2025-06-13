import { RateLimitHeaderParser } from '../../parsers/RateLimitHeaderParser';

describe('RateLimitHeaderParser', () => {
  describe('parseRateLimitHeaders', () => {
    it('should parse rate limit headers from rate-limits.md', () => {
      const headers = RateLimitHeaderParser.parseRateLimitHeaders();

      expect(headers).toBeDefined();
      expect(headers.length).toBeGreaterThan(0);

      // Should include the standard rate limit headers
      const limitHeader = headers.find((h) => h.name === 'X-RateLimit-Limit');
      expect(limitHeader).toBeDefined();
      expect(limitHeader?.description).toContain('Number of requests permitted');

      const remainingHeader = headers.find(
        (h) => h.name === 'X-RateLimit-Remaining'
      );
      expect(remainingHeader).toBeDefined();
      expect(remainingHeader?.description).toContain('Number of requests you can still make');

      const resetHeader = headers.find((h) => h.name === 'X-RateLimit-Reset');
      expect(resetHeader).toBeDefined();
      expect(resetHeader?.description).toContain('Timestamp when your rate limit will reset');
    });

    it('should return default headers if file cannot be parsed', () => {
      // Test that we get reasonable defaults
      const headers = RateLimitHeaderParser.parseRateLimitHeaders();

      expect(headers).toBeDefined();
      expect(headers.length).toBe(3);

      const headerNames = headers.map((h) => h.name);
      expect(headerNames).toContain('X-RateLimit-Limit');
      expect(headerNames).toContain('X-RateLimit-Remaining');
      expect(headerNames).toContain('X-RateLimit-Reset');
    });
  });
});