import { AttributeParser } from '../../parsers/AttributeParser';

describe('AttributeParser - most_recent_notification_id special case', () => {
  it('should parse most_recent_notification_id as Integer not String', () => {
    // Mock content from grouped_notifications.md
    const content = `
#### \`most_recent_notification_id\`

**Description:** ID of the most recent notification in the group.\\
**Type:** String\\
**Version history:**\\
4.3.0 (\`mastodon\` [API version]({{< relref "entities/Instance#api-versions" >}}) 2) - added
`;

    const attributes = AttributeParser.parseMethodEntityAttributes(content);

    expect(attributes).toHaveLength(1);
    const attribute = attributes[0];

    expect(attribute.name).toBe('most_recent_notification_id');
    expect(attribute.type).toBe('Integer');
    expect(attribute.description).toBe(
      'ID of the most recent notification in the group.'
    );
  });

  it('should parse most_recent_notification_id as Integer in entity format', () => {
    // Mock content in entity format (with ### instead of ####)
    const content = `
### \`most_recent_notification_id\`

**Description:** ID of the most recent notification in the group.\\
**Type:** String\\
**Version history:**\\
4.3.0 - added
`;

    const attributes = AttributeParser.parseAttributesFromSection(
      content,
      'NotificationGroup'
    );

    expect(attributes).toHaveLength(1);
    const attribute = attributes[0];

    expect(attribute.name).toBe('most_recent_notification_id');
    expect(attribute.type).toBe('Integer');
    expect(attribute.description).toBe(
      'ID of the most recent notification in the group.'
    );
  });
});
