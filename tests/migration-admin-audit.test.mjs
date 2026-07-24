#!/usr/bin/env node
/**
 * Static security review of migration 008 (admin audit + roles).
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const path = join(process.cwd(), 'supabase/migrations/008_admin_audit_and_roles.sql');
assert.ok(existsSync(path), 'migration 008 must exist');

const sql = readFileSync(path, 'utf8');

assert.match(sql, /create table if not exists public\.user_roles/i);
assert.match(sql, /create table if not exists public\.admin_audit_log/i);
assert.match(sql, /admin_audit: admin read/i);
assert.match(sql, /revoke insert, update, delete on public\.admin_audit_log/i);
assert.match(sql, /mdz_assert_admin_caller/i);
assert.match(sql, /mdz_audit_admin_action/i);
assert.match(sql, /admin_grant_user_role/i);
assert.match(sql, /admin_revoke_user_role/i);
assert.match(sql, /admin_list_audit_log/i);
assert.match(sql, /security definer/i);
assert.match(sql, /set search_path\s*=\s*public/i);
assert.ok(!/with check\s*\(\s*true\s*\)/i.test(sql), '008 must not open write policies with check(true)');

console.log('  ✓ migration 008 admin audit + roles security shape');
