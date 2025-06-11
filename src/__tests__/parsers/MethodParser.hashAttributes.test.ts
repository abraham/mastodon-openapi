import { MethodParser } from '../../parsers/MethodParser';

describe('MethodParser - Hash Attributes parsing', () => {
  let methodParser: MethodParser;

  beforeEach(() => {
    methodParser = new MethodParser();
  });

  test('should parse hash attributes from "Each hash in the array will contain the following attributes:" section', () => {
    const sectionContent = `
## Weekly activity {#activity}

\`\`\`http
GET /api/v1/instance/activity HTTP/1.1
\`\`\`

Instance activity over the last 3 months, binned weekly.

**Returns:** Array of Hash\\
**OAuth:** Public\\
**Version history:**\\
2.1.2 - added\\
3.0.0 - requires user token if instance is in whitelist mode

#### Request

##### Headers

Authorization
: Provide this header with \`Bearer <user_token>\` to gain authorized access to this API method.

#### Response

##### 200: OK

Each hash in the array will contain the following attributes:

week
: String (UNIX Timestamp). Midnight at the first day of the week.

statuses
: String (cast from an integer). The number of Statuses created since the week began.

logins
: String (cast from an integer). The number of user logins since the week began.

registrations
: String (cast from an integer). The number of user registrations since the week began.

\`\`\`json
[
  {
    "week": "1574640000",
    "statuses": "37125",
    "logins": "14239",
    "registrations": "542"
  }
]
\`\`\`
`;

    // Call the private method through reflection for testing
    const parseHashAttributes = (methodParser as any).parseHashAttributes.bind(
      methodParser
    );
    const result = parseHashAttributes(sectionContent);

    expect(result).toEqual([
      {
        name: 'week',
        type: 'String',
        description: 'Midnight at the first day of the week.',
      },
      {
        name: 'statuses',
        type: 'String',
        description: 'The number of Statuses created since the week began.',
      },
      {
        name: 'logins',
        type: 'String',
        description: 'The number of user logins since the week began.',
      },
      {
        name: 'registrations',
        type: 'String',
        description: 'The number of user registrations since the week began.',
      },
    ]);
  });

  test('should return empty array when no hash attributes section exists', () => {
    const sectionContent = `
## Some method {#method}

\`\`\`http
GET /api/v1/some/endpoint HTTP/1.1
\`\`\`

**Returns:** Array of Hash\\
**OAuth:** Public\\

Just some basic endpoint with no hash attributes described.
`;

    const parseHashAttributes = (methodParser as any).parseHashAttributes.bind(
      methodParser
    );
    const result = parseHashAttributes(sectionContent);

    expect(result).toEqual([]);
  });
});
