#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Update the mastodonDocsCommit in config.json to the latest commit from main branch
 */
function updateDocsCommit() {
  const configPath = path.join(__dirname, '..', 'config.json');

  if (!fs.existsSync(configPath)) {
    console.error('config.json not found');
    process.exit(1);
  }

  console.log('Fetching latest commit SHA from mastodon/documentation...');

  try {
    // Get the latest commit SHA from the remote repository
    const latestCommit = execSync(
      'git ls-remote https://github.com/mastodon/documentation refs/heads/main',
      { encoding: 'utf8' }
    )
      .trim()
      .split('\t')[0];

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
    console.error('Error updating docs commit:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  const hasChanges = updateDocsCommit();
  process.exit(hasChanges ? 0 : 1); // Exit with 1 if no changes (for CI workflow)
}

module.exports = { updateDocsCommit };
