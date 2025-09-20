import { AttributeParser } from '../../parsers/AttributeParser';

describe('Debug NotificationGroup parsing', () => {
  it('should extract all enum values from NotificationGroup type attribute', () => {
    // This is the exact content from the grouped_notifications.md file
    const content = `
#### \`type\`

**Description:** The type of event that resulted in the notifications in this group.\\
**Type:** String (Enumerable oneOf)\\
\`mention\` = Someone mentioned you in their status\\
\`status\` = Someone you enabled notifications for has posted a status\\
\`reblog\` = Someone boosted one of your statuses\\
\`follow\` = Someone followed you\\
\`follow_request\` = Someone requested to follow you\\
\`favourite\` = Someone favourited one of your statuses\\
\`poll\` = A poll you have voted in or created has ended\\
\`update\` = A status you interacted with has been edited\\
\`admin.sign_up\` = Someone signed up (optionally sent to admins)\\
\`admin.report\` = A new report has been filed\\
\`severed_relationships\` = Some of your follow relationships have been severed as a result of a moderation or block event\\
\`moderation_warning\` = A moderator has taken action against your account or has sent you a warning\\
\`quote\` = Someone has quoted one of your statuses\\
\`quoted_update\` = A status you have quoted has been edited\\
**Version history:**\\
4.3.0 (\`mastodon\` [API version]({{< relref "entities/Instance#api-versions" >}}) 2) - added\\
4.5.0 (\`mastodon\` [API version]({{< relref "entities/Instance#api-versions" >}}) 7) - added \`quote\` and \`quoted_update\`
`;

    const attributes = AttributeParser.parseMethodEntityAttributes(content);
    expect(attributes).toHaveLength(1);
    
    const typeAttribute = attributes[0];
    expect(typeAttribute.name).toBe('type');
    expect(typeAttribute.enumValues).toBeDefined();
    
    // Log the actual parsed enum values for debugging
    console.log('Parsed enum values:', typeAttribute.enumValues);
    
    // Should include all values including quote and quoted_update
    const expectedValues = [
      'mention',
      'status', 
      'reblog',
      'follow',
      'follow_request',
      'favourite',
      'poll', 
      'update',
      'admin.sign_up',
      'admin.report',
      'severed_relationships',
      'moderation_warning',
      'quote',
      'quoted_update'
    ];
    
    expect(typeAttribute.enumValues).toEqual(expect.arrayContaining(expectedValues));
    expect(typeAttribute.enumValues).toContain('quote');
    expect(typeAttribute.enumValues).toContain('quoted_update');
  });
});