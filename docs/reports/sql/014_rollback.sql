-- ============================================================
-- Operator-only ROLLBACK for migration 014
-- Location: docs/reports/sql/ (NOT supabase/migrations/)
--
-- Restores registration_id to NULL only where SAFE:
--   - row is in backup with previous_registration_id NULL/blank
--   - status still pending/new (blank treated as pending)
--   - current registration_id is not referenced by profiles /
--     support tickets / review fields / notifications /
--     email_outbox / admin audit / downstream process
-- Then removes 014 trigger, helpers, unique index, sequence.
-- Does NOT drop the backup table (kept for audit).
-- Requires baseline tables from migrations 008/010/012.
-- ============================================================

-- 1) Safe restore of registration_id → NULL
update public.registrations r
set registration_id = null
from public.registrations_regid_backup_014 b
where r.id = b.id
  and nullif(btrim(coalesce(b.previous_registration_id, '')), '') is null
  and lower(coalesce(nullif(btrim(r.status), ''), 'pending')) in ('pending', 'new')
  and nullif(btrim(coalesce(r.registration_id, '')), '') is not null
  and not exists (
    select 1
    from public.profiles p
    where p.registration_id = r.registration_id
  )
  and not exists (
    select 1
    from public.support_tickets st
    where st.linked_registration_id = r.registration_id
  )
  and r.reviewed_at is null
  and r.reviewed_by is null
  and not exists (
    select 1
    from public.notifications n
    where n.payload::text like '%' || r.registration_id || '%'
  )
  and not exists (
    select 1
    from public.email_outbox e
    where e.payload::text like '%' || r.registration_id || '%'
  )
  and not exists (
    select 1
    from public.admin_audit_log a
    where a.target_label = r.registration_id
       or a.payload::text like '%' || r.registration_id || '%'
  );

-- Report how many backup-set rows still hold an id vs restored null
select
  count(*) filter (
    where nullif(btrim(coalesce(r.registration_id, '')), '') is not null
  ) as backup_rows_still_with_id,
  count(*) filter (
    where nullif(btrim(coalesce(r.registration_id, '')), '') is null
  ) as backup_rows_restored_null
from public.registrations_regid_backup_014 b
join public.registrations r on r.id = b.id;

-- 2) Remove trigger
drop trigger if exists mdz_registrations_assign_registration_id on public.registrations;

-- 3) Remove helper / trigger functions
drop function if exists public.mdz_registrations_assign_registration_id();
drop function if exists public.mdz_next_registration_id(timestamptz);
drop function if exists public.mdz_msg_registration_id(text);
drop function if exists public.mdz_is_test_registration_email(text);
drop function if exists public.mdz_is_real_pending_registration(text, text);
drop function if exists public.mdz_registration_id_missing(text);

-- 4) Remove unique index
drop index if exists public.registrations_registration_id_uidx;

-- 5) Remove sequence
drop sequence if exists public.mdz_registration_id_seq;
