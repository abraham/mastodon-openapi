#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Update the mastodonDocsCommit in config.json to the latest commit from main branch
 */
function updateDocsCommit(): boolean {
  const configPath = path.join(__dirname, '..', 'config.json');
  const docsDir = path.join(__dirname, '..', 'mastodon-documentation');

  if (!fs.existsSync(configPath)) {
    console.error('config.json not found');
    process.exit(1);
  }

  if (!fs.existsSync(docsDir)) {
    console.error(
      'mastodon-documentation directory not found. Run setup-docs first.'
    );
    process.exit(1);
  }

  console.log(
    'Updating mastodon/documentation and fetching latest commit SHA...'
  );

  try {
    // Pull the latest changes from the remote repository
    console.log('Pulling latest changes...');
    execSync('git pull origin main', {
      cwd: docsDir,
      stdio: 'inherit',
    });

    // Get the latest commit SHA from the local repository
    const latestCommit = execSync('git rev-parse HEAD', {
      cwd: docsDir,
      encoding: 'utf8',
    }).trim();

    console.log(`Latest commit SHA: ${latestCommit}`);

    // Read current config
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const oldCommit = config.mastodonDocsCommit;

    if (oldCommit === latestCommit) {
      console.log('Config is already up to date.');
      return false;
    }

    // Update config with new commit
    config.mastodonDocsCommit = latestCommit;

    // Write updated config
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');

    console.log(
      `Updated mastodonDocsCommit from ${oldCommit} to ${latestCommit}`
    );
    return true;
  } catch (error) {
    console.error('Error updating docs commit:', (error as Error).message);
    process.exit(1);
  }
}

if (require.main === module) {
  const hasChanges = updateDocsCommit();
  process.exit(hasChanges ? 0 : 1); // Exit with 1 if no changes (for CI workflow)
}

export { updateDocsCommit };
