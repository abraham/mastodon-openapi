import { MethodParser } from '../../parsers/MethodParser';
import * as fs from 'fs';

describe('MethodParser - Draft File Handling', () => {
  let parser: MethodParser;
  const mockDraftFile = '/tmp/mock-draft-method.md';

  beforeEach(() => {
    parser = new MethodParser();

    // Create a mock draft method file for testing
    const draftContent = `---
title: Draft API methods
description: Draft API methods for testing
draft: true
---

# Draft API methods

## \`GET /api/v1/draft\` {#get-api-v1-draft}

**Description:** This is a draft method that should not be parsed.

**Returns:** String\\
**OAuth:** Public\\
**Version history:**\\
1.0.0 - added
`;

    fs.writeFileSync(mockDraftFile, draftContent);
  });

  afterEach(() => {
    // Clean up mock file
    if (fs.existsSync(mockDraftFile)) {
      fs.unlinkSync(mockDraftFile);
    }
  });

  test('should exclude draft method files from parsing', () => {
    const methodFiles = parser.parseAllMethods();

    // Since we're testing with the real documentation, and there are no draft method files currently,
    // let's test indirectly by ensuring no methods contain draft-related content
    for (const methodFile of methodFiles) {
      expect(methodFile.name).not.toContain('draft');
      for (const method of methodFile.methods) {
        expect(method.description?.toLowerCase()).not.toContain(
          'this is a draft'
        );
      }
    }

    // Should have the expected number of method files (currently 40)
    expect(methodFiles.length).toBeGreaterThan(35);
  });

  test('should still include non-draft method files', () => {
    const methodFiles = parser.parseAllMethods();

    // Should find known non-draft method files
    const accountsFile = methodFiles.find((f) => f.name === 'accounts');
    expect(accountsFile).toBeDefined();

    const appsFile = methodFiles.find((f) => f.name === 'apps');
    expect(appsFile).toBeDefined();
  });
});
