-- ============================================================
-- Dry-run for migration 014 (registration_id integrity)
-- Run in Supabase SQL Editor BEFORE applying 014_*.sql.
--
-- Self-contained preview:
--   - session-local JSON helper (pg_temp) — does NOT require migration 014
--   - temp view so queries A/B share classification without CTE scope bugs
-- No row mutation on public.registrations.
-- ============================================================

-- Session-local safe extract (malformed JSON → NULL). Not public schema.
create or replace function pg_temp.mdz_dry_msg_registration_id(p_message text)
returns text
language plpgsql
as $$
declare
  extracted text;
begin
  if p_message is null or btrim(p_message) = '' then
    return null;
  end if;
  begin
    extracted := nullif(btrim(coalesce(p_message::jsonb ->> 'registration_id', '')), '');
  exception when others then
    return null;
  end;
  return extracted;
end;
$$;

-- Classification of every registrations row relative to 014:
--   already_has_id              → untouched (has non-blank registration_id)
--   recover_from_message        → real pending, missing id, valid MDZ-REG-* in message, free
--   will_generate               → real pending, missing id, no usable free message id
--   excluded_as_test            → missing id + test email markers
--   missing_not_eligible        → missing id but NOT real-pending (wrong status / blank email)
--   recover_blocked_collision   → would recover from message but value already used elsewhere
--
-- Temp view keeps A/B in the same classification scope (WITH alone ends at statement A).
drop view if exists mdz_014_dry_run_enriched;
create temporary view mdz_014_dry_run_enriched as
with classified as (
  select
    r.id,
    r.email,
    r.status,
    r.registration_id,
    r.created_at,
    nullif(btrim(coalesce(r.registration_id, '')), '') is null as missing_id,
    pg_temp.mdz_dry_msg_registration_id(r.message) as msg_registration_id,
    (
      lower(coalesce(nullif(btrim(r.status), ''), 'pending')) in ('pending', 'new')
      and r.email is not null
      and btrim(r.email) <> ''
      and not (lower(r.email) ~ '(example\.com|\.local\y|probe|e2e)')
    ) as is_real_pending,
    (
      r.email is not null
      and btrim(r.email) <> ''
      and lower(r.email) ~ '(example\.com|\.local\y|probe|e2e)'
    ) as is_test_email
  from public.registrations r
),
enriched as (
  select
    c.*,
    case
      when c.msg_registration_id is not null
           and c.msg_registration_id ~ '^MDZ-REG-'
           and exists (
             select 1
             from public.registrations x
             where x.id <> c.id
               and x.registration_id = c.msg_registration_id
           )
      then true
      else false
    end as msg_id_collides,
    case
      when not c.missing_id then 'already_has_id'
      when c.is_test_email then 'excluded_as_test'
      when c.is_real_pending
           and c.msg_registration_id is not null
           and c.msg_registration_id ~ '^MDZ-REG-'
           and not exists (
             select 1
             from public.registrations x
             where x.id <> c.id
               and x.registration_id = c.msg_registration_id
           )
        then 'recover_from_message'
      when c.is_real_pending
           and c.msg_registration_id is not null
           and c.msg_registration_id ~ '^MDZ-REG-'
           and exists (
             select 1
             from public.registrations x
             where x.id <> c.id
               and x.registration_id = c.msg_registration_id
           )
        then 'recover_blocked_collision'
      when c.is_real_pending then 'will_generate'
      else 'missing_not_eligible'
    end as bucket
  from classified c
)
select * from enriched;

-- A) Summary counts (review these before any UPDATE)
select
  count(*) filter (where bucket = 'recover_from_message') as recover_from_message,
  count(*) filter (where bucket = 'will_generate') as will_generate,
  count(*) filter (where bucket = 'excluded_as_test') as excluded_as_test,
  count(*) filter (where bucket = 'recover_blocked_collision') as recover_blocked_collision,
  count(*) filter (where bucket = 'missing_not_eligible') as missing_not_eligible_untouched,
  count(*) filter (where bucket = 'already_has_id') as already_has_id_untouched,
  count(*) as total_rows
from mdz_014_dry_run_enriched;

-- B) Sample rows per actionable / excluded bucket
select
  bucket,
  id,
  email,
  status,
  registration_id as current_registration_id,
  msg_registration_id,
  created_at
from mdz_014_dry_run_enriched
where bucket in (
  'recover_from_message',
  'will_generate',
  'excluded_as_test',
  'recover_blocked_collision',
  'missing_not_eligible'
)
order by
  case bucket
    when 'recover_from_message' then 1
    when 'will_generate' then 2
    when 'excluded_as_test' then 3
    when 'recover_blocked_collision' then 4
    else 5
  end,
  id
limit 100;

-- C) Uniqueness health before apply
select
  registration_id,
  count(*) as dup_count
from public.registrations
where nullif(btrim(registration_id), '') is not null
group by registration_id
having count(*) > 1
order by dup_count desc, registration_id
limit 50;
