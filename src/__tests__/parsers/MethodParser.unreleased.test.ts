import { MethodParser } from '../../parsers/MethodParser';
import { SUPPORTED_VERSION } from '../../parsers/VersionParser';

describe('MethodParser - Unreleased Methods', () => {
  let methodParser: MethodParser;

  beforeEach(() => {
    methodParser = new MethodParser();
  });

  test('should mark methods with newer versions as unreleased', () => {
    // Create a version that's newer than the supported version
    const newerVersion = '5.0.0'; // Assuming SUPPORTED_VERSION is 4.3.0

    const mockSection = `## Future method {#future}

\`\`\`http
GET /api/v1/test/future HTTP/1.1
\`\`\`

A method with newer version.

**Returns:** String\\
**OAuth:** Public\\
**Version history:**\\
${newerVersion} - added
`;

    // Use reflection to access private method for testing
    const parseMethodSection = (methodParser as any).parseMethodSection.bind(
      methodParser
    );
    const result = parseMethodSection(mockSection);

    // Should successfully parse this method and mark it as unreleased
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Future method');
    expect(result?.httpMethod).toBe('GET');
    expect(result?.endpoint).toBe('/api/v1/test/future');
    expect(result?.unreleased).toBe(true);
    expect(result?.versions).toContain(newerVersion);
  });

  test('should not mark methods with supported versions as unreleased', () => {
    const mockSection = `## Current method {#current}

\`\`\`http
GET /api/v1/test/current HTTP/1.1
\`\`\`

A method with current version.

**Returns:** String\\
**OAuth:** Public\\
**Version history:**\\
${SUPPORTED_VERSION} - added
`;

    // Use reflection to access private method for testing
    const parseMethodSection = (methodParser as any).parseMethodSection.bind(
      methodParser
    );
    const result = parseMethodSection(mockSection);

    // Should successfully parse this method without unreleased flag
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Current method');
    expect(result?.httpMethod).toBe('GET');
    expect(result?.endpoint).toBe('/api/v1/test/current');
    expect(result?.unreleased).toBeUndefined();
    expect(result?.versions).toContain(SUPPORTED_VERSION);
  });

  test('should not mark methods with older versions as unreleased', () => {
    const mockSection = `## Old method {#old}

\`\`\`http
GET /api/v1/test/old HTTP/1.1
\`\`\`

A method with older version.

**Returns:** String\\
**OAuth:** Public\\
**Version history:**\\
2.0.0 - added
`;

    // Use reflection to access private method for testing
    const parseMethodSection = (methodParser as any).parseMethodSection.bind(
      methodParser
    );
    const result = parseMethodSection(mockSection);

    // Should successfully parse this method without unreleased flag
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Old method');
    expect(result?.httpMethod).toBe('GET');
    expect(result?.endpoint).toBe('/api/v1/test/old');
    expect(result?.unreleased).toBeUndefined();
    expect(result?.versions).toContain('2.0.0');
  });

  test('should mark methods with mixed versions as unreleased if any version is newer', () => {
    const newerVersion = '5.0.0';
    const mockSection = `## Mixed version method {#mixed}

\`\`\`http
GET /api/v1/test/mixed HTTP/1.1
\`\`\`

A method with mixed versions.

**Returns:** String\\
**OAuth:** Public\\
**Version history:**\\
2.0.0 - added\\
${SUPPORTED_VERSION} - updated\\
${newerVersion} - enhanced
`;

    // Use reflection to access private method for testing
    const parseMethodSection = (methodParser as any).parseMethodSection.bind(
      methodParser
    );
    const result = parseMethodSection(mockSection);

    // Should successfully parse this method and mark it as unreleased due to the newer version
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Mixed version method');
    expect(result?.httpMethod).toBe('GET');
    expect(result?.endpoint).toBe('/api/v1/test/mixed');
    expect(result?.unreleased).toBe(true);
    expect(result?.versions).toContain('2.0.0');
    expect(result?.versions).toContain(SUPPORTED_VERSION);
    expect(result?.versions).toContain(newerVersion);
  });

  test('should handle methods with both deprecated and unreleased flags', () => {
    const newerVersion = '5.0.0';
    const mockSection = `## Deprecated future method {{%deprecated%}} {#dep-future}

\`\`\`http
GET /api/v1/test/dep-future HTTP/1.1
\`\`\`

A method that is both deprecated and has newer versions.

**Returns:** String\\
**OAuth:** Public\\
**Version history:**\\
2.0.0 - added\\
${newerVersion} - enhanced but deprecated
`;

    // Use reflection to access private method for testing
    const parseMethodSection = (methodParser as any).parseMethodSection.bind(
      methodParser
    );
    const result = parseMethodSection(mockSection);

    // Should successfully parse this method and mark it as both deprecated and unreleased
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Deprecated future method');
    expect(result?.httpMethod).toBe('GET');
    expect(result?.endpoint).toBe('/api/v1/test/dep-future');
    expect(result?.deprecated).toBe(true);
    expect(result?.unreleased).toBe(true);
    expect(result?.versions).toContain('2.0.0');
    expect(result?.versions).toContain(newerVersion);
  });

  test('should not mark methods without version history as unreleased', () => {
    const mockSection = `## No version method {#no-version}

\`\`\`http
GET /api/v1/test/no-version HTTP/1.1
\`\`\`

A method without version history.

**Returns:** String\\
**OAuth:** Public
`;

    // Use reflection to access private method for testing
    const parseMethodSection = (methodParser as any).parseMethodSection.bind(
      methodParser
    );
    const result = parseMethodSection(mockSection);

    // Should successfully parse this method without unreleased flag
    expect(result).not.toBeNull();
    expect(result?.name).toBe('No version method');
    expect(result?.httpMethod).toBe('GET');
    expect(result?.endpoint).toBe('/api/v1/test/no-version');
    expect(result?.unreleased).toBeUndefined();
    expect(result?.versions).toBeUndefined();
  });
});
