#!/usr/bin/env ts-node

import fs from 'fs';
import { execSync } from 'child_process';
import { applyOverrides } from './apply-overrides';
import { setupSecurityPolicy } from './setup-security-policy';
import { CONFIG_PATH, DOCS_ROOT, resetConfigCache } from '../src/config';

/**
 * Update the mastodonDocsCommit in config.json to the latest commit from main branch
 */
function updateDocsCommit(): boolean {
  const configPath = CONFIG_PATH;
  const docsDir = DOCS_ROOT;

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
    // Fetch the latest changes from the remote repository
    console.log('Fetching latest changes...');
    execSync('git fetch origin', {
      cwd: docsDir,
      stdio: 'inherit',
    });

    // Reset local branch to match origin/main, discarding any local changes
    console.log('Resetting to origin/main...');
    execSync('git reset --hard origin/main', {
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

    // Apply override commits
    applyOverrides();

    return true;
  } catch (error) {
    console.error('Error updating docs commit:', (error as Error).message);
    process.exit(1);
  }
}

/**
 * Update mastodonSecurityCommit to the current mastodon/mastodon main SHA and
 * re-vendor SECURITY.md, which is the canonical list of supported versions.
 */
async function updateSecurityCommit(): Promise<boolean> {
  console.log('Resolving latest mastodon/mastodon commit...');

  const lsRemote = execSync(
    'git ls-remote https://github.com/mastodon/mastodon refs/heads/main',
    { encoding: 'utf8' }
  ).trim();
  const latestCommit = lsRemote.split(/\s+/)[0];

  if (!/^[0-9a-f]{40}$/.test(latestCommit)) {
    throw new Error(`Unexpected git ls-remote output: ${lsRemote}`);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const oldCommit = config.mastodonSecurityCommit;

  if (oldCommit !== latestCommit) {
    config.mastodonSecurityCommit = latestCommit;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
    resetConfigCache();
    console.log(
      `Updated mastodonSecurityCommit from ${oldCommit} to ${latestCommit}`
    );
  }

  await setupSecurityPolicy();

  return oldCommit !== latestCommit;
}

if (require.main === module) {
  const docsChanged = updateDocsCommit();
  updateSecurityCommit()
    .then((securityChanged) => {
      const hasChanges = docsChanged || securityChanged;
      console.log(
        hasChanges
          ? 'Pinned commits updated.'
          : 'Pinned commits already current.'
      );

      // Nothing to update is a normal outcome, not a failure. Callers that care
      // should diff config.json and dist/schema.json.
      process.exit(0);
    })
    .catch((error: Error) => {
      console.error('Error updating security commit:', error.message);
      process.exit(1);
    });
}

export { updateDocsCommit, updateSecurityCommit };
