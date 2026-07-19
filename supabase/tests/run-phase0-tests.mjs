#!/usr/bin/env node
/**
 * MawashiDZ Phase 0 database tests
 * - Fresh install path (setup.sql)
 * - Existing schema path (legacy stub + align + phase0)
 * - Sequential + parallel member_id uniqueness
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const readSql = (relativePath) =>
  readFileSync(join(root, relativePath), 'utf8');

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
    do $$ begin
      create role anon nologin noinherit;
    exception when duplicate_object then null; end $$;
    do $$ begin
      create role authenticated nologin noinherit;
    exception when duplicate_object then null; end $$;
    do $$ begin
      create role service_role nologin noinherit bypassrls;
    exception when duplicate_object then null; end $$;
    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$ select null::uuid $$;
  `);
}

async function createLegacySchema(client) {
  await createAuthSchema(client);
  await client.query(`
    create table if not exists public.profiles (
      id uuid primary key references auth.users(id) on delete cascade,
      full_name text,
      phone text,
      email text,
      created_at timestamptz not null default now()
    );
    create table if not exists public.registrations (
      id bigint generated always as identity primary key,
      full_name text not null,
      phone text not null,
      email text,
      whatsapp text,
      wilaya text,
      user_type text,
      role text,
      message text,
      status text default 'new',
      is_verified boolean not null default false,
      privacy_accepted boolean not null default false,
      founding_terms_accepted boolean not null default false,
      created_at timestamptz not null default now(),
      unique (email),
      unique (phone)
    );
    create table if not exists public.contact_messages (
      id bigint generated always as identity primary key,
      ticket_id text unique,
      full_name text,
      phone text,
      email text,
      wilaya text,
      daira text,
      commune text,
      request_type text,
      message text,
      status text not null default 'new',
      created_at timestamptz not null default now()
    );
    create table if not exists public.feedback_tickets (
      id bigint generated always as identity primary key,
      ticket_id text unique,
      report_type text,
      full_name text,
      contact text,
      details text,
      status text not null default 'new',
      created_at timestamptz not null default now()
    );
    create table if not exists public.breeders (
      id bigint generated always as identity primary key,
      full_name text,
      phone text,
      wilaya text,
      commune text,
      farm_name text,
      created_at timestamptz not null default now()
    );
  `);

  const { rows: [user] } = await client.query(`
    insert into auth.users (email, raw_user_meta_data)
    values ('legacy@example.com', '{"full_name":"Legacy User","phone":"0555123456","role":"breeder"}'::jsonb)
    returning id
  `);

  await client.query(`
    insert into public.profiles (id, full_name, phone, email)
    values ($1, 'Legacy User', '0555123456', 'legacy@example.com')
  `, [user.id]);
}

async function assertUniqueIds(ids, label) {
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    throw new Error(`${label}: duplicate member_id values detected: ${[...new Set(duplicates)].join(', ')}`);
  }
}

async function testSequentialAllocation(client) {
  const { rows } = await client.query(`
    select public.allocate_member_id(role) as member_id
    from (values ('breeder'), ('breeder'), ('vet'), ('buyer')) as t(role)
  `);
  const ids = rows.map((row) => row.member_id);
  ids.forEach((id) => {
    if (!/^MDZ-[A-Z]-\d{6}$/.test(id)) {
      throw new Error(`Invalid member_id format: ${id}`);
    }
  });
  await assertUniqueIds(ids, 'sequential allocation');
}

async function testParallelAllocation(port) {
  const workers = 40;
  const pool = new pg.Pool({
    host: '127.0.0.1',
    port,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres',
    max: workers,
  });

  const results = await Promise.all(
    Array.from({ length: workers }, () =>
      pool.query(`select public.allocate_member_id('breeder') as member_id`)
    )
  );

  const ids = results.map((result) => result.rows[0].member_id);
  await assertUniqueIds(ids, 'parallel allocation');
  await pool.end();
}

async function testResolveLogin(client) {
  const { rows: [lookupUser] } = await client.query(`
    insert into auth.users (email, raw_user_meta_data)
    values ('lookup@example.com', '{"role":"buyer","full_name":"Lookup User","phone":"0666123456"}'::jsonb)
    returning id
  `);

  const memberId = (
    await client.query(`select public.allocate_member_id('buyer') as member_id`)
  ).rows[0].member_id;

  await client.query(`
    insert into public.profiles (id, member_id, full_name, phone, email, role, status)
    values ($1, $2, 'Lookup User', '+213666123456', 'lookup@example.com', 'buyer', 'pending')
    on conflict (id) do update set
      member_id = excluded.member_id,
      phone = excluded.phone,
      email = excluded.email
  `, [lookupUser.id, memberId]);

  const phoneLookup = await client.query(
    `select public.resolve_login_identifier('0666123456') as email`
  );
  const memberLookup = await client.query(
    `select public.resolve_login_identifier($1) as email`,
    [memberId]
  );

  if (phoneLookup.rows[0].email !== 'lookup@example.com') {
    throw new Error(`Phone resolve failed: got ${phoneLookup.rows[0].email}`);
  }
  if (memberLookup.rows[0].email !== 'lookup@example.com') {
    throw new Error(`Member ID resolve failed: got ${memberLookup.rows[0].email}`);
  }
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
  if (!denied) {
    throw new Error(`${roleName} role should not be allowed to execute allocate_member_id()`);
  }
}

async function signupWithMetadata(client, email, metadata) {
  const { rows: [created] } = await client.query(
    `insert into auth.users (email, raw_user_meta_data)
     values ($1, $2::jsonb)
     returning id, raw_user_meta_data`,
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
    role: 'manager',
    member_id: 'MDZ-W-000001',
    status: 'approved',
  });
  if (profile.member_id === 'MDZ-W-000001') {
    throw new Error('Client-supplied member_id was not overwritten');
  }
  if (!/^MDZ-U-\d{6}$/.test(profile.member_id)) {
    throw new Error(`Privileged role should downgrade to buyer prefix, got ${profile.member_id}`);
  }
  if (user.raw_user_meta_data?.member_id !== profile.member_id) {
    throw new Error('Metadata member_id does not match allocated profile member_id');
  }
}

async function testClientStatusIgnored(client) {
  const { profile } = await signupWithMetadata(client, 'spoof-status@example.com', {
    role: 'breeder',
    status: 'approved',
  });
  if (profile.status !== 'pending') {
    throw new Error(`Expected pending status, got ${profile.status}`);
  }
}

async function testPrivilegedRoleDowngraded(client) {
  const { profile } = await signupWithMetadata(client, 'spoof-admin@example.com', {
    role: 'admin',
  });
  if (profile.role !== 'buyer') {
    throw new Error(`admin role should downgrade to buyer, got ${profile.role}`);
  }
}

async function testUnknownRoleDowngraded(client) {
  const { profile } = await signupWithMetadata(client, 'spoof-unknown@example.com', {
    role: 'totally_unknown_role',
  });
  if (profile.role !== 'buyer') {
    throw new Error(`unknown role should downgrade to buyer, got ${profile.role}`);
  }
}

async function testValidRolePrefixes(client) {
  const cases = [
    ['breeder', 'MDZ-F-'],
    ['vet', 'MDZ-V-'],
    ['feed', 'MDZ-S-'],
    ['buyer', 'MDZ-U-'],
  ];
  for (const [role, prefix] of cases) {
    const { profile } = await signupWithMetadata(client, `${role}-prefix@example.com`, { role });
    if (!profile.member_id?.startsWith(prefix)) {
      throw new Error(`Role ${role} expected prefix ${prefix}, got ${profile.member_id}`);
    }
  }
}

async function testOneSignupOneProfile(client) {
  const beforeUsers = Number((await client.query(`select count(*)::int as c from auth.users`)).rows[0].c);
  const beforeProfiles = Number((await client.query(`select count(*)::int as c from public.profiles`)).rows[0].c);
  const { profile } = await signupWithMetadata(client, 'single-signup@example.com', { role: 'breeder' });
  const afterUsers = Number((await client.query(`select count(*)::int as c from auth.users`)).rows[0].c);
  const afterProfiles = Number((await client.query(`select count(*)::int as c from public.profiles`)).rows[0].c);
  if (afterUsers !== beforeUsers + 1 || afterProfiles !== beforeProfiles + 1) {
    throw new Error('Signup must create exactly one auth user and one profile');
  }
  if (!/^MDZ-F-\d{6}$/.test(profile.member_id)) {
    throw new Error(`Expected one sequential breeder member_id, got ${profile.member_id}`);
  }
}

async function testNullMetadataSignup(client) {
  const { rows: [created] } = await client.query(`
    insert into auth.users (email, raw_user_meta_data)
    values ('null-meta@example.com', null)
    returning id
  `);
  const { rows: [profile] } = await client.query(
    `select member_id, role, status from public.profiles where id = $1`,
    [created.id]
  );
  if (!profile || profile.status !== 'pending' || profile.role !== 'buyer') {
    throw new Error('NULL metadata signup did not create secure default profile');
  }
}

async function testInvalidBirthDateDoesNotAbort(client) {
  const { profile } = await signupWithMetadata(client, 'bad-date@example.com', {
    role: 'buyer',
    birth_date: 'not-a-real-date',
  });
  if (profile.birth_date !== null) {
    throw new Error(`Invalid birth_date should be null, got ${profile.birth_date}`);
  }
}

async function testAnonCannotAllocate(client) {
  await testRoleCannotAllocate(client, 'anon');
}

async function testAuthenticatedCannotAllocate(client) {
  await testRoleCannotAllocate(client, 'authenticated');
}

async function testBeforeSignupTrigger(client) {
  const { rows: [created] } = await client.query(`
    insert into auth.users (email, raw_user_meta_data)
    values ('trigger-test@example.com', '{"role":"breeder","full_name":"Trigger Test"}'::jsonb)
    returning raw_user_meta_data
  `);
  const memberId = created.raw_user_meta_data?.member_id;
  if (!memberId || !/^MDZ-F-\d{6}$/.test(memberId)) {
    throw new Error(`before-signup trigger did not assign member_id: ${memberId}`);
  }
}

async function testHandleNewUser(client) {
  const { rows: [created] } = await client.query(`
    insert into auth.users (email, raw_user_meta_data)
    values (
      'new-user@example.com',
      '{"role":"vet","full_name":"New Vet","phone":"0666123456","first_name":"New","last_name":"Vet"}'::jsonb
    )
    returning id
  `);

  const { rows: [profile] } = await client.query(
    `select member_id, phone, role, status from public.profiles where id = $1`,
    [created.id]
  );

  if (!profile?.member_id?.startsWith('MDZ-V-')) {
    throw new Error(`handle_new_user did not allocate vet member_id: ${profile?.member_id}`);
  }
  if (profile.phone !== '+213666123456') {
    throw new Error(`Phone not normalized: ${profile.phone}`);
  }
  if (profile.status !== 'pending') {
    throw new Error(`Unexpected profile status: ${profile.status}`);
  }
}

async function testIdempotentRerun(client, sql) {
  await runSql(client, sql, 'idempotent re-run');
}

async function main() {
  const embedded = new EmbeddedPostgres({
    databaseDir: join(root, 'tests', '.pgdata'),
    user: 'postgres',
    password: 'postgres',
    port: 6543,
    persistent: false,
  });

  await embedded.initialise();
  await embedded.start();

  const port = 6543;
  const client = new pg.Client({
    host: '127.0.0.1',
    port,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres',
  });

  await client.connect();
  const setupSql = readSql('setup.sql');
  const alignSql = readSql('migrations/20260718220000_align_existing_schema.sql');
  const phase0Sql = readSql('migrations/20260719000000_phase0_member_id_foundation.sql');
  const secureSql = readSql('migrations/20260719110000_secure_allocate_member_id.sql');

  console.log('→ Testing fresh install (setup.sql)');
  await createAuthSchema(client);
  await runSql(client, setupSql, 'setup.sql');
  await testSequentialAllocation(client);
  await testParallelAllocation(port);
  await testAnonCannotAllocate(client);
  await testAuthenticatedCannotAllocate(client);
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
  await testIdempotentRerun(client, setupSql);
  await testIdempotentRerun(client, secureSql);

  console.log('→ Testing existing schema path (legacy + align + phase0 + secure)');
  await client.query('drop schema public cascade; drop schema auth cascade; create schema public;');
  await createLegacySchema(client);
  await runSql(client, alignSql, 'align_existing');
  await runSql(client, phase0Sql, 'phase0');
  await runSql(client, secureSql, 'secure');

  const legacyMember = await client.query(
    `select member_id, phone from public.profiles where email = 'legacy@example.com'`
  );
  if (!legacyMember.rows[0]?.member_id) {
    throw new Error('Legacy profile was not backfilled with member_id');
  }
  if (legacyMember.rows[0].phone !== '+213555123456') {
    throw new Error(`Legacy phone not normalized: ${legacyMember.rows[0].phone}`);
  }

  await testResolveLogin(client);
  await testParallelAllocation(port);
  await testClientStatusIgnored(client);
  await testIdempotentRerun(client, phase0Sql);
  await testIdempotentRerun(client, secureSql);

  console.log('✓ All Phase 0 + security hardening database tests passed');
  await client.end();
  await embedded.stop();
}

main().catch((error) => {
  console.error('✗', error.message || error);
  process.exit(1);
});
