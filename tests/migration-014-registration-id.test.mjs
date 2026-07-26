#!/usr/bin/env node
/**
 * Static review of migration 014 (registration_id backfill + server assign)
 * + dry-run companion SQL.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const migPath = join(process.cwd(), 'supabase/migrations/014_registration_id_integrity.sql');
const dryPath = join(process.cwd(), 'docs/reports/sql/014_registration_id_dry_run.sql');
const planPath = join(process.cwd(), 'docs/reports/REGISTRATION_ID_INTEGRITY_014_PLAN.md');

assert.ok(existsSync(migPath), 'migration 014 must exist');
assert.ok(existsSync(dryPath), 'dry-run SQL must exist');
assert.ok(existsSync(planPath), 'plan doc must exist');

const sql = readFileSync(migPath, 'utf8');
const dry = readFileSync(dryPath, 'utf8');

assert.match(sql, /mdz_next_registration_id/i);
assert.match(sql, /mdz_registration_id_seq/i);
assert.match(sql, /message::jsonb\s*->>\s*'registration_id'/i);
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

// Positive inclusion on both mutation paths
const updateBlocks = sql.split(/-- -+/).filter((b) => /update public\.registrations/i.test(b));
assert.ok(updateBlocks.length >= 1, 'expected UPDATE blocks');
assert.ok(
  /mdz_is_real_pending_registration\s*\(/i.test(sql),
  'mutations must use positive real-pending predicate',
);
assert.ok(
  /mdz_registration_id_missing\s*\(/i.test(sql),
  'mutations must guard missing registration_id',
);

// Trigger must preserve client-supplied id (early return when present)
assert.match(
  sql,
  /if not public\.mdz_registration_id_missing\(new\.registration_id\) then\s*return new;/is,
);

assert.ok(/pending/i.test(sql), 'must target pending/real rows');
assert.ok(!/drop table/i.test(sql), '014 must not drop tables');
assert.ok(!/delete from public\.registrations/i.test(sql), '014 must not delete registration rows');

// Dry-run is read-only and classifies buckets
assert.ok(!/^\s*(insert|update|delete|truncate)\b/im.test(dry), 'dry-run must not contain DML statements');
assert.match(dry, /recover_from_message/);
assert.match(dry, /will_generate/);
assert.match(dry, /excluded_as_test/);
assert.match(dry, /already_has_id/);

console.log('  ✓ migration 014 registration_id integrity shape');
