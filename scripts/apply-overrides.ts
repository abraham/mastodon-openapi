#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Apply override commits to the mastodon-documentation repository
 */
function applyOverrides(): void {
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

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const overrideCommits = config.overrideCommits || [];
  const overridesRepository = config.overridesRepository;

  // Exit early if no overrides to apply
  if (overrideCommits.length === 0) {
    console.log('No override commits to apply.');
    return;
  }

  console.log(`Applying ${overrideCommits.length} override commit(s)...`);

  try {
    // Configure git user for cherry-picking
    console.log('Configuring git user...');
    execSync(`git config user.email "bot@example.com"`, {
      stdio: 'inherit',
      cwd: docsDir,
    });
    execSync(`git config user.name "bot"`, {
      stdio: 'inherit',
      cwd: docsDir,
    });

    // Add overrides remote if repository is specified
    if (overridesRepository) {
      console.log(`Adding ${overridesRepository} overrides remote...`);
      execSync(`git remote add overrides ${overridesRepository} || true`, {
        stdio: 'inherit',
        cwd: docsDir,
      });
      execSync(`git fetch overrides`, {
        stdio: 'inherit',
        cwd: docsDir,
      });
    }

    // Apply each override commit
    for (const commit of overrideCommits) {
      console.log(`Cherry-picking commit ${commit}...`);
      execSync(`git cherry-pick ${commit}`, {
        stdio: 'inherit',
        cwd: docsDir,
      });
    }

    console.log('Override commits applied successfully.');
  } catch (error) {
    console.error('Error applying override commits:', (error as Error).message);
    process.exit(1);
  }
}

if (require.main === module) {
  applyOverrides();
}

export { applyOverrides };
