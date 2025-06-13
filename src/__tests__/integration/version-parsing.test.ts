import { MethodParser } from '../../parsers/MethodParser';
import { AttributeParser } from '../../parsers/AttributeParser';

describe('Version parsing integration', () => {
  describe('Method version parsing', () => {
    test('should parse version numbers from actual method documentation format', () => {
      const mockMethodSection = `
## Post a new status {#create}

\`\`\`http
POST /api/v1/statuses HTTP/1.1
\`\`\`

Publish a status with the given parameters.

**Returns:** [Status]({{<relref "entities/status">}}). When \`scheduled_at\` is present, [ScheduledStatus]({{<relref "entities/scheduledstatus">}}) is returned instead.\\
**OAuth:** User + \`write:statuses\`\\
**Version history:**\\
0.0.0 - added\\
2.7.0 - \`scheduled_at\` added\\
2.8.0 - \`poll\` added

#### Request
`;

      const methodParser = new MethodParser();
      const parseMethodSection = (methodParser as any).parseMethodSection.bind(
        methodParser
      );
      const result = parseMethodSection(mockMethodSection);

      expect(result).not.toBeNull();
      expect(result?.versions).toEqual(['0.0.0', '2.7.0', '2.8.0']);
    });

    test('should parse version numbers from complex version history', () => {
      const mockMethodSection = `
## Delete a status {#delete}

\`\`\`http
DELETE /api/v1/statuses/:id HTTP/1.1
\`\`\`

Delete one of your own statuses.

**Returns:** [Status]({{<relref "entities/status">}}) with source properties\\
**OAuth:** User + \`write:statuses\`\\
**Version history:**\\
0.0.0 - added\\
2.9.0 - return source properties, for use with delete and redraft\\
4.4.0 (\`mastodon\` [API version]({{< relref "entities/Instance#api-versions" >}}) 4) - added \`delete_media\` optional parameter

#### Request
`;

      const methodParser = new MethodParser();
      const parseMethodSection = (methodParser as any).parseMethodSection.bind(
        methodParser
      );
      const result = parseMethodSection(mockMethodSection);

      expect(result).not.toBeNull();
      expect(result?.versions).toEqual(['0.0.0', '2.9.0', '4.4.0']);
    });
  });

  describe('Entity attribute version parsing', () => {
    test('should parse version numbers from entity attribute format', () => {
      const mockAttributeContent = `
### \`visibility\` {#visibility}

**Description:** Visibility of this status.\\
**Type:** String (Enumerable oneOf)\\
\`public\` = Visible to everyone, shown in public timelines.\\
\`unlisted\` = Visible to public, but not included in public timelines.\\
\`private\` = Visible to followers only, and to any mentioned users.\\
\`direct\` = Visible only to mentioned users.\\
**Version history:**\\
0.9.9 - added

### \`spoiler_text\` {#spoiler_text}

**Description:** Subject or summary line, below which status content is collapsed until expanded.\\
**Type:** String\\
**Version history:**\\
1.0.0 - added
`;

      const attributes = AttributeParser.parseAttributesFromSection(
        mockAttributeContent,
        'Status'
      );

      expect(attributes).toHaveLength(2);

      const visibilityAttr = attributes.find(
        (attr) => attr.name === 'visibility'
      );
      expect(visibilityAttr).toBeDefined();
      expect(visibilityAttr?.versions).toEqual(['0.9.9']);

      const spoilerTextAttr = attributes.find(
        (attr) => attr.name === 'spoiler_text'
      );
      expect(spoilerTextAttr).toBeDefined();
      expect(spoilerTextAttr?.versions).toEqual(['1.0.0']);
    });

    test('should parse version numbers from method entity attribute format', () => {
      const mockMethodEntityContent = `
#### \`name\` {#name}

**Description:** The name of the application that posted this status.\\
**Type:** String\\
**Version history:**\\
0.9.9 - added

#### \`website\` {{%optional%}} {#website}

**Description:** The website associated with the application that posted this status.\\
**Type:** {{<nullable>}} String (URL) or null\\
**Version history:**\\
0.9.9 - added\\
3.5.1 - this property is now nullable
`;

      const attributes = AttributeParser.parseMethodEntityAttributes(
        mockMethodEntityContent
      );

      expect(attributes).toHaveLength(2);

      const nameAttr = attributes.find((attr) => attr.name === 'name');
      expect(nameAttr).toBeDefined();
      expect(nameAttr?.versions).toEqual(['0.9.9']);

      const websiteAttr = attributes.find((attr) => attr.name === 'website');
      expect(websiteAttr).toBeDefined();
      expect(websiteAttr?.versions).toEqual(['0.9.9', '3.5.1']);
    });
  });
});
