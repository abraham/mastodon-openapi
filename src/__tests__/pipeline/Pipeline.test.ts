import { Pipeline } from '../../pipeline/Pipeline';
import { createPipelineContext } from '../../pipeline/PipelineContext';
import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { InMemorySource } from '../../source/InMemorySource';
import { Config } from '../../config';

const config: Config = {
  mastodonDocsCommit: 'abc1234def5678',
  mastodonSecurityCommit: '0000000000000000000000000000000000000000',
  blockedFiles: ['methods/blocked.md'],
  overridesRepository: 'https://github.com/example/documentation',
  overrideCommits: [],
};

const guides = {
  'api/oauth-scopes.md': `---
title: OAuth Scopes
---

| Scope | Description |
| ----- | ----------- |
| \`read\` | Read everything |
| \`write\` | Write everything |
`,
  'api/rate-limits.md': `---
title: Rate limits
---

## Headers

\`X-RateLimit-Limit\`
: Number of requests permitted per time period

\`X-RateLimit-Remaining\`
: Number of requests you can still make

\`X-RateLimit-Reset\`
: Timestamp when your rate limit will reset
`,
  'api/guidelines.md': `---
title: Guidelines
---

Link: <https://mastodon.example/api/v1/endpoint?max_id=123>; rel="next", <https://mastodon.example/api/v1/endpoint?min_id=456>; rel="prev"
`,
  'methods/async_refreshes.md': `---
title: Async refreshes
---

Mastodon-Async-Refresh: id="<string>", retry=<int>, result_count=<int>
`,
  'client/intro.md': `---
title: Intro
---

## How to use API response data {#responses}

- 200 = OK. The request was handled successfully.
- 4xx = Client error. You may see 401 Unauthorized, 404 Not Found, or 422 Unprocessed.
`,
};

const securityPolicy = `## Supported Versions

| Version | Supported |
| ------- | --------- |
| 4.7.0   | Yes       |
| 4.4.x   | Yes       |
`;

const entityDoc = `---
title: Widget
description: A widget.
---

## Attributes

### \`id\` {#id}

**Description:** The widget id.\\
**Type:** String\\
**Version history:**\\
1.0.0 - added
`;

const methodDoc = `---
title: widgets
description: Widget methods.
---

## Get a widget {#get}

\`\`\`http
GET /api/v1/widgets/:id HTTP/1.1
\`\`\`

Fetch a widget.

**Returns:** [Widget]\\
**OAuth:** Public\\
**Version history:**\\
1.0.0 - added
`;

function inMemoryContext() {
  return createPipelineContext({
    config,
    source: new InMemorySource({
      entity: { 'Widget.md': entityDoc },
      method: { 'widgets.md': methodDoc, 'blocked.md': methodDoc },
      guides,
      securityPolicy,
    }),
  });
}

describe('Pipeline', () => {
  it('declares generation stages in dependency order', () => {
    expect(new OpenAPIGenerator(inMemoryContext()).stageNames()).toEqual([
      'collect-error-examples',
      'narrow-client-credentials-scopes',
      'convert-entities',
      'convert-methods',
      'generate-links',
      'deduplicate-enums',
    ]);
  });

  it('runs end to end against an in-memory source', () => {
    const log = jest.spyOn(console, 'log').mockImplementation();
    let result;
    try {
      result = new Pipeline(inMemoryContext()).run();
    } finally {
      log.mockRestore();
    }

    expect(result.entityCount).toBe(1);
    expect(result.methodFileCount).toBe(1);
    expect(result.methodCount).toBe(1);

    expect(result.spec.openapi).toBe('3.1.0');
    expect(result.spec.paths['/api/v1/widgets/{id}']).toBeDefined();
    expect(result.spec.components?.schemas?.Widget).toBeDefined();
    expect(result.spec.info.description).toContain('abc1234');
  });

  it('honours blockedFiles from the injected config', () => {
    const log = jest.spyOn(console, 'log').mockImplementation();
    try {
      const result = new Pipeline(inMemoryContext()).run();
      expect(result.methodFileCount).toBe(1);
    } finally {
      log.mockRestore();
    }
  });

  it('produces identical output for identical input', () => {
    const log = jest.spyOn(console, 'log').mockImplementation();
    try {
      const a = new Pipeline(inMemoryContext()).run().json;
      const b = new Pipeline(inMemoryContext()).run().json;
      expect(a).toBe(b);
    } finally {
      log.mockRestore();
    }
  });
});
