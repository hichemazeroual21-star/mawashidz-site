-- ============================================================
-- MawashiDZ — مراجعة طلبات التسجيل (موافقة / رفض) عبر RPC آمن
-- - لا PATCH مباشر على status من المتصفح
-- - الإدارة: كل الولايات + كل الحالات المسموحة
-- - مدير الولاية: ولايته فقط + approved|rejected فقط
-- - يحدّث profiles/registrations عبر registration_id فقط (بدون مطابقة email)
-- Idempotent.
-- ============================================================

create or replace function public.review_registration_status(
  p_registration_id text,
  p_new_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  reg public.registrations%rowtype;
  caller_wilaya text;
  is_admin boolean := false;
  is_manager boolean := false;
  updated_profile_id uuid;
  profiles_updated int := 0;
  regs_updated int := 0;
  reason_clean text := nullif(btrim(coalesce(p_reason, '')), '');
  reg_id text;
begin
  if caller_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_new_status not in ('approved', 'rejected', 'pending', 'suspended', 'active') then
    raise exception 'invalid status: %', p_new_status using errcode = '22023';
  end if;

  reg_id := nullif(btrim(coalesce(p_registration_id, '')), '');
  if reg_id is null then
    raise exception 'registration_id required' using errcode = '22023';
  end if;

  select * into reg
  from public.registrations r
  where r.registration_id = reg_id
  order by r.created_at desc nulls last
  limit 1;

  if not found then
    raise exception 'registration not found' using errcode = 'P0002';
  end if;

  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = caller_id
      and ur.role in ('admin', 'founder', 'super_admin')
  ) into is_admin;

  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = caller_id
      and ur.role in ('wilaya_manager', 'manager', 'wilaya_mgr')
  ) into is_manager;

  -- Also allow profiles.role = manager for wilaya operators without user_roles row
  if not is_manager then
    select exists (
      select 1 from public.profiles p
      where p.id = caller_id
        and lower(coalesce(p.role, '')) in ('manager', 'wilaya_manager', 'wilaya_mgr')
    ) into is_manager;
  end if;

  if not is_admin and not is_manager then
    raise exception 'insufficient privileges' using errcode = '42501';
  end if;

  -- Managers may only approve/reject (not suspend/reactivate/pending)
  if not is_admin and p_new_status not in ('approved', 'rejected') then
    raise exception 'managers may only approve or reject' using errcode = '42501';
  end if;

  if not is_admin then
    select p.wilaya into caller_wilaya
    from public.profiles p
    where p.id = caller_id;

    if caller_wilaya is null
       or nullif(btrim(reg.wilaya), '') is null
       or btrim(reg.wilaya) is distinct from btrim(caller_wilaya) then
      raise exception 'wilaya scope violation' using errcode = '42501';
    end if;
  end if;

  -- Bypass protect_profile_sensitive_columns when present (migration 005)
  perform set_config('mdz.admin_profile_update', 'true', true);

  -- Match profiles ONLY by registration_id (never by email — prevents cross-account updates)
  update public.profiles p
  set status = p_new_status
  where p.registration_id = reg_id;

  get diagnostics profiles_updated = row_count;

  select p.id into updated_profile_id
  from public.profiles p
  where p.registration_id = reg_id
  order by p.created_at desc nulls last
  limit 1;

  update public.registrations r
  set status = p_new_status
  where r.registration_id = reg_id;

  get diagnostics regs_updated = row_count;

  if reason_clean is not null then
    begin
      update public.registrations r
      set message = case
        when r.message is null or btrim(r.message::text) = '' then
          json_build_object('review_reason', reason_clean, 'reviewed_at', now())::text
        when r.message::text like '{%' then
          (r.message::jsonb || jsonb_build_object('review_reason', reason_clean, 'reviewed_at', now()))::text
        else r.message
      end
      where r.registration_id = reg_id;
    exception when others then
      null;
    end;
  end if;

  if regs_updated < 1 then
    raise exception 'registration update failed' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'ok', true,
    'registration_id', reg_id,
    'status', p_new_status,
    'profile_id', updated_profile_id,
    'profiles_updated', profiles_updated,
    'registrations_updated', regs_updated,
    'wilaya', reg.wilaya
  );
end;
$$;

revoke all on function public.review_registration_status(text, text, text) from public;
revoke all on function public.review_registration_status(text, text, text) from anon;
grant execute on function public.review_registration_status(text, text, text) to authenticated;
grant execute on function public.review_registration_status(text, text, text) to service_role;

-- Harden existing profile RPC: managers may set status only for same wilaya + approved|rejected
create or replace function public.admin_set_profile_status(
  target_profile_id uuid,
  new_status text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  result public.profiles;
  target public.profiles%rowtype;
  is_dashboard_sql boolean := current_user in ('postgres', 'supabase_admin', 'supabase_storage_admin');
  is_admin boolean := false;
  is_manager boolean := false;
  caller_wilaya text;
begin
  if new_status not in ('pending', 'approved', 'rejected', 'suspended', 'active') then
    raise exception 'invalid status: %', new_status;
  end if;

  if not is_dashboard_sql then
    if caller_id is null then
      raise exception 'authentication required';
    end if;

    select exists (
      select 1 from public.user_roles ur
      where ur.user_id = caller_id
        and ur.role in ('admin', 'founder', 'super_admin')
    ) into is_admin;

    select exists (
      select 1 from public.user_roles ur
      where ur.user_id = caller_id
        and ur.role in ('wilaya_manager', 'manager', 'wilaya_mgr')
    ) into is_manager;

    if not is_manager then
      select exists (
        select 1 from public.profiles p
        where p.id = caller_id
          and lower(coalesce(p.role, '')) in ('manager', 'wilaya_manager', 'wilaya_mgr')
      ) into is_manager;
    end if;

    if not is_admin and not is_manager then
      raise exception 'insufficient privileges: admin or wilaya manager role required';
    end if;

    if not is_admin and new_status not in ('approved', 'rejected') then
      raise exception 'managers may only approve or reject';
    end if;

    select * into target from public.profiles where id = target_profile_id;
    if target.id is null then
      raise exception 'profile not found: %', target_profile_id;
    end if;

    if not is_admin then
      select p.wilaya into caller_wilaya from public.profiles p where p.id = caller_id;
      if caller_wilaya is null
         or target.wilaya is null
         or btrim(target.wilaya) is distinct from btrim(caller_wilaya) then
        raise exception 'wilaya scope violation';
      end if;
    end if;
  end if;

  perform set_config('mdz.admin_profile_update', 'true', true);

  update public.profiles
  set status = new_status
  where id = target_profile_id
  returning * into result;

  if result.id is null then
    raise exception 'profile not found: %', target_profile_id;
  end if;

  return result;
end;
$$;

revoke all on function public.admin_set_profile_status(uuid, text) from public;
revoke all on function public.admin_set_profile_status(uuid, text) from anon;
grant execute on function public.admin_set_profile_status(uuid, text) to authenticated;
grant execute on function public.admin_set_profile_status(uuid, text) to service_role;
