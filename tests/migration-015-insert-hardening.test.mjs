#!/usr/bin/env node
/**
 * Static security review of migration 015 (restore INSERT hardening).
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const path015 = join(process.cwd(), 'supabase/migrations/015_restore_public_insert_hardening.sql');
assert.ok(existsSync(path015), 'migration 015 must exist');
const sql = readFileSync(path015, 'utf8');

assert.match(sql, /registrations: public insert/i);
assert.match(sql, /contact: public insert/i);
assert.match(sql, /feedback: public insert/i);
assert.match(sql, /length\(btrim\(coalesce\(full_name/i);
assert.match(sql, /length\(message\)\s*<=\s*20000/i);
assert.match(sql, /length\(message\)\s*<=\s*10000/i);
assert.match(sql, /length\(details\)\s*<=\s*10000/i);
assert.ok(
  !/with check\s*\(\s*true\s*\)/i.test(sql),
  '015 must not use with check (true)',
);

// Regression: timestamped Phase 0 migration still contains the bad policies —
// 015 exists specifically to undo that for live DBs that applied both.
const phase0 = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260719000000_phase0_member_id_foundation.sql'),
  'utf8',
);
assert.match(
  phase0,
  /with check\s*\(\s*true\s*\)/i,
  'phase0 timestamped migration is the known regressor (documents why 015 exists)',
);

// 009 shape must still match what 015 restores (length checks present)
const sql009 = readFileSync(
  join(process.cwd(), 'supabase/migrations/009_schema_baseline_hardening.sql'),
  'utf8',
);
assert.match(sql009, /length\(btrim\(coalesce\(full_name/i);

console.log('  ✓ migration 015 restore public INSERT hardening guards');
