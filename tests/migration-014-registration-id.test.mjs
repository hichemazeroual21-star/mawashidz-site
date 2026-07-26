#!/usr/bin/env node
/**
 * Static review of migration 014 (registration_id backfill + server assign).
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const path = join(process.cwd(), 'supabase/migrations/014_registration_id_integrity.sql');
assert.ok(existsSync(path), 'migration 014 must exist');

const sql = readFileSync(path, 'utf8');

assert.match(sql, /mdz_next_registration_id/i);
assert.match(sql, /mdz_registration_id_seq/i);
assert.match(sql, /message::jsonb\s*->>\s*'registration_id'/i);
assert.match(sql, /mdz_is_test_registration_email/i);
assert.match(sql, /example\\\.com/i);
assert.match(sql, /probe|e2e/i);
assert.match(sql, /mdz_registrations_assign_registration_id/i);
assert.match(sql, /before insert on public\.registrations/i);
assert.match(sql, /MDZ-REG-/);
assert.ok(
  /pending/i.test(sql),
  'backfill generation must target pending/real rows',
);
assert.ok(
  !/drop table/i.test(sql),
  '014 must not drop tables',
);
assert.ok(
  !/delete from public\.registrations/i.test(sql),
  '014 must not delete registration rows',
);

console.log('  ✓ migration 014 registration_id integrity shape');
