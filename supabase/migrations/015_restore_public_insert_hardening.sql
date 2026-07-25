-- ============================================================
-- MawashiDZ — 015 Restore public INSERT hardening (pre-launch P0 item 2)
-- Re-applies migration 009 WITH CHECK constraints after
-- 20260719000000_phase0_member_id_foundation.sql reverted them to
-- unrestricted insert checks. Idempotent · no data deletion.
-- ============================================================

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
