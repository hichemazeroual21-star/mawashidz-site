-- ============================================================
-- MawashiDZ — قبول الأعضاء بأمان (admin RPC + bypass للـ trigger)
-- المشكلة: protect_profile_sensitive_columns() يمنع تغيير status
--           حتى من Table Editor و UPDATE المباشر.
--
-- الحل: RPC إداري يضع علامة bypass داخل الجلسة ثم يحدّث status.
--       الحماية العامة تبقى — المستخدم العادي ما يقدرش يقبل نفسه.
--
-- شغّله من: Supabase Dashboard → SQL Editor → Run
-- آمن لإعادة التشغيل (idempotent).
-- ============================================================

-- 1) تحديث دالة الحماية — تسمح بالتعديل فقط عبر RPC الإداري
create or replace function public.protect_profile_sensitive_columns()
returns trigger
language plpgsql
as $$
declare
  admin_bypass boolean := coalesce(current_setting('mdz.admin_profile_update', true), '') = 'true';
begin
  if tg_op = 'UPDATE' and not admin_bypass then
    if old.status is distinct from new.status then
      raise exception 'status cannot be changed from client' using errcode = 'P0001';
    end if;
    if old.member_id is distinct from new.member_id then
      raise exception 'member_id cannot be changed from client' using errcode = 'P0001';
    end if;
    if old.role is distinct from new.role then
      raise exception 'role cannot be changed from client' using errcode = 'P0001';
    end if;
    if old.registration_id is distinct from new.registration_id then
      raise exception 'registration_id cannot be changed from client' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

-- إعادة ربط الـ trigger (قد يكون الاسم مختلفاً على الإنتاج)
drop trigger if exists protect_profile_sensitive_columns on public.profiles;
drop trigger if exists profiles_protect_sensitive on public.profiles;
drop trigger if exists trg_protect_profile_sensitive_columns on public.profiles;

create trigger protect_profile_sensitive_columns
  before update on public.profiles
  for each row execute function public.protect_profile_sensitive_columns();

-- 2) RPC إداري — قبول / رفض / تعليق عضو
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
  is_dashboard_sql boolean := current_user in ('postgres', 'supabase_admin', 'supabase_storage_admin');
begin
  if new_status not in ('pending', 'approved', 'rejected', 'suspended', 'active') then
    raise exception 'invalid status: %', new_status;
  end if;

  -- SQL Editor (postgres) أو مؤسس/إدارة عبر JWT
  if not is_dashboard_sql then
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

revoke all on function public.admin_set_profile_status(uuid, text) from public;
grant execute on function public.admin_set_profile_status(uuid, text) to authenticated;
grant execute on function public.admin_set_profile_status(uuid, text) to service_role;

-- ============================================================
-- بعد التشغيل — قبول Kamel Zas (استبدل UUID الكامل):
--
--   select public.admin_set_profile_status(
--     '54860c2e-3b58-4e99-aedd-bXXXXXXXXXX'::uuid,
--     'approved'
--   );
--
-- أو بالإيميل:
--
--   select public.admin_set_profile_status(p.id, 'approved')
--   from public.profiles p
--   where p.email ilike '%kamel%'
--   limit 1;
-- ============================================================
