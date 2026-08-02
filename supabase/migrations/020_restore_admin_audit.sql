-- MawashiDZ — 020 Restore the production admin audit subsystem
-- Forward-only repair for DB-DRIFT-AUDIT-01 / reopened TD-008 and TD-019.
-- Do not replay 008 on a partially migrated production database.

begin;

do $$
begin
  if to_regclass('public.user_roles') is null then
    raise exception '020 abort: public.user_roles is missing';
  end if;
  if to_regprocedure('public.mdz_is_platform_admin()') is null then
    raise exception '020 abort: public.mdz_is_platform_admin() is missing';
  end if;
  if to_regprocedure('public.mdz_is_wilaya_manager()') is null then
    raise exception '020 abort: public.mdz_is_wilaya_manager() is missing';
  end if;
  if to_regprocedure('public.review_registration_status(text,text,text)') is null then
    raise exception '020 abort: review_registration_status(text,text,text) is missing';
  end if;
  if to_regprocedure('public.set_support_ticket_status(bigint,text)') is null then
    raise exception '020 abort: set_support_ticket_status(bigint,text) is missing';
  end if;
end;
$$;

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_id uuid not null,
  action text not null,
  target_type text not null,
  target_id uuid,
  target_label text,
  payload jsonb not null default '{}'::jsonb
);

do $$
declare
  invalid_columns text;
begin
  select string_agg(r.column_name, ', ' order by r.column_name)
    into invalid_columns
  from (
    values
      ('id', 'bigint'),
      ('created_at', 'timestamp with time zone'),
      ('actor_id', 'uuid'),
      ('action', 'text'),
      ('target_type', 'text'),
      ('target_id', 'uuid'),
      ('target_label', 'text'),
      ('payload', 'jsonb')
  ) as r(column_name, expected_type)
  left join pg_catalog.pg_attribute a
    on a.attrelid = 'public.admin_audit_log'::regclass
   and a.attname = r.column_name
   and a.attnum > 0
   and not a.attisdropped
  where a.attname is null
     or pg_catalog.format_type(a.atttypid, a.atttypmod) <> r.expected_type;

  if invalid_columns is not null then
    raise exception '020 abort: admin_audit_log missing or incompatible columns: %', invalid_columns;
  end if;
end;
$$;

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_actor_id_idx
  on public.admin_audit_log (actor_id);

alter table public.admin_audit_log enable row level security;

drop policy if exists "admin_audit: admin read" on public.admin_audit_log;
create policy "admin_audit: admin read"
  on public.admin_audit_log
  for select
  to authenticated
  using (public.mdz_is_platform_admin());

revoke all on table public.admin_audit_log from public, anon, authenticated;
grant select on table public.admin_audit_log to authenticated;
grant all on table public.admin_audit_log to service_role;

create or replace function public.mdz_assert_admin_caller()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if not public.mdz_is_platform_admin() then
    raise exception 'insufficient privileges: admin role required' using errcode = '42501';
  end if;
  return caller_id;
end;
$$;

create or replace function public.mdz_audit_admin_action(
  p_actor_id uuid,
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_target_label text,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null or p_actor_id is distinct from caller_id then
    raise exception 'audit actor mismatch' using errcode = '42501';
  end if;
  if not (
    public.mdz_is_platform_admin()
    or public.mdz_is_wilaya_manager()
  ) then
    raise exception 'insufficient privileges: operator role required' using errcode = '42501';
  end if;
  if nullif(btrim(p_action), '') is null
     or nullif(btrim(p_target_type), '') is null then
    raise exception 'audit action and target type are required' using errcode = '22023';
  end if;

  insert into public.admin_audit_log (
    actor_id, action, target_type, target_id, target_label, payload
  ) values (
    caller_id,
    btrim(p_action),
    btrim(p_target_type),
    p_target_id,
    nullif(btrim(p_target_label), ''),
    coalesce(p_payload, '{}'::jsonb)
  );
end;
$$;

create or replace function public.admin_list_audit_log(p_limit integer default 30)
returns setof public.admin_audit_log
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.mdz_assert_admin_caller();
  return query
  select l.*
  from public.admin_audit_log l
  order by l.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
end;
$$;

revoke all on function public.mdz_assert_admin_caller()
  from public, anon, authenticated, service_role;
grant execute on function public.mdz_assert_admin_caller() to authenticated;

revoke all on function public.mdz_audit_admin_action(uuid, text, text, uuid, text, jsonb)
  from public, anon, authenticated, service_role;

revoke all on function public.admin_list_audit_log(integer)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_list_audit_log(integer) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'admin_audit_log'
      and c.relkind in ('r', 'p')
      and c.relrowsecurity
  ) then
    raise exception '020 abort: admin_audit_log RLS post-condition failed';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'admin_audit_log'
      and policyname = 'admin_audit: admin read'
  ) then
    raise exception '020 abort: audit read policy post-condition failed';
  end if;

  if has_table_privilege('anon', 'public.admin_audit_log', 'SELECT')
     or not has_table_privilege('authenticated', 'public.admin_audit_log', 'SELECT')
     or not has_table_privilege('service_role', 'public.admin_audit_log', 'SELECT')
     or not has_table_privilege('service_role', 'public.admin_audit_log', 'INSERT') then
    raise exception '020 abort: audit table privilege post-condition failed';
  end if;

  if has_function_privilege('public', 'public.mdz_audit_admin_action(uuid,text,text,uuid,text,jsonb)', 'EXECUTE')
     or has_function_privilege('anon', 'public.mdz_audit_admin_action(uuid,text,text,uuid,text,jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.mdz_audit_admin_action(uuid,text,text,uuid,text,jsonb)', 'EXECUTE')
     or has_function_privilege('service_role', 'public.mdz_audit_admin_action(uuid,text,text,uuid,text,jsonb)', 'EXECUTE') then
    raise exception '020 abort: audit writer must remain internal-only';
  end if;

  if has_function_privilege('public', 'public.admin_list_audit_log(integer)', 'EXECUTE')
     or has_function_privilege('anon', 'public.admin_list_audit_log(integer)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.admin_list_audit_log(integer)', 'EXECUTE') then
    raise exception '020 abort: audit reader privilege post-condition failed';
  end if;

  if to_regclass('public.mdz_schema_migrations') is not null then
    insert into public.mdz_schema_migrations (version, name, notes) values
      ('020', 'restore_admin_audit',
       'Forward-only repair for production drift: restores audit table, internal writer, admin reader, RLS and explicit ACLs without replaying 008.')
    on conflict (version) do update set
      name = excluded.name,
      notes = excluded.notes;
  end if;
end;
$$;

commit;
