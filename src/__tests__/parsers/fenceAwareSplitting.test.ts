import { MethodParser } from '../../parsers/MethodParser';
import { Config } from '../../config';
import { InMemorySource } from '../../source/InMemorySource';
import { createPipelineContext } from '../../pipeline/PipelineContext';

jest.mock('../../parsers/VersionParser', () => ({
  SUPPORTED_VERSION: '4.4.0',
  MINIMUM_VERSION: '4.3.0',
  VersionParser: {
    extractVersionNumbers: jest.fn().mockReturnValue([]),
    compareVersions: jest.fn(),
    findMaxVersion: jest.fn(),
    hasNewerVersion: jest.fn().mockReturnValue(false),
    isOperationUnreleased: jest.fn().mockReturnValue(false),
  },
}));

const config: Config = {
  mastodonDocsCommit: 'abc123',
  mastodonSecurityCommit: 'def456',
  blockedFiles: [],
  overridesRepository: 'https://github.com/example/documentation',
  overrideCommits: [],
};

/**
 * A fenced sample whose content starts with `##` at column 0 used to split the
 * document: it truncated the preceding method before its Returns and OAuth
 * lines, and produced a phantom section from the sample's text.
 */
const docWithHeadingLikeSample = `---
title: widgets
---

## Create a widget {#create}

\`\`\`http
POST /api/v1/widgets HTTP/1.1
\`\`\`

Creates a widget. The rendered result looks like:

\`\`\`text
## Rendered heading
body text
\`\`\`

**Returns:** [Widget]\\
**OAuth:** User token + \`write:widgets\`

## Delete a widget {#delete}

\`\`\`http
DELETE /api/v1/widgets/:id HTTP/1.1
\`\`\`

Deletes a widget.

**Returns:** [Widget]\\
**OAuth:** User token + \`write:widgets\`
`;

describe('heading splits are fence aware', () => {
  const [file] = new MethodParser(
    createPipelineContext({
      config,
      source: new InMemorySource({
        method: { 'widgets.md': docWithHeadingLikeSample },
      }),
    })
  ).parseAllMethods();

  it('finds only the documented methods', () => {
    expect(file.methods.map((m) => m.name)).toEqual([
      'Create a widget',
      'Delete a widget',
    ]);
  });

  it('keeps fields that follow the sample attached to their method', () => {
    expect(file.methods[0].returns).toBe('[Widget]');
    expect(file.methods[0].oauth).toContain('write:widgets');
  });
});
