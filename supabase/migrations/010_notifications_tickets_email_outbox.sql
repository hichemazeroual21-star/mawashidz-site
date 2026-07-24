-- ============================================================
-- MawashiDZ — Phase 1: notifications, support tickets, email outbox
-- After: 009_schema_baseline_hardening.sql
-- Idempotent. Archive-only (no hard delete of messages/tickets).
-- ============================================================

-- ------------------------------------------------------------
-- 1) notifications (server-backed inbox)
-- ------------------------------------------------------------
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null,
  title text not null,
  body text,
  payload jsonb not null default '{}'::jsonb,
  link_path text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_event_type_nonempty check (length(btrim(event_type)) > 0),
  constraint notifications_title_len check (length(title) between 1 and 200)
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id)
  where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "notifications: recipient read" on public.notifications;
create policy "notifications: recipient read"
  on public.notifications for select
  to authenticated
  using (recipient_id = (select auth.uid()));

-- No direct insert/update/delete from clients — RPCs only
revoke insert, update, delete on public.notifications from anon, authenticated;

-- ------------------------------------------------------------
-- 2) support tickets + messages + internal notes
-- ------------------------------------------------------------
create table if not exists public.support_tickets (
  id bigint generated always as identity primary key,
  ticket_code text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  wilaya text,
  request_type text not null,
  subject text not null,
  status text not null default 'open',
  priority text not null default 'normal',
  assigned_to uuid references auth.users (id) on delete set null,
  linked_registration_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_tickets_code_unique unique (ticket_code),
  constraint support_tickets_status_check check (
    status in ('open', 'in_review', 'waiting_for_member', 'escalated', 'closed')
  ),
  constraint support_tickets_priority_check check (
    priority in ('low', 'normal', 'high', 'urgent')
  ),
  constraint support_tickets_type_check check (
    request_type in (
      'inquiry', 'complaint', 'suggestion', 'profile_change',
      'verification', 'technical', 'membership_followup', 'other'
    )
  ),
  constraint support_tickets_subject_len check (length(btrim(subject)) between 2 and 200)
);

create index if not exists support_tickets_created_by_idx on public.support_tickets (created_by, created_at desc);
create index if not exists support_tickets_wilaya_status_idx on public.support_tickets (wilaya, status);
create index if not exists support_tickets_status_updated_idx on public.support_tickets (status, updated_at desc);

create table if not exists public.support_messages (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references public.support_tickets (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint support_messages_body_len check (length(btrim(body)) between 1 and 10000)
);

create index if not exists support_messages_ticket_idx
  on public.support_messages (ticket_id, created_at asc);

create table if not exists public.support_internal_notes (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references public.support_tickets (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint support_internal_notes_body_len check (length(btrim(body)) between 1 and 10000)
);

create index if not exists support_internal_notes_ticket_idx
  on public.support_internal_notes (ticket_id, created_at asc);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_internal_notes enable row level security;

-- Helper: is platform admin
create or replace function public.mdz_is_platform_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = uid
      and ur.role in ('admin', 'founder', 'super_admin')
  );
$$;

create or replace function public.mdz_is_wilaya_manager(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = uid
      and ur.role in ('wilaya_manager', 'manager', 'wilaya_mgr')
  )
  or exists (
    select 1 from public.profiles p
    where p.id = uid
      and lower(coalesce(p.role, '')) in ('manager', 'wilaya_manager', 'wilaya_mgr')
  );
$$;

create or replace function public.mdz_caller_wilaya(uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(btrim(p.wilaya), '') from public.profiles p where p.id = uid;
$$;

revoke all on function public.mdz_is_platform_admin(uuid) from public;
revoke all on function public.mdz_is_wilaya_manager(uuid) from public;
revoke all on function public.mdz_caller_wilaya(uuid) from public;
grant execute on function public.mdz_is_platform_admin(uuid) to authenticated, service_role;
grant execute on function public.mdz_is_wilaya_manager(uuid) to authenticated, service_role;
grant execute on function public.mdz_caller_wilaya(uuid) to authenticated, service_role;

-- Tickets SELECT
drop policy if exists "support_tickets: member read own" on public.support_tickets;
create policy "support_tickets: member read own"
  on public.support_tickets for select
  to authenticated
  using (
    created_by = (select auth.uid())
    or public.mdz_is_platform_admin((select auth.uid()))
    or (
      public.mdz_is_wilaya_manager((select auth.uid()))
      and wilaya is not null
      and wilaya = public.mdz_caller_wilaya((select auth.uid()))
    )
  );

-- Messages SELECT (same ticket visibility)
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
          or public.mdz_is_platform_admin((select auth.uid()))
          or (
            public.mdz_is_wilaya_manager((select auth.uid()))
            and t.wilaya is not null
            and t.wilaya = public.mdz_caller_wilaya((select auth.uid()))
          )
        )
    )
  );

-- Internal notes: staff only
drop policy if exists "support_notes: staff read" on public.support_internal_notes;
create policy "support_notes: staff read"
  on public.support_internal_notes for select
  to authenticated
  using (
    public.mdz_is_platform_admin((select auth.uid()))
    or (
      public.mdz_is_wilaya_manager((select auth.uid()))
      and exists (
        select 1 from public.support_tickets t
        where t.id = ticket_id
          and t.wilaya is not null
          and t.wilaya = public.mdz_caller_wilaya((select auth.uid()))
      )
    )
  );

revoke insert, update, delete on public.support_tickets from anon, authenticated;
revoke insert, update, delete on public.support_messages from anon, authenticated;
revoke insert, update, delete on public.support_internal_notes from anon, authenticated;

-- ------------------------------------------------------------
-- 3) email outbox (server sender; never browser keys for transactional)
-- ------------------------------------------------------------
create table if not exists public.email_outbox (
  id bigint generated always as identity primary key,
  recipient_email text not null,
  recipient_user_id uuid references auth.users (id) on delete set null,
  template_key text not null,
  subject text not null,
  body_text text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint email_outbox_status_check check (status in ('pending', 'sent', 'failed', 'skipped')),
  constraint email_outbox_email_len check (length(btrim(recipient_email)) between 3 and 320)
);

create index if not exists email_outbox_pending_idx
  on public.email_outbox (created_at asc)
  where status = 'pending';

alter table public.email_outbox enable row level security;

drop policy if exists "email_outbox: admin read" on public.email_outbox;
create policy "email_outbox: admin read"
  on public.email_outbox for select
  to authenticated
  using (public.mdz_is_platform_admin((select auth.uid())));

revoke insert, update, delete on public.email_outbox from anon, authenticated;

-- ------------------------------------------------------------
-- 4) RPCs — notifications
-- ------------------------------------------------------------
create or replace function public.mdz_notify_user(
  p_recipient_id uuid,
  p_event_type text,
  p_title text,
  p_body text default null,
  p_payload jsonb default '{}'::jsonb,
  p_link_path text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id bigint;
begin
  insert into public.notifications (recipient_id, event_type, title, body, payload, link_path)
  values (
    p_recipient_id,
    lower(btrim(p_event_type)),
    left(btrim(p_title), 200),
    nullif(btrim(coalesce(p_body, '')), ''),
    coalesce(p_payload, '{}'::jsonb),
    nullif(btrim(coalesce(p_link_path, '')), '')
  )
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.mdz_notify_user(uuid, text, text, text, jsonb, text) from public;
grant execute on function public.mdz_notify_user(uuid, text, text, text, jsonb, text) to service_role;

create or replace function public.list_my_notifications(p_limit int default 40, p_unread_only boolean default false)
returns setof public.notifications
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  return query
  select n.*
  from public.notifications n
  where n.recipient_id = uid
    and (not p_unread_only or n.read_at is null)
  order by n.created_at desc
  limit greatest(1, least(coalesce(p_limit, 40), 100));
end;
$$;

create or replace function public.mark_notification_read(p_notification_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  updated int;
begin
  if uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id and recipient_id = uid;
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  updated int;
begin
  if uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  update public.notifications
  set read_at = now()
  where recipient_id = uid and read_at is null;
  get diagnostics updated = row_count;
  return updated;
end;
$$;

revoke all on function public.list_my_notifications(int, boolean) from public;
revoke all on function public.mark_notification_read(bigint) from public;
revoke all on function public.mark_all_notifications_read() from public;
grant execute on function public.list_my_notifications(int, boolean) to authenticated;
grant execute on function public.mark_notification_read(bigint) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;

-- ------------------------------------------------------------
-- 5) RPCs — email enqueue (service / security definer callers)
-- ------------------------------------------------------------
create or replace function public.mdz_enqueue_email(
  p_email text,
  p_user_id uuid,
  p_template_key text,
  p_subject text,
  p_body_text text,
  p_payload jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id bigint;
begin
  insert into public.email_outbox (recipient_email, recipient_user_id, template_key, subject, body_text, payload)
  values (
    lower(btrim(p_email)),
    p_user_id,
    btrim(p_template_key),
    left(btrim(p_subject), 200),
    left(btrim(p_body_text), 20000),
    coalesce(p_payload, '{}'::jsonb)
  )
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.mdz_enqueue_email(text, uuid, text, text, text, jsonb) from public;
grant execute on function public.mdz_enqueue_email(text, uuid, text, text, text, jsonb) to service_role;

-- Claim pending emails for Worker (service_role only)
create or replace function public.mdz_claim_email_outbox(p_limit int default 20)
returns setof public.email_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    select e.id
    from public.email_outbox e
    where e.status = 'pending'
    order by e.created_at asc
    limit greatest(1, least(coalesce(p_limit, 20), 50))
    for update skip locked
  )
  update public.email_outbox e
  set attempts = e.attempts + 1
  from picked
  where e.id = picked.id
  returning e.*;
end;
$$;

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
  if p_status not in ('sent', 'failed', 'skipped', 'pending') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  update public.email_outbox
  set status = p_status,
      last_error = nullif(btrim(coalesce(p_error, '')), ''),
      sent_at = case when p_status = 'sent' then now() else sent_at end
  where id = p_id;
end;
$$;

revoke all on function public.mdz_claim_email_outbox(int) from public;
revoke all on function public.mdz_mark_email_outbox(bigint, text, text) from public;
grant execute on function public.mdz_claim_email_outbox(int) to service_role;
grant execute on function public.mdz_mark_email_outbox(bigint, text, text) to service_role;

-- ------------------------------------------------------------
-- 6) RPCs — support tickets
-- ------------------------------------------------------------
create or replace function public.create_support_ticket(
  p_request_type text,
  p_subject text,
  p_body text
)
returns public.support_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  member_wilaya text;
  recent int;
  ticket public.support_tickets;
  code text;
begin
  if uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_request_type not in (
    'inquiry', 'complaint', 'suggestion', 'profile_change',
    'verification', 'technical', 'membership_followup', 'other'
  ) then
    raise exception 'invalid request_type' using errcode = '22023';
  end if;

  if length(btrim(coalesce(p_subject, ''))) < 2 or length(btrim(p_body)) < 2 then
    raise exception 'subject and body required' using errcode = '22023';
  end if;

  select count(*)::int into recent
  from public.support_tickets t
  where t.created_by = uid and t.created_at > now() - interval '1 hour';
  if recent >= 8 then
    raise exception 'ticket rate limit exceeded' using errcode = '54000';
  end if;

  select nullif(btrim(p.wilaya), '')
  into member_wilaya
  from public.profiles p where p.id = uid;

  code := 'TKT-' || to_char(now() at time zone 'utc', 'YYMMDD') || '-' ||
          upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.support_tickets (
    ticket_code, created_by, wilaya, request_type, subject, status, priority, linked_registration_id
  ) values (
    code, uid, member_wilaya, p_request_type, left(btrim(p_subject), 200), 'open', 'normal',
    (select nullif(btrim(registration_id), '') from public.profiles where id = uid)
  )
  returning * into ticket;

  insert into public.support_messages (ticket_id, author_id, body)
  values (ticket.id, uid, left(btrim(p_body), 10000));

  return ticket;
end;
$$;

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

  is_staff := public.mdz_is_platform_admin(uid)
    or (
      public.mdz_is_wilaya_manager(uid)
      and t.wilaya is not null
      and t.wilaya = public.mdz_caller_wilaya(uid)
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

  -- Notify the other party
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
    -- notify assigned or leave for queue (no specific assignee required)
    null;
  end if;

  return msg;
end;
$$;

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
    public.mdz_is_platform_admin(uid)
    or (
      public.mdz_is_wilaya_manager(uid)
      and t.wilaya is not null
      and t.wilaya = public.mdz_caller_wilaya(uid)
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

  return result;
end;
$$;

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
    public.mdz_is_platform_admin(uid)
    or (
      public.mdz_is_wilaya_manager(uid)
      and t.wilaya is not null
      and t.wilaya = public.mdz_caller_wilaya(uid)
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

revoke all on function public.create_support_ticket(text, text, text) from public;
revoke all on function public.reply_support_ticket(bigint, text) from public;
revoke all on function public.set_support_ticket_status(bigint, text) from public;
revoke all on function public.add_support_internal_note(bigint, text) from public;
grant execute on function public.create_support_ticket(text, text, text) to authenticated;
grant execute on function public.reply_support_ticket(bigint, text) to authenticated;
grant execute on function public.set_support_ticket_status(bigint, text) to authenticated;
grant execute on function public.add_support_internal_note(bigint, text) to authenticated;
