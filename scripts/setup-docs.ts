#!/usr/bin/env ts-node

import fs from 'fs';
import { execFileSync } from 'child_process';
import { applyOverrides } from './apply-overrides';
import { setupSecurityPolicy } from './setup-security-policy';
import { getConfig, DOCS_ROOT, REPO_ROOT } from '../src/config';

const GIT_SHA_RE = /^[0-9a-f]{40}$/;

/**
 * Setup Mastodon documentation repository at the configured commit SHA
 */
function setupMastodonDocs(): void {
  const docsDir = DOCS_ROOT;
  const targetCommit = getConfig().mastodonDocsCommit;

  if (!GIT_SHA_RE.test(targetCommit)) {
    console.error(`Invalid mastodonDocsCommit SHA: ${targetCommit}`);
    process.exit(1);
  }

  console.log(`Setting up Mastodon documentation at commit ${targetCommit}...`);

  try {
    // Clone if directory doesn't exist, otherwise just fetch
    if (!fs.existsSync(docsDir)) {
      console.log('Cloning mastodon/documentation repository...');
      execFileSync(
        'git',
        [
          'clone',
          'https://github.com/mastodon/documentation',
          'mastodon-documentation',
        ],
        {
          stdio: 'inherit',
          cwd: REPO_ROOT,
        }
      );
    } else {
      console.log('Fetching latest commits...');
      execFileSync('git', ['fetch', 'origin'], {
        stdio: 'inherit',
        cwd: docsDir,
      });
    }

    // Checkout the specific commit
    console.log(`Checking out commit ${targetCommit}...`);
    execFileSync('git', ['checkout', targetCommit], {
      stdio: 'inherit',
      cwd: docsDir,
    });

    // Apply override commits
    applyOverrides();

    console.log('Mastodon documentation setup complete.');
  } catch (error) {
    console.error(
      'Error setting up mastodon documentation:',
      (error as Error).message
    );
    process.exit(1);
  }
}

if (require.main === module) {
  setupMastodonDocs();
  setupSecurityPolicy().catch((error: Error) => {
    console.error('Error setting up security policy:', error.message);
    process.exit(1);
  });
}

export { setupMastodonDocs };
