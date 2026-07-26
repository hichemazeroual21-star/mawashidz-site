#!/usr/bin/env node
/**
 * Static + contract review of migration 014 (registration_id integrity)
 * + dry-run / backup / rollback operator SQL.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const migPath = join(root, 'supabase/migrations/014_registration_id_integrity.sql');
const dryPath = join(root, 'docs/reports/sql/014_registration_id_dry_run.sql');
const backupPath = join(root, 'docs/reports/sql/014_pre_apply_backup.sql');
const rollbackPath = join(root, 'docs/reports/sql/014_rollback.sql');
const planPath = join(root, 'docs/reports/REGISTRATION_ID_INTEGRITY_014_PLAN.md');

assert.ok(existsSync(migPath), 'migration 014 must exist');
assert.ok(existsSync(dryPath), 'dry-run SQL must exist');
assert.ok(existsSync(backupPath), 'pre-apply backup SQL must exist');
assert.ok(existsSync(rollbackPath), 'rollback SQL must exist');
assert.ok(existsSync(planPath), 'plan doc must exist');

// Operator artifacts must NOT live under supabase/migrations/
assert.ok(!existsSync(join(root, 'supabase/migrations/014_pre_apply_backup.sql')));
assert.ok(!existsSync(join(root, 'supabase/migrations/014_rollback.sql')));

const sql = readFileSync(migPath, 'utf8');
const dry = readFileSync(dryPath, 'utf8');
const backup = readFileSync(backupPath, 'utf8');
const rollback = readFileSync(rollbackPath, 'utf8');
const plan = readFileSync(planPath, 'utf8');

assert.match(sql, /mdz_next_registration_id/i);
assert.match(sql, /mdz_registration_id_seq/i);
assert.match(sql, /mdz_msg_registration_id/i);
assert.match(sql, /mdz_is_test_registration_email/i);
assert.match(sql, /mdz_is_real_pending_registration/i);
assert.match(sql, /mdz_registration_id_missing/i);
assert.match(sql, /example\\\.com/i);
assert.match(sql, /probe|e2e/i);
assert.match(sql, /mdz_registrations_assign_registration_id/i);
assert.match(sql, /before insert on public\.registrations/i);
assert.match(sql, /MDZ-REG-/);
assert.match(sql, /registrations_registration_id_uidx/);
assert.match(sql, /raise exception/i);
assert.match(sql, /not exists/i);

// Sequence seeding: zero-capable setval; no unused cur
assert.match(
  sql,
  /perform setval\(\s*'public\.mdz_registration_id_seq',\s*greatest\(max_n,\s*1\),\s*max_n\s*>\s*0\s*\)/is,
);
assert.ok(!/\bcur\b/.test(sql), 'removed cur variable must not be referenced');

// Safe JSON helper shape + grants
assert.match(sql, /create or replace function public\.mdz_msg_registration_id\(p_message text\)/i);
assert.match(sql, /language plpgsql\s*immutable/i);
assert.match(sql, /exception when others then\s*return null/is);
assert.match(
  sql,
  /revoke all on function public\.mdz_msg_registration_id\(text\) from public/i,
);
assert.match(
  sql,
  /revoke all on function public\.mdz_msg_registration_id\(text\) from anon,\s*authenticated/i,
);
assert.match(
  sql,
  /grant execute on function public\.mdz_msg_registration_id\(text\) to service_role/i,
);

// Direct message::jsonb ->> registration_id only inside mdz_msg_registration_id body
const directJsonExtract = [...sql.matchAll(/(\w[\w.]*)\s*::jsonb\s*->>\s*'registration_id'/gi)];
assert.ok(directJsonExtract.length >= 1, 'helper body must cast message to jsonb');
for (const m of directJsonExtract) {
  assert.equal(
    m[1].toLowerCase(),
    'p_message',
    `direct jsonb extract must use p_message only, found: ${m[1]}`,
  );
}
assert.ok(
  !/\br\.message\s*::jsonb\s*->>\s*'registration_id'/i.test(sql),
  'backfill must not use raw r.message::jsonb extract',
);
assert.ok(
  !/\bnew\.message\s*::jsonb\s*->>\s*'registration_id'/i.test(sql),
  'trigger must not use raw new.message::jsonb extract',
);
assert.match(sql, /public\.mdz_msg_registration_id\(r\.message\)/);
assert.match(sql, /public\.mdz_msg_registration_id\(new\.message\)/);

// Positive inclusion + missing-id guards
assert.ok(
  /mdz_is_real_pending_registration\s*\(/i.test(sql),
  'mutations must use positive real-pending predicate',
);
assert.ok(
  /mdz_registration_id_missing\s*\(/i.test(sql),
  'mutations must guard missing registration_id',
);

// Trigger must preserve client-supplied id
assert.match(
  sql,
  /if not public\.mdz_registration_id_missing\(new\.registration_id\) then\s*return new;/is,
);

assert.ok(/pending/i.test(sql), 'must target pending/real rows');
assert.ok(!/drop table/i.test(sql), '014 must not drop tables');
assert.ok(!/delete from public\.registrations/i.test(sql), '014 must not delete registration rows');

// Dry-run is self-contained (no public.mdz_msg_registration_id) + no row DML
assert.ok(
  !/public\.mdz_msg_registration_id/i.test(dry),
  'dry-run must not depend on public.mdz_msg_registration_id before migration apply',
);
assert.match(dry, /pg_temp\.mdz_dry_msg_registration_id/i);
assert.match(dry, /exception when others then\s*return null/is);
assert.ok(!/^\s*(insert|update|delete|truncate)\b/im.test(dry), 'dry-run must not contain row DML');
assert.match(dry, /recover_from_message/);
assert.match(dry, /will_generate/);
assert.match(dry, /excluded_as_test/);
assert.match(dry, /already_has_id/);

// CTE scope fix: A/B must not select from bare "enriched" without a statement-local WITH.
// Preferred pattern: temp view shared by A/B.
assert.match(dry, /create temporary view mdz_014_dry_run_enriched/i);
assert.match(dry, /from mdz_014_dry_run_enriched/i);
{
  // Strip line comments for statement splitting
  const dryNoLineComments = dry.replace(/--[^\n]*/g, '');
  const statements = dryNoLineComments
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  // Bare SELECT from enriched without a statement-local WITH is the original 42P01 bug.
  const bareSelectsFromEnriched = statements.filter(
    (s) => /^\s*select\b/i.test(s) && /\bfrom\s+enriched\b/i.test(s),
  );
  for (const stmt of bareSelectsFromEnriched) {
    assert.match(
      stmt,
      /^\s*with\b/i,
      'SELECT from enriched must include its own WITH (Postgres CTE scope ends at statement)',
    );
  }
  // CREATE VIEW ... AS WITH ... SELECT * FROM enriched is OK (WITH is inside the view body).
  const viewDefiningEnriched = statements.filter(
    (s) =>
      /create\s+temporary\s+view\s+mdz_014_dry_run_enriched/i.test(s) &&
      /\bwith\b[\s\S]*\benriched\s+as\b/i.test(s) &&
      /\bfrom\s+enriched\b/i.test(s),
  );
  assert.equal(viewDefiningEnriched.length, 1, 'temp view must define enriched CTE once');
  const selectsFromTempView = statements.filter(
    (s) => /^\s*select\b/i.test(s) && /\bfrom\s+mdz_014_dry_run_enriched\b/i.test(s),
  );
  assert.ok(
    selectsFromTempView.length >= 2,
    'queries A and B must both read mdz_014_dry_run_enriched',
  );
}

// Backup never overwrites
assert.match(backup, /create table if not exists public\.registrations_regid_backup_014/i);
assert.match(backup, /previous_registration_id/);
assert.match(plan, /014_pre_apply_backup\.sql/);
assert.match(plan, /\|\s*\*\*0\*\*\s*\|\s*Run \*\*backup\*\*/);

// Rollback restores only when safe, then drops objects
assert.match(rollback, /registrations_regid_backup_014/);
assert.match(rollback, /profiles/);
assert.match(rollback, /support_tickets/);
assert.match(rollback, /reviewed_at/);
assert.match(rollback, /notifications/);
assert.match(rollback, /email_outbox/);
assert.match(rollback, /admin_audit_log/);
assert.match(rollback, /drop trigger if exists mdz_registrations_assign_registration_id/i);
assert.match(rollback, /drop function if exists public\.mdz_msg_registration_id/i);
assert.match(rollback, /drop index if exists public\.registrations_registration_id_uidx/i);
assert.match(rollback, /drop sequence if exists public\.mdz_registration_id_seq/i);
assert.match(plan, /Rollback procedure/i);
assert.match(plan, /\|\s*\*\*0\*\*\s*\|\s*Run \*\*backup\*\*/);

// --- Contract: mdz_msg_registration_id (mirrors SQL helper semantics) ---
function mdzMsgRegistrationId(pMessage) {
  if (pMessage == null || String(pMessage).trim() === '') return null;
  try {
    const obj = JSON.parse(pMessage);
    const raw = obj?.registration_id;
    const extracted = raw == null ? '' : String(raw).trim();
    return extracted === '' ? null : extracted;
  } catch {
    return null;
  }
}

assert.equal(
  mdzMsgRegistrationId('{"registration_id":"MDZ-REG-2026-000001"}'),
  'MDZ-REG-2026-000001',
  'valid JSON → returns registration_id',
);
assert.equal(
  mdzMsgRegistrationId('{"registration_id":"  MDZ-REG-2026-000002  "}'),
  'MDZ-REG-2026-000002',
  'valid JSON trims registration_id',
);
assert.equal(mdzMsgRegistrationId('not-json{'), null, 'malformed JSON → returns NULL');
assert.equal(mdzMsgRegistrationId('{bad'), null, 'malformed JSON → returns NULL');
assert.equal(mdzMsgRegistrationId('{"other":1}'), null, 'missing key → NULL');
assert.equal(mdzMsgRegistrationId(null), null);

// --- Contract: sequence seeding with zero MDZ-REG-* rows must not throw ---
function nextValAfterSeed(maxN) {
  const value = Math.max(maxN, 1);
  const isCalled = maxN > 0;
  // Postgres setval(seq, value, is_called): next nextval is value+1 if is_called else value
  return isCalled ? value + 1 : value;
}
assert.equal(nextValAfterSeed(0), 1, 'zero MDZ-REG rows: next id starts at 1 (no throw)');
assert.equal(nextValAfterSeed(5), 6, 'existing max 5 → next 6');

console.log('  ✓ migration 014 registration_id integrity shape');
