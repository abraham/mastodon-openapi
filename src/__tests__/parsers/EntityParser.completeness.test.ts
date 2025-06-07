import { EntityParser } from '../../parsers/EntityParser';
import * as fs from 'fs';
import * as path from 'path';

describe('EntityParser - Deep Attribute Analysis', () => {
  let parser: EntityParser;

  beforeEach(() => {
    parser = new EntityParser();
  });

  test('should analyze Account entity for any missing attributes', () => {
    // Account is a complex entity, let's see if we're missing anything
    const entities = parser.parseAllEntities();
    const accountEntity = entities.find((e) => e.name === 'Account');

    expect(accountEntity).toBeDefined();
    if (accountEntity) {
      console.log(
        `Account entity has ${accountEntity.attributes.length} attributes`
      );

      // Let's compare with manual parsing of the markdown
      const entitiesPath = path.join(
        __dirname,
        '../../../mastodon-documentation/content/en/entities'
      );
      const accountPath = path.join(entitiesPath, 'Account.md');
      const content = fs.readFileSync(accountPath, 'utf-8');

      // Find all attribute headers manually
      const manualAttributeMatches = content.match(/### `[^`]+`/g) || [];
      const manualAttributeNames = manualAttributeMatches.map((match) =>
        match.replace(/### `([^`]+)`/, '$1')
      );

      console.log(
        `Manual count found ${manualAttributeNames.length} attributes`
      );
      console.log(
        'Manual attributes:',
        manualAttributeNames.slice(0, 10).join(', ') + '...'
      );

      const parsedAttributeNames = accountEntity.attributes.map((a) => a.name);
      console.log(
        'Parsed attributes:',
        parsedAttributeNames.slice(0, 10).join(', ') + '...'
      );

      // Find any manual attributes not in parsed list
      const missing = manualAttributeNames.filter(
        (name) => !parsedAttributeNames.includes(name)
      );
      if (missing.length > 0) {
        console.log('MISSING attributes:', missing);
      } else {
        console.log('All manual attributes found in parsed list!');
      }

      // Find any parsed attributes not in manual list (shouldn't happen)
      const extra = parsedAttributeNames.filter(
        (name) => !manualAttributeNames.includes(name)
      );
      if (extra.length > 0) {
        console.log('EXTRA parsed attributes:', extra);
      }
    }
  });

  test('should check CohortData entity from Admin_Cohort.md', () => {
    const entities = parser.parseAllEntities();

    // Should find both Admin::Cohort and CohortData
    const cohortEntity = entities.find((e) => e.name === 'Admin::Cohort');
    const cohortDataEntity = entities.find((e) => e.name === 'CohortData');

    expect(cohortEntity).toBeDefined();
    expect(cohortDataEntity).toBeDefined();

    if (cohortEntity) {
      console.log(
        `Admin::Cohort entity has ${cohortEntity.attributes.length} attributes`
      );
      console.log(
        'Admin::Cohort attributes:',
        cohortEntity.attributes.map((a) => a.name).join(', ')
      );
    }

    if (cohortDataEntity) {
      console.log(
        `CohortData entity has ${cohortDataEntity.attributes.length} attributes`
      );
      console.log(
        'CohortData attributes:',
        cohortDataEntity.attributes.map((a) => a.name).join(', ')
      );
    }
  });
});
