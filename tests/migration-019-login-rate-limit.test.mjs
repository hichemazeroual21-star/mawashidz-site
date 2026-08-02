#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const migration = readFileSync(join(root, 'supabase/migrations/019_lock_login_identifier.sql'), 'utf8');
const verify = readFileSync(join(root, 'supabase/migrations/019_lock_login_identifier.verify.sql'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');

assert.match(migration, /to_regprocedure\('public\.resolve_login_identifier\(text\)'\)/i);
assert.match(migration, /revoke all on function public\.resolve_login_identifier\(text\) from public/i);
assert.match(migration, /revoke execute on function public\.resolve_login_identifier\(text\) from anon/i);
assert.match(migration, /revoke execute on function public\.resolve_login_identifier\(text\) from authenticated/i);
assert.match(migration, /grant execute on function public\.resolve_login_identifier\(text\) to service_role/i);
assert.match(migration, /has_function_privilege/i, 'migration must enforce its privilege post-condition');
assert.match(verify, /check_result/i);
assert.match(verify, /service_role_execute/i);

assert.ok(!html.includes('/rpc/resolve_login_identifier'), 'browser must not call resolver RPC directly');
assert.match(html, /siteAuthRequest\('\/api\/auth\/login'/, 'login must use Worker endpoint');
assert.match(html, /siteAuthRequest\('\/api\/auth\/recover'/, 'recovery must use Worker endpoint');

console.log('  ✓ migration 019 cuts browser resolver access after Worker auth cutover');
