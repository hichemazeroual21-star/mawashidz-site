#!/usr/bin/env node
/**
 * Static review of migration 009 (schema baseline hardening).
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const path = join(process.cwd(), 'supabase/migrations/009_schema_baseline_hardening.sql');
assert.ok(existsSync(path), 'migration 009 must exist');

const sql = readFileSync(path, 'utf8');

assert.match(sql, /add column if not exists status/i);
assert.match(sql, /registrations: public insert/i);
assert.match(sql, /length\(btrim\(coalesce\(full_name/i);
assert.match(sql, /mdz_registrations_insert_guard/i);
assert.match(sql, /registration rate limit exceeded/i);
assert.match(sql, /profiles add column if not exists updated_at/i);
assert.ok(
  !/with check\s*\(\s*true\s*\)/i.test(sql),
  '009 must not restore open with check(true) insert policies',
);

const setup = readFileSync(join(process.cwd(), 'supabase/setup.sql'), 'utf8');
assert.match(setup, /create table if not exists public\.user_roles/i);
assert.match(setup, /status text not null default 'pending'/i);
assert.match(setup, /mdz_registrations_insert_guard/i);
assert.match(setup, /protect_profile_sensitive_columns/i);

console.log('  ✓ migration 009 + setup.sql baseline hardening shape');
