# ADR 003 — Membership role vs operational elevation (proposal)

**Status:** Proposed — awaiting Founder confirmation  
**Date:** 2026-07-24  
**Tags:** authz, RLS, roles  
**Blocks:** least-privilege cleanup; wilaya governance clarity  

## Context

Strategic Constitution §3.1 separates:

- **`profiles.role`** — membership type (breeder, vet, buyer, …)
- **`user_roles`** — operational elevation (wilaya_manager, admin, …)

Current Phase 1 helpers (e.g. `mdz_is_wilaya_manager` in `010_notifications_tickets_email_outbox.sql` / successors) treat **either** a `user_roles` manager row **or** `profiles.role` in (`manager`, `wilaya_manager`, `wilaya_mgr`) as sufficient for wilaya-scoped ticket/ops access.

That matches transitional UX (managers may only have `profiles.role`) but conflicts with the constitutional separation and least-privilege intent.

## Options

| ID | Option | Pros | Cons |
|----|--------|------|------|
| A | **Strict:** operational power only via `user_roles`; `profiles.role=manager` is membership label only | Matches Constitution §3.1 | Requires backfill + registration/review UX for every manager |
| B | **Bridge (current):** allow both during Years 1–2; document as transitional TD | No immediate break | Dual source of truth; audit confusion |
| C | **Collapse:** store elevation only on `profiles.role` | Simpler tables | Rejects Constitution model; worse multi-role users |

## Recommendation

**A** as end state; keep **B** only until Founder marks a date and engineering ships backfill + admin tooling.

## Consequences if deferred

Privilege grants remain ambiguous; TD-009 role alias sprawl continues; security reviews cannot assert a single elevation source.

## Not done in this ADR PR

No RLS/RPC behavior change until Founder selects A/B/C and a follow-up migration is approved.
