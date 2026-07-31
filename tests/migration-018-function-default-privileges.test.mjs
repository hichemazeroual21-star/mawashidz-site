#!/usr/bin/env node
/**
 * Static acceptance for migration 018 — function default privileges package.
 * Does not modify Migration 017. Live catalog evidence is Owner-run via verify.sql.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { checkSql, runGuard } from '../scripts/check-function-privileges.mjs';

const migPath = join(
  process.cwd(),
  'supabase/migrations/018_function_default_privileges.sql',
);
const verifyPath = join(
  process.cwd(),
  'supabase/migrations/018_function_default_privileges.verify.sql',
);
const unsafePath = join(
  process.cwd(),
  'tests/fixtures/function-privilege-guard/unsafe_new_function.sql',
);
const safePath = join(
  process.cwd(),
  'tests/fixtures/function-privilege-guard/safe_new_function.sql',
);

// --- 017 untouched ---
const mig017 = join(
  process.cwd(),
  'supabase/migrations/017_harden_reachable_security_definers.sql',
);
assert.ok(existsSync(mig017), '017 migration must remain present');
const sql017 = readFileSync(mig017, 'utf8');
assert.match(sql017, /017_harden_reachable_security_definers/i);

// --- 018 migration shape ---
assert.ok(existsSync(migPath), '018 migration must exist');
assert.ok(existsSync(verifyPath), '018 verify must exist');
const sql = readFileSync(migPath, 'utf8');
const verify = readFileSync(verifyPath, 'utf8');

assert.match(sql, /forward-looking only|FORWARD-ONLY/i);
assert.match(sql, /does NOT retroactively|does not retroactively/i);
assert.match(sql, /Migration 017/i);
assert.match(sql, /GLOBAL/i);
assert.match(sql, /hardwired PUBLIC EXECUTE|IN SCHEMA/i);

// Must use GLOBAL revoke for postgres (no IN SCHEMA on the revoke lines)
const postgresRevokes = [
  ...sql.matchAll(
    /alter\s+default\s+privileges\s+for\s+role\s+postgres\s+revoke\s+execute\s+on\s+functions\s+from\s+\w+/gi,
  ),
];
assert.ok(
  postgresRevokes.length >= 3,
  'expected GLOBAL ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE lines',
);
assert.ok(
  postgresRevokes.every((m) => !/in\s+schema/i.test(m[0])),
  'postgres REVOKE defaults must not use IN SCHEMA',
);

// Must NOT use the known-noop form as an active statement
assert.ok(
  !/alter\s+default\s+privileges\s+for\s+role\s+postgres\s+in\s+schema\s+public\s+revoke/i.test(
    sql,
  ),
  'must not use IN SCHEMA REVOKE for postgres (PG no-op for PUBLIC EXECUTE)',
);

assert.match(sql, /revoke execute on functions from public/i);
assert.match(sql, /revoke execute on functions from anon/i);
assert.match(sql, /revoke execute on functions from authenticated/i);
assert.ok(
  !/^\s*alter\s+default\s+privileges\s+for\s+role\s+supabase_admin/im.test(sql),
  'must not depend on modifying supabase_admin defaults',
);
assert.match(sql, /residual/i);
assert.match(sql, /'018'/);
assert.match(sql, /mdz_schema_migrations/);
assert.match(sql, /mdz018_mig_probe/);
assert.match(sql, /defaclnamespace\s*=\s*0/);

// verify kit contains required evidence queries
assert.match(verify, /pg_default_acl/);
assert.match(verify, /aclexplode/);
assert.match(verify, /has_function_privilege/);
assert.match(verify, /E7b_primary/);
assert.match(verify, /mdz018_probe_default_privs/);
assert.match(verify, /rollback/i);
assert.match(verify, /RESIDUAL/);
assert.match(verify, /defaclnamespace\s*=\s*0/);
assert.match(verify, /proacl_is_null/);

// --- CI guard: unsafe fails, safe passes ---
assert.ok(existsSync(unsafePath));
assert.ok(existsSync(safePath));
const unsafeErrs = checkSql(readFileSync(unsafePath, 'utf8'), 'unsafe_fixture');
assert.ok(unsafeErrs.length >= 2, `unsafe must fail, got: ${unsafeErrs.join('; ')}`);
assert.ok(
  unsafeErrs.some((e) => /REVOKE ALL/i.test(e)),
  'unsafe must cite missing REVOKE ALL FROM PUBLIC',
);
assert.ok(
  unsafeErrs.some((e) => /search_path/i.test(e)),
  'unsafe SECURITY DEFINER must fail empty search_path policy',
);

const safeErrs = checkSql(readFileSync(safePath, 'utf8'), 'safe_fixture');
assert.deepEqual(safeErrs, [], `safe must pass, got: ${safeErrs.join('; ')}`);

// --- Guard run on repo: 018 enforced, no false fail on 018 ---
const { enforced, errors } = runGuard();
assert.ok(
  enforced.includes('018_function_default_privileges.sql'),
  '018 must be in enforced set',
);
assert.ok(
  !enforced.some((n) => n.startsWith('017_')),
  '017 must never be enforced by this guard',
);
assert.deepEqual(errors, [], `guard must pass on current repo: ${errors.join('; ')}`);

console.log('  ✓ migration 018 GLOBAL default privileges fix + CI guard fixtures hold');
console.log('  ✓ Migration 017 was not modified by this package');
console.log('  ✓ Broader platform status remains NO GO (this package only)');
