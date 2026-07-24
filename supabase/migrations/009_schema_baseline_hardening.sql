-- ============================================================
-- MawashiDZ — Schema baseline hardening (Phase 0)
-- After: 007 (review RPC), 008 (audit + user_roles)
-- Idempotent. Safe on production with existing columns.
-- ============================================================

-- 1) registrations columns required by dashboards + review RPC
alter table public.registrations add column if not exists member_id text;
alter table public.registrations add column if not exists registration_id text;
alter table public.registrations add column if not exists daira text;
alter table public.registrations add column if not exists status text;

update public.registrations
set status = 'pending'
where status is null or btrim(status) = '';

alter table public.registrations alter column status set default 'pending';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'registrations' and column_name = 'status'
  ) then
    begin
      alter table public.registrations alter column status set not null;
    exception when others then
      -- leave nullable if legacy nulls cannot be normalized in one pass
      null;
    end;
  end if;
end $$;

create index if not exists registrations_registration_id_idx
  on public.registrations (registration_id)
  where registration_id is not null and btrim(registration_id) <> '';

create index if not exists registrations_status_created_at_idx
  on public.registrations (status, created_at desc);

-- 2) profiles.updated_at (compat with 001 path)
alter table public.profiles add column if not exists updated_at timestamptz;
update public.profiles set updated_at = coalesce(updated_at, created_at, now()) where updated_at is null;
alter table public.profiles alter column updated_at set default now();

-- 3) Harden public INSERT policies (length + required fields — not a substitute for edge rate limits)
drop policy if exists "registrations: public insert" on public.registrations;
create policy "registrations: public insert"
  on public.registrations for insert
  to anon, authenticated
  with check (
    length(btrim(coalesce(full_name, ''))) between 2 and 200
    and length(btrim(coalesce(phone, ''))) between 8 and 32
    and (email is null or length(btrim(email)) between 3 and 320)
    and (message is null or length(message) <= 20000)
    and (wilaya is null or length(wilaya) <= 120)
    and (role is null or length(role) <= 64)
    and (user_type is null or length(user_type) <= 64)
  );

drop policy if exists "contact: public insert" on public.contact_messages;
create policy "contact: public insert"
  on public.contact_messages for insert
  to anon, authenticated
  with check (
    (full_name is null or length(btrim(full_name)) <= 200)
    and (phone is null or length(btrim(phone)) <= 32)
    and (message is null or length(message) <= 10000)
    and (request_type is null or length(request_type) <= 120)
    and (ticket_id is null or length(ticket_id) <= 120)
  );

drop policy if exists "feedback: public insert" on public.feedback_tickets;
create policy "feedback: public insert"
  on public.feedback_tickets for insert
  to anon, authenticated
  with check (
    (full_name is null or length(btrim(full_name)) <= 200)
    and (contact is null or length(btrim(contact)) <= 320)
    and (details is null or length(details) <= 10000)
    and (report_type is null or length(report_type) <= 120)
    and (ticket_id is null or length(ticket_id) <= 120)
  );

-- 4) Insert budget guard — same phone cannot flood registrations
create or replace function public.mdz_registrations_insert_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count int;
  phone_key text := public.normalize_algerian_phone(new.phone);
begin
  if phone_key is null then
    phone_key := regexp_replace(coalesce(new.phone, ''), '[^0-9+]', '', 'g');
  end if;

  if phone_key is null or length(phone_key) < 8 then
    raise exception 'invalid phone' using errcode = '22023';
  end if;

  select count(*)::int into recent_count
  from public.registrations r
  where r.created_at > now() - interval '1 hour'
    and (
      public.normalize_algerian_phone(r.phone) = phone_key
      or regexp_replace(coalesce(r.phone, ''), '[^0-9+]', '', 'g') = phone_key
    );

  if recent_count >= 5 then
    raise exception 'registration rate limit exceeded' using errcode = '54000';
  end if;

  if new.status is null or btrim(new.status) = '' then
    new.status := 'pending';
  end if;

  return new;
end;
$$;

drop trigger if exists mdz_registrations_insert_guard on public.registrations;
create trigger mdz_registrations_insert_guard
  before insert on public.registrations
  for each row execute function public.mdz_registrations_insert_guard();

revoke all on function public.mdz_registrations_insert_guard() from public;
