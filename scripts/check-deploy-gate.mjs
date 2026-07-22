#!/usr/bin/env node
/**
 * Blocks deploy until owner confirms Cloudflare safe mode.
 * Set MAWASHIDZ_CF_SAFE_MODE=confirmed after Version command is
 * `npx wrangler versions upload` (not `npx wrangler deploy` on all branches).
 */
const ok = process.env.MAWASHIDZ_CF_SAFE_MODE === 'confirmed';

if (!ok) {
  console.error(`
╔══════════════════════════════════════════════════════════════════╗
║  DEPLOY BLOCKED — Cloudflare prerequisite not confirmed          ║
╠══════════════════════════════════════════════════════════════════╣
║  mawashidz-live Version command MUST be:                         ║
║    npx wrangler versions upload                                  ║
║  (NOT npx wrangler deploy on every branch)                       ║
║                                                                  ║
║  After the owner fixes the dashboard, run:                       ║
║    export MAWASHIDZ_CF_SAFE_MODE=confirmed                       ║
║                                                                  ║
║  See DEPLOYMENT.md — "Prerequisite gate"                         ║
╚══════════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

console.log('deploy gate: MAWASHIDZ_CF_SAFE_MODE=confirmed');
