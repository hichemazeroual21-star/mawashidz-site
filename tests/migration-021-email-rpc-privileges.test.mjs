#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const migration = readFileSync(join(root, 'supabase/migrations/021_reconcile_email_rpc_privileges.sql'), 'utf8');
const verify = readFileSync(join(root, 'supabase/migrations/021_reconcile_email_rpc_privileges.verify.sql'), 'utf8');

const signatures = [
  'mdz_claim_email_outbox',
  'mdz_enqueue_email',
  'mdz_mark_email_outbox',
  'mdz_notify_user',
];

assert.match(migration, /^begin;/im);
assert.match(migration, /^commit;/im);
assert.match(migration, /to_regprocedure\(v_signature\) is null/i);

for (const name of signatures) {
  assert.match(migration, new RegExp(`revoke all on function public\\.${name}`, 'i'));
  assert.match(migration, new RegExp(`revoke execute on function public\\.${name}[\\s\\S]*?from anon, authenticated`, 'i'));
  assert.match(migration, new RegExp(`grant execute on function public\\.${name}[\\s\\S]*?to service_role`, 'i'));
  assert.match(verify, new RegExp(`public\\.${name}\\(`, 'i'));
}

assert.match(migration, /has_function_privilege\('public', v_signature, 'EXECUTE'\)/i);
assert.match(migration, /has_function_privilege\('anon', v_signature, 'EXECUTE'\)/i);
assert.match(migration, /has_function_privilege\('authenticated', v_signature, 'EXECUTE'\)/i);
assert.match(migration, /not has_function_privilege\('service_role', v_signature, 'EXECUTE'\)/i);
assert.match(migration, /\(\s*'021',[\s\S]*?'reconcile_email_rpc_privileges'/i);
assert.match(verify, /ledger_021_exists/i);
assert.match(verify, /check_result/i);

assert.doesNotMatch(migration, /create or replace function/i, '021 must not rewrite function bodies');
assert.doesNotMatch(migration, /grant execute[^;]+to\s+(anon|authenticated|public)\s*;/i);

console.log('  ✓ migration 021 reconciles email RPC privileges without rewriting runtime functions');
