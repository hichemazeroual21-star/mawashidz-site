# MawashiDZ — Risk Register
**Canonical path:** `docs/constitution/RISK_REGISTER.md`
**Last reviewed:** 2026-07-24

---

> Every identified risk must be owned, monitored, and mitigated.
> This register is reviewed before every major product release.
> Probability: High / Medium / Low. Impact: Critical / High / Medium / Low.

---

## R-001: Simulated Market Prices Attributed to Government Source

| Field | Value |
|-------|-------|
| **Category** | Legal / Reputational |
| **Probability** | High (already occurring) |
| **Impact** | Critical |
| **Detection** | Already identified in code review |
| **Description** | `market-engine.js` and `market-core.mjs` generate prices using hash functions. These prices are labeled as coming from `madr.gov.dz`. No real data feed from MADR exists. |
| **Mitigation** | Remove attribution. Label prices as "estimated reference" until verified data feed established. |
| **Owner** | Founder |
| **Status** | 🔴 Open — Immediate action required |

---

## R-002: No Password Policy

| Field | Value |
|-------|-------|
| **Category** | Security |
| **Probability** | High (any user can register with a weak password) |
| **Impact** | High |
| **Description** | Registration accepts any password, including single characters. This enables easy account takeover via credential stuffing or brute force. |
| **Mitigation** | Implement minimum 8-character password with at least 1 number. Block common passwords. Enforce server-side via Supabase Auth hooks. |
| **Owner** | Engineering |
| **Status** | 🟡 Open |

---

## R-003: `index.html` Monolith

| Field | Value |
|-------|-------|
| **Category** | Technical |
| **Probability** | High (file is 3,616 lines and growing) |
| **Impact** | High |
| **Description** | All CSS, JavaScript, and HTML are in a single file. As features grow, this becomes difficult to maintain, test, and debug. New developers will struggle. Performance will degrade. |
| **Mitigation** | Phase 1: extract critical JS to modules (already started with `registration-flow.mjs`, `mdz-dashboards.mjs`). Phase 2: continue modularization. Phase 3: assess full component architecture. |
| **Owner** | Engineering |
| **Status** | 🟡 Open — mitigating incrementally |

---

## R-004: No Livestock Data Model

| Field | Value |
|-------|-------|
| **Category** | Product |
| **Probability** | High (confirmed: no tables exist) |
| **Impact** | Critical |
| **Description** | MawashiDZ cannot manage livestock, issue health records, or operate a marketplace without an animal data model. This is the largest product gap. |
| **Mitigation** | Design and implement animal schema as Phase 2 top priority. |
| **Owner** | Engineering / Founder |
| **Status** | 🔴 Open — blocks marketplace launch |

---

## R-005: No Media Storage System

| Field | Value |
|-------|-------|
| **Category** | Product / Technical |
| **Probability** | High (confirmed: no Supabase Storage configured) |
| **Impact** | High |
| **Description** | Listings, profiles, and health certificates require photos and documents. Without storage, the marketplace cannot function. |
| **Mitigation** | Configure Supabase Storage buckets with RLS policies as Phase 2 prerequisite. |
| **Owner** | Engineering |
| **Status** | 🟡 Open |

---

## R-006: Fake Veterinarian Accounts

| Field | Value |
|-------|-------|
| **Category** | Security / Trust |
| **Probability** | Medium |
| **Impact** | Critical |
| **Description** | Without credential verification, anyone can register as a veterinarian and falsely certify animal health. This directly damages platform trust and could cause buyers to purchase sick animals based on false health certificates. |
| **Mitigation** | Veterinarian professional capabilities (health certificates, visible badge) are inactive until credentials are verified by a wilaya manager or admin. |
| **Owner** | Product / Engineering |
| **Status** | 🟡 Open |

---

## R-007: Eid al-Adha Traffic Spike

| Field | Value |
|-------|-------|
| **Category** | Operational / Technical |
| **Probability** | High (predictable annual event) |
| **Impact** | High |
| **Description** | Livestock commerce in Algeria peaks dramatically before Eid al-Adha. If the platform is not prepared, it may crash exactly when it matters most — destroying trust on the most commercially important days. |
| **Mitigation** | Load test before Eid. Ensure Supabase plan allows peak connections. Plan static asset CDN. Implement circuit breakers for non-critical features. |
| **Owner** | Engineering / Founder |
| **Status** | 🟡 Open — requires advance planning |

---

## R-008: Supabase Vendor Lock-in

| Field | Value |
|-------|-------|
| **Category** | Technical |
| **Probability** | Low (currently) |
| **Impact** | High |
| **Description** | Heavy reliance on Supabase-specific features (Auth, RLS policies, PostgREST, Storage) makes migration to another provider complex and expensive if Supabase changes pricing or availability. |
| **Mitigation** | Keep all database logic in PostgreSQL-standard SQL (no Supabase-proprietary extensions). Abstract API calls through a service layer. Document migration path. |
| **Owner** | Engineering |
| **Status** | 🟢 Monitoring |

---

## R-009: No Backup Strategy Documented

| Field | Value |
|-------|-------|
| **Category** | Operational |
| **Probability** | High (not documented means not verified) |
| **Impact** | Critical |
| **Description** | No backup or disaster recovery documentation exists. If the Supabase project is accidentally deleted or corrupted, all member data, animal records, and platform configuration could be lost permanently. |
| **Mitigation** | Document: Supabase's automated backup policy; manual export schedule; restore procedure test. Enable Point-in-Time Recovery (PITR) on Supabase. |
| **Owner** | Founder / Engineering |
| **Status** | 🔴 Open |

---

## R-010: No Monitoring or Alerting

| Field | Value |
|-------|-------|
| **Category** | Operational |
| **Probability** | High (confirmed: no monitoring infrastructure documented) |
| **Impact** | High |
| **Description** | Platform failures, slow queries, and security events would not be detected in real time. Incidents would be discovered by users, not by the team. |
| **Mitigation** | Before production launch: implement uptime monitoring (UptimeRobot, Betterstack, or similar); Supabase database dashboard alerts; error logging (Sentry or similar). |
| **Owner** | Engineering |
| **Status** | 🟡 Open |

---

## R-011: Phone Uniqueness Gap in `profiles`

| Field | Value |
|-------|-------|
| **Category** | Data Integrity |
| **Probability** | Medium |
| **Impact** | Medium |
| **Description** | `registrations` table enforces `UNIQUE (phone)` but `profiles` does not. A user bypassing the registration form or a service_role operation could create duplicate phone accounts. |
| **Mitigation** | Add partial unique index on `profiles(phone)` where phone is not null. |
| **Owner** | Engineering |
| **Status** | 🟡 Open |

---

## R-012: Content Security Policy Not Defined

| Field | Value |
|-------|-------|
| **Category** | Security |
| **Probability** | Medium |
| **Impact** | High |
| **Description** | Without a Content Security Policy (CSP) header, the platform is more vulnerable to XSS attacks, especially as inline event handlers and eval-like patterns exist in the current HTML. |
| **Mitigation** | Define and implement a CSP header in `deploy/_headers` and `netlify.toml`. Start with report-only mode to identify violations before enforcing. |
| **Owner** | Engineering |
| **Status** | 🟡 Open |

---

## R-013: Wilaya Manager Inactivity

| Field | Value |
|-------|-------|
| **Category** | Operational |
| **Probability** | High |
| **Impact** | High |
| **Description** | If a wilaya manager is inactive, registrations in their wilaya stack up unapproved. New users cannot use the platform. Trust erodes. |
| **Mitigation** | Define SLA for registration review (suggested: 72 hours). Alert Founder/Admin when queue age exceeds SLA. Allow Admin to approve on behalf of inactive manager. |
| **Owner** | Founder / Operations |
| **Status** | 🟡 Open |

---

## R-014: Code Duplication in Market Engine

| Field | Value |
|-------|-------|
| **Category** | Technical |
| **Probability** | High (confirmed: duplicate code exists) |
| **Impact** | Low (now), Medium (as code diverges) |
| **Description** | `assets/market-engine.js` and `netlify/functions/market-core.mjs` contain identical logic. Any bug fix or change must be applied twice. They will inevitably diverge over time. |
| **Mitigation** | Consolidate into a single shared module. Short-term: add a comment warning developers to keep them in sync. Medium-term: extract to shared package. |
| **Owner** | Engineering |
| **Status** | 🟢 Low priority but known |

---

## R-015: No Legal Entity or Terms of Service

| Field | Value |
|-------|-------|
| **Category** | Legal / Regulatory |
| **Probability** | High (assumed: no documentation exists) |
| **Impact** | Critical |
| **Description** | Operating a platform that collects personal data without a Privacy Policy, Terms of Service, or registered legal entity may violate Algerian law (Law 18-07 on personal data protection). |
| **Mitigation** | Engage legal counsel before public launch. Publish Privacy Policy and Terms of Service. Register appropriate legal entity. |
| **Owner** | Founder |
| **Status** | 🔴 Open — legal review required |

---

*This register is reviewed and updated before every major product release.*
