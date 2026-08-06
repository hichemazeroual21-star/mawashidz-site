#!/usr/bin/env node
/**
 * Emergency / break-glass production deploy from local checkout.
 * Canonical path: merge to main → Cloudflare Workers Builds (see DEPLOYMENT.md).
 */
import { execSync } from 'node:child_process';
import { PII_HOLD_ACTIVE } from '../worker.mjs';

function run(cmd, env = {}) {
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });
}

run('node scripts/check-deploy-gate.mjs');
run('node scripts/check-outbox-env.mjs');
run('npm test');
run('npm run build');

let commit = 'unknown';
try {
  commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch {
  /* empty */
}

run('npx wrangler deploy', { VERIFY_GIT_COMMIT: commit });
run(PII_HOLD_ACTIVE ? 'npm run verify:pii-hold' : 'npm run verify:prod', { VERIFY_GIT_COMMIT: commit });

if (PII_HOLD_ACTIVE) {
  console.log('skip smoke:email-outbox (PII hold requires the route to stay blocked)');
} else if (process.env.EMAIL_OUTBOX_SECRET) {
  run('npm run smoke:email-outbox');
} else {
  console.log('skip smoke:email-outbox (EMAIL_OUTBOX_SECRET unset)');
}

console.log(`\nEmergency deploy finished (${PII_HOLD_ACTIVE ? 'PII hold' : 'normal'} verifier). Prefer Git → main → Cloudflare for routine releases.`);
