#!/usr/bin/env node
/**
 * Phase 0 security: allocate_member_id must NOT be callable by anon/authenticated.
 * Uses live Supabase publishable key (no secret env). Fails on regression.
 */
import assert from 'node:assert/strict';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fpjvjfgwbfehhcvdirpy.supabase.co';
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_kl5En74g9tnPW6JDpf3wDA_wQ573fB9';

let r;
try {
  r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/allocate_member_id`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ member_role: 'vet' }),
  });
} catch (err) {
  console.warn('\n⚠️  test:security SKIPPED — network error:', err.message, '\n');
  process.exit(0);
}

const body = await r.json().catch(() => ({}));
assert.equal(r.status, 401, `anon must not execute allocate_member_id (got ${r.status})`);
assert.match(String(body.message || ''), /permission denied/i, 'expected permission denied for anon RPC');

console.log('  ✓ allocate_member_id blocked for anon (Phase 0 security posture)');
