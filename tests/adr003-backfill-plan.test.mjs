#!/usr/bin/env node
/**
 * Static + logic guards for ADR-003 user_roles backfill plan (no prod I/O).
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const files = [
  'docs/runbooks/ADR003_USER_ROLES_BACKFILL.md',
  'supabase/sql/adr003_backfill_01_discovery.sql',
  'supabase/sql/adr003_backfill_02_apply.sql',
  'supabase/sql/adr003_backfill_03_verify.sql',
  'supabase/sql/adr003_backfill_04_rollback.sql',
];
for (const f of files) {
  assert.ok(existsSync(join(root, f)), `missing ${f}`);
}

const discovery = readFileSync(join(root, 'supabase/sql/adr003_backfill_01_discovery.sql'), 'utf8');
const apply = readFileSync(join(root, 'supabase/sql/adr003_backfill_02_apply.sql'), 'utf8');
const verify = readFileSync(join(root, 'supabase/sql/adr003_backfill_03_verify.sql'), 'utf8');
const rollback = readFileSync(join(root, 'supabase/sql/adr003_backfill_04_rollback.sql'), 'utf8');
const runbook = readFileSync(join(root, 'docs/runbooks/ADR003_USER_ROLES_BACKFILL.md'), 'utf8');

assert.match(discovery, /has_platform_admin/);
assert.match(discovery, /backfill_candidate_count/);
assert.match(discovery, /wilaya_manager/);
assert.ok(!/\b(insert|update|delete)\b/i.test(discovery.replace(/--.*/g, '')), 'discovery must be read-only');

assert.match(apply, /mdz_ops_backfill_log/);
assert.match(apply, /ABORT: no platform admin/);
assert.match(apply, /on conflict \(user_id, role\) do nothing/i);
assert.match(apply, /wilaya_manager/);
assert.ok(!/delete from public\.user_roles/i.test(apply), 'apply must not delete user_roles');
assert.ok(!/update public\.profiles/i.test(apply), 'apply must not rewrite profiles');

assert.match(verify, /managers_missing_elevation/);
assert.match(verify, /would_pass_post_014/);
assert.match(verify, /has_platform_admin/);

assert.match(rollback, /batch_id/);
assert.match(rollback, /ROLLED_BACK|delete from public\.user_roles/i);
assert.ok(
  /ur\.role not in \('admin', 'founder', 'super_admin'\)|not in \('admin', 'founder', 'super_admin'\)/i.test(rollback),
  'rollback must protect platform roles',
);

assert.match(runbook, /لا تُنفَّذ على الإنتاج الليلة|Plan only/);
assert.match(runbook, /has_platform_admin/);

/** Simulate: who needs backfill + post-014 access */
function needsBackfill(profileRole, userRoles) {
  const pr = String(profileRole || '').toLowerCase();
  const bridge = ['manager', 'wilaya_manager', 'wilaya_mgr'].includes(pr);
  const hasElev = (userRoles || []).some((r) =>
    ['wilaya_manager', 'manager', 'wilaya_mgr'].includes(String(r).toLowerCase()),
  );
  return bridge && !hasElev;
}

function wouldPassPost014(userRoles) {
  return (userRoles || []).some((r) =>
    ['wilaya_manager', 'manager', 'wilaya_mgr'].includes(String(r).toLowerCase()),
  );
}

function hasPlatformAdmin(userRoles) {
  return (userRoles || []).some((r) =>
    ['admin', 'founder', 'super_admin'].includes(String(r).toLowerCase()),
  );
}

// Cases
assert.equal(needsBackfill('manager', []), true);
assert.equal(needsBackfill('manager', ['wilaya_manager']), false);
assert.equal(needsBackfill('breeder', []), false);
assert.equal(needsBackfill('manager', ['founder']), true); // founder still needs wilaya elev if operating as manager label

// After simulated backfill, privilege preserved
const before = { profileRole: 'manager', userRoles: [] };
assert.equal(wouldPassPost014(before.userRoles), false);
assert.equal(needsBackfill(before.profileRole, before.userRoles), true);
const after = { profileRole: 'manager', userRoles: ['wilaya_manager'] };
assert.equal(wouldPassPost014(after.userRoles), true);

// Founder admin panel independent of wilaya backfill
assert.equal(hasPlatformAdmin(['founder']), true);
assert.equal(hasPlatformAdmin([]), false);
assert.equal(hasPlatformAdmin(['wilaya_manager']), false);

// Backfill must not strip founder
const founderMgr = { userRoles: ['founder'] };
const afterAlso = { userRoles: ['founder', 'wilaya_manager'] };
assert.equal(hasPlatformAdmin(founderMgr.userRoles), true);
assert.equal(hasPlatformAdmin(afterAlso.userRoles), true);
assert.equal(wouldPassPost014(afterAlso.userRoles), true);

console.log('  ✓ ADR-003 backfill plan guards + privilege simulation');
