#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Setup Mastodon documentation repository at the configured commit SHA
 */
function setupMastodonDocs(): void {
  const configPath = path.join(__dirname, '..', 'config.json');
  const docsDir = path.join(__dirname, '..', 'mastodon-documentation');

  if (!fs.existsSync(configPath)) {
    console.error('config.json not found');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const targetCommit = config.mastodonDocsCommit;
  const overrideCommits = config.overrideCommits || [];
  const overridesRepository = config.overridesRepository;

  if (!targetCommit) {
    console.error('mastodonDocsCommit not found in config.json');
    process.exit(1);
  }

  console.log(`Setting up Mastodon documentation at commit ${targetCommit}...`);

  try {
    // Clone if directory doesn't exist, otherwise just fetch
    if (!fs.existsSync(docsDir)) {
      console.log('Cloning mastodon/documentation repository...');
      execSync(
        'git clone https://github.com/mastodon/documentation mastodon-documentation',
        {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..'),
        }
      );
    } else {
      console.log('Fetching latest commits...');
      execSync('git fetch origin', {
        stdio: 'inherit',
        cwd: docsDir,
      });
    }

    // Checkout the specific commit
    console.log(`Checking out commit ${targetCommit}...`);
    execSync(`git checkout ${targetCommit}`, {
      stdio: 'inherit',
      cwd: docsDir,
    });

    // Apply override commits if any
    if (overrideCommits.length > 0) {
      console.log(`Adding ${overridesRepository} overrides remote...`);
      execSync(`git config user.email "bot@example.com"`, {
        stdio: 'inherit',
        cwd: docsDir,
      });
      execSync(`git config user.name "bot"`, {
        stdio: 'inherit',
        cwd: docsDir,
      });
      execSync(`git remote add overrides ${overridesRepository} || true`, {
        stdio: 'inherit',
        cwd: docsDir,
      });
      execSync(`git fetch overrides`, {
        stdio: 'inherit',
        cwd: docsDir,
      });

      console.log(`Applying ${overrideCommits.length} override commit(s)...`);
      for (const commit of overrideCommits) {
        console.log(`Cherry-picking commit ${commit}...`);
        execSync(`git cherry-pick ${commit}`, {
          stdio: 'inherit',
          cwd: docsDir,
        });
      }
    }

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
}

export { setupMastodonDocs };
