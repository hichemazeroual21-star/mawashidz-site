-- MawashiDZ — ONE-USER profile repair for orphan auth user
-- Target: sadbenmoad7@gmail.com
-- auth.users.id: 5d37389c-4409-4ed0-8bf5-79194b7d27ca
-- Symptom: openAccount → profile_missing (diag confirmed)
-- Scope: create/link public.profiles for THIS id only. NO user_roles changes.
-- Run in Supabase SQL Editor as postgres/service_role. Do NOT run until Founder reviews.

-- =============================================================================
-- STEP 0 — Discovery (read-only). Paste results before applying STEP 2.
-- =============================================================================

-- 0a) Confirm auth user exists and capture metadata (source of truth for backfill)
select
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  u.raw_user_meta_data
from auth.users u
where u.id = '5d37389c-4409-4ed0-8bf5-79194b7d27ca';

-- 0b) Confirm profiles row is missing for this id (expect 0 rows)
select p.*
from public.profiles p
where p.id = '5d37389c-4409-4ed0-8bf5-79194b7d27ca';

-- 0c) Collision check: any OTHER profile already using this email?
select p.id, p.email, p.member_id, p.role, p.status, p.registration_id
from public.profiles p
where lower(p.email) = lower('sadbenmoad7@gmail.com');

-- 0d) Optional registration row to copy membership fields from (if signup pipeline wrote it)
select
  r.id,
  r.registration_id,
  r.member_id,
  r.full_name,
  r.phone,
  r.email,
  r.role,
  r.user_type,
  r.wilaya,
  r.daira,
  r.status,
  r.created_at
from public.registrations r
where lower(r.email) = lower('sadbenmoad7@gmail.com')
order by r.created_at desc
limit 5;

-- 0e) Do NOT change — visibility only (must stay untouched by this repair)
select ur.user_id, ur.role, ur.created_at
from public.user_roles ur
where ur.user_id = '5d37389c-4409-4ed0-8bf5-79194b7d27ca';

-- =============================================================================
-- STEP 1 — Decision rules (human)
-- =============================================================================
-- A) If 0b returns a row → STOP. No insert needed (diag may have been stale).
-- B) If 0c returns a DIFFERENT id for the same email → STOP and escalate.
--    Do not merge/steal that profile; linking would break the other account.
-- C) If 0a returns no auth user → STOP (wrong project / wrong uuid).
-- D) Otherwise proceed to STEP 2.
--
-- Values to insert (mirrors public.handle_new_user):
--   id              = auth.users.id (exact uuid above) — PK + FK to auth.users
--   email           = auth.users.email
--   member_id       = valid MDZ-* from metadata OR registration OR allocate_member_id(role)
--   registration_id = metadata / registration if present, else null
--   full_name / phone / role / wilaya / daira / commune / birth_date / invite_*
--                   = coalesce(registration, metadata); role default 'buyer' only if both null
--   status          = 'pending' (schema default; do not elevate)
--   created_at / updated_at = now() defaults if columns exist
--
-- Constraints respected:
--   - profiles.id PK references auth.users(id) ON DELETE CASCADE
--   - status NOT NULL default 'pending'
--   - unique partial index on member_id when non-null/non-blank
--   - allocate_member_id is service_role-only (SQL Editor / postgres OK)
--   - No INSERT into user_roles
--   - protect_profile_sensitive_columns is BEFORE UPDATE only — INSERT is fine

-- =============================================================================
-- STEP 2 — Repair insert (single user). Review output of STEP 0 first.
-- =============================================================================
-- This block is idempotent: if the profile already exists, it does nothing.

do $$
declare
  v_uid constant uuid := '5d37389c-4409-4ed0-8bf5-79194b7d27ca';
  v_email_expect constant text := 'sadbenmoad7@gmail.com';
  u record;
  reg record;
  v_role text;
  v_member_id text;
  v_registration_id text;
  v_full_name text;
  v_phone text;
  v_phone_raw text;
  v_digits text;
  v_wilaya text;
  v_daira text;
  v_commune text;
  v_birth_date date;
  v_invite_code text;
  v_invited_by text;
  v_first_name text;
  v_last_name text;
begin
  select * into u from auth.users where id = v_uid;
  if not found then
    raise exception 'auth.users row not found for %', v_uid;
  end if;
  if lower(coalesce(u.email, '')) <> lower(v_email_expect) then
    raise exception 'email mismatch: auth has %, expected %', u.email, v_email_expect;
  end if;

  if exists (select 1 from public.profiles p where p.id = v_uid) then
    raise notice 'profiles row already exists for % — no-op', v_uid;
    return;
  end if;

  if exists (
    select 1 from public.profiles p
    where lower(p.email) = lower(v_email_expect) and p.id <> v_uid
  ) then
    raise exception 'another profiles.id already owns email % — manual merge required', v_email_expect;
  end if;

  select * into reg
  from public.registrations r
  where lower(r.email) = lower(v_email_expect)
  order by r.created_at desc nulls last
  limit 1;

  v_role := nullif(trim(coalesce(
    reg.role,
    reg.user_type,
    u.raw_user_meta_data ->> 'role',
    ''
  )), '');

  v_member_id := nullif(trim(coalesce(
    reg.member_id,
    u.raw_user_meta_data ->> 'member_id',
    ''
  )), '');
  if v_member_id is null or v_member_id !~ '^MDZ-[A-Z]-[0-9]{6}$' then
    v_member_id := public.allocate_member_id(coalesce(v_role, 'buyer'));
  end if;

  -- Guard unique member_id collision with a different user
  if exists (
    select 1 from public.profiles p
    where p.member_id = v_member_id and p.id <> v_uid
  ) then
    v_member_id := public.allocate_member_id(coalesce(v_role, 'buyer'));
  end if;

  v_registration_id := nullif(trim(coalesce(
    reg.registration_id,
    u.raw_user_meta_data ->> 'registration_id',
    ''
  )), '');

  v_full_name := nullif(trim(coalesce(
    reg.full_name,
    u.raw_user_meta_data ->> 'full_name',
    ''
  )), '');
  v_first_name := nullif(trim(coalesce(u.raw_user_meta_data ->> 'first_name', '')), '');
  v_last_name := nullif(trim(coalesce(u.raw_user_meta_data ->> 'last_name', '')), '');

  v_phone_raw := nullif(trim(coalesce(
    reg.phone,
    u.raw_user_meta_data ->> 'phone',
    ''
  )), '');
  /* Inline normalize — prod may lack public.normalize_algerian_phone(text). */
  if v_phone_raw is not null then
    v_digits := regexp_replace(v_phone_raw, '[^0-9]', '', 'g');
    if v_digits ~ '^213[567]\d{8}$' then
      v_phone := '+' || v_digits;
    elsif v_digits ~ '^0[567]\d{8}$' then
      v_phone := '+213' || substring(v_digits from 2);
    elsif v_digits ~ '^[567]\d{8}$' then
      v_phone := '+213' || v_digits;
    else
      v_phone := null;
    end if;
  else
    v_phone := null;
  end if;

  v_wilaya := nullif(trim(coalesce(reg.wilaya, u.raw_user_meta_data ->> 'wilaya', '')), '');
  v_daira := nullif(trim(coalesce(reg.daira, u.raw_user_meta_data ->> 'daira', '')), '');
  v_commune := nullif(trim(coalesce(u.raw_user_meta_data ->> 'commune', '')), '');

  begin
    v_birth_date := nullif(trim(coalesce(u.raw_user_meta_data ->> 'birth_date', '')), '')::date;
  exception when others then
    v_birth_date := null;
  end;

  v_invite_code := nullif(trim(coalesce(u.raw_user_meta_data ->> 'invite_code', '')), '');
  v_invited_by := nullif(trim(coalesce(u.raw_user_meta_data ->> 'invited_by', '')), '');

  insert into public.profiles (
    id,
    member_id,
    registration_id,
    full_name,
    first_name,
    last_name,
    phone,
    email,
    role,
    wilaya,
    daira,
    commune,
    birth_date,
    invite_code,
    invited_by,
    status
  ) values (
    v_uid,
    v_member_id,
    v_registration_id,
    v_full_name,
    v_first_name,
    v_last_name,
    v_phone,
    u.email,
    v_role,                 -- membership label only; may be null → OK
    v_wilaya,
    v_daira,
    v_commune,
    v_birth_date,
    v_invite_code,
    v_invited_by,
    'pending'               -- force pending; never copy elevated status from metadata
  );

  raise notice 'inserted profiles id=% member_id=% role=% status=pending',
    v_uid, v_member_id, v_role;
end;
$$;

-- =============================================================================
-- STEP 3 — Verify (read-only)
-- =============================================================================
select
  p.id,
  p.email,
  p.member_id,
  p.registration_id,
  p.full_name,
  p.role,
  p.status,
  p.wilaya,
  p.phone
from public.profiles p
where p.id = '5d37389c-4409-4ed0-8bf5-79194b7d27ca';

-- user_roles must be unchanged (expect same as STEP 0e — often empty for this user)
select ur.user_id, ur.role
from public.user_roles ur
where ur.user_id = '5d37389c-4409-4ed0-8bf5-79194b7d27ca';

-- Optional rollback (only if STEP 2 was just applied and you need to undo THIS row):
-- delete from public.profiles
-- where id = '5d37389c-4409-4ed0-8bf5-79194b7d27ca'
--   and lower(email) = lower('sadbenmoad7@gmail.com');
