import { EntityParser } from '../../parsers/EntityParser';
import * as fs from 'fs';
import * as path from 'path';

describe('EntityParser - Specific Missing Attributes', () => {
  let parser: EntityParser;

  beforeEach(() => {
    parser = new EntityParser();
  });

  test('should identify specific formatting issues in WebPushSubscription', () => {
    // Look at the raw markdown content
    const entitiesPath = path.join(
      __dirname,
      '../../../mastodon-documentation/content/en/entities'
    );
    const webPushPath = path.join(entitiesPath, 'WebPushSubscription.md');
    const content = fs.readFileSync(webPushPath, 'utf-8');

    // Find the problematic 'standard' attribute
    const standardMatch = content.match(
      /### `standard`[\s\S]*?### `server_key`/
    );
    expect(standardMatch).toBeTruthy();

    if (standardMatch) {
      console.log('Standard attribute section:');
      console.log(standardMatch[0]);

      // Check if the Type line has a backslash
      const typeLineMatch = standardMatch[0].match(/\*\*Type:\*\*[^\n]*/);
      if (typeLineMatch) {
        console.log('Type line:', typeLineMatch[0]);
        const hasBackslash = typeLineMatch[0].endsWith('\\');
        console.log('Has trailing backslash:', hasBackslash);

        if (!hasBackslash) {
          console.log(
            'ISSUE: Type line should end with backslash for proper parsing'
          );
        }
      }
    }

    // Now check if parser actually captures this attribute
    const entities = parser.parseAllEntities();
    const webPushEntity = entities.find(
      (e) => e.name === 'WebPushSubscription'
    );
    const standardAttr = webPushEntity?.attributes.find(
      (a) => a.name === 'standard'
    );

    expect(standardAttr).toBeDefined();
    console.log('Standard attribute parsed:', standardAttr);
  });

  test('should check for attributes that might be missed due to formatting', () => {
    const entities = parser.parseAllEntities();

    // Let's check a few entities that our audit flagged
    const problematicFiles = [
      'Account.md',
      'Instance.md',
      'StatusEdit.md',
      'Tag.md',
      'V1_Instance.md',
    ];

    for (const fileName of problematicFiles) {
      const entityName = fileName.replace('.md', '').replace('_', '::');
      let entity = entities.find((e) => e.name === entityName);

      // Try variations
      if (!entity) {
        entity = entities.find((e) => e.name === fileName.replace('.md', ''));
      }
      if (!entity && entityName.includes('::')) {
        entity = entities.find((e) => e.name === entityName.replace('::', '_'));
      }

      if (entity) {
        console.log(
          `${fileName}: Found entity '${entity.name}' with ${entity.attributes.length} attributes`
        );
      } else {
        console.log(`${fileName}: Entity not found!`);
      }
    }
  });
});
