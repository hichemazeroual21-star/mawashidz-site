-- 007_manual_rls_fixes.sql
-- Naming scheme note: this repo has two migration conventions —
-- numeric (001–006) and dated (20260718*). This file follows the
-- numeric scheme as the CANONICAL one going forward.
-- Any future dated-style migration must be renamed to numeric
-- before merge, or this note must be updated to reverse the decision.
--
-- Idempotent. Safe to run anywhere, including production
-- where these changes were already applied by hand on 2026-07-21.
--
-- Context: legacy "Allow admin read" on registrations used USING (true).
-- Dashboard SELECT policies: apply 003 separately (see DEPLOYMENT.md).

drop policy if exists "Allow admin read" on public.registrations;

drop policy if exists "user_roles: self read" on public.user_roles;
create policy "user_roles: self read"
  on public.user_roles for select
  to authenticated
  using (user_id = (select auth.uid()));

alter table public.user_roles enable row level security;
