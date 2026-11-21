#!/usr/bin/env ts-node

import fs from 'fs';
import { execFileSync } from 'child_process';
import { getConfig, DOCS_ROOT } from '../src/config';

const GIT_SHA_RE = /^[0-9a-f]{40}$/;

/**
 * Apply override commits to the mastodon-documentation repository
 */
function applyOverrides(): void {
  const docsDir = DOCS_ROOT;

  if (!fs.existsSync(docsDir)) {
    console.error(
      'mastodon-documentation directory not found. Run setup-docs first.'
    );
    process.exit(1);
  }

  const config = getConfig();
  const overrideCommits = config.overrideCommits;
  const overridesRepository = config.overridesRepository;

  // Exit early if no overrides to apply
  if (overrideCommits.length === 0) {
    console.log('No override commits to apply.');
    return;
  }

  for (const commit of overrideCommits) {
    if (!GIT_SHA_RE.test(commit)) {
      console.error(`Invalid override commit SHA: ${commit}`);
      process.exit(1);
    }
  }

  console.log(`Applying ${overrideCommits.length} override commit(s)...`);

  try {
    // Configure git user for cherry-picking
    console.log('Configuring git user...');
    execFileSync('git', ['config', 'user.email', 'bot@example.com'], {
      stdio: 'inherit',
      cwd: docsDir,
    });
    execFileSync('git', ['config', 'user.name', 'bot'], {
      stdio: 'inherit',
      cwd: docsDir,
    });

    // Add or update overrides remote if repository is specified
    if (overridesRepository) {
      console.log(`Configuring ${overridesRepository} overrides remote...`);
      let hasRemote = false;
      try {
        execFileSync('git', ['remote', 'get-url', 'overrides'], {
          stdio: 'ignore',
          cwd: docsDir,
        });
        hasRemote = true;
      } catch {
        hasRemote = false;
      }

      execFileSync(
        'git',
        [
          'remote',
          hasRemote ? 'set-url' : 'add',
          '--',
          'overrides',
          overridesRepository,
        ],
        {
          stdio: 'inherit',
          cwd: docsDir,
        }
      );
      execFileSync('git', ['fetch', 'overrides'], {
        stdio: 'inherit',
        cwd: docsDir,
      });
    }

    // Apply each override commit
    for (const commit of overrideCommits) {
      console.log(`Cherry-picking commit ${commit}...`);
      execFileSync('git', ['cherry-pick', commit], {
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
