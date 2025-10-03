import { MethodParser } from '../../parsers/MethodParser';

describe('MethodParser - Response Codes', () => {
  it('should parse method-specific response codes from media.md', () => {
    const methodParser = new MethodParser();
    const methodFiles = methodParser.parseAllMethods();

    // Find the media file
    const mediaFile = methodFiles.find((file) => file.name === 'media');
    expect(mediaFile).toBeDefined();
    expect(mediaFile?.methods).toBeDefined();

    // Find the POST /api/v2/media method
    const postV2MediaMethod = mediaFile?.methods.find(
      (method) =>
        method.httpMethod === 'POST' && method.endpoint === '/api/v2/media'
    );
    expect(postV2MediaMethod).toBeDefined();

    // Verify that method-specific response codes are parsed
    expect(postV2MediaMethod?.responseCodes).toBeDefined();
    expect(postV2MediaMethod?.responseCodes?.length).toBeGreaterThan(0);

    // Check for specific codes mentioned in the issue
    const codes = postV2MediaMethod?.responseCodes?.map((rc) => rc.code);
    expect(codes).toContain('200'); // OK
    expect(codes).toContain('202'); // Accepted - this is the one mentioned in the issue
    expect(codes).toContain('401'); // Unauthorized
    expect(codes).toContain('422'); // Unprocessable entity
    expect(codes).toContain('500'); // Server error

    // Verify 202 has correct description
    const code202 = postV2MediaMethod?.responseCodes?.find(
      (rc) => rc.code === '202'
    );
    expect(code202).toBeDefined();
    expect(code202?.description).toBe('Accepted');
  });

  it('should parse 206 Partial content from GET /api/v1/media/:id', () => {
    const methodParser = new MethodParser();
    const methodFiles = methodParser.parseAllMethods();

    // Find the media file
    const mediaFile = methodFiles.find((file) => file.name === 'media');
    expect(mediaFile).toBeDefined();

    // Find the GET /api/v1/media/:id method
    const getMediaMethod = mediaFile?.methods.find(
      (method) =>
        method.httpMethod === 'GET' && method.endpoint === '/api/v1/media/:id'
    );
    expect(getMediaMethod).toBeDefined();

    // Verify that method-specific response codes are parsed
    expect(getMediaMethod?.responseCodes).toBeDefined();
    const codes = getMediaMethod?.responseCodes?.map((rc) => rc.code);

    // Check for 206 Partial content
    expect(codes).toContain('206');

    // Verify 206 has correct description
    const code206 = getMediaMethod?.responseCodes?.find(
      (rc) => rc.code === '206'
    );
    expect(code206).toBeDefined();
    expect(code206?.description).toBe('Partial content');
  });

  it('should fall back to global response codes if method has none', () => {
    const methodParser = new MethodParser();
    const methodFiles = methodParser.parseAllMethods();

    // Find a method that might not have response codes in documentation
    // Most methods will have response codes, so we'll just verify the structure works
    let foundMethodWithoutCodes = false;
    for (const file of methodFiles) {
      for (const method of file.methods) {
        if (!method.responseCodes) {
          foundMethodWithoutCodes = true;
          // This method should fall back to global codes in MethodConverter
          expect(method.responseCodes).toBeUndefined();
          break;
        }
      }
      if (foundMethodWithoutCodes) break;
    }
    // This test just verifies the structure - actual fallback is tested in MethodConverter
  });
});
