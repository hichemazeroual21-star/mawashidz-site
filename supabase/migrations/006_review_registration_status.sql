-- ============================================================
-- MawashiDZ — مراجعة طلبات التسجيل (موافقة / رفض) عبر RPC آمن
-- - لا PATCH مباشر على status من المتصفح
-- - الإدارة: كل الولايات
-- - مدير الولاية: ولايته فقط
-- - يحدّث profiles.status و registrations.status عند التوفر
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
  updated_profile public.profiles%rowtype;
  reason_clean text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if caller_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_new_status not in ('approved', 'rejected', 'pending', 'suspended', 'active') then
    raise exception 'invalid status: %', p_new_status using errcode = '22023';
  end if;

  if p_registration_id is null or btrim(p_registration_id) = '' then
    raise exception 'registration_id required' using errcode = '22023';
  end if;

  select * into reg
  from public.registrations r
  where r.registration_id = btrim(p_registration_id)
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

  if not is_admin and not is_manager then
    raise exception 'insufficient privileges' using errcode = '42501';
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

  -- profiles may be protected by trigger — use same bypass as admin_set_profile_status
  perform set_config('mdz.admin_profile_update', 'true', true);

  update public.profiles p
  set status = p_new_status
  where p.registration_id = btrim(p_registration_id)
     or (
       nullif(to_jsonb(reg)->>'email', '') is not null
       and p.email is not null
       and lower(p.email) = lower(nullif(to_jsonb(reg)->>'email', ''))
     )
  returning * into updated_profile;

  update public.registrations r
  set status = p_new_status
  where r.registration_id = btrim(p_registration_id)
     or r.id = reg.id;

  -- optional reason stored in message JSON when column is jsonb/text blob — best-effort
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
      where r.id = reg.id;
    exception when others then
      null; -- never fail review solely on reason persistence
    end;
  end if;

  return jsonb_build_object(
    'ok', true,
    'registration_id', btrim(p_registration_id),
    'status', p_new_status,
    'profile_id', updated_profile.id,
    'wilaya', reg.wilaya
  );
end;
$$;

revoke all on function public.review_registration_status(text, text, text) from public;
grant execute on function public.review_registration_status(text, text, text) to authenticated;
grant execute on function public.review_registration_status(text, text, text) to service_role;

-- Harden existing profile RPC: managers may set status only for same wilaya
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

    if not is_admin and not is_manager then
      raise exception 'insufficient privileges: admin or wilaya manager role required';
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
  set
    status = new_status,
    updated_at = coalesce(updated_at, now())
  where id = target_profile_id
  returning * into result;

  if result.id is null then
    raise exception 'profile not found: %', target_profile_id;
  end if;

  return result;
end;
$$;
