import { AttributeParser } from '../../parsers/AttributeParser';

describe('AttributeParser - Enum Nullable Issue', () => {
  it('should not mark enum properties as nullable when only enum values are added in newer versions', () => {
    // Mock content representing a Notification entity with type property
    // where new enum values were added in newer versions but the property itself existed from the beginning
    const content = `
### \`type\`

**Description:** The type of event that resulted in the notification.\\

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

**Version history:**\\
0.0.0 - added\\
2.8.0 - added \`poll\`\\
3.1.0 - added \`status\`\\
3.5.0 - added \`update\`\\
4.0.0 - added \`admin.sign_up\`\\
4.0.0 - added \`admin.report\`
`;

    const attributes = AttributeParser.parseAttributesFromSection(
      content,
      'Notification'
    );

    expect(attributes).toHaveLength(1);
    const typeAttribute = attributes[0];

    expect(typeAttribute.name).toBe('type');
    expect(typeAttribute.enumValues).toContain('mention');
    expect(typeAttribute.enumValues).toContain('admin.report');
    expect(typeAttribute.enumValues).toContain('admin.sign_up');

    // The key assertion: the type property should NOT be nullable
    // even though enum values were added in newer versions (4.0.0)
    // because the property itself existed from 0.0.0
    expect(typeAttribute.nullable).toBeFalsy();
    expect(typeAttribute.optional).toBeFalsy();
  });

  it('should mark enum properties as nullable when the property itself was added in a newer version', () => {
    // Mock content for a property that was entirely added in a newer version
    const content = `
### \`new_enum_property\`

**Description:** A new enum property added in a recent version.\\

**Type:** String (Enumerable oneOf)\\
\`value1\` = First value\\
\`value2\` = Second value\\

**Version history:**\\
4.5.0 - added
`;

    const attributes = AttributeParser.parseAttributesFromSection(
      content,
      'TestEntity'
    );

    expect(attributes).toHaveLength(1);
    const newProperty = attributes[0];

    expect(newProperty.name).toBe('new_enum_property');
    expect(newProperty.enumValues).toContain('value1');
    expect(newProperty.enumValues).toContain('value2');

    // This should be nullable because the entire property was added in 4.5.0
    // which is newer than the supported version (4.4.0)
    expect(newProperty.nullable).toBeTruthy();
  });

  it('should distinguish between property addition and enum value additions in version history', () => {
    // This test checks the core logic: if a property was "added" in an old version
    // but enum values were added later, the property should not be nullable
    const content = `
### \`status\`

**Description:** The status of the request.\\

**Type:** String (Enumerable oneOf)\\
\`pending\` = Request is pending\\
\`approved\` = Request is approved\\
\`rejected\` = Request is rejected\\
\`expired\` = Request has expired\\

**Version history:**\\
1.0.0 - added\\
3.0.0 - added \`approved\`\\
3.2.0 - added \`rejected\`\\
4.5.0 - added \`expired\`
`;

    const attributes = AttributeParser.parseAttributesFromSection(
      content,
      'TestEntity'
    );

    expect(attributes).toHaveLength(1);
    const statusAttribute = attributes[0];

    expect(statusAttribute.name).toBe('status');
    expect(statusAttribute.enumValues).toContain('pending');
    expect(statusAttribute.enumValues).toContain('expired');

    // Should NOT be nullable because the property itself was added in 1.0.0
    // Even though 'expired' was added in 4.5.0 (newer than supported 4.4.0)
    expect(statusAttribute.nullable).toBeFalsy();
  });
});
