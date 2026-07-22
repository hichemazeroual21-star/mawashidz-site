#!/usr/bin/env node
/**
 * Emergency / break-glass production deploy from local checkout.
 * Canonical path: merge to main → Cloudflare Workers Builds (see DEPLOYMENT.md).
 */
import { execSync } from 'node:child_process';

function run(cmd, env = {}) {
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });
}

run('node scripts/check-deploy-gate.mjs');
run('npm test');
run('npm run build');

let commit = 'unknown';
try {
  commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch {
  /* empty */
}

run('npx wrangler deploy', { VERIFY_GIT_COMMIT: commit });
run('npm run verify:prod', { VERIFY_GIT_COMMIT: commit });

console.log('\nEmergency deploy finished. Prefer Git → main → Cloudflare for routine releases.');
