import { ParameterParser } from '../../parsers/ParameterParser';
import { TypeInference } from '../../parsers/TypeInference';

describe('ParameterParser grouped_types array enum handling', () => {
  it('should extract notification types from "Types to filter include" section', () => {
    const mockSection = `
## Get all grouped notifications

Types to filter include:
- \`mention\` = Someone mentioned you in their status
- \`status\` = Someone you enabled notifications for has posted a status
- \`reblog\` = Someone boosted one of your statuses
- \`follow\` = Someone followed you
- \`follow_request\` = Someone requested to follow you
- \`favourite\` = Someone favourited one of your statuses
- \`poll\` = A poll you have voted in or created has ended
- \`update\` = A status you boosted with has been edited
- \`admin.sign_up\` = Someone signed up (optionally sent to admins)
- \`admin.report\` = A new report has been filed
- \`severed_relationships\` = Some of your follow relationships have been severed as a result of a moderation or block event
- \`moderation_warning\` = A moderator has taken action against your account or has sent you a warning
- \`quote\` = Someone has quoted one of your statuses
- \`quoted_update\` = A status you have quoted has been edited

##### Query parameters

grouped_types[]
: Array of String. Restrict which notification types can be grouped.
`;

    const notificationTypes =
      ParameterParser.extractNotificationTypes(mockSection);
    expect(notificationTypes).toEqual([
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
      'quoted_update',
    ]);
  });

  it('should apply notification types to grouped_types[] parameter', () => {
    const mockSection = `
## Get all grouped notifications

Types to filter include:
- \`mention\` = Someone mentioned you in their status
- \`status\` = Someone you enabled notifications for has posted a status
- \`reblog\` = Someone boosted one of your statuses
- \`follow\` = Someone followed you

##### Query parameters

grouped_types[]
: Array of String. Restrict which notification types can be grouped.

limit
: Integer. Maximum number of results to return.
`;

    const parameters = ParameterParser.parseAllParameters(mockSection);

    const groupedTypesParam = parameters.find(
      (p) => p.name === 'grouped_types'
    );
    expect(groupedTypesParam).toBeDefined();
    expect(groupedTypesParam!.schema!.type).toBe('array');
    expect(groupedTypesParam!.schema!.items!.enum).toEqual([
      'mention',
      'status',
      'reblog',
      'follow',
    ]);
  });

  it('should extract enum values from description with "include" pattern', () => {
    const description =
      'Array of String. Restrict which notification types can be grouped. Types include `mention`, `status`, `reblog`, `follow`, `follow_request`, `favourite`, `poll`, `update`, `admin.sign_up`, `admin.report`, `severed_relationships`, `moderation_warning`, `quote`, `quoted_update`.';

    const enumValues =
      TypeInference.extractEnumValuesFromDescription(description);

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
      'moderation_warning',
      'quote',
      'quoted_update',
    ]);
  });

  it('should apply enum values to array items when parsing grouped_types[]', () => {
    // Mock a section similar to the grouped notifications API
    const mockSection = `
## Get all grouped notifications

##### Query parameters

grouped_types[]
: Array of String. Restrict which notification types can be grouped. Types include \`mention\`, \`status\`, \`reblog\`, \`follow\`, \`follow_request\`, \`favourite\`, \`poll\`, \`update\`, \`admin.sign_up\`, \`admin.report\`, \`severed_relationships\`, \`moderation_warning\`, \`quote\`, \`quoted_update\`.

limit
: Integer. Maximum number of results to return.
`;

    const parameters = ParameterParser.parseParametersByType(
      mockSection,
      'Query parameters',
      'query'
    );

    // Find the grouped_types parameter
    const groupedTypesParam = parameters.find(
      (p) => p.name === 'grouped_types'
    );
    expect(groupedTypesParam).toBeDefined();
    expect(groupedTypesParam!.schema!.type).toBe('array');

    // The array items should have enum constraints
    expect(groupedTypesParam!.schema!.items).toBeDefined();
    expect(groupedTypesParam!.schema!.items!.enum).toBeDefined();
    expect(groupedTypesParam!.schema!.items!.enum).toEqual([
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
      'quoted_update',
    ]);
  });

  it('should handle types[] parameter with enum values', () => {
    const mockSection = `
##### Query parameters

types[]
: Array of String. Types to include in the result. Can be \`mention\`, \`status\`, \`reblog\`, \`follow\`.
`;

    const parameters = ParameterParser.parseParametersByType(
      mockSection,
      'Query parameters',
      'query'
    );

    const typesParam = parameters.find((p) => p.name === 'types');
    expect(typesParam).toBeDefined();
    expect(typesParam!.schema!.type).toBe('array');
    expect(typesParam!.schema!.items!.enum).toEqual([
      'mention',
      'status',
      'reblog',
      'follow',
    ]);
  });
});
