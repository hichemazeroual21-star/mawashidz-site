-- MawashiDZ — 022 Fail closed when privileged audit cannot be written
-- Removes the legacy undefined_function compatibility catches from the two
-- privileged mutation paths that were allowed to continue without an audit row.

begin;

do $$
begin
  if to_regprocedure('public.mdz_audit_admin_action(uuid,text,text,uuid,text,jsonb)') is null then
    raise exception '022 abort: public.mdz_audit_admin_action is missing';
  end if;
  if to_regprocedure('public.review_registration_status(text,text,text)') is null then
    raise exception '022 abort: public.review_registration_status is missing';
  end if;
  if to_regprocedure('public.set_support_ticket_status(bigint,text)') is null then
    raise exception '022 abort: public.set_support_ticket_status is missing';
  end if;
  if to_regclass('public.mdz_schema_migrations') is null then
    raise exception '022 abort: public.mdz_schema_migrations is missing';
  end if;
end;
$$;

create or replace function public.review_registration_status(
  p_registration_id text,
  p_new_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
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

  if p_new_status = 'rejected' and reason_clean is null then
    raise exception 'rejection reason required' using errcode = '22023';
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

  is_admin := public.mdz_is_platform_admin();
  is_manager := public.mdz_is_wilaya_manager();

  if not is_admin and not is_manager then
    raise exception 'insufficient privileges' using errcode = '42501';
  end if;

  if not is_admin and p_new_status not in ('approved', 'rejected') then
    raise exception 'managers may only approve or reject' using errcode = '42501';
  end if;

  if not is_admin then
    caller_wilaya := public.mdz_caller_wilaya();
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
  set status = p_new_status,
      review_reason = case when p_new_status = 'rejected' then reason_clean else coalesce(reason_clean, r.review_reason) end,
      reviewed_at = now(),
      reviewed_by = caller_id
  where r.registration_id = reg_id;
  get diagnostics regs_updated = row_count;

  if regs_updated < 1 then
    raise exception 'registration update failed' using errcode = 'P0002';
  end if;

  -- No exception catch: an unavailable or failing writer aborts the mutation.
  perform public.mdz_audit_admin_action(
    caller_id,
    'registration.review',
    'registration',
    updated_profile_id,
    reg_id,
    jsonb_build_object(
      'status', p_new_status,
      'reason', reason_clean,
      'wilaya', reg.wilaya,
      'actor_rank', case when is_admin then 'admin' else 'wilaya_manager' end
    )
  );

  if updated_profile_id is not null then
    if p_new_status = 'approved' then
      notif_title := 'تمت الموافقة على طلب العضوية';
      notif_body := 'يمكنك الآن استخدام حسابك في مواشي DZ.';
      mail_subject := 'MawashiDZ — تمت الموافقة على عضويتك';
      mail_body := 'تمت الموافقة على طلب عضويتك. افتح حسابك: https://mawashidz.com/#account';
    elsif p_new_status = 'rejected' then
      notif_title := 'تم رفض طلب العضوية';
      notif_body := reason_clean;
      mail_subject := 'MawashiDZ — تحديث طلب العضوية';
      mail_body := 'تم رفض طلب عضويتك. السبب: ' || reason_clean || '. التفاصيل: https://mawashidz.com/#account';
    elsif p_new_status = 'suspended' then
      notif_title := 'تم تعليق الحساب';
      notif_body := coalesce(reason_clean, 'تواصل مع الدعم عبر تذكرة إن احتجت مساعدة.');
      mail_subject := 'MawashiDZ — تعليق الحساب';
      mail_body := 'تم تعليق حسابك. افتح حسابك أو تذكرة دعم: https://mawashidz.com/#account-support';
    else
      notif_title := 'تحديث حالة العضوية';
      notif_body := p_new_status;
      mail_subject := 'MawashiDZ — تحديث العضوية';
      mail_body := 'تم تحديث حالة عضويتك إلى: ' || p_new_status;
    end if;

    perform public.mdz_notify_user(
      updated_profile_id,
      'registration_' || p_new_status,
      notif_title,
      notif_body,
      jsonb_build_object('registration_id', reg_id, 'status', p_new_status, 'reason', reason_clean),
      case when p_new_status = 'rejected' then '#account-request' else '#account' end
    );

    if member_email is not null and btrim(member_email) <> '' then
      perform public.mdz_enqueue_email(
        member_email,
        updated_profile_id,
        'registration_' || p_new_status,
        mail_subject,
        mail_body,
        jsonb_build_object('registration_id', reg_id, 'status', p_new_status)
      );
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
revoke execute on function public.review_registration_status(text, text, text) from anon;
grant execute on function public.review_registration_status(text, text, text) to authenticated, service_role;

create or replace function public.set_support_ticket_status(
  p_ticket_id bigint,
  p_status text
)
returns public.support_tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  t public.support_tickets%rowtype;
  result public.support_tickets;
begin
  if uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_status not in ('open', 'in_review', 'waiting_for_member', 'escalated', 'closed') then
    raise exception 'invalid status' using errcode = '22023';
  end if;

  select * into t from public.support_tickets where id = p_ticket_id;
  if not found then
    raise exception 'ticket not found' using errcode = 'P0002';
  end if;

  if not (
    public.mdz_is_platform_admin()
    or (
      public.mdz_is_wilaya_manager()
      and t.wilaya is not null
      and t.wilaya = public.mdz_caller_wilaya()
    )
  ) then
    raise exception 'insufficient privileges' using errcode = '42501';
  end if;

  update public.support_tickets
  set status = p_status,
      updated_at = now(),
      archived_at = case when p_status = 'closed' then coalesce(archived_at, now()) else archived_at end
  where id = p_ticket_id
  returning * into result;

  perform public.mdz_notify_user(
    t.created_by,
    'ticket_status',
    'تحديث حالة تذكرة الدعم',
    p_status,
    jsonb_build_object('ticket_id', t.id, 'ticket_code', t.ticket_code, 'status', p_status),
    '#account-support'
  );

  -- No exception catch: an unavailable or failing writer aborts the mutation.
  perform public.mdz_audit_admin_action(
    uid,
    'ticket.status',
    'support_ticket',
    null,
    t.ticket_code,
    jsonb_build_object('ticket_id', t.id, 'status', p_status)
  );

  return result;
end;
$$;

revoke all on function public.set_support_ticket_status(bigint, text) from public;
revoke execute on function public.set_support_ticket_status(bigint, text) from anon;
grant execute on function public.set_support_ticket_status(bigint, text) to authenticated;

do $$
declare
  v_signature text;
  v_definition text;
begin
  foreach v_signature in array array[
    'public.review_registration_status(text,text,text)',
    'public.set_support_ticket_status(bigint,text)'
  ]
  loop
    select pg_get_functiondef(to_regprocedure(v_signature)) into v_definition;
    if position('mdz_audit_admin_action' in v_definition) = 0
       or position('EXCEPTION' in upper(v_definition)) > 0 then
      raise exception '022 abort: fail-closed audit post-condition failed: %', v_signature;
    end if;
  end loop;

  insert into public.mdz_schema_migrations (version, name, notes) values
    (
      '022',
      'fail_closed_admin_audit',
      'Privileged registration reviews and support-ticket status changes now roll back when the audit writer is missing or fails.'
    )
  on conflict (version) do update set
    name = excluded.name,
    notes = excluded.notes;
end;
$$;

commit;
