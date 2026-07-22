-- ============================================================
-- MawashiDZ — Admin operations foundation (audit log + role RPCs)
-- Requires: 002 (user_roles RLS), 005 (admin_set_profile_status + trigger bypass)
-- Idempotent. Does not change registration rows from the client.
-- ============================================================

-- 1) Audit log (append-only from SECURITY DEFINER functions)
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

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_actor_id_idx
  on public.admin_audit_log (actor_id);

alter table public.admin_audit_log enable row level security;

drop policy if exists "admin_audit: admin read" on public.admin_audit_log;
create policy "admin_audit: admin read"
  on public.admin_audit_log for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.role in ('admin', 'founder', 'super_admin')
    )
  );

revoke insert, update, delete on public.admin_audit_log from anon, authenticated;

-- 2) Shared helpers
create or replace function public.mdz_assert_admin_caller()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'authentication required';
  end if;
  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = caller_id
      and ur.role in ('admin', 'founder', 'super_admin')
  ) then
    raise exception 'insufficient privileges: admin role required';
  end if;
  return caller_id;
end;
$$;

revoke all on function public.mdz_assert_admin_caller() from public;
grant execute on function public.mdz_assert_admin_caller() to authenticated;

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
set search_path = public
as $$
begin
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, target_label, payload)
  values (p_actor_id, p_action, p_target_type, p_target_id, p_target_label, coalesce(p_payload, '{}'::jsonb));
end;
$$;

revoke all on function public.mdz_audit_admin_action(uuid, text, text, uuid, text, jsonb) from public;

-- 3) Profile status (extends 005 — optional reason in audit payload)
create or replace function public.admin_set_profile_status(
  target_profile_id uuid,
  new_status text,
  reason text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  result public.profiles;
  old_status text;
  is_dashboard_sql boolean := current_user in ('postgres', 'supabase_admin', 'supabase_storage_admin');
begin
  if new_status not in ('pending', 'approved', 'rejected', 'suspended', 'active') then
    raise exception 'invalid status: %', new_status;
  end if;

  if is_dashboard_sql then
    caller_id := coalesce(auth.uid(), target_profile_id);
  else
    caller_id := public.mdz_assert_admin_caller();
  end if;

  select p.status into old_status from public.profiles p where p.id = target_profile_id;
  if old_status is null then
    raise exception 'profile not found: %', target_profile_id;
  end if;

  perform set_config('mdz.admin_profile_update', 'true', true);

  update public.profiles
  set
    status = new_status,
    updated_at = now()
  where id = target_profile_id
  returning * into result;

  perform public.mdz_audit_admin_action(
    caller_id,
    'profile.status_change',
    'profiles',
    target_profile_id,
    result.email,
    jsonb_build_object(
      'old_status', old_status,
      'new_status', new_status,
      'reason', reason
    )
  );

  return result;
end;
$$;

revoke all on function public.admin_set_profile_status(uuid, text, text) from public;
grant execute on function public.admin_set_profile_status(uuid, text, text) to authenticated;
grant execute on function public.admin_set_profile_status(uuid, text, text) to service_role;

-- Drop old 2-arg signature if present (005)
drop function if exists public.admin_set_profile_status(uuid, text);

-- 4) Grant / revoke platform roles (not registration role breeder/vet)
create or replace function public.admin_grant_user_role(
  target_user_id uuid,
  role_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := public.mdz_assert_admin_caller();
  normalized text := lower(trim(role_name));
begin
  if normalized not in (
    'founder', 'admin', 'super_admin',
    'wilaya_manager', 'manager', 'wilaya_mgr'
  ) then
    raise exception 'invalid platform role: %', role_name;
  end if;

  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = target_user_id and ur.role = normalized
  ) then
    insert into public.user_roles (user_id, role)
    values (target_user_id, normalized);
  end if;

  perform public.mdz_audit_admin_action(
    caller_id,
    'user_role.grant',
    'user_roles',
    target_user_id,
    normalized,
    jsonb_build_object('role', normalized)
  );
end;
$$;

create or replace function public.admin_revoke_user_role(
  target_user_id uuid,
  role_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := public.mdz_assert_admin_caller();
  normalized text := lower(trim(role_name));
begin
  delete from public.user_roles ur
  where ur.user_id = target_user_id and ur.role = normalized;

  perform public.mdz_audit_admin_action(
    caller_id,
    'user_role.revoke',
    'user_roles',
    target_user_id,
    normalized,
    jsonb_build_object('role', normalized)
  );
end;
$$;

revoke all on function public.admin_grant_user_role(uuid, text) from public;
revoke all on function public.admin_revoke_user_role(uuid, text) from public;
grant execute on function public.admin_grant_user_role(uuid, text) to authenticated;
grant execute on function public.admin_revoke_user_role(uuid, text) to authenticated;

-- 5) Recent audit for dashboard (admin UI)
create or replace function public.admin_list_audit_log(p_limit int default 30)
returns setof public.admin_audit_log
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.mdz_assert_admin_caller();
  return query
  select *
  from public.admin_audit_log l
  order by l.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
end;
$$;

revoke all on function public.admin_list_audit_log(int) from public;
grant execute on function public.admin_list_audit_log(int) to authenticated;
