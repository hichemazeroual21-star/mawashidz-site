#!/usr/bin/env node
/**
 * Fail early on bad SUPABASE_URL shape and (when required) missing outbox secrets.
 *
 * Usage:
 *   node scripts/check-outbox-env.mjs
 *   OUTBOX_REQUIRE_SECRETS=1 node scripts/check-outbox-env.mjs   # also require all four keys in env
 *
 * Cloudflare Workers Builds do not inject Worker secrets into the build env by default.
 * Set OUTBOX_REQUIRE_SECRETS=1 only when secrets are present (local / CI with vault).
 * Dashboard secrets on the Worker that serves mawashidz.com must still be verified manually
 * or via smoke:email-outbox after deploy.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateSupabaseUrlConfig } from './lib/supabase-url.mjs';

const REQUIRED = [
  'EMAIL_OUTBOX_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
];

let failed = 0;
const fail = (m) => {
  console.error(`FAIL: ${m}`);
  failed++;
};

const wranglerPath = join(process.cwd(), 'wrangler.jsonc');
const wranglerRaw = readFileSync(wranglerPath, 'utf8').replace(/^\s*\/\/.*$/gm, '');
const wrangler = JSON.parse(wranglerRaw.replace(/,\s*}/g, '}'));
if (wrangler.name !== 'mawashidz-live') {
  fail(`wrangler.jsonc name is "${wrangler.name}", expected mawashidz-live (domain must match this Worker)`);
} else {
  console.log('ok: wrangler.jsonc name=mawashidz-live');
}

const url = process.env.SUPABASE_URL || process.env.MDZ_SUPABASE_URL || '';
if (url) {
  const v = validateSupabaseUrlConfig(url);
  if (!v.ok) {
    for (const e of v.errors) fail(`SUPABASE_URL: ${e}`);
  } else {
    console.log(`ok: SUPABASE_URL shape → ${v.normalized}`);
  }
} else {
  console.log('skip: SUPABASE_URL not in process env (normal for CF build; set on Worker runtime)');
}

if (process.env.OUTBOX_REQUIRE_SECRETS === '1') {
  for (const k of REQUIRED) {
    const val = process.env[k] || '';
    if (!String(val).trim()) fail(`missing required secret/env: ${k}`);
    else console.log(`ok: ${k} is set`);
  }
  if (process.env.EMAIL_OUTBOX_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY
    && process.env.EMAIL_OUTBOX_SECRET === process.env.SUPABASE_SERVICE_ROLE_KEY) {
    fail('EMAIL_OUTBOX_SECRET must not equal SUPABASE_SERVICE_ROLE_KEY');
  }
} else {
  console.log('skip: OUTBOX_REQUIRE_SECRETS!=1 — not asserting all four keys in build env');
}

if (failed) {
  console.error(`\ncheck-outbox-env: ${failed} failure(s)`);
  process.exit(1);
}
console.log('check-outbox-env: ok');
