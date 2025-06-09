import { EntityParsingUtils } from '../../parsers/EntityParsingUtils';

describe('EntityParsingUtils', () => {
  describe('extractEnumValues', () => {
    it('should extract enum values from single-line format', () => {
      const content = `
Some text before
\`value1\` = Description for value1
\`value2\` = Description for value2
\`value3\` = Description for value3
Some text after
`;

      const enumValues = EntityParsingUtils.extractEnumValues(content);
      expect(enumValues).toEqual(['value1', 'value2', 'value3']);
    });

    it('should extract enum values from multi-line format with backslashes', () => {
      // This represents the actual format from Notification.md
      const content = `
**Type:** String (Enumerable oneOf)\\
\`mention\` = Someone mentioned you in their status\\
\`status\` = Someone you enabled notifications for has posted a status\\
\`reblog\` = Someone boosted one of your statuses\\
\`follow\` = Someone followed you\\
\`follow_request\` = Someone requested to follow you\\
\`favourite\` = Someone favourited one of your statuses\\
\`poll\` = A poll you have voted in or created has ended\\
\`update\` = A status you reblogged has been edited\\
\`admin.sign_up\` = Someone signed up (optionally sent to admins)\\
\`admin.report\` = A new report has been filed\\
\`severed_relationships\` = Some of your follow relationships have been severed as a result of a moderation or block event\\
\`moderation_warning\` = A moderator has taken action against your account or has sent you a warning\\
**Version history:**\\
`;

      const enumValues = EntityParsingUtils.extractEnumValues(content);
      console.log('Debug: extractEnumValues result:', enumValues);
      expect(enumValues).toEqual([
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
        'moderation_warning'
      ]);
    });

    it('should handle mixed single-line and multi-line formats', () => {
      const content = `
\`single\` = Single line value
\`multi1\` = Multi line value part 1\\
\`multi2\` = Multi line value part 2\\
\`another_single\` = Another single line
`;

      const enumValues = EntityParsingUtils.extractEnumValues(content);
      expect(enumValues).toEqual(['single', 'multi1', 'multi2', 'another_single']);
    });

    it('should return empty array when no enum values found', () => {
      const content = 'No enum values here';
      const enumValues = EntityParsingUtils.extractEnumValues(content);
      expect(enumValues).toEqual([]);
    });
  });
});