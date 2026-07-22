#!/usr/bin/env node
/**
 * Production RLS posture check (requires direct Postgres).
 * Set DATABASE_URL or SUPABASE_DB_URL (session mode / pooler).
 */
const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.warn('\n⚠️  verify:rls SKIPPED — set DATABASE_URL or SUPABASE_DB_URL to run policy checks.\n');
  process.exit(0);
}

let pg;
try {
  pg = await import('pg');
} catch {
  console.error('verify:rls FAILED — install pg (npm install) and retry.');
  process.exit(1);
}

const client = new pg.default.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

function fail(msg, detail) {
  console.error(`FAIL: ${msg}`);
  if (detail) console.error(detail);
  process.exit(1);
}

const rls = await client.query(`
  select c.relname, c.relrowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname in ('user_roles', 'registrations')
  order by c.relname
`);

const rlsMap = Object.fromEntries(rls.rows.map((r) => [r.relname, r.relrowsecurity]));
if (rls.rows.length !== 2) {
  fail('expected user_roles and registrations in public schema', JSON.stringify(rls.rows));
}
if (rlsMap.registrations !== true) fail('registrations RLS must be enabled', `relrowsecurity=${rlsMap.registrations}`);

const policies = await client.query(`
  select tablename, policyname, cmd, roles::text, qual::text
  from pg_policies
  where schemaname = 'public' and tablename in ('user_roles', 'registrations')
  order by tablename, cmd, policyname
`);

const byTable = { user_roles: [], registrations: [] };
for (const row of policies.rows) byTable[row.tablename].push(row);

const urSelect = byTable.user_roles.filter((p) => p.cmd === 'SELECT');
if (urSelect.length !== 1) {
  fail(`user_roles SELECT policies: expected 1, got ${urSelect.length}`, JSON.stringify(urSelect, null, 2));
}
if (!String(urSelect[0].policyname).includes('self read')) {
  fail('user_roles SELECT policy should be self-read', urSelect[0].policyname);
}

const regSelect = byTable.registrations.filter((p) => p.cmd === 'SELECT');
const regInsert = byTable.registrations.filter((p) => p.cmd === 'INSERT');
if (regSelect.length !== 2) {
  fail(`registrations SELECT policies: expected 2, got ${regSelect.length}`, JSON.stringify(regSelect, null, 2));
}
if (regInsert.length !== 1) {
  fail(`registrations INSERT policies: expected 1, got ${regInsert.length}`, JSON.stringify(regInsert, null, 2));
}

const openQual = byTable.registrations.filter((p) => {
  const q = String(p.qual || '').trim().toLowerCase();
  return q === 'true';
});
if (openQual.length) {
  fail('registrations must not have USING (true) policies', JSON.stringify(openQual, null, 2));
}

console.log('OK user_roles: RLS on, 1 SELECT (self-read)');
console.log('OK registrations: RLS on, 2 SELECT, 1 INSERT, no qual=true');
console.log('\nverify:rls passed.');
await client.end();
