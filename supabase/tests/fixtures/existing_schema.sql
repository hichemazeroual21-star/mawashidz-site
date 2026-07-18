-- Mirrors the verified Production schema as of 2026-07-18 (pre-Phase-0)
create extension if not exists pgcrypto;

\i supabase/tests/fixtures/auth_stubs.sql

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table public.registrations (
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

create table public.contact_messages (
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

create table public.feedback_tickets (
  id bigint generated always as identity primary key,
  ticket_id text unique,
  report_type text,
  full_name text,
  contact text,
  details text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table public.breeders (
  id bigint generated always as identity primary key,
  full_name text,
  phone text,
  wilaya text,
  commune text,
  farm_name text,
  created_at timestamptz not null default now()
);

-- Seed a legacy profile row (must survive migration)
insert into auth.users (id, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', 'legacy@example.com', '{}'::jsonb);

insert into public.profiles (id, full_name, phone, email)
values (
  '11111111-1111-1111-1111-111111111111',
  'مستخدم قديم',
  '+213555000111',
  'legacy@example.com'
);
