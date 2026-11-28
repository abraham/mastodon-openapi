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

  test('should parse stream event definitions and per-method event lists', () => {
    const methodFiles = methodParser.parseAllMethods();
    const streamingMethodFile = methodFiles.find((f) => f.name === 'streaming');

    expect(streamingMethodFile?.streamEvents).toBeDefined();
    const byName = new Map(
      streamingMethodFile!.streamEvents!.map((e) => [e.name, e])
    );
    expect(byName.get('update')?.payload).toEqual({
      kind: 'entity',
      entityName: 'Status',
    });
    expect(byName.get('delete')?.payload).toEqual({ kind: 'string' });
    expect(byName.get('announcement.reaction')?.payload).toEqual({
      kind: 'object',
    });
    expect(byName.get('filters_changed')?.payload).toEqual({ kind: 'empty' });

    const userMethod = streamingMethodFile!.methods.find(
      (m) => m.endpoint === '/api/v1/streaming/user'
    );
    expect(userMethod?.streamEvents).toEqual([
      'update',
      'delete',
      'notification',
      'filters_changed',
      'announcement',
      'announcement.reaction',
      'announcement.delete',
      'status.update',
    ]);

    const directMethod = streamingMethodFile!.methods.find(
      (m) => m.endpoint === '/api/v1/streaming/direct'
    );
    expect(directMethod?.streamEvents).toEqual(['conversation']);

    const healthMethod = streamingMethodFile!.methods.find(
      (m) => m.endpoint === '/api/v1/streaming/health'
    );
    expect(healthMethod?.streamEvents).toBeUndefined();
  });
});
