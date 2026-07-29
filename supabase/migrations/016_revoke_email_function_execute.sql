-- ============================================================
-- MawashiDZ — Migration 016: emergency email RPC EXECUTE containment
-- ============================================================
-- Scope: EMERGENCY CONTAINMENT ONLY. Revoke EXECUTE on the four email RPC
-- functions from anon, authenticated, and public. No other change.
--
-- Live catalog evidence (production, measured 2026-07-29 via pg_proc joined to
-- pg_namespace where nspname = 'public'; aclexplode returned exactly 16 rows =
-- four functions x four grantees; no legacy overloads exist):
--
--   All four functions are SECURITY DEFINER (prosecdef = true).
--
--   Exact live signatures (p.oid::regprocedure):
--     public.mdz_claim_email_outbox(integer,text)
--     public.mdz_enqueue_email(text,uuid,text,text,text,jsonb)
--     public.mdz_mark_email_outbox(bigint,text,text,text)
--     public.mdz_notify_user(uuid,text,text,text,jsonb,text)
--
--   Measured pre-change ACL for each of the four functions grants EXECUTE to:
--     postgres, anon, authenticated, service_role.
--
-- Why anon/authenticated hold EXECUTE despite prior `revoke ... from public`:
-- Supabase ships `alter default privileges in schema public grant all on
-- functions to anon, authenticated`, a DIRECT grant that a revoke from PUBLIC
-- cannot remove. This migration revokes from anon and authenticated explicitly.
--
-- Runtime-caller evidence (repository sweep):
--   service_role remains the required runtime caller and is intentionally NOT
--   revoked here.
--   The Cloudflare Worker email-outbox drain uses SUPABASE_SERVICE_ROLE_KEY for
--   mdz_claim_email_outbox and mdz_mark_email_outbox
--   (netlify/functions/email-outbox.mjs, reached via worker.mjs scheduled()).
--   No browser runtime caller of any of the four functions exists.
--
-- Table evidence (out of scope here, recorded for context only):
--   public.email_outbox has RLS enabled.
--   anon has no direct table privilege on public.email_outbox.
--   The only table SELECT policy is restricted to authenticated platform
--   administrators (USING public.mdz_is_platform_admin()).
--   No table, policy, or FORCE RLS change belongs in this migration.
--
-- Rollback intent (DOCUMENTATION ONLY — not executed here):
--   To reverse, restore EXECUTE to anon and authenticated on the same four
--   exact signatures:
--     grant execute on function public.mdz_claim_email_outbox(integer,text)
--       to anon, authenticated;
--     grant execute on function public.mdz_enqueue_email(text,uuid,text,text,text,jsonb)
--       to anon, authenticated;
--     grant execute on function public.mdz_mark_email_outbox(bigint,text,text,text)
--       to anon, authenticated;
--     grant execute on function public.mdz_notify_user(uuid,text,text,text,jsonb,text)
--       to anon, authenticated;
--
-- Note: the root ALTER DEFAULT PRIVILEGES correction is a separate, later
-- package because it affects all future functions and requires a reviewed
-- allowlist. It is deliberately excluded here.
--
-- Idempotent: revoking a privilege that is not held is a no-op in PostgreSQL.
-- ============================================================

revoke execute on function public.mdz_claim_email_outbox(integer,text)
from anon, authenticated, public;

revoke execute on function public.mdz_enqueue_email(text,uuid,text,text,text,jsonb)
from anon, authenticated, public;

revoke execute on function public.mdz_mark_email_outbox(bigint,text,text,text)
from anon, authenticated, public;

revoke execute on function public.mdz_notify_user(uuid,text,text,text,jsonb,text)
from anon, authenticated, public;
