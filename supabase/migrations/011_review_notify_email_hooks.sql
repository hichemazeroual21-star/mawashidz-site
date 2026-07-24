-- ============================================================
-- MawashiDZ — Wire registration review → notification + email outbox
-- After: 010_notifications_tickets_email_outbox.sql
-- Replaces review_registration_status body; keeps same signature.
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
  member_email text;
  notif_title text;
  notif_body text;
  mail_subject text;
  mail_body text;
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

  perform set_config('mdz.admin_profile_update', 'true', true);

  update public.profiles p
  set status = p_new_status
  where p.registration_id = reg_id;

  get diagnostics profiles_updated = row_count;

  select p.id, p.email into updated_profile_id, member_email
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

  -- Audit when helper exists (008)
  begin
    if is_admin and updated_profile_id is not null then
      perform public.mdz_audit_admin_action(
        caller_id,
        'registration.review',
        'registration',
        updated_profile_id,
        reg_id,
        jsonb_build_object('status', p_new_status, 'reason', reason_clean, 'wilaya', reg.wilaya)
      );
    end if;
  exception when undefined_function then
    null;
  end;

  -- In-app notification + email outbox for the member
  if updated_profile_id is not null then
    if p_new_status = 'approved' then
      notif_title := 'تمت الموافقة على طلب العضوية';
      notif_body := 'يمكنك الآن استخدام حسابك في مواشي DZ.';
      mail_subject := 'MawashiDZ — تمت الموافقة على عضويتك';
      mail_body := 'تمت الموافقة على طلب عضويتك. افتح حسابك للمتابعة: https://mawashidz.com/#account';
    elsif p_new_status = 'rejected' then
      notif_title := 'تم رفض طلب العضوية';
      notif_body := coalesce(reason_clean, 'راجع سبب الرفض من تبويب الطلب في حسابك.');
      mail_subject := 'MawashiDZ — تحديث طلب العضوية';
      mail_body := 'تم تحديث حالة طلب عضويتك إلى مرفوض. السبب: '
        || coalesce(reason_clean, 'غير محدد')
        || '. التفاصيل: https://mawashidz.com/#account';
    elsif p_new_status = 'suspended' then
      notif_title := 'تم تعليق الحساب';
      notif_body := coalesce(reason_clean, 'تواصل مع الدعم عبر تذكرة إن احتجت مساعدة.');
      mail_subject := 'MawashiDZ — تعليق الحساب';
      mail_body := 'تم تعليق حسابك. افتح حسابك أو افتح تذكرة دعم: https://mawashidz.com/#account';
    else
      notif_title := 'تحديث حالة العضوية';
      notif_body := p_new_status;
      mail_subject := 'MawashiDZ — تحديث العضوية';
      mail_body := 'تم تحديث حالة عضويتك إلى: ' || p_new_status;
    end if;

    begin
      perform public.mdz_notify_user(
        updated_profile_id,
        'registration_' || p_new_status,
        notif_title,
        notif_body,
        jsonb_build_object(
          'registration_id', reg_id,
          'status', p_new_status,
          'reason', reason_clean
        ),
        '#account'
      );
    exception when undefined_function then
      null;
    end;

    if member_email is not null and btrim(member_email) <> '' then
      begin
        perform public.mdz_enqueue_email(
          member_email,
          updated_profile_id,
          'registration_' || p_new_status,
          mail_subject,
          mail_body,
          jsonb_build_object('registration_id', reg_id, 'status', p_new_status)
        );
      exception when undefined_function then
        null;
      end;
    end if;
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

-- Members may read their own registration row (status + review_reason in message)
drop policy if exists "registrations: member read own" on public.registrations;
create policy "registrations: member read own"
  on public.registrations for select
  to authenticated
  using (
    registration_id is not null
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.registration_id is not null
        and p.registration_id = registrations.registration_id
    )
  );
