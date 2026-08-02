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
assert.match(migration, /v_live_server_major\s*<>\s*18/i);
assert.match(migration, /does not match isolated-tested major 18/i);

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
assert.match(verify, /no_exception_handler/i);
assert.match(verify, /ledger_version/i);
assert.match(verify, /check_result/i);
assert.match(verify, /public_execute_blocked/i);
assert.match(verify, /anon_execute_blocked/i);
assert.match(verify, /authenticated_execute_allowed/i);
assert.match(verify, /security_definer/i);
assert.match(verify, /expected_source_sha256/i);
assert.match(verify, /actual_source_sha256/i);
assert.match(verify, /expected_source_utf8_bytes/i);
assert.match(verify, /actual_source_utf8_bytes/i);
assert.match(verify, /binary_reference_is_null/i);
assert.match(verify, /sql_body_is_null/i);
assert.match(verify, /unexpected_overload_count/i);
assert.match(verify, /expected_direct_execute_grantees/i);
assert.match(verify, /actual_direct_execute_grantees/i);
assert.match(verify, /unexpected_execute_grantors/i);
assert.match(verify, /unexpected_grantable_grantees/i);
assert.match(migration, /acl_normalize/i);
assert.match(migration, /revoke execute on function %s from %I cascade/i);
assert.match(verify, /server_version_num/i);
assert.match(verify, /captured_at_utc/i);
assert.match(verify, /OK_ATTESTED/i);
for (const sourceSha256 of [
  '315a74e268c4e0f7f593c27e69182bd1f08dc4ba039877cc5f9aceeac81f93d7',
  '80002a92f653641b0f751ad76a63dfdafc2ed3026dea1fdcd5981164557c837d',
]) {
  assert.match(migration, new RegExp(sourceSha256, 'i'));
  assert.match(verify, new RegExp(sourceSha256, 'i'));
}
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
  /grant execute on function public\.review_registration_status\(text, text, text\)\s+to authenticated, service_role/i,
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
