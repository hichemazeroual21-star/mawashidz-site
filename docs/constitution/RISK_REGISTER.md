# MawashiDZ Risk Register

**Version:** 1.0  
**Date:** 2026-07-24  
**Owner:** Founder (business) · Engineering lead (technical) · until named roles exist

Probability: Low / Medium / High  
Impact: Low / Medium / High / Critical  

---

## Technical risks

| ID | Description | Prob. | Impact | Detection | Mitigation | Recovery | Tag |
|----|-------------|-------|--------|-----------|------------|----------|-----|
| T1 | Signup metadata privilege / status self-grant | Med | Critical | Security tests; audit profiles | Whitelist roles; force pending | Revoke bad roles; force re-approval | Verified Fact |
| T2 | Dual privilege source (`user_roles` vs `profiles.role`) | High | High | Code review; RPC audit | Single SSOT `user_roles` | Re-grant roles; revoke profile fallback | Verified Fact |
| T3 | Missing audit log migration | High | High | Doc vs migration diff | Ship audit table + RPC hooks | Backfill limited; accept gap for past | Verified Fact |
| T4 | Migration path drift (setup vs 001–007 vs Phase 0) | High | High | Staging restore drills | One canonical path doc | Rebuild staging from canon | Verified Fact |
| T5 | Monolithic `index.html` maintainability | High | Medium | PR size; bug rate | Continue extracting modules | Incremental splits | Verified Fact |
| T6 | Media storage growth (future uploads) | Med | High | Bucket metrics | Limits, compression, quotas | Lifecycle delete policies | Assumption |
| T7 | Offline sync conflicts (future) | Med | High | Conflict metrics | Read-mostly offline first | Manual resolve UX | Assumption |
| T8 | Vendor lock-in (Supabase/CF) | Med | Medium | Architecture reviews | Keep SQL portable; thin adapters | Migration plan ADR | Assumption |
| T9 | Hub built before Member Ops stable | Med | High | ROADMAP gate checks | Enforce gates in PR policy | Freeze Hub PRs | Verified Fact |
| T10 | Synthetic price API mistaken for market truth | High | High | User support tickets; press | Relabel; document methodology | Public correction notice | Verified Fact |

---

## Business risks

| ID | Description | Cause | Likelihood | Impact | Mitigation | Tag |
|----|-------------|-------|------------|--------|------------|-----|
| B1 | Low adoption | Weak habit; WhatsApp inertia | High | Critical | Solve one painful workflow excellently | Assumption |
| B2 | Marketplace cold start | No listings/buyers | High | Critical | Seed one wilaya; invite-only liquidity | Assumption |
| B3 | Overpromise vs shipped product | Marketing copy ahead of code | High | High | Honest UI labels; remove fake modules from hero | Verified Fact |
| B4 | Vet supply shortage | Verification friction | Med | High | Free vet onboarding; clear value | Assumption |
| B5 | Revenue uncertainty | No model decided | High | High | Founder business model decision | Verified Fact (undecided) |
| B6 | Seasonal dependency (Aid) | Cultural demand spike | High | Medium | Seasonal mode; year-round ops value | Verified Fact (seasonality) |
| B7 | Confusion with state platforms | Parallel digital livestock tools | Med | High | Clear positioning; legal review | Verified Fact (Adhahi exists in press) |
| B8 | Intermediary bypass | Brokers prefer offline margin | High | Medium | Design for intermediaries after research | Assumption + academic context |

---

## Security risks

| ID | Description | Mitigation | Tag |
|----|-------------|------------|-----|
| S1 | Unauthorized access / privilege escalation | Fix T1/T2; RLS tests | Verified Fact |
| S2 | Identity fraud / fake vets | Manual verification; license checks; progressive trust | Assumption (process) |
| S3 | Fake listings (future) | Moderation queues; photo reuse detection later | Long-Term Idea for ML |
| S4 | Spam registrations / contact floods | Rate limits; captcha if needed; RPC constraints | Recommendation |
| S5 | Account takeover | Strong recovery; session hygiene; monitoring | Recommendation |
| S6 | Malicious uploads (future) | Type/size limits; AV scanning; separate buckets | Recommendation |
| S7 | QR forgery (future) | Online verification; signed tokens; no secrets in QR | Recommendation |
| S8 | Login identifier enumeration | Rate limit; generic errors where required | Verified Fact (surface exists) |
| S9 | Data leakage via search/notifications | Same RLS as list APIs; payload minimization | Recommendation |

---

## Operational risks

| ID | Description | Mitigation | Tag |
|----|-------------|------------|-----|
| O1 | Server/provider outage | Status page; multi-region later; cached reads | Assumption |
| O2 | Backup failure | Documented backup restore drills quarterly | Recommendation |
| O3 | Human/employee error | Least privilege; audit; confirm dialogs | Recommendation |
| O4 | Deployment config drift | Already evidenced in recovery docs; strengthen deploy checklists | Verified Fact (history) |
| O5 | Support overload at launch | Ticket triage; macros; wilaya escalation rules | Assumption |
| O6 | 58 managers without training | Playbooks; sandbox; phased wilaya rollout | Recommendation |
| O7 | Third-party email/SMS outage | Dual provider strategy later; in-app fallback | Recommendation |

---

## Year 1 — ranked

1. T1/S1 privilege paths — mitigate immediately  
2. B3 honesty gap — relabel & tone down claims  
3. T3 audit gap — ship before claiming admin maturity  
4. B1/B2 adoption/cold start — research + single-wilaya focus  
5. T4 migration canon — prevent irreversible prod mistakes  
6. O6 manager operations readiness  

## Year 3 — growth risks

Scaling listings/media · hiring moderators · technical debt in monolith · marketplace dispute volume · wilaya performance variance · payment pressure  

## Year 5 — national adoption risks

Governance maturity · DR/business continuity · legal complexity · data sovereignty · architectural modularization only when measured need appears · sustainability of trust brand  

---

## Review

Update this register when risks materialize or mitigations ship. Link incidents to IDs.
