import { HeaderParser } from '../../parsers/HeaderParser';

describe('HeaderParser', () => {
  describe('parseHeaders', () => {
    it('should parse all headers from documentation', () => {
      const headers = HeaderParser.parseHeaders();

      // Should return 5 headers
      expect(headers).toHaveLength(5);

      // Check X-RateLimit-Limit
      const rateLimitLimit = headers.find(
        (h) => h.name === 'X-RateLimit-Limit'
      );
      expect(rateLimitLimit).toBeDefined();
      expect(rateLimitLimit?.description).toBe(
        'Number of requests permitted per time period'
      );
      expect(rateLimitLimit?.schema.type).toBe('integer');

      // Check X-RateLimit-Remaining
      const rateLimitRemaining = headers.find(
        (h) => h.name === 'X-RateLimit-Remaining'
      );
      expect(rateLimitRemaining).toBeDefined();
      expect(rateLimitRemaining?.description).toBe(
        'Number of requests you can still make'
      );
      expect(rateLimitRemaining?.schema.type).toBe('integer');

      // Check X-RateLimit-Reset
      const rateLimitReset = headers.find(
        (h) => h.name === 'X-RateLimit-Reset'
      );
      expect(rateLimitReset).toBeDefined();
      expect(rateLimitReset?.description).toContain('Timestamp');
      expect(rateLimitReset?.schema.type).toBe('string');
      expect(rateLimitReset?.schema.format).toBe('date-time');

      // Check Link header
      const link = headers.find((h) => h.name === 'Link');
      expect(link).toBeDefined();
      expect(link?.description).toContain('Pagination links');
      expect(link?.description).toContain('Format:');
      expect(link?.description).toContain('RFC 8288');
      expect(link?.schema.type).toBe('string');

      // Check Mastodon-Async-Refresh header
      const asyncRefresh = headers.find(
        (h) => h.name === 'Mastodon-Async-Refresh'
      );
      expect(asyncRefresh).toBeDefined();
      expect(asyncRefresh?.description).toContain('async refresh');
      expect(asyncRefresh?.description).toContain('Format:');
      expect(asyncRefresh?.description).toContain('retry');
      expect(asyncRefresh?.description).toContain('result_count');
      expect(asyncRefresh?.schema.type).toBe('string');
    });

    it('should parse rate limit headers correctly', () => {
      const headers = HeaderParser.parseHeaders();
      const rateLimitHeaders = headers.filter((h) =>
        h.name.startsWith('X-RateLimit-')
      );

      expect(rateLimitHeaders).toHaveLength(3);

      // All rate limit headers should have descriptions from the docs
      rateLimitHeaders.forEach((header) => {
        expect(header.description).toBeTruthy();
        expect(header.description.length).toBeGreaterThan(0);
        expect(header.schema).toBeDefined();
        expect(header.schema.type).toBeTruthy();
      });
    });

    it('should include example format in Link header description', () => {
      const headers = HeaderParser.parseHeaders();
      const linkHeader = headers.find((h) => h.name === 'Link');

      expect(linkHeader).toBeDefined();
      expect(linkHeader?.description).toContain('mastodon.example');
      expect(linkHeader?.description).toContain('max_id');
      expect(linkHeader?.description).toContain('min_id');
      expect(linkHeader?.description).toContain('rel="next"');
      expect(linkHeader?.description).toContain('rel="prev"');
    });

    it('should include format details in Mastodon-Async-Refresh description', () => {
      const headers = HeaderParser.parseHeaders();
      const asyncRefreshHeader = headers.find(
        (h) => h.name === 'Mastodon-Async-Refresh'
      );

      expect(asyncRefreshHeader).toBeDefined();
      expect(asyncRefreshHeader?.description).toContain('id=');
      expect(asyncRefreshHeader?.description).toContain('retry=');
      expect(asyncRefreshHeader?.description).toContain('result_count=');
      expect(asyncRefreshHeader?.description).toContain('<string>');
      expect(asyncRefreshHeader?.description).toContain('<int>');
    });
  });
});
