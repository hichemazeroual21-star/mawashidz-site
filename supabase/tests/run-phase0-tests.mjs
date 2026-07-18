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

  console.log('→ Testing fresh install (setup.sql)');
  await createAuthSchema(client);
  await runSql(client, setupSql, 'setup.sql');
  await testSequentialAllocation(client);
  await testParallelAllocation(port);
  await testHandleNewUser(client);
  await testIdempotentRerun(client, setupSql);

  console.log('→ Testing existing schema path (legacy + align + phase0)');
  await client.query('drop schema public cascade; drop schema auth cascade; create schema public;');
  await createLegacySchema(client);
  await runSql(client, alignSql, 'align_existing');
  await runSql(client, phase0Sql, 'phase0');

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
  await testIdempotentRerun(client, phase0Sql);

  await client.end();
  await embedded.stop();
  console.log('✓ All Phase 0 database tests passed');
}

main().catch((error) => {
  console.error('✗', error.message || error);
  process.exit(1);
});
