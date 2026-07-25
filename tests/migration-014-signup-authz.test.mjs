#!/usr/bin/env node
/**
 * Static security review of migration 014 (signup authz harden + ADR-003 A).
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const path = join(process.cwd(), 'supabase/migrations/014_signup_authz_harden.sql');
assert.ok(existsSync(path), 'migration 014 must exist');

const sql = readFileSync(path, 'utf8');

assert.match(sql, /create or replace function public\.mdz_membership_role/i);
assert.match(sql, /when 'breeder' then 'breeder'/i);
assert.match(sql, /else 'buyer'/i);

assert.match(sql, /create or replace function public\.mdz_is_wilaya_manager\(\)/i);
assert.match(sql, /from public\.user_roles ur/i);
const mgrFn = sql.match(/create or replace function public\.mdz_is_wilaya_manager\(\)[\s\S]*?\$\$;/i);
assert.ok(mgrFn, 'mdz_is_wilaya_manager body required');
assert.ok(!/profiles/i.test(mgrFn[0]), 'mdz_is_wilaya_manager must not reference profiles');

assert.match(sql, /create or replace function public\.handle_new_user/i);
assert.match(sql, /mdz_membership_role/);
assert.match(sql, /'pending'/);
assert.ok(
  !/coalesce\(nullif\(trim\(new\.raw_user_meta_data\s*->>\s*'status'\)/i.test(sql),
  'handle_new_user must not read status from signup metadata',
);
assert.match(
  sql,
  /status = coalesce\(public\.profiles\.status, 'pending'\)/i,
  'ON CONFLICT must not adopt excluded.status from metadata',
);
assert.match(sql, /raw_user_meta_data := new\.raw_user_meta_data - 'status'/i);

console.log('  ✓ migration 014 signup authz harden guards');
