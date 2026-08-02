import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const root = process.cwd();
const migration = await readFile(`${root}/supabase/migrations/022_fail_closed_admin_audit.sql`, 'utf8');
const verify = await readFile(`${root}/supabase/migrations/022_fail_closed_admin_audit.verify.sql`, 'utf8');
const db = new PGlite();

await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  create schema auth;

  create function auth.uid() returns uuid
  language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

  create table public.mdz_schema_migrations (
    version text primary key,
    name text not null,
    applied_at timestamptz not null default now(),
    notes text
  );

  create table public.registrations (
    registration_id text primary key,
    created_at timestamptz default now(),
    wilaya text,
    status text,
    review_reason text,
    reviewed_at timestamptz,
    reviewed_by uuid
  );

  create table public.profiles (
    id uuid primary key,
    email text,
    registration_id text,
    created_at timestamptz default now(),
    status text
  );

  create table public.support_tickets (
    id bigint primary key,
    created_by uuid not null,
    wilaya text,
    status text,
    updated_at timestamptz default now(),
    archived_at timestamptz,
    ticket_code text not null
  );

  create table public.test_notifications (
    id bigint generated always as identity primary key,
    user_id uuid,
    event_type text
  );

  create table public.test_email_outbox (
    id bigint generated always as identity primary key,
    recipient_email text,
    template_key text
  );

  create table public.admin_audit_log (
    id bigint generated always as identity primary key,
    actor_id uuid,
    action text,
    target_type text,
    target_id uuid,
    target_label text,
    payload jsonb
  );

  create function public.mdz_is_platform_admin() returns boolean
  language sql stable as $$ select true $$;

  create function public.mdz_is_wilaya_manager() returns boolean
  language sql stable as $$ select false $$;

  create function public.mdz_caller_wilaya() returns text
  language sql stable as $$ select null::text $$;

  create function public.mdz_notify_user(
    p_user_id uuid,
    p_type text,
    p_title text,
    p_body text,
    p_payload jsonb,
    p_link text
  ) returns bigint
  language plpgsql
  as $$
  declare new_id bigint;
  begin
    insert into public.test_notifications(user_id, event_type)
    values (p_user_id, p_type)
    returning id into new_id;
    return new_id;
  end;
  $$;

  create function public.mdz_enqueue_email(
    p_recipient_email text,
    p_profile_id uuid,
    p_template_key text,
    p_subject text,
    p_body text,
    p_payload jsonb
  ) returns bigint
  language plpgsql
  as $$
  declare new_id bigint;
  begin
    insert into public.test_email_outbox(recipient_email, template_key)
    values (p_recipient_email, p_template_key)
    returning id into new_id;
    return new_id;
  end;
  $$;

  create function public.mdz_audit_admin_action(
    p_actor_id uuid,
    p_action text,
    p_target_type text,
    p_target_id uuid,
    p_target_label text,
    p_payload jsonb default '{}'::jsonb
  ) returns void
  language plpgsql
  as $$
  begin
    insert into public.admin_audit_log(actor_id, action, target_type, target_id, target_label, payload)
    values (p_actor_id, p_action, p_target_type, p_target_id, p_target_label, p_payload);
    if current_setting('mdz.test.audit_fail', true) = 'on' then
      raise exception 'MDZ_TEST_FORCED_AUDIT_FAILURE';
    end if;
  end;
  $$;

  create function public.review_registration_status(text, text, text default null)
  returns jsonb language sql as $$ select '{}'::jsonb $$;

  create function public.set_support_ticket_status(bigint, text)
  returns public.support_tickets language sql
  as $$ select * from public.support_tickets where false $$;
`);

await db.exec(migration);

const verification = await db.query(verify);
assert.equal(verification.rows.length, 2);
assert.deepEqual(
  verification.rows.map((row) => row.check_result),
  ['OK', 'OK'],
  'the read-only production verifier must accept both rewritten functions',
);

const actor = '11111111-1111-4111-8111-111111111111';
const profile = '22222222-2222-4222-8222-222222222222';
await db.exec(`
  select set_config('request.jwt.claim.sub', '${actor}', false);
  insert into public.registrations(registration_id, wilaya, status)
  values ('REG-FAIL', 'Jijel', 'pending');
  insert into public.profiles(id, email, registration_id, status)
  values ('${profile}', 'member@example.test', 'REG-FAIL', 'pending');
  insert into public.support_tickets(id, created_by, wilaya, status, ticket_code)
  values (41, '${profile}', 'Jijel', 'open', 'TKT-FAIL');
  select set_config('mdz.test.audit_fail', 'on', false);
`);

let registrationError = '';
try {
  await db.query(`select public.review_registration_status('REG-FAIL', 'approved', null)`);
} catch (error) {
  registrationError = String(error?.message ?? error);
}
assert.match(registrationError, /MDZ_TEST_FORCED_AUDIT_FAILURE/);

const registrationState = await db.query(`
  select
    (select status from public.registrations where registration_id = 'REG-FAIL') as registration_status,
    (select review_reason is null from public.registrations where registration_id = 'REG-FAIL') as review_reason_unchanged,
    (select reviewed_at is null from public.registrations where registration_id = 'REG-FAIL') as reviewed_at_unchanged,
    (select reviewed_by is null from public.registrations where registration_id = 'REG-FAIL') as reviewed_by_unchanged,
    (select status from public.profiles where registration_id = 'REG-FAIL') as profile_status,
    (select count(*)::int from public.test_notifications) as notification_rows,
    (select count(*)::int from public.test_email_outbox) as email_rows,
    (select count(*)::int from public.admin_audit_log) as audit_rows
`);
assert.deepEqual(registrationState.rows[0], {
  registration_status: 'pending',
  review_reason_unchanged: true,
  reviewed_at_unchanged: true,
  reviewed_by_unchanged: true,
  profile_status: 'pending',
  notification_rows: 0,
  email_rows: 0,
  audit_rows: 0,
});

let ticketError = '';
try {
  await db.query(`select public.set_support_ticket_status(41, 'closed')`);
} catch (error) {
  ticketError = String(error?.message ?? error);
}
assert.match(ticketError, /MDZ_TEST_FORCED_AUDIT_FAILURE/);

const ticketState = await db.query(`
  select
    (select status from public.support_tickets where id = 41) as ticket_status,
    (select archived_at is null from public.support_tickets where id = 41) as archived_at_unchanged,
    (select count(*)::int from public.test_notifications) as notification_rows,
    (select count(*)::int from public.test_email_outbox) as email_rows,
    (select count(*)::int from public.admin_audit_log) as audit_rows,
    exists (
      select 1 from public.mdz_schema_migrations
      where version = '022' and name = 'fail_closed_admin_audit'
    ) as ledger_022_exists
`);
assert.deepEqual(ticketState.rows[0], {
  ticket_status: 'open',
  archived_at_unchanged: true,
  notification_rows: 0,
  email_rows: 0,
  audit_rows: 0,
  ledger_022_exists: true,
});

console.log(JSON.stringify({
  engine: 'PGlite/PostgreSQL',
  migration: '022_fail_closed_admin_audit.sql',
  verifier_rows: verification.rows.map((row) => ({ signature: row.signature, result: row.check_result })),
  forced_error: 'MDZ_TEST_FORCED_AUDIT_FAILURE',
  registration: registrationState.rows[0],
  support_ticket: ticketState.rows[0],
  result: 'OK_ATOMIC_ROLLBACK',
}, null, 2));

await db.close();
