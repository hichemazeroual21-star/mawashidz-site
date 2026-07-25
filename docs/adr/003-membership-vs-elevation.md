# ADR 003 — Membership role vs operational elevation

**Status:** Accepted — Option A  
**Date:** 2026-07-24 (accepted 2026-07-25 via pre-launch P0 Build Prompt)  
**Tags:** authz, RLS, roles  
**Implements:** `supabase/migrations/014_signup_authz_harden.sql` + client gates  

## Context

Strategic Constitution §3.1 separates:

- **`profiles.role`** — membership type (breeder, vet, buyer, manager, …)
- **`user_roles`** — operational elevation (wilaya_manager, admin, …)

Prior Phase 1 helpers treated **either** a `user_roles` manager row **or** `profiles.role` in (`manager`, `wilaya_manager`, `wilaya_mgr`) as sufficient for wilaya-scoped ticket/ops access. That dual source conflicted with least-privilege intent and enabled signup/metadata confusion.

## Decision

**Option A (Strict):** operational power only via `user_roles`. `profiles.role=manager` is a membership label only (member_id prefix `W`); it does **not** grant review/ticket elevation.

## Consequences

- Live managers must have a `user_roles` row (`wilaya_manager` / `manager` / `wilaya_mgr`) before they can operate dashboards after migration 014.
- Signup metadata can no longer set `status` or non-whitelisted roles into `profiles`.
- Client UI gates (`hasManagerAccess`, `dashRoleFlag`) align with server helpers.
