import * as fs from 'fs';
import * as path from 'path';
import { MethodEntityParser } from '../../parsers/MethodEntityParser';

describe('MethodEntityParser - OEmbed inline response', () => {
  let tempFilePath: string;

  beforeEach(() => {
    tempFilePath = path.join(__dirname, 'test-oembed-methods.md');
  });

  afterEach(() => {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  });

  test('should detect and parse OEmbed metadata inline response', () => {
    // Create markdown content that mimics the actual oembed.md structure
    const oembedMarkdown = `---
title: oembed API methods
description: For generating OEmbed previews.
---

## Get OEmbed info as JSON {#get}

\`\`\`http
GET /api/oembed HTTP/1.1
\`\`\`

**Returns:** OEmbed metadata\\
**OAuth:** Public\\
**Version history:**\\
1.0.0 - added

#### Response
##### 200: OK

Represents OEmbed "rich" preview, with associated iframe and metadata.

\`\`\`json
{
  "type": "rich",
  "version": "1.0",
  "title": "New status by trwnh",
  "author_name": "infinite love ⴳ",
  "author_url": "https://mastodon.social/@trwnh",
  "provider_name": "mastodon.social",
  "provider_url": "https://mastodon.social/",
  "cache_age": 86400,
  "html": "<iframe src=\\"https://mastodon.social/@trwnh/99664077509711321/embed\\" class=\\"mastodon-embed\\" style=\\"max-width: 100%; border: 0\\" width=\\"400\\" allowfullscreen=\\"allowfullscreen\\"></iframe><script src=\\"https://mastodon.social/embed.js\\" async=\\"async\\"></script>",
  "width": 400,
  "height": null
}
\`\`\`
`;

    fs.writeFileSync(tempFilePath, oembedMarkdown);

    const entities =
      MethodEntityParser.parseEntitiesFromMethodFile(tempFilePath);

    // Should find one entity from the inline JSON response
    expect(entities).toHaveLength(1);

    const entity = entities[0];
    expect(entity.name).toBe('OEmbedResponse');
    expect(entity.description).toBe(
      'Response schema for Get OEmbed info as JSON'
    );
    expect(entity.example).toBeDefined();

    // Check that the entity has the expected attributes from the JSON example
    const typeAttr = entity.attributes.find((attr) => attr.name === 'type');
    expect(typeAttr).toBeDefined();
    expect(typeAttr?.type).toBe('String');

    const versionAttr = entity.attributes.find(
      (attr) => attr.name === 'version'
    );
    expect(versionAttr).toBeDefined();
    expect(versionAttr?.type).toBe('String');

    const htmlAttr = entity.attributes.find((attr) => attr.name === 'html');
    expect(htmlAttr).toBeDefined();
    expect(htmlAttr?.type).toBe('String');

    const widthAttr = entity.attributes.find((attr) => attr.name === 'width');
    expect(widthAttr).toBeDefined();
    expect(widthAttr?.type).toBe('Integer');

    const heightAttr = entity.attributes.find((attr) => attr.name === 'height');
    expect(heightAttr).toBeDefined();
    // Note: height is null in the example, so it's inferred as String (nullable)
    expect(heightAttr?.type).toBe('String');
  });

  test('should include example JSON in the entity', () => {
    const oembedMarkdown = `---
title: oembed API methods
---

## Get OEmbed info as JSON {#get}

**Returns:** OEmbed metadata

#### Response
##### 200: OK

\`\`\`json
{
  "type": "rich",
  "version": "1.0",
  "title": "New status by trwnh"
}
\`\`\`
`;

    fs.writeFileSync(tempFilePath, oembedMarkdown);

    const entities =
      MethodEntityParser.parseEntitiesFromMethodFile(tempFilePath);
    const entity = entities[0];

    expect(entity.example).toEqual({
      type: 'rich',
      version: '1.0',
      title: 'New status by trwnh',
    });
  });

  test('should handle other metadata-like responses', () => {
    const metadataMarkdown = `---
title: test methods
---

## Get server metadata {#metadata}

**Returns:** Server metadata

#### Response
##### 200: OK

\`\`\`json
{
  "name": "example.social",
  "version": "4.2.0"
}
\`\`\`

## Get configuration data {#config}

**Returns:** Configuration metadata

#### Response
##### 200: OK

\`\`\`json
{
  "max_characters": 500,
  "media_attachments": {
    "image_size_limit": 10485760
  }
}
\`\`\`
`;

    fs.writeFileSync(tempFilePath, metadataMarkdown);

    const entities =
      MethodEntityParser.parseEntitiesFromMethodFile(tempFilePath);

    expect(entities).toHaveLength(2);

    const serverEntity = entities.find(
      (e) => e.name === 'GetServerMetadataResponse'
    );
    expect(serverEntity).toBeDefined();

    const configEntity = entities.find(
      (e) => e.name === 'GetConfigurationDataResponse'
    );
    expect(configEntity).toBeDefined();
  });
});
