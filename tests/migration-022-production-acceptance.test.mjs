#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const root = process.cwd();
const migration = await readFile(`${root}/supabase/migrations/022_fail_closed_admin_audit.sql`, 'utf8');
const attestation = await readFile(`${root}/supabase/migrations/022_fail_closed_admin_audit.verify.sql`, 'utf8');
const evidence021 = await readFile(
  `${root}/docs/runbooks/sql/021_reconcile_email_rpc_privileges.live-evidence.sql`,
  'utf8',
);
const happyPathSmoke = await readFile(
  `${root}/docs/runbooks/sql/022_happy_path_rollback_smoke.sql`,
  'utf8',
);
const rlsSmoke = await readFile(
  `${root}/docs/runbooks/sql/022_non_admin_audit_rls_smoke.sql`,
  'utf8',
);
const enginePreflight = await readFile(
  `${root}/docs/runbooks/sql/022_engine_major_preflight.sql`,
  'utf8',
);
const runbook = await readFile(`${root}/docs/runbooks/SEC01_PRODUCTION_ACCEPTANCE_AR.md`, 'utf8');

assert.doesNotMatch(
  evidence021,
  /^\s*(begin|commit|do|insert|update|delete|create|alter|drop|grant|revoke|truncate)\b/im,
  '021 live evidence must remain read-only',
);
for (const field of [
  'captured_at_utc',
  'server_version_num',
  'server_encoding',
  'session_user_name',
  'current_user_name',
  'expected_identity_args',
  'raw_proacl',
  'expanded_execute_acl_supporting',
  'ledger_applied_at_utc',
  'OK_ATTESTED',
]) {
  assert.match(evidence021, new RegExp(field, 'i'));
}

assert.match(happyPathSmoke, /for update/i, 'the selected ticket must be locked against races');
assert.match(happyPathSmoke, /MDZ_022_SMOKE_ROLLBACK/);
assert.match(happyPathSmoke, /audit_rows_during\s*<>\s*1/i);
assert.match(happyPathSmoke, /notification_rows_during\s*<>\s*1/i);
assert.match(happyPathSmoke, /audit_event_absent_after_rollback/i);
assert.match(happyPathSmoke, /notification_event_absent_after_rollback/i);
assert.match(happyPathSmoke, /sequence_gap_expected/i);
assert.match(happyPathSmoke, /OK_ROLLBACK_SMOKE/i);
assert.doesNotMatch(
  happyPathSmoke,
  /^\s*(insert|update|delete|truncate)\s+(?:into\s+)?public\./im,
  'the smoke harness must not directly mutate a persistent public table',
);

assert.match(rlsSmoke, /set_config\('role', 'authenticated', true\)/i);
assert.match(rlsSmoke, /subject_sha256/i);
assert.match(rlsSmoke, /mdz_is_platform_admin\(\)/i);
assert.match(rlsSmoke, /count\(\*\)\s+[\s\S]*?from public\.admin_audit_log/i);
assert.match(rlsSmoke, /security\.rls_probe/i);
assert.match(rlsSmoke, /total_rows_with_sentinel/i);
assert.match(rlsSmoke, /visible_sentinel_rows/i);
assert.match(rlsSmoke, /sentinel_absent_after_rollback/i);
assert.match(rlsSmoke, /OK_RLS_SENTINEL_HIDDEN/i);
assert.equal(
  (rlsSmoke.match(/insert into public\.admin_audit_log/gi) ?? []).length,
  1,
  'the RLS harness must create exactly one transactional sentinel',
);
assert.doesNotMatch(
  rlsSmoke,
  /^\s*(update|delete|truncate)\s+(?:from\s+)?public\./im,
  'the RLS harness must not perform other persistent-table mutations',
);

assert.match(runbook, /021-أ[\s\S]*021-ب[\s\S]*022-أ[\s\S]*022-ب[\s\S]*022-ج[\s\S]*022-د/);
assert.match(runbook, /SHA-256/);
assert.match(runbook, /server_version_num/);
assert.match(attestation, /OK_ATTESTED/);
assert.match(enginePreflight, /OK_ENGINE_MAJOR_MATCH/);
assert.match(enginePreflight, /BLOCK_ENGINE_MAJOR_MISMATCH/);
assert.match(attestation, /engine_major_matches/i);
assert.match(
  runbook,
  /021-أ[\s\S]*021-ب[\s\S]*022-0[\s\S]*022-أ[\s\S]*022-ب[\s\S]*022-ج[\s\S]*022-د/,
);

const db = new PGlite();
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  create role unexpected_rpc_caller nologin;
  create schema auth;
  grant usage on schema auth to authenticated;

  create table auth.users (
    id uuid primary key,
    created_at timestamptz not null default now()
  );

  create function auth.uid() returns uuid
  language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant execute on function auth.uid() to authenticated;

  create table public.mdz_schema_migrations (
    version text primary key,
    name text not null,
    applied_at timestamptz not null default now(),
    notes text
  );

  create table public.user_roles (
    user_id uuid not null,
    role text not null
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
    status text,
    role text
  );

  create table public.support_tickets (
    id bigint primary key,
    created_by uuid not null,
    wilaya text,
    status text,
    updated_at timestamptz default now(),
    archived_at timestamptz,
    ticket_code text not null,
    created_at timestamptz not null default now()
  );

  create table public.notifications (
    id bigint generated always as identity primary key,
    recipient_id uuid not null,
    event_type text not null,
    title text not null,
    body text,
    payload jsonb not null default '{}'::jsonb,
    link_path text,
    created_at timestamptz not null default now()
  );

  create table public.test_email_outbox (
    id bigint generated always as identity primary key,
    recipient_email text,
    template_key text
  );

  create table public.admin_audit_log (
    id bigint generated always as identity primary key,
    created_at timestamptz not null default now(),
    actor_id uuid not null,
    action text not null,
    target_type text not null,
    target_id uuid,
    target_label text,
    payload jsonb not null default '{}'::jsonb
  );

  alter table public.admin_audit_log enable row level security;
  grant select on public.admin_audit_log to authenticated;

  create function public.mdz_is_platform_admin() returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('admin', 'founder', 'super_admin')
    )
  $$;
  grant execute on function public.mdz_is_platform_admin() to authenticated;

  create function public.mdz_is_wilaya_manager() returns boolean
  language sql stable as $$ select false $$;

  create function public.mdz_caller_wilaya() returns text
  language sql stable as $$ select null::text $$;

  create function public.mdz_notify_user(
    p_recipient_id uuid,
    p_event_type text,
    p_title text,
    p_body text,
    p_payload jsonb,
    p_link_path text
  ) returns bigint
  language plpgsql
  as $$
  declare v_id bigint;
  begin
    insert into public.notifications(recipient_id, event_type, title, body, payload, link_path)
    values (p_recipient_id, p_event_type, p_title, p_body, p_payload, p_link_path)
    returning id into v_id;
    return v_id;
  end;
  $$;

  create function public.mdz_enqueue_email(
    p_email text,
    p_user_id uuid,
    p_template_key text,
    p_subject text,
    p_body_text text,
    p_payload jsonb
  ) returns bigint
  language plpgsql
  as $$
  declare v_id bigint;
  begin
    insert into public.test_email_outbox(recipient_email, template_key)
    values (p_email, p_template_key)
    returning id into v_id;
    return v_id;
  end;
  $$;

  create function public.mdz_claim_email_outbox(
    p_limit integer,
    p_worker_id text
  ) returns integer
  language sql as $$ select 0 $$;

  create function public.mdz_mark_email_outbox(
    p_id bigint,
    p_status text,
    p_error text,
    p_provider_message_id text
  ) returns boolean
  language sql as $$ select true $$;

  revoke all on function public.mdz_claim_email_outbox(integer, text)
    from public, anon, authenticated;
  revoke all on function public.mdz_enqueue_email(text, uuid, text, text, text, jsonb)
    from public, anon, authenticated;
  revoke all on function public.mdz_mark_email_outbox(bigint, text, text, text)
    from public, anon, authenticated;
  revoke all on function public.mdz_notify_user(uuid, text, text, text, jsonb, text)
    from public, anon, authenticated;
  grant execute on function public.mdz_claim_email_outbox(integer, text) to service_role;
  grant execute on function public.mdz_enqueue_email(text, uuid, text, text, text, jsonb) to service_role;
  grant execute on function public.mdz_mark_email_outbox(bigint, text, text, text) to service_role;
  grant execute on function public.mdz_notify_user(uuid, text, text, text, jsonb, text) to service_role;

  create function public.mdz_audit_admin_action(
    p_actor_id uuid,
    p_action text,
    p_target_type text,
    p_target_id uuid,
    p_target_label text,
    p_payload jsonb default '{}'::jsonb
  ) returns void
  language plpgsql security definer set search_path = ''
  as $$
  begin
    if p_actor_id is distinct from auth.uid() then
      raise exception 'audit actor mismatch';
    end if;
    insert into public.admin_audit_log(actor_id, action, target_type, target_id, target_label, payload)
    values (p_actor_id, p_action, p_target_type, p_target_id, p_target_label, p_payload);
  end;
  $$;

  create function public.review_registration_status(text, text, text default null)
  returns jsonb language sql as $$ select '{}'::jsonb $$;

  create function public.set_support_ticket_status(bigint, text)
  returns public.support_tickets language sql
  as $$ select * from public.support_tickets where false $$;

  grant execute on function public.review_registration_status(text, text, text)
    to unexpected_rpc_caller;
  grant execute on function public.set_support_ticket_status(bigint, text)
    to unexpected_rpc_caller;
  grant execute on function public.review_registration_status(text, text, text)
    to authenticated with grant option;
  grant execute on function public.set_support_ticket_status(bigint, text)
    to authenticated with grant option;
`);

const engineGate = await db.query(enginePreflight);
assert.equal(engineGate.rows[0]?.check_result, 'OK_ENGINE_MAJOR_MATCH');
assert.equal(engineGate.rows[0]?.engine_major_matches, true);
const mismatchedEnginePreflight = enginePreflight
  .replace('180003::integer as isolated_tested_server_version_num',
    '170000::integer as isolated_tested_server_version_num')
  .replace('18::integer as isolated_tested_server_major',
    '17::integer as isolated_tested_server_major');
const blockedEngineGate = await db.query(mismatchedEnginePreflight);
assert.equal(blockedEngineGate.rows[0]?.check_result, 'BLOCK_ENGINE_MAJOR_MISMATCH');
assert.equal(blockedEngineGate.rows[0]?.engine_major_matches, false);

// Policies resolve referenced functions at creation time, so create it after the helper exists.
await db.exec(`
  create policy "admin_audit: admin read"
    on public.admin_audit_log for select to authenticated
    using (public.mdz_is_platform_admin());
`);

await db.exec(`
  insert into public.mdz_schema_migrations(version, name, notes)
  values (
    '021',
    'reconcile_email_rpc_privileges',
    'PGlite acceptance fixture for the read-only 021 evidence query.'
  );
`);
const evidence021Results = await db.query(evidence021);
assert.equal(evidence021Results.rows.length, 4);
assert.deepEqual(
  evidence021Results.rows.map((row) => row.function_check_result),
  ['OK_ATTESTED', 'OK_ATTESTED', 'OK_ATTESTED', 'OK_ATTESTED'],
);
assert.deepEqual(
  evidence021Results.rows.map((row) => row.overall_result),
  ['OK_ATTESTED', 'OK_ATTESTED', 'OK_ATTESTED', 'OK_ATTESTED'],
);

await db.exec(`
  grant execute on function public.mdz_claim_email_outbox(integer, text)
    to unexpected_rpc_caller;
`);
const hostileEvidence021 = await db.query(evidence021);
assert.equal(
  hostileEvidence021.rows.find((row) =>
    row.expected_signature === 'public.mdz_claim_email_outbox(integer,text)'
  )?.function_check_result,
  'FAIL',
  '021 evidence must reject an unexpected direct EXECUTE grantee',
);
assert.ok(hostileEvidence021.rows.every((row) => row.overall_result === 'FAIL'));
await db.exec(`
  revoke execute on function public.mdz_claim_email_outbox(integer, text)
    from unexpected_rpc_caller;
`);

await db.exec(`
  create function public.mdz_notify_user(uuid) returns bigint
  language sql as $$ select 0::bigint $$;
`);
const overloadedEvidence021 = await db.query(evidence021);
assert.equal(
  overloadedEvidence021.rows.find((row) =>
    row.expected_signature === 'public.mdz_notify_user(uuid,text,text,text,jsonb,text)'
  )?.function_check_result,
  'FAIL',
  '021 evidence must reject an unexpected overload',
);
await db.exec(`drop function public.mdz_notify_user(uuid);`);

const preMigrationShape = await db.query(`
  select
    p.oid::regprocedure::text as signature,
    l.lanname as language_name,
    p.prosecdef as security_definer
  from pg_proc p
  join pg_language l on l.oid = p.prolang
  where p.oid in (
    to_regprocedure('public.review_registration_status(text,text,text)'),
    to_regprocedure('public.set_support_ticket_status(bigint,text)')
  )
  order by p.oid::regprocedure::text
`);
let mismatchedMigrationError = '';
try {
  await db.exec(migration.replace('v_live_server_major <> 18', 'v_live_server_major <> 17'));
} catch (error) {
  mismatchedMigrationError = String(error?.message ?? error);
}
await db.exec('rollback;');
assert.match(mismatchedMigrationError, /does not match isolated-tested major 18/);
const postBlockedMigrationShape = await db.query(`
  select
    p.oid::regprocedure::text as signature,
    l.lanname as language_name,
    p.prosecdef as security_definer
  from pg_proc p
  join pg_language l on l.oid = p.prolang
  where p.oid in (
    to_regprocedure('public.review_registration_status(text,text,text)'),
    to_regprocedure('public.set_support_ticket_status(bigint,text)')
  )
  order by p.oid::regprocedure::text
`);
assert.deepEqual(
  postBlockedMigrationShape.rows,
  preMigrationShape.rows,
  'engine-major mismatch must abort before either function is replaced',
);
const blockedLedger = await db.query(`
  select exists (
    select 1 from public.mdz_schema_migrations where version = '022'
  ) as ledger_exists
`);
assert.equal(blockedLedger.rows[0]?.ledger_exists, false);

await db.exec(migration);
const verified = await db.query(attestation);
assert.deepEqual(verified.rows.map((row) => row.check_result), ['OK_ATTESTED', 'OK_ATTESTED']);
assert.deepEqual(
  verified.rows.map((row) => row.actual_direct_execute_grantees),
  [
    ['authenticated', 'postgres', 'service_role'],
    ['authenticated', 'postgres'],
  ],
  '022 must rebuild the direct EXECUTE ACL as an exact allowlist',
);
assert.deepEqual(
  verified.rows.map((row) => row.unexpected_grantable_grantees),
  [[], []],
  'non-owner roles must not retain EXECUTE grant options',
);
const hostileAcl = await db.query(`
  select
    has_function_privilege(
      'unexpected_rpc_caller',
      'public.review_registration_status(text,text,text)',
      'EXECUTE'
    ) as review_execute,
    has_function_privilege(
      'unexpected_rpc_caller',
      'public.set_support_ticket_status(bigint,text)',
      'EXECUTE'
    ) as ticket_execute
`);
assert.deepEqual(hostileAcl.rows[0], { review_execute: false, ticket_execute: false });

await db.exec(`
  grant execute on function public.set_support_ticket_status(bigint, text)
    to unexpected_rpc_caller;
`);
const verifierAgainstUnexpectedAcl = await db.query(attestation);
assert.equal(
  verifierAgainstUnexpectedAcl.rows.find((row) =>
    row.signature === 'public.set_support_ticket_status(bigint,text)'
  )?.check_result,
  'FAIL',
  '022 verifier must reject ACL drift introduced after migration',
);
await db.exec(`
  revoke execute on function public.set_support_ticket_status(bigint, text)
    from unexpected_rpc_caller;
`);

await db.exec(`
  grant execute on function public.set_support_ticket_status(bigint, text)
    to authenticated with grant option;
`);
const verifierAgainstGrantOption = await db.query(attestation);
assert.equal(
  verifierAgainstGrantOption.rows.find((row) =>
    row.signature === 'public.set_support_ticket_status(bigint,text)'
  )?.check_result,
  'FAIL',
  '022 verifier must reject non-owner EXECUTE grant options',
);
await db.exec(`
  revoke grant option for execute
    on function public.set_support_ticket_status(bigint, text)
    from authenticated cascade;
`);

const mismatchedAttestation = attestation
  .replace('180003::integer as isolated_tested_server_version_num',
    '170000::integer as isolated_tested_server_version_num')
  .replace('18::integer as isolated_tested_server_major',
    '17::integer as isolated_tested_server_major')
  .replace('/ 10000 = 18', '/ 10000 = 17');
const blockedAttestation = await db.query(mismatchedAttestation);
assert.deepEqual(
  blockedAttestation.rows.map((row) => row.check_result),
  ['FAIL', 'FAIL'],
  '022 verifier must fail when the isolated-test major differs from the live major',
);

const adminId = '11111111-1111-4111-8111-111111111111';
const memberId = '22222222-2222-4222-8222-222222222222';
await db.exec(`
  insert into auth.users(id) values ('${adminId}'), ('${memberId}');
  insert into public.user_roles(user_id, role) values ('${adminId}', 'admin');
  insert into public.profiles(id, role, status) values ('${memberId}', 'buyer', 'approved');
  insert into public.support_tickets(id, created_by, wilaya, status, ticket_code)
  values (41, '${memberId}', 'Jijel', 'open', 'TKT-ACCEPTANCE');
`);

const happyResults = await db.exec(happyPathSmoke);
const happyEvidence = happyResults.at(-1)?.rows?.[0];
if (happyEvidence?.check_result !== 'OK_ROLLBACK_SMOKE') {
  console.error(JSON.stringify({ happyEvidence, happyResults }, null, 2));
}
assert.equal(happyEvidence?.check_result, 'OK_ROLLBACK_SMOKE');
assert.equal(happyEvidence?.audit_rows_during, 1);
assert.equal(happyEvidence?.notification_rows_during, 1);
assert.equal(happyEvidence?.ticket_unchanged_after_rollback, true);
assert.equal(happyEvidence?.audit_event_absent_after_rollback, true);
assert.equal(happyEvidence?.notification_event_absent_after_rollback, true);

const postSmokeState = await db.query(`
  select
    (select status from public.support_tickets where id = 41) as ticket_status,
    (select count(*)::integer from public.admin_audit_log) as audit_rows,
    (select count(*)::integer from public.notifications) as notification_rows
`);
assert.deepEqual(postSmokeState.rows[0], {
  ticket_status: 'open',
  audit_rows: 0,
  notification_rows: 0,
});

const rlsResults = await db.exec(rlsSmoke);
const rlsEvidence = rlsResults.at(-1)?.rows?.[0];
if (rlsEvidence?.check_result !== 'OK_RLS_SENTINEL_HIDDEN') {
  console.error(JSON.stringify({ rlsEvidence, rlsResults }, null, 2));
}
assert.equal(rlsEvidence?.current_user_name, 'authenticated');
assert.equal(rlsEvidence?.platform_admin_result, false);
assert.ok(rlsEvidence?.total_rows_with_sentinel >= 1);
assert.equal(rlsEvidence?.visible_audit_rows, 0);
assert.equal(rlsEvidence?.visible_sentinel_rows, 0);
assert.equal(rlsEvidence?.sentinel_absent_after_rollback, true);
assert.equal(rlsEvidence?.check_result, 'OK_RLS_SENTINEL_HIDDEN');

await db.exec(`
  create policy "admin_audit: hostile permissive read"
    on public.admin_audit_log for select to authenticated
    using (true);
`);
const hostileRlsResults = await db.exec(rlsSmoke);
const hostileRlsEvidence = hostileRlsResults.at(-1)?.rows?.[0];
assert.equal(hostileRlsEvidence?.check_result, 'FAIL');
assert.ok(hostileRlsEvidence?.visible_sentinel_rows >= 1);
assert.equal(hostileRlsEvidence?.sentinel_absent_after_rollback, true);
await db.exec(`
  drop policy "admin_audit: hostile permissive read"
    on public.admin_audit_log;
`);

console.log(JSON.stringify({
  result: 'OK_PRODUCTION_ACCEPTANCE_HARNESS',
  engine_preflight: engineGate.rows[0],
  email_rpc_021: evidence021Results.rows.map((row) => ({
    signature: row.expected_signature,
    function: row.function_check_result,
    overall: row.overall_result,
  })),
  happy_path: happyEvidence,
  ordinary_member_rls: rlsEvidence,
}, null, 2));

await db.close();
