#!/usr/bin/env node
/**
 * Static security review of migration 016 (contact/feedback admin read — TD-013).
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const path016 = join(process.cwd(), 'supabase/migrations/016_contact_feedback_admin_read.sql');
assert.ok(existsSync(path016), 'migration 016 must exist');
const sql = readFileSync(path016, 'utf8');

assert.match(sql, /contact: admin read/i);
assert.match(sql, /feedback: admin read/i);
assert.match(sql, /mdz_is_platform_admin\(\)/i);
assert.match(sql, /for select/i);
assert.ok(!/for (update|delete|all)/i.test(sql), '016 must not grant update/delete/all');
assert.ok(
  !/to anon/i.test(sql),
  '016 admin read must not grant to anon',
);
assert.ok(
  !/using\s*\(\s*true\s*\)/i.test(sql),
  '016 must not open SELECT with using (true)',
);

console.log('  ✓ migration 016 contact/feedback admin read guards');
