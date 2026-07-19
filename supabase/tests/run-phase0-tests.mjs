#!/usr/bin/env node
/**
 * MawashiDZ Phase 0 Final — database + security tests
 * Generates docs/PHASE0_TEST_REPORT.md on success.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const repoRoot = join(__dirname, '..', '..');

const FINAL_MIGRATION = 'migrations/20260720_phase0_final.sql';
const REPORT_PATH = join(repoRoot, 'docs', 'PHASE0_TEST_REPORT.md');

const readSql = (relativePath) =>
  readFileSync(join(root, relativePath), 'utf8');

const results = {
  passed: [],
  failed: [],
  security: [],
  concurrency: [],
  coverage: [],
};

function record(category, name, ok, detail = '') {
  const entry = { name, detail };
  if (ok) {
    results[category].push(entry);
  } else {
    results.failed.push({ ...entry, category });
  }
}

async function runSql(client, sql, label) {
  try {
    await client.query(sql);
  } catch (error) {
    error.message = `${label}: ${error.message}`;
    throw error;
  }
}

async function createAuthSchema(client) {
  await client.query(`
    create schema if not exists auth;
    create table if not exists auth.users (
      id uuid primary key default gen_random_uuid(),
      email text,
      raw_user_meta_data jsonb default '{}'::jsonb
    );
    do $$ begin create role anon nologin noinherit;
    exception when duplicate_object then null; end $$;
    do $$ begin create role authenticated nologin noinherit;
    exception when duplicate_object then null; end $$;
    do $$ begin create role service_role nologin noinherit bypassrls;
    exception when duplicate_object then null; end $$;
    create or replace function auth.uid()
    returns uuid language sql stable as $$ select null::uuid $$;
  `);
}

async function createLegacySchema(client) {
  await createAuthSchema(client);
  await client.query(`
    create table if not exists public.profiles (
      id uuid primary key references auth.users(id) on delete cascade,
      full_name text, phone text, email text,
      created_at timestamptz not null default now()
    );
    create table if not exists public.registrations (
      id bigint generated always as identity primary key,
      full_name text not null, phone text not null, email text,
      whatsapp text, wilaya text, user_type text, role text, message text,
      status text default 'new', is_verified boolean not null default false,
      privacy_accepted boolean not null default false,
      founding_terms_accepted boolean not null default false,
      created_at timestamptz not null default now(),
      unique (email), unique (phone)
    );
    create table if not exists public.contact_messages (
      id bigint generated always as identity primary key,
      ticket_id text unique, full_name text, phone text, email text,
      wilaya text, daira text, commune text, request_type text, message text,
      status text not null default 'new',
      created_at timestamptz not null default now()
    );
    create table if not exists public.feedback_tickets (
      id bigint generated always as identity primary key,
      ticket_id text unique, report_type text, full_name text, contact text,
      details text, status text not null default 'new',
      created_at timestamptz not null default now()
    );
    create table if not exists public.breeders (
      id bigint generated always as identity primary key,
      full_name text, phone text, wilaya text, commune text, farm_name text,
      created_at timestamptz not null default now()
    );
  `);

  const { rows: [user] } = await client.query(`
    insert into auth.users (email, raw_user_meta_data)
    values ('legacy@example.com', '{"full_name":"Legacy User","phone":"0555123456","role":"breeder"}'::jsonb)
    returning id
  `);
  await client.query(
    `insert into public.profiles (id, full_name, phone, email)
     values ($1, 'Legacy User', '0555123456', 'legacy@example.com')`,
    [user.id]
  );
}

async function assertUniqueIds(ids, label) {
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    throw new Error(`${label}: duplicate member_id values: ${[...new Set(duplicates)].join(', ')}`);
  }
}

async function testSequentialAllocation(client) {
  const { rows } = await client.query(`
    select public.allocate_member_id(role) as member_id
    from (values ('breeder'), ('breeder'), ('vet'), ('buyer')) as t(role)
  `);
  const ids = rows.map((row) => row.member_id);
  ids.forEach((id) => {
    if (!/^MDZ-[A-Z]-\d{6}$/.test(id)) throw new Error(`Invalid member_id format: ${id}`);
  });
  await assertUniqueIds(ids, 'sequential allocation');
  record('passed', 'Sequential member_id allocation', true);
  record('coverage', 'allocate_member_id() format + uniqueness', true);
}

async function testParallelAllocation(port) {
  const workers = 40;
  const pool = new pg.Pool({
    host: '127.0.0.1', port, database: 'postgres',
    user: 'postgres', password: 'postgres', max: workers,
  });
  const results40 = await Promise.all(
    Array.from({ length: workers }, () =>
      pool.query(`select public.allocate_member_id('breeder') as member_id`)
    )
  );
  const ids = results40.map((r) => r.rows[0].member_id);
  await assertUniqueIds(ids, 'parallel allocation');
  await pool.end();
  record('concurrency', '40 parallel allocate_member_id() calls — no duplicates', true);
  record('passed', 'Parallel member_id allocation (40 workers)', true);
}

async function testResolveLogin(client) {
  const { rows: [lookupUser] } = await client.query(`
    insert into auth.users (email, raw_user_meta_data)
    values ('lookup@example.com', '{"role":"buyer","full_name":"Lookup User","phone":"0666123456"}'::jsonb)
    returning id
  `);
  const memberId = (await client.query(`select public.allocate_member_id('buyer') as member_id`)).rows[0].member_id;
  await client.query(`
    insert into public.profiles (id, member_id, full_name, phone, email, role, status)
    values ($1, $2, 'Lookup User', '+213666123456', 'lookup@example.com', 'buyer', 'pending')
    on conflict (id) do update set member_id = excluded.member_id, phone = excluded.phone, email = excluded.email
  `, [lookupUser.id, memberId]);

  const phoneLookup = await client.query(`select public.resolve_login_identifier('0666123456') as email`);
  const memberLookup = await client.query(`select public.resolve_login_identifier($1) as email`, [memberId]);
  if (phoneLookup.rows[0].email !== 'lookup@example.com') throw new Error(`Phone resolve failed`);
  if (memberLookup.rows[0].email !== 'lookup@example.com') throw new Error(`Member ID resolve failed`);
  record('passed', 'resolve_login_identifier() — phone and member_id', true);
  record('coverage', 'Login identifier resolution', true);
}

async function testRoleCannotAllocate(client, roleName) {
  await client.query(`grant usage on schema public to ${roleName}`);
  await client.query(`set role ${roleName}`);
  let denied = false;
  try {
    await client.query(`select public.allocate_member_id('breeder')`);
  } catch (error) {
    denied = /permission denied/i.test(String(error.message || error));
  } finally {
    await client.query('reset role');
  }
  if (!denied) throw new Error(`${roleName} should not execute allocate_member_id()`);
  record('security', `No ${roleName} EXECUTE on allocate_member_id()`, true);
}

async function signupWithMetadata(client, email, metadata) {
  const { rows: [created] } = await client.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id, raw_user_meta_data`,
    [email, JSON.stringify(metadata)]
  );
  const { rows: [profile] } = await client.query(
    `select member_id, role, status, birth_date from public.profiles where id = $1`,
    [created.id]
  );
  return { user: created, profile };
}

async function testClientMemberIdOverwritten(client) {
  const { user, profile } = await signupWithMetadata(client, 'spoof-id@example.com', {
    role: 'manager', member_id: 'MDZ-W-000001', status: 'approved',
  });
  if (profile.member_id === 'MDZ-W-000001') throw new Error('Client member_id not overwritten');
  if (!/^MDZ-U-\d{6}$/.test(profile.member_id)) throw new Error('Privileged role not downgraded to buyer prefix');
  if (user.raw_user_meta_data?.member_id !== profile.member_id) throw new Error('Metadata member_id mismatch');
  record('security', 'Client-controlled member_id overwritten', true);
}

async function testClientStatusIgnored(client) {
  const { profile } = await signupWithMetadata(client, 'spoof-status@example.com', {
    role: 'breeder', status: 'approved',
  });
  if (profile.status !== 'pending') throw new Error(`Expected pending, got ${profile.status}`);
  record('security', 'Client-controlled status ignored — always pending', true);
}

async function testPrivilegedRoleDowngraded(client) {
  const { profile } = await signupWithMetadata(client, 'spoof-admin@example.com', { role: 'admin' });
  if (profile.role !== 'buyer') throw new Error(`admin should downgrade to buyer, got ${profile.role}`);
  record('security', 'Privileged role (admin) downgraded to buyer', true);
}

async function testUnknownRoleDowngraded(client) {
  const { profile } = await signupWithMetadata(client, 'spoof-unknown@example.com', {
    role: 'totally_unknown_role',
  });
  if (profile.role !== 'buyer') throw new Error(`unknown role should downgrade to buyer`);
  record('security', 'Unknown role downgraded to buyer', true);
}

async function testValidRolePrefixes(client) {
  const cases = [['breeder', 'MDZ-F-'], ['vet', 'MDZ-V-'], ['feed', 'MDZ-S-'], ['buyer', 'MDZ-U-']];
  for (const [role, prefix] of cases) {
    const { profile } = await signupWithMetadata(client, `${role}-prefix@example.com`, { role });
    if (!profile.member_id?.startsWith(prefix)) throw new Error(`Role ${role} expected prefix ${prefix}`);
  }
  record('security', 'Role whitelist — valid roles get correct prefix', true);
}

async function testOneSignupOneProfile(client) {
  const beforeUsers = Number((await client.query(`select count(*)::int as c from auth.users`)).rows[0].c);
  const beforeProfiles = Number((await client.query(`select count(*)::int as c from public.profiles`)).rows[0].c);
  const { profile } = await signupWithMetadata(client, 'single-signup@example.com', { role: 'breeder' });
  const afterUsers = Number((await client.query(`select count(*)::int as c from auth.users`)).rows[0].c);
  const afterProfiles = Number((await client.query(`select count(*)::int as c from public.profiles`)).rows[0].c);
  if (afterUsers !== beforeUsers + 1 || afterProfiles !== beforeProfiles + 1) {
    throw new Error('Signup must create exactly one user and one profile');
  }
  if (!/^MDZ-F-\d{6}$/.test(profile.member_id)) throw new Error('Expected breeder member_id');
  record('passed', 'One signup → one profile', true);
}

async function testNullMetadataSignup(client) {
  const { rows: [created] } = await client.query(`
    insert into auth.users (email, raw_user_meta_data) values ('null-meta@example.com', null) returning id
  `);
  const { rows: [profile] } = await client.query(
    `select member_id, role, status from public.profiles where id = $1`, [created.id]
  );
  if (!profile || profile.status !== 'pending' || profile.role !== 'buyer') {
    throw new Error('NULL metadata signup did not create secure defaults');
  }
  record('passed', 'NULL metadata signup defaults (buyer, pending)', true);
}

async function testInvalidBirthDateDoesNotAbort(client) {
  const { profile } = await signupWithMetadata(client, 'bad-date@example.com', {
    role: 'buyer', birth_date: 'not-a-real-date',
  });
  if (profile.birth_date !== null) throw new Error(`Invalid birth_date should be null`);
  record('passed', 'safe_metadata_date() rejects invalid input', true);
}

async function testBeforeSignupTrigger(client) {
  const { rows: [created] } = await client.query(`
    insert into auth.users (email, raw_user_meta_data)
    values ('trigger-test@example.com', '{"role":"breeder","full_name":"Trigger Test"}'::jsonb)
    returning raw_user_meta_data
  `);
  const memberId = created.raw_user_meta_data?.member_id;
  if (!memberId || !/^MDZ-F-\d{6}$/.test(memberId)) throw new Error('before-signup trigger did not assign member_id');
  record('passed', 'assign_member_id_before_signup() BEFORE INSERT trigger', true);
}

async function testHandleNewUser(client) {
  const { rows: [created] } = await client.query(`
    insert into auth.users (email, raw_user_meta_data)
    values ('new-user@example.com',
      '{"role":"vet","full_name":"New Vet","phone":"0666123456","first_name":"New","last_name":"Vet"}'::jsonb)
    returning id
  `);
  const { rows: [profile] } = await client.query(
    `select member_id, phone, role, status from public.profiles where id = $1`, [created.id]
  );
  if (!profile?.member_id?.startsWith('MDZ-V-')) throw new Error('handle_new_user vet member_id failed');
  if (profile.phone !== '+213666123456') throw new Error(`Phone not normalized: ${profile.phone}`);
  if (profile.status !== 'pending') throw new Error(`Unexpected status: ${profile.status}`);
  record('passed', 'handle_new_user() AFTER INSERT trigger', true);
}

async function runSecurityAudit(client) {
  const { rows: allocGrants } = await client.query(`
    select grantee from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name = 'allocate_member_id'
      and privilege_type = 'EXECUTE' and grantee in ('anon', 'authenticated', 'PUBLIC')
  `);
  if (allocGrants.length > 0) {
    throw new Error(`allocate_member_id has forbidden grants: ${allocGrants.map((r) => r.grantee).join(', ')}`);
  }
  record('security', 'No anonymous/authenticated EXECUTE on allocate_member_id()', true);

  const { rows: triggers } = await client.query(`
    select tgname, count(*)::int as cnt
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth' and c.relname = 'users' and not t.tgisinternal
    group by tgname
  `);
  const beforeTriggers = triggers.filter((t) => /assign_member_id|before/i.test(t.tgname));
  const afterTriggers = triggers.filter((t) => /created|handle_new|after/i.test(t.tgname));
  if (beforeTriggers.length !== 1) {
    throw new Error(`Expected 1 BEFORE signup trigger, found ${beforeTriggers.length}: ${triggers.map((t) => t.tgname).join(', ')}`);
  }
  if (afterTriggers.length !== 1) {
    throw new Error(`Expected 1 AFTER signup trigger, found ${afterTriggers.length}: ${triggers.map((t) => t.tgname).join(', ')}`);
  }
  record('security', 'Exactly one trigger per signup purpose', true);

  const securityDefinerFns = [
    'allocate_member_id', 'sync_member_id_counters_from_profiles',
    'resolve_login_identifier', 'assign_member_id_before_signup', 'handle_new_user',
  ];
  for (const fn of securityDefinerFns) {
    const { rows } = await client.query(`
      select p.prosecdef, coalesce(array_to_string(p.proconfig, ','), '') as config
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = $1
    `, [fn]);
    if (!rows[0]?.prosecdef) throw new Error(`${fn} is not SECURITY DEFINER`);
    if (!rows[0].config.includes('search_path=public')) {
      throw new Error(`${fn} missing fixed search_path=public`);
    }
    record('security', `SECURITY DEFINER ${fn}() has search_path=public`, true);
  }

  const { rows: fnCounts } = await client.query(`
    select proname, count(*)::int as cnt
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and proname in (
        'allocate_member_id', 'handle_new_user', 'assign_member_id_before_signup',
        'normalize_public_signup_role', 'normalize_algerian_phone',
        'resolve_login_identifier', 'safe_metadata_date'
      )
    group by proname having count(*) > 1
  `);
  if (fnCounts.length > 0) {
    throw new Error(`Duplicate function definitions: ${fnCounts.map((r) => r.proname).join(', ')}`);
  }
  record('security', 'No duplicate core function definitions', true);

  const expectedFns = [
    'allocate_member_id', 'handle_new_user', 'assign_member_id_before_signup',
    'normalize_public_signup_role', 'normalize_algerian_phone',
    'resolve_login_identifier', 'safe_metadata_date',
  ];
  for (const fn of expectedFns) {
    const { rows } = await client.query(`
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = $1
    `, [fn]);
    if (rows.length === 0) throw new Error(`Missing function: ${fn}`);
  }
  record('coverage', 'All 7 canonical Phase 0 functions present', true);
}

function writeReport() {
  const now = new Date().toISOString();
  const allPassed = results.failed.length === 0;
  const lines = [
    '# Phase 0 Test Report',
    '',
    `**Generated:** ${now} UTC`,
    `**Migration:** \`${FINAL_MIGRATION}\``,
    `**Status:** ${allPassed ? '✅ ALL PASSED' : '❌ FAILURES DETECTED'}`,
    '',
    '## Summary',
    '',
    `| Category | Count |`,
    `|----------|-------|`,
    `| Passed | ${results.passed.length} |`,
    `| Security | ${results.security.length} |`,
    `| Concurrency | ${results.concurrency.length} |`,
    `| Coverage | ${results.coverage.length} |`,
    `| Failed | ${results.failed.length} |`,
    '',
    '## Passed Tests',
    '',
    ...results.passed.map((t) => `- ✅ ${t.name}${t.detail ? ` — ${t.detail}` : ''}`),
    '',
    '## Security Tests',
    '',
    ...results.security.map((t) => `- 🔒 ${t.name}${t.detail ? ` — ${t.detail}` : ''}`),
    '',
    '## Concurrency Tests',
    '',
    ...results.concurrency.map((t) => `- ⚡ ${t.name}${t.detail ? ` — ${t.detail}` : ''}`),
    '',
    '## Coverage',
    '',
    ...results.coverage.map((t) => `- 📋 ${t.name}${t.detail ? ` — ${t.detail}` : ''}`),
  ];

  if (results.failed.length > 0) {
    lines.push('', '## Failed Tests', '');
    results.failed.forEach((t) => {
      lines.push(`- ❌ [${t.category}] ${t.name}${t.detail ? ` — ${t.detail}` : ''}`);
    });
  }

  lines.push(
    '',
    '## Test Paths',
    '',
    '1. **Fresh install** — empty database + `20260720_phase0_final.sql`',
    '2. **Legacy upgrade** — pre-Phase-0 schema stub + `20260720_phase0_final.sql`',
    '3. **Idempotent re-run** — final migration executed twice',
    '',
    '## Environment',
    '',
    '- Embedded PostgreSQL (embedded-postgres)',
    '- Node.js test runner: `npm run test:db`',
    '',
    '---',
    '*Phase 0 Final — production baseline. Do not deploy without owner approval.*',
  );

  writeFileSync(REPORT_PATH, lines.join('\n') + '\n');
}

async function runTestSuite(client, port, finalSql, label) {
  console.log(`→ ${label}`);
  await testSequentialAllocation(client);
  await testParallelAllocation(port);
  await testRoleCannotAllocate(client, 'anon');
  await testRoleCannotAllocate(client, 'authenticated');
  await testBeforeSignupTrigger(client);
  await testHandleNewUser(client);
  await testClientMemberIdOverwritten(client);
  await testClientStatusIgnored(client);
  await testPrivilegedRoleDowngraded(client);
  await testUnknownRoleDowngraded(client);
  await testValidRolePrefixes(client);
  await testOneSignupOneProfile(client);
  await testNullMetadataSignup(client);
  await testInvalidBirthDateDoesNotAbort(client);
  await runSecurityAudit(client);
  await runSql(client, finalSql, 'idempotent re-run');
  record('passed', `${label} — idempotent re-run`, true);
}

async function main() {
  const embedded = new EmbeddedPostgres({
    databaseDir: join(root, 'tests', '.pgdata'),
    user: 'postgres', password: 'postgres', port: 6543, persistent: false,
  });

  await embedded.initialise();
  await embedded.start();

  const port = 6543;
  const client = new pg.Client({
    host: '127.0.0.1', port, database: 'postgres', user: 'postgres', password: 'postgres',
  });
  await client.connect();

  const finalSql = readSql(FINAL_MIGRATION);

  await createAuthSchema(client);
  await runSql(client, finalSql, FINAL_MIGRATION);
  await runTestSuite(client, port, finalSql, 'Fresh install path');

  await client.query('drop schema public cascade; drop schema auth cascade; create schema public;');
  await createLegacySchema(client);
  await runSql(client, finalSql, FINAL_MIGRATION);

  const legacyMember = await client.query(
    `select member_id, phone from public.profiles where email = 'legacy@example.com'`
  );
  if (!legacyMember.rows[0]?.member_id) throw new Error('Legacy profile not backfilled with member_id');
  if (legacyMember.rows[0].phone !== '+213555123456') {
    throw new Error(`Legacy phone not normalized: ${legacyMember.rows[0].phone}`);
  }
  record('passed', 'Legacy upgrade — member_id backfill + phone normalization', true);

  await testResolveLogin(client);
  await testParallelAllocation(port);
  await testClientStatusIgnored(client);
  await runSql(client, finalSql, 'legacy idempotent re-run');
  record('passed', 'Legacy upgrade path — idempotent re-run', true);

  writeReport();
  console.log(`✓ All Phase 0 Final tests passed`);
  console.log(`  Report: ${REPORT_PATH}`);

  await client.end();
  await embedded.stop();
}

main().catch((error) => {
  console.error('✗', error.message || error);
  try { writeReport(); } catch { /* ignore */ }
  process.exit(1);
});
