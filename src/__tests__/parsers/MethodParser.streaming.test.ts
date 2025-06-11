import { MethodParser } from '../../parsers/MethodParser';

describe('MethodParser - Streaming endpoints', () => {
  let methodParser: MethodParser;

  beforeEach(() => {
    methodParser = new MethodParser();
  });

  test('should identify streaming endpoints correctly', () => {
    const methodFiles = methodParser.parseAllMethods();

    // Find the streaming methods file
    const streamingMethodFile = methodFiles.find((f) => f.name === 'streaming');
    expect(streamingMethodFile).toBeDefined();

    if (streamingMethodFile) {
      // Health endpoint should NOT be marked as streaming
      const healthMethod = streamingMethodFile.methods.find(
        (method) => method.endpoint === '/api/v1/streaming/health'
      );
      expect(healthMethod).toBeDefined();
      expect(healthMethod?.isStreaming).toBeUndefined();

      // User streaming endpoint should be marked as streaming
      const userStreamingMethod = streamingMethodFile.methods.find(
        (method) => method.endpoint === '/api/v1/streaming/user'
      );
      expect(userStreamingMethod).toBeDefined();
      expect(userStreamingMethod?.isStreaming).toBe(true);

      // Public streaming endpoint should be marked as streaming
      const publicStreamingMethod = streamingMethodFile.methods.find(
        (method) => method.endpoint === '/api/v1/streaming/public'
      );
      expect(publicStreamingMethod).toBeDefined();
      expect(publicStreamingMethod?.isStreaming).toBe(true);

      // Count all streaming endpoints (should be all except health)
      const streamingMethods = streamingMethodFile.methods.filter(
        (method) => method.isStreaming === true
      );

      // We expect 9 streaming methods (all except health)
      // user, user/notification, public, public/local, public/remote, hashtag, hashtag/local, list, direct
      expect(streamingMethods.length).toBe(9);
    }
  });

  test('should preserve returns field for streaming endpoints', () => {
    const methodFiles = methodParser.parseAllMethods();
    const streamingMethodFile = methodFiles.find((f) => f.name === 'streaming');

    if (streamingMethodFile) {
      const userStreamingMethod = streamingMethodFile.methods.find(
        (method) => method.endpoint === '/api/v1/streaming/user'
      );

      expect(userStreamingMethod?.returns).toBeDefined();
      expect(userStreamingMethod?.returns).toContain('update');
      expect(userStreamingMethod?.returns).toContain('delete');
      expect(userStreamingMethod?.returns).toContain('notification');
    }
  });
});
