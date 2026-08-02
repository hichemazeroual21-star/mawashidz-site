#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const migration = readFileSync(join(root, 'supabase/migrations/022_fail_closed_admin_audit.sql'), 'utf8');
const verify = readFileSync(join(root, 'supabase/migrations/022_fail_closed_admin_audit.verify.sql'), 'utf8');

const signatures = [
  'public.review_registration_status(text,text,text)',
  'public.set_support_ticket_status(bigint,text)',
];

assert.match(migration, /^begin;/im);
assert.match(migration, /^commit;/im);
assert.match(migration, /022 abort: public\.mdz_audit_admin_action is missing/i);
assert.match(migration, /022 abort: public\.mdz_schema_migrations is missing/i);

for (const signature of signatures) {
  const functionName = signature.match(/public\.([^(]+)/)?.[1];
  assert.ok(functionName, `invalid test signature: ${signature}`);
  assert.match(migration, new RegExp(`create or replace function public\\.${functionName}\\(`, 'i'));
  assert.match(migration, new RegExp(signature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  assert.match(verify, new RegExp(signature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
}

assert.equal(
  (migration.match(/perform public\.mdz_audit_admin_action\(/gi) ?? []).length,
  2,
  'both privileged mutations must invoke the audit writer exactly once',
);
assert.doesNotMatch(
  migration,
  /exception\s+when\s+undefined_function/i,
  '022 must not swallow a missing audit writer',
);
assert.doesNotMatch(
  migration,
  /exception\s+when\s+others/i,
  '022 must not swallow generic audit failures',
);
assert.match(migration, /v_definition\s+~\*\s+'exception\[\[:space:\]\]\+when'/i);
assert.match(migration, /'022',[\s\S]*?'fail_closed_admin_audit'/i);

assert.match(verify, /references_audit_writer/i);
assert.match(verify, /missing_writer_not_swallowed/i);
assert.match(verify, /ledger_022_exists/i);
assert.match(verify, /check_result/i);
assert.match(verify, /public_execute_blocked/i);
assert.match(verify, /anon_execute_blocked/i);
assert.match(verify, /authenticated_execute_allowed/i);
assert.match(verify, /no_exception_handler/i);
assert.match(verify, /security_definer/i);
assert.equal(
  (migration.match(/set search_path = ''/gi) ?? []).length,
  2,
  'both SECURITY DEFINER functions must use an empty search_path',
);
assert.match(
  migration,
  /revoke all on function public\.review_registration_status\(text, text, text\) from public/i,
);
assert.match(
  migration,
  /revoke execute on function public\.review_registration_status\(text, text, text\) from anon/i,
);
assert.match(
  migration,
  /grant execute on function public\.review_registration_status\(text, text, text\) to authenticated, service_role/i,
);
assert.match(
  migration,
  /revoke all on function public\.set_support_ticket_status\(bigint, text\) from public/i,
);
assert.match(
  migration,
  /revoke execute on function public\.set_support_ticket_status\(bigint, text\) from anon/i,
);
assert.match(
  migration,
  /grant execute on function public\.set_support_ticket_status\(bigint, text\) to authenticated/i,
);

console.log('  ✓ migration 022 makes privileged audit fail closed with explicit hardened ACLs');
