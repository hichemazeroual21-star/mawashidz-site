#!/usr/bin/env node
/**
 * Static security review of migration 007 (review_registration_status).
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const path = join(process.cwd(), 'supabase/migrations/007_review_registration_status.sql');
assert.ok(existsSync(path), 'migration 007 must exist (not colliding with 006_registrations_unique)');
assert.ok(
  !existsSync(join(process.cwd(), 'supabase/migrations/006_review_registration_status.sql')),
  'old 006_review_registration_status.sql must be renamed to 007',
);

const sql = readFileSync(path, 'utf8');

assert.match(sql, /create or replace function public\.review_registration_status/i);
assert.match(sql, /security definer/i);
assert.match(sql, /set search_path\s*=\s*public/i);
assert.match(sql, /revoke all on function public\.review_registration_status[\s\S]*from anon/i);
assert.match(sql, /grant execute on function public\.review_registration_status[\s\S]*to authenticated/i);

// Profiles must be updated by registration_id only — never email join/match
assert.match(sql, /where p\.registration_id = reg_id/i);
assert.ok(
  !/\bemail\s*=\s*/i.test(sql) && !/p\.email\s*=/i.test(sql) && !/lower\(.*email/i.test(sql),
  'must not match profiles by email',
);

assert.match(sql, /managers may only approve or reject/i);
assert.match(sql, /wilaya scope violation/i);
assert.match(sql, /insufficient privileges/i);
assert.match(sql, /p_new_status not in \('approved', 'rejected'\)/i);

// Manager recognition via profiles.role fallback
assert.match(sql, /lower\(coalesce\(p\.role, ''\)\) in \('manager'/i);

console.log('  ✓ migration 007 review_registration_status security shape');
