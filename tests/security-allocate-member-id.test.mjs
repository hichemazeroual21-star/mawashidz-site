#!/usr/bin/env node
/**
 * Phase 0 security: allocate_member_id must NOT be callable by anon/authenticated.
 * Run against live Supabase: node tests/security-allocate-member-id.test.mjs
 */
import assert from 'node:assert/strict';

const SUPABASE_URL = 'https://fpjvjfgwbfehhcvdirpy.supabase.co';
const KEY = 'sb_publishable_kl5En74g9tnPW6JDpf3wDA_wQ573fB9';

const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/allocate_member_id`, {
  method: 'POST',
  headers: {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ member_role: 'vet' }),
});

const body = await r.json().catch(() => ({}));
assert.equal(r.status, 401, `anon must not execute allocate_member_id (got ${r.status})`);
assert.match(String(body.message || ''), /permission denied/i, 'expected permission denied for anon RPC');

console.log('  ✓ allocate_member_id blocked for anon (Phase 0 security posture)');
