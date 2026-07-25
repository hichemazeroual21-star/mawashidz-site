-- ============================================================
-- MawashiDZ — Phase 1 P0 email outbox hardening
-- After: 012_phase1_quality_elevation.sql
-- Fixes: attempt exhaustion while awaiting provider; provider idempotency id
-- Idempotent.
-- ============================================================

alter table public.email_outbox add column if not exists provider_message_id text;

create index if not exists email_outbox_provider_message_id_idx
  on public.email_outbox (provider_message_id)
  where provider_message_id is not null;

-- Mark with optional provider id; awaiting_provider requeues without consuming attempt budget
create or replace function public.mdz_mark_email_outbox(
  p_id bigint,
  p_status text,
  p_error text default null,
  p_provider_message_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  err text := nullif(btrim(coalesce(p_error, '')), '');
  provider_id text := nullif(btrim(coalesce(p_provider_message_id, '')), '');
  awaiting boolean := false;
begin
  if p_status not in ('pending', 'processing', 'sent', 'failed', 'skipped') then
    raise exception 'invalid status' using errcode = '22023';
  end if;

  awaiting := (p_status = 'pending' and err is not null and err like 'awaiting_%');

  update public.email_outbox
  set status = p_status,
      last_error = err,
      provider_message_id = coalesce(provider_id, provider_message_id),
      sent_at = case when p_status = 'sent' then coalesce(sent_at, now()) else sent_at end,
      -- Undo claim attempt bump when we only waited for provider config
      attempts = case
        when awaiting then greatest(0, attempts - 1)
        else attempts
      end,
      locked_at = case when p_status in ('sent', 'failed', 'skipped', 'pending') then null else locked_at end,
      locked_by = case when p_status in ('sent', 'failed', 'skipped', 'pending') then null else locked_by end
  where id = p_id;
end;
$$;

revoke all on function public.mdz_mark_email_outbox(bigint, text, text, text) from public;
grant execute on function public.mdz_mark_email_outbox(bigint, text, text, text) to service_role;

-- Drop legacy 3-arg overload to avoid ambiguous PostgREST dispatch
drop function if exists public.mdz_mark_email_outbox(bigint, text, text);

-- Claim: skip rows already reconciled with provider id still pending/processing cleanup
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
  -- Rows that already have a provider id but are not marked sent → finish as sent (no resend)
  update public.email_outbox
  set status = 'sent',
      sent_at = coalesce(sent_at, now()),
      locked_at = null,
      locked_by = null,
      last_error = null
  where provider_message_id is not null
    and status in ('pending', 'processing', 'failed');

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
      and e.provider_message_id is null
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

-- Ensure unsafe 1-arg claim stays dropped
drop function if exists public.mdz_claim_email_outbox(int);
