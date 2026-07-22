-- 008_consolidate_insert_policies.sql
-- Drops legacy duplicate INSERT policy names on public.registrations.
-- Keeps: "registrations: public insert" (same definition as 001/004 — anon + authenticated, with check true).
-- Idempotent. Do not loosen — recreates canonical policy if missing.

drop policy if exists "Allow public insert" on public.registrations;
drop policy if exists "Allow public insert registrations" on public.registrations;
drop policy if exists "Allow public registrations" on public.registrations;

drop policy if exists "registrations: public insert" on public.registrations;
create policy "registrations: public insert"
  on public.registrations for insert
  to anon, authenticated
  with check (true);
