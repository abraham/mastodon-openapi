#!/usr/bin/env ts-node

import fs from 'fs';
import {
  getConfig,
  SECURITY_POLICY_DIR,
  SECURITY_POLICY_PATH,
  SECURITY_POLICY_SHA_PATH,
} from '../src/config';

function securityPolicyUrl(commit: string): string {
  return `https://raw.githubusercontent.com/mastodon/mastodon/${commit}/SECURITY.md`;
}

/**
 * Download mastodon/mastodon SECURITY.md at the configured commit SHA. This is
 * the canonical source for which Mastodon versions are supported.
 */
async function setupSecurityPolicy(): Promise<void> {
  const commit = getConfig().mastodonSecurityCommit;

  if (
    fs.existsSync(SECURITY_POLICY_PATH) &&
    fs.existsSync(SECURITY_POLICY_SHA_PATH) &&
    fs.readFileSync(SECURITY_POLICY_SHA_PATH, 'utf8').trim() === commit
  ) {
    console.log(`SECURITY.md already vendored at commit ${commit}.`);
    return;
  }

  console.log(`Downloading SECURITY.md at commit ${commit}...`);

  const response = await fetch(securityPolicyUrl(commit));
  if (!response.ok) {
    throw new Error(
      `Failed to download SECURITY.md at ${commit}: ${response.status} ${response.statusText}`
    );
  }

  const content = await response.text();
  if (!content.includes('## Supported Versions')) {
    throw new Error(
      `SECURITY.md at ${commit} has no "## Supported Versions" section`
    );
  }

  fs.mkdirSync(SECURITY_POLICY_DIR, { recursive: true });
  fs.writeFileSync(SECURITY_POLICY_PATH, content);
  fs.writeFileSync(SECURITY_POLICY_SHA_PATH, `${commit}\n`);

  console.log(`SECURITY.md vendored at ${SECURITY_POLICY_PATH}.`);
}

if (require.main === module) {
  setupSecurityPolicy().catch((error: Error) => {
    console.error('Error setting up security policy:', error.message);
    process.exit(1);
  });
}

export { setupSecurityPolicy, securityPolicyUrl };
