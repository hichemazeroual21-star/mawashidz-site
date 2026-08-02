#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const path = join(process.cwd(), 'supabase/migrations/020_restore_admin_audit.sql');
assert.ok(existsSync(path), 'migration 020 must exist');

const sql = readFileSync(path, 'utf8');

assert.match(sql, /^begin;/im);
assert.match(sql, /^commit;/im);
assert.match(sql, /create table if not exists public\.admin_audit_log/i);
assert.match(sql, /alter table public\.admin_audit_log enable row level security/i);
assert.match(sql, /create policy "admin_audit: admin read"/i);
assert.match(sql, /create or replace function public\.mdz_assert_admin_caller\(\)/i);
assert.match(sql, /create or replace function public\.mdz_audit_admin_action\(/i);
assert.match(sql, /create or replace function public\.admin_list_audit_log\(/i);
assert.match(sql, /audit actor mismatch/i);
assert.match(sql, /mdz_is_platform_admin\(\)/i);
assert.match(sql, /mdz_is_wilaya_manager\(\)/i);
assert.match(sql, /revoke all on function public\.mdz_audit_admin_action[\s\S]*from public, anon, authenticated, service_role/i);
assert.match(sql, /grant execute on function public\.admin_list_audit_log\(integer\) to authenticated/i);
assert.match(sql, /\('020', 'restore_admin_audit'/i);

assert.doesNotMatch(sql, /create or replace function public\.admin_(grant|revoke)_user_role/i);
assert.doesNotMatch(sql, /create or replace function public\.admin_set_profile_status/i);
assert.doesNotMatch(sql, /\b(update|delete from)\s+public\.(profiles|registrations|support_tickets)\b/i);
assert.doesNotMatch(sql, /grant execute on function public\.mdz_audit_admin_action[\s\S]*to\s+(anon|authenticated|service_role)/i);

console.log('  ✓ migration 020 forward-only admin audit repair shape');
