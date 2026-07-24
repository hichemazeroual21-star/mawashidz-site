-- ============================================================
-- MawashiDZ — Phase 1 quality elevation (production readiness)
-- After: 011_review_notify_email_hooks.sql
-- Fixes: email lease, helper privilege, manager audit, review_reason column
-- Idempotent.
-- ============================================================

-- 1) Dedicated review_reason (stop JSON-in-message fragility)
alter table public.registrations add column if not exists review_reason text;
alter table public.registrations add column if not exists reviewed_at timestamptz;
alter table public.registrations add column if not exists reviewed_by uuid references auth.users (id) on delete set null;

-- Backfill from message JSON when possible
do $$
begin
  update public.registrations r
  set review_reason = coalesce(
        nullif(btrim(r.review_reason), ''),
        nullif(btrim(r.message::jsonb ->> 'review_reason'), '')
      ),
      reviewed_at = coalesce(
        r.reviewed_at,
        nullif(r.message::jsonb ->> 'reviewed_at', '')::timestamptz
      )
  where r.message is not null
    and btrim(r.message) like '{%'
    and (r.review_reason is null or btrim(r.review_reason) = '');
exception when others then
  null;
end $$;

-- 2) Email outbox lease / processing state
alter table public.email_outbox drop constraint if exists email_outbox_status_check;
alter table public.email_outbox
  add constraint email_outbox_status_check
  check (status in ('pending', 'processing', 'sent', 'failed', 'skipped'));

alter table public.email_outbox add column if not exists locked_at timestamptz;
alter table public.email_outbox add column if not exists locked_by text;

-- Re-open permanently skipped rows so a later API key can send them
update public.email_outbox
set status = 'pending', last_error = null
where status = 'skipped'
  and coalesce(last_error, '') in ('RESEND_API_KEY unset', 'RESEND_API_KEY unset');

-- 3) Lock down privilege helpers — auth.uid() only (no arbitrary uid probing)
create or replace function public.mdz_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role in ('admin', 'founder', 'super_admin')
  );
$$;

create or replace function public.mdz_is_wilaya_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role in ('wilaya_manager', 'manager', 'wilaya_mgr')
  )
  or exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and lower(coalesce(p.role, '')) in ('manager', 'wilaya_manager', 'wilaya_mgr')
  );
$$;

create or replace function public.mdz_caller_wilaya()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(btrim(p.wilaya), '') from public.profiles p where p.id = (select auth.uid());
$$;

revoke all on function public.mdz_is_platform_admin() from public;
revoke all on function public.mdz_is_wilaya_manager() from public;
revoke all on function public.mdz_caller_wilaya() from public;
grant execute on function public.mdz_is_platform_admin() to authenticated, service_role;
grant execute on function public.mdz_is_wilaya_manager() to authenticated, service_role;
grant execute on function public.mdz_caller_wilaya() to authenticated, service_role;

-- Recreate RLS policies onto no-arg helpers BEFORE dropping uuid overloads
-- (Postgres refuses DROP while policies still reference the old signatures)
drop policy if exists "support_tickets: member read own" on public.support_tickets;
create policy "support_tickets: member read own"
  on public.support_tickets for select
  to authenticated
  using (
    created_by = (select auth.uid())
    or public.mdz_is_platform_admin()
    or (
      public.mdz_is_wilaya_manager()
      and wilaya is not null
      and wilaya = public.mdz_caller_wilaya()
    )
  );

drop policy if exists "support_messages: visible on ticket" on public.support_messages;
create policy "support_messages: visible on ticket"
  on public.support_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id
        and (
          t.created_by = (select auth.uid())
          or public.mdz_is_platform_admin()
          or (
            public.mdz_is_wilaya_manager()
            and t.wilaya is not null
            and t.wilaya = public.mdz_caller_wilaya()
          )
        )
    )
  );

drop policy if exists "support_notes: staff read" on public.support_internal_notes;
create policy "support_notes: staff read"
  on public.support_internal_notes for select
  to authenticated
  using (
    public.mdz_is_platform_admin()
    or (
      public.mdz_is_wilaya_manager()
      and exists (
        select 1 from public.support_tickets t
        where t.id = ticket_id
          and t.wilaya is not null
          and t.wilaya = public.mdz_caller_wilaya()
      )
    )
  );

drop policy if exists "email_outbox: admin read" on public.email_outbox;
create policy "email_outbox: admin read"
  on public.email_outbox for select
  to authenticated
  using (public.mdz_is_platform_admin());

-- Now safe: remove probeable uuid-arg helpers
drop function if exists public.mdz_is_platform_admin(uuid);
drop function if exists public.mdz_is_wilaya_manager(uuid);
drop function if exists public.mdz_caller_wilaya(uuid);

-- Explicit grants (do not rely on default privileges alone)
grant select on public.notifications to authenticated;
grant select on public.support_tickets to authenticated;
grant select on public.support_messages to authenticated;
grant select on public.support_internal_notes to authenticated;
grant select on public.email_outbox to authenticated;
revoke all on public.notifications from anon;
revoke all on public.support_tickets from anon;
revoke all on public.support_messages from anon;
revoke all on public.support_internal_notes from anon;
revoke all on public.email_outbox from anon;

-- 4) Atomic claim with processing lease
create or replace function public.mdz_claim_email_outbox(
  p_limit int default 20,
  p_worker_id text default 'worker'
)
returns setof public.email_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Recover stale processing locks (> 10 minutes)
  update public.email_outbox
  set status = 'pending', locked_at = null, locked_by = null
  where status = 'processing'
    and locked_at is not null
    and locked_at < now() - interval '10 minutes';

  return query
  with picked as (
    select e.id
    from public.email_outbox e
    where e.status = 'pending'
      and e.attempts < 8
    order by e.created_at asc
    limit greatest(1, least(coalesce(p_limit, 20), 50))
    for update skip locked
  )
  update public.email_outbox e
  set status = 'processing',
      attempts = e.attempts + 1,
      locked_at = now(),
      locked_by = left(coalesce(nullif(btrim(p_worker_id), ''), 'worker'), 120)
  from picked
  where e.id = picked.id
  returning e.*;
end;
$$;

revoke all on function public.mdz_claim_email_outbox(int, text) from public;
grant execute on function public.mdz_claim_email_outbox(int, text) to service_role;

-- Remove ambiguous 1-arg overload (defaults on 2-arg cover callers)
drop function if exists public.mdz_claim_email_outbox(int);

create or replace function public.mdz_mark_email_outbox(
  p_id bigint,
  p_status text,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('pending', 'processing', 'sent', 'failed', 'skipped') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  update public.email_outbox
  set status = p_status,
      last_error = nullif(btrim(coalesce(p_error, '')), ''),
      sent_at = case when p_status = 'sent' then now() else sent_at end,
      locked_at = case when p_status in ('sent', 'failed', 'skipped', 'pending') then null else locked_at end,
      locked_by = case when p_status in ('sent', 'failed', 'skipped', 'pending') then null else locked_by end
  where id = p_id;
end;
$$;

-- 5) When Resend unset: leave pending (do not permanent-skip)
-- Handled in Worker; DB allows pending.

-- 6) Rewrite review RPC: reason column + audit for managers too + helpers without uid args
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

  -- Audit EVERY privileged review (admin and manager)
  begin
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
  exception when undefined_function then
    null;
  end;

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
revoke all on function public.review_registration_status(text, text, text) from anon;
grant execute on function public.review_registration_status(text, text, text) to authenticated, service_role;

-- 7) Unread notification count for header badge
create or replace function public.count_my_unread_notifications()
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  n int;
begin
  if uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  select count(*)::int into n
  from public.notifications
  where recipient_id = uid and read_at is null;
  return coalesce(n, 0);
end;
$$;

revoke all on function public.count_my_unread_notifications() from public;
grant execute on function public.count_my_unread_notifications() to authenticated;

-- 8) Staff ticket reply should notify member (already); member reply notify assignee or wilaya managers via outbox optional
-- Notify platform: insert notification for assigned_to if set
create or replace function public.reply_support_ticket(
  p_ticket_id bigint,
  p_body text
)
returns public.support_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  t public.support_tickets%rowtype;
  msg public.support_messages;
  is_staff boolean;
begin
  if uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if length(btrim(coalesce(p_body, ''))) < 1 then
    raise exception 'body required' using errcode = '22023';
  end if;

  select * into t from public.support_tickets where id = p_ticket_id;
  if not found then
    raise exception 'ticket not found' using errcode = 'P0002';
  end if;
  if t.archived_at is not null or t.status = 'closed' then
    raise exception 'ticket closed' using errcode = 'P0001';
  end if;

  is_staff := public.mdz_is_platform_admin()
    or (
      public.mdz_is_wilaya_manager()
      and t.wilaya is not null
      and t.wilaya = public.mdz_caller_wilaya()
    );

  if t.created_by is distinct from uid and not is_staff then
    raise exception 'insufficient privileges' using errcode = '42501';
  end if;

  insert into public.support_messages (ticket_id, author_id, body)
  values (p_ticket_id, uid, left(btrim(p_body), 10000))
  returning * into msg;

  update public.support_tickets
  set updated_at = now(),
      status = case
        when is_staff and t.created_by is distinct from uid then 'waiting_for_member'
        when not is_staff then 'in_review'
        else status
      end
  where id = p_ticket_id;

  if is_staff and t.created_by is distinct from uid then
    perform public.mdz_notify_user(
      t.created_by,
      'ticket_reply',
      'رد على تذكرة الدعم',
      left(btrim(p_body), 180),
      jsonb_build_object('ticket_id', t.id, 'ticket_code', t.ticket_code),
      '#account-support'
    );
  elsif not is_staff then
    if t.assigned_to is not null then
      perform public.mdz_notify_user(
        t.assigned_to,
        'ticket_member_reply',
        'رد عضو على تذكرة',
        left(btrim(p_body), 180),
        jsonb_build_object('ticket_id', t.id, 'ticket_code', t.ticket_code),
        '#account-support'
      );
    else
      -- Fan-out to platform admins so unassigned tickets are not silent
      insert into public.notifications (recipient_id, event_type, title, body, payload, link_path)
      select ur.user_id,
             'ticket_member_reply',
             'رد عضو على تذكرة',
             left(btrim(p_body), 180),
             jsonb_build_object('ticket_id', t.id, 'ticket_code', t.ticket_code),
             '#admin-dash'
      from public.user_roles ur
      where ur.role in ('admin', 'founder', 'super_admin');
    end if;
  end if;

  return msg;
end;
$$;

revoke all on function public.reply_support_ticket(bigint, text) from public;
grant execute on function public.reply_support_ticket(bigint, text) to authenticated;

-- 9) set_support_ticket_status / add note — use new helpers
create or replace function public.set_support_ticket_status(
  p_ticket_id bigint,
  p_status text
)
returns public.support_tickets
language plpgsql
security definer
set search_path = public
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

  begin
    perform public.mdz_audit_admin_action(
      uid,
      'ticket.status',
      'support_ticket',
      null,
      t.ticket_code,
      jsonb_build_object('ticket_id', t.id, 'status', p_status)
    );
  exception when undefined_function then
    null;
  end;

  return result;
end;
$$;

revoke all on function public.set_support_ticket_status(bigint, text) from public;
grant execute on function public.set_support_ticket_status(bigint, text) to authenticated;

create or replace function public.add_support_internal_note(
  p_ticket_id bigint,
  p_body text
)
returns public.support_internal_notes
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  t public.support_tickets%rowtype;
  note public.support_internal_notes;
begin
  if uid is null then
    raise exception 'authentication required' using errcode = '28000';
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

  insert into public.support_internal_notes (ticket_id, author_id, body)
  values (p_ticket_id, uid, left(btrim(p_body), 10000))
  returning * into note;
  return note;
end;
$$;

revoke all on function public.add_support_internal_note(bigint, text) from public;
grant execute on function public.add_support_internal_note(bigint, text) to authenticated;
