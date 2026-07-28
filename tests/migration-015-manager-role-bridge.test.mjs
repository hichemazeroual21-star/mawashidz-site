#!/usr/bin/env node
/**
 * Static acceptance for migration 015 — cut profiles.role manager privilege bridge.
 * Pair with live SQL in artifacts/security/2026-07-28-manager-role-bridge-acceptance.sql.txt
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { hasManagerAccess, canReviewRegistration } from '../js/mdz-dashboards.mjs';

const migPath = join(process.cwd(), 'supabase/migrations/015_cut_manager_profiles_role_bridge.sql');
const archivePath = join(process.cwd(), 'artifacts/security/2026-07-28-manager-role-bridge.sql.txt');

assert.ok(existsSync(migPath), '015 migration must exist');
assert.ok(existsSync(archivePath), 'pre-cut archive must exist outside supabase/migrations');
assert.ok(
  !archivePath.includes(`${join('supabase', 'migrations')}`),
  'archive must stay outside supabase/migrations',
);

const sql = readFileSync(migPath, 'utf8');
const archive = readFileSync(archivePath, 'utf8');

// Archive preserves the bridge evidence
assert.match(archive, /or exists\s*\(\s*select 1 from public\.profiles p/i);
assert.match(archive, /lower\(coalesce\(p\.role/i);

// 015 removes profiles.role privilege path and keeps user_roles
assert.match(sql, /create or replace function public\.mdz_is_wilaya_manager\(\)/i);
assert.match(sql, /from public\.user_roles ur/i);
assert.ok(
  !/or\s+exists\s*\(\s*select\s+1\s+from\s+public\.profiles\s+p/i.test(sql),
  '015 must not retain OR exists(... profiles ...) privilege bridge',
);
assert.ok(
  !/lower\(coalesce\(p\.role/i.test(sql),
  '015 must not grant privilege from profiles.role',
);

// Migration ledger introduced without inventing 001–014 history
assert.match(sql, /create table if not exists public\.mdz_schema_migrations/i);
assert.match(sql, /'015'/);
assert.ok(
  !/baseline ledger seed/i.test(sql),
  'must not fabricate applied history for unknown prior migrations',
);

// --- Acceptance pair (client gate mirrors server cut) ---
// 1) profiles.role=manager alone → rejected
assert.equal(hasManagerAccess([]), false);
assert.equal(hasManagerAccess([], 'manager'), false, 'extra args must not restore profiles.role bridge');
assert.equal(
  canReviewRegistration([], 'بسكرة', 'بسكرة', { asAdmin: false, profileRole: 'manager' }),
  false,
  'profiles.role=manager must not pass review client gate',
);

// 2) temporary user_roles manager row → accepted
assert.equal(hasManagerAccess(['wilaya_manager']), true);
assert.equal(hasManagerAccess(['manager']), true);
assert.equal(
  canReviewRegistration(['wilaya_manager'], 'بسكرة', 'بسكرة', { asAdmin: false }),
  true,
  'user_roles manager must still pass review client gate',
);

console.log('  ✓ migration 015 cuts profiles.role bridge; acceptance pair holds');
