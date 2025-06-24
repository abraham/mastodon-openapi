import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';
import { EntityClass } from '../../interfaces/EntityClass';

describe('OpenAPIGenerator ExternalDocs Generation', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  describe('Method external documentation', () => {
    it('should generate externalDocs for methods with anchors', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'favourites',
          description: 'Favourites methods',
          methods: [
            {
              name: 'View favourited statuses',
              httpMethod: 'GET',
              endpoint: '/api/v1/favourites',
              description: 'Statuses the user has favourited.',
              anchor: 'get',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation = spec.paths['/api/v1/favourites']?.get;
      expect(operation).toBeDefined();
      expect(operation?.externalDocs).toBeDefined();
      expect(operation?.externalDocs?.url).toBe(
        'https://docs.joinmastodon.org/methods/favourites/#get'
      );
      expect(operation?.externalDocs?.description).toBe(
        'Official Mastodon API documentation'
      );
    });

    it('should not generate externalDocs for methods without anchors', () => {
      const methodFiles: ApiMethodsFile[] = [
        {
          name: 'test',
          description: 'Test methods',
          methods: [
            {
              name: 'Test method',
              httpMethod: 'GET',
              endpoint: '/api/v1/test',
              description: 'Test method without anchor.',
              // no anchor property
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], methodFiles);

      const operation = spec.paths['/api/v1/test']?.get;
      expect(operation).toBeDefined();
      expect(operation?.externalDocs).toBeUndefined();
    });
  });

  describe('Entity external documentation', () => {
    it('should generate externalDocs for main entities', () => {
      const entities: EntityClass[] = [
        {
          name: 'Account',
          description: 'Represents a user account',
          attributes: [
            {
              name: 'id',
              type: 'String',
              description: 'The account ID',
            },
          ],
        },
      ];

      const spec = generator.generateSchema(entities, []);

      const accountSchema = spec.components?.schemas?.Account;
      expect(accountSchema).toBeDefined();
      expect(accountSchema?.externalDocs).toBeDefined();
      expect(accountSchema?.externalDocs?.url).toBe(
        'https://docs.joinmastodon.org/entities/Account/'
      );
      expect(accountSchema?.externalDocs?.description).toBe(
        'Official Mastodon API documentation'
      );
    });

    it('should generate externalDocs for sub-entities', () => {
      const entities: EntityClass[] = [
        {
          name: 'CredentialAccount',
          description: 'Credential account entity',
          attributes: [
            {
              name: 'source',
              type: 'Object',
              description: 'Source attributes',
            },
          ],
        },
      ];

      const spec = generator.generateSchema(entities, []);

      const credentialAccountSchema =
        spec.components?.schemas?.CredentialAccount;
      expect(credentialAccountSchema).toBeDefined();
      expect(credentialAccountSchema?.externalDocs).toBeDefined();
      expect(credentialAccountSchema?.externalDocs?.url).toBe(
        'https://docs.joinmastodon.org/entities/Account/#CredentialAccount'
      );
      expect(credentialAccountSchema?.externalDocs?.description).toBe(
        'Official Mastodon API documentation'
      );
    });

    it('should generate externalDocs for Field sub-entity', () => {
      const entities: EntityClass[] = [
        {
          name: 'Field',
          description: 'Profile field entity',
          attributes: [
            {
              name: 'name',
              type: 'String',
              description: 'Field name',
            },
          ],
        },
      ];

      const spec = generator.generateSchema(entities, []);

      const fieldSchema = spec.components?.schemas?.Field;
      expect(fieldSchema).toBeDefined();
      expect(fieldSchema?.externalDocs).toBeDefined();
      expect(fieldSchema?.externalDocs?.url).toBe(
        'https://docs.joinmastodon.org/entities/Account/#Field'
      );
      expect(fieldSchema?.externalDocs?.description).toBe(
        'Official Mastodon API documentation'
      );
    });

    it('should generate externalDocs for CohortData sub-entity', () => {
      const entities: EntityClass[] = [
        {
          name: 'CohortData',
          description: 'Cohort data entity',
          attributes: [
            {
              name: 'data',
              type: 'Object',
              description: 'Cohort data',
            },
          ],
        },
      ];

      const spec = generator.generateSchema(entities, []);

      const cohortDataSchema = spec.components?.schemas?.CohortData;
      expect(cohortDataSchema).toBeDefined();
      expect(cohortDataSchema?.externalDocs).toBeDefined();
      expect(cohortDataSchema?.externalDocs?.url).toBe(
        'https://docs.joinmastodon.org/entities/Admin_Cohort/#CohortData'
      );
      expect(cohortDataSchema?.externalDocs?.description).toBe(
        'Official Mastodon API documentation'
      );
    });

    it('should generate externalDocs for Trends_Link sub-entity', () => {
      const entities: EntityClass[] = [
        {
          name: 'Trends_Link',
          description: 'Trends link entity',
          attributes: [
            {
              name: 'url',
              type: 'String',
              description: 'Link URL',
            },
          ],
        },
      ];

      const spec = generator.generateSchema(entities, []);

      const trendsLinkSchema = spec.components?.schemas?.Trends_Link;
      expect(trendsLinkSchema).toBeDefined();
      expect(trendsLinkSchema?.externalDocs).toBeDefined();
      expect(trendsLinkSchema?.externalDocs?.url).toBe(
        'https://docs.joinmastodon.org/entities/PreviewCard/#trends-link'
      );
      expect(trendsLinkSchema?.externalDocs?.description).toBe(
        'Official Mastodon API documentation'
      );
    });
  });
});
