# Architectural Principles

**Status:** Binding for engineering under Constitution v3.0  
**Audience:** Every implementer  

These are invariants. If a PR violates them, reject or amend Constitution first.

---

## 1. Product

1. **Identity + commerce thesis** — Years 1–2 work must strengthen trusted livestock identity or trusted trade in Algeria.  
2. **Animals before Hub chrome** — do not ship card frameworks without domain objects.  
3. **Tickets before open chat** — support load and fraud control come first.  
4. **Complexity justifies itself** — prefer delete over abstract.

## 2. Security

5. **Server is truth** — RLS + RPC; UI gates are not authorization.  
6. **Least privilege** — no default admin powers; wilaya fence enforced server-side.  
7. **Audit privileged mutations** — who/when/what/before/after.  
8. **Public endpoints assume abuse** — rate limit and validate.

## 3. Data

9. **Ledgers are append-only** — ownership, approvals, audit, health events.  
10. **Classify before storing** — immutable vs soft-delete vs media lifecycle.  
11. **Opaque public IDs for QR** — no PII in codes; verification API is gated.

## 4. Platform

12. **One membership type + optional elevation** — do not conflate `profiles.role` and `user_roles`.  
13. **Brokers ≠ breeders** — distinct membership; shared commercial infra only.  
14. **Vets never edit commerce/ownership fields.**  
15. **Unassigned wilayas escalate** — do not assume 58 managers.

## 5. Delivery

16. **Phase exit criteria are gates** — no skipping Must criteria.  
17. **CI green required** — `npm test` on PR.  
18. **No big-bang rewrites** — extract modules; keep Supabase until measured pain.  
19. **ADR or Decision Log for durable choices** — do not hide decisions in chat.  
20. **Strategy freeze** — no silent strategy drift; amend formally.

---

## Anti-principles (reject)

- Feature parity with competitors without thesis fit  
- Blockchain / crypto for livestock ID  
- E2E chat that blinds moderators  
- Medical or pricing AI without governance  
- Microservices before operational scale pain  
