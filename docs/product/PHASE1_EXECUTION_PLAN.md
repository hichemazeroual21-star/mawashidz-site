# Phase 1 execution plan — Member Operations foundation

**Date:** 2026-07-24  
**Branch:** `cursor/phase1-member-ops-foundation-4b6e`  
**Authority:** Constitution v3.0 §8 + Roadmap Phase 1 (1.C–1.F Must)  
**PRD:** MEMBER_OPERATIONS.md §4–5 · SUPPORT_AND_MESSAGES_CENTER.md

---

## 1. Dependencies verified (main)

| Dependency | Status |
|------------|--------|
| Phase 0 schema (`user_roles`, audit, insert guards) | Merged |
| `review_registration_status` RPC | Present (007) |
| CI `test:ci` | Present |
| EmailJS client alert on signup | Exists (ops only — not member transactional) |
| Server notifications / tickets tables | **Absent** |
| Rejection reason in member UI | **Absent** (stored in `registrations.message` JSON) |

## 2. Architectural risks

| Risk | Mitigation |
|------|------------|
| Client-side EmailJS for membership outcomes | Replace with **server outbox** + Worker sender; keys never in browser |
| Open ticket spam | Typed tickets only; RLS; rate guard; no member↔member |
| Notification payload leaking wilaya internals | Recipient-scoped rows only; minimal payload |
| Dual email providers (Resend vs Brevo) | Provider-agnostic adapter; **Resend first** (engineering choice aligned with PRD) |
| Large PR scope | One vertical slice: schema + review→notify + rejection UI + ticket MVP + email outbox |

## 3. Founder decisions

| Topic | Verdict |
|-------|---------|
| Email provider | **No wait** — PRD already allows Resend/Brevo; implement Resend adapter + env config. Brevo = later swap. |
| FD-06 retention | Soft-delete/archive tickets; notifications soft-read; no hard delete (PRD). |

## 4. Delivery slice (this PR)

1. Migration **010** — `notifications`, `support_tickets`, `support_messages`, `support_internal_notes`, `email_outbox` + RLS + RPCs  
2. Migration **011** — extend `review_registration_status` to enqueue notification + email outbox  
3. Account UI — notifications tab; rejection reason on request tab  
4. Support & Messages Center MVP — member create/list/reply; admin/manager queue (wilaya fence)  
5. Worker `/api/process-email-outbox` — Resend when `RESEND_API_KEY` set; otherwise leave pending (visible, not silent)  
6. Tests + schema docs + runbook note + Decision Log entry  

## 5. Explicitly out of scope

Marketplace · Livestock Identity · QR · Hub · AI · member↔member messaging · push/SMS/WhatsApp

## 6. Rollback

- Drop migration 011 function body by re-applying 007 review function (keep 010 tables or drop in reverse order if unused).  
- Disable Worker email route via env (`RESEND_API_KEY` unset → no sends).  
- UI tabs degrade if RPCs missing (graceful empty states).
