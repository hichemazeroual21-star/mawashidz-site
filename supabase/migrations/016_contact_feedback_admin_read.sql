-- ============================================================
-- MawashiDZ — 016 Contact/feedback admin read (pre-launch P0 item 3 / TD-013)
-- Closes blind inbox: platform admins may SELECT; public remains insert-only.
-- Depends on: 012+ (mdz_is_platform_admin no-arg), 015 (insert hardening).
-- Idempotent · no data deletion · no public SELECT.
-- ============================================================

alter table public.contact_messages enable row level security;
alter table public.feedback_tickets enable row level security;

drop policy if exists "contact: admin read" on public.contact_messages;
create policy "contact: admin read"
  on public.contact_messages for select
  to authenticated
  using (public.mdz_is_platform_admin());

drop policy if exists "feedback: admin read" on public.feedback_tickets;
create policy "feedback: admin read"
  on public.feedback_tickets for select
  to authenticated
  using (public.mdz_is_platform_admin());
