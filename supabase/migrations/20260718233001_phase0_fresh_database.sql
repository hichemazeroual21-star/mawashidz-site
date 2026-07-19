-- ============================================================
-- MawashiDZ Phase 0 — Migration for NEW / empty databases
-- Version: 1.8.0
--
-- Use this file when starting from a blank Supabase project
-- (no profiles/registrations tables yet), OR after wiping a
-- non-production sandbox.
--
-- For the live project that already has tables, use instead:
--   20260718233000_phase0_existing_database.sql
--
-- Guarantees:
--   - Idempotent (safe to re-run)
--   - Creates base tables, then applies the same Phase 0 hardening
--   - Does NOT delete data
--
-- Rollback: supabase/rollbacks/20260718233001_phase0_fresh_database_rollback.sql
-- ============================================================

begin;

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Base tables (new databases only)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key,
  full_name text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

-- Attach FK to auth.users when available (Supabase). Skip gracefully in local tests.
do $$
begin
  if to_regclass('auth.users') is not null
     and not exists (
       select 1 from pg_constraint
       where conname = 'profiles_id_fkey'
         and conrelid = 'public.profiles'::regclass
     )
  then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users (id) on delete cascade;
  end if;
end $$;

create table if not exists public.registrations (
  id bigint generated always as identity primary key,
  full_name text not null,
  phone text not null,
  email text,
  whatsapp text,
  wilaya text,
  user_type text,
  role text,
  message text,
  is_verified boolean not null default false,
  privacy_accepted boolean not null default false,
  founding_terms_accepted boolean not null default false,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  unique (email),
  unique (phone)
);

create table if not exists public.contact_messages (
  id bigint generated always as identity primary key,
  ticket_id text unique,
  full_name text,
  phone text,
  email text,
  wilaya text,
  daira text,
  commune text,
  request_type text,
  message text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.feedback_tickets (
  id bigint generated always as identity primary key,
  ticket_id text unique,
  report_type text,
  full_name text,
  contact text,
  details text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

commit;

-- Apply the same hardening as the existing-database migration.
-- (Kept as a second file apply step so both paths share one source of truth.)
-- In Supabase SQL Editor: run this file, then run 20260718233000_phase0_existing_database.sql
-- In automated tests: the runner applies both in order.
