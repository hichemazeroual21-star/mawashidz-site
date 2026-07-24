# MawashiDZ Technical Audit — Repository Reality

**Version:** 1.0  
**Date:** 2026-07-24  
**Scope:** Code, migrations, tests, and existing product docs in `/workspace`  
**Method:** Static analysis of repository (no production DB introspection in this run)

Classification tags: **Verified Fact** · **Assumption** · **Recommendation** · **Long-Term Idea**

---

## 1. Executive verdict

**Verified Fact:** MawashiDZ today is a production-oriented **public SPA + identity/registration platform** with operator approval tooling and informational APIs (news/prices). It is **not yet** a livestock management system, transactional marketplace, veterinary case system, QR verification network, or Smart Hub runtime.

**Recommendation:** Align public messaging and roadmap expectations with this reality. Build trust on what works (identity, approvals, clarity) before expanding domain depth.

---

## 2. Architecture snapshot

| Layer | Implementation | Evidence |
|-------|----------------|----------|
| UI | Monolithic `index.html` (~3600 lines) + extracted modules under `js/` | `index.html`, `js/*.mjs` |
| Deploy | Cloudflare Worker `worker.mjs` + `wrangler.jsonc`; Netlify functions shared for news/prices | `DEPLOYMENT.md`, `worker.mjs` |
| Auth/DB | Supabase Auth + Postgres + RLS/RPC | `supabase/` |
| i18n | `assets/i18n.js` + `assets/i18n-content.js` (ar/en/fr/de) | assets |
| Geo | 58 wilayas / dairas / communes JSON | `assets/algeria_cities.json` |
| Tests | Node unit/e2e/security/layout suite via `npm test` | `package.json`, `tests/` |

**Verified Fact:** `worker.mjs` routes `/api/livestock-news` and `/api/livestock-prices` and static assets — it does not implement Auth or marketplace transactions.

---

## 3. Authentication

### Verified Facts

- Signup via Supabase Auth with role-specific registration forms.  
- Login identifier resolution supports email / phone / `member_id` via `resolve_login_identifier`.  
- Sequential `member_id` allocation uses `allocate_member_id` with advisory lock; execute granted to **service_role only** (hardened Phase 0).  
- BEFORE INSERT trigger assigns `member_id` into auth metadata; AFTER INSERT `handle_new_user()` creates `profiles`.  
- Password recovery module exists (`js/password-recovery.mjs`) with tests.  
- Registration success is defined primarily by Auth account creation; `registrations` insert / EmailJS failures degrade to warnings (`js/registration-flow.mjs`).

### Weaknesses

| Issue | Tag | Notes |
|-------|-----|-------|
| `handle_new_user()` copies metadata `role` and optionally `status` | Verified Fact | Privilege / status self-assignment risk |
| Manager authorization fallback on `profiles.role` | Verified Fact | Weakens `user_roles` as SSOT |
| Login resolution RPC is anon-callable | Verified Fact | Useful UX; enumeration risk without rate limits |
| Public registration inserts `with check (true)` | Verified Fact | Spam / junk row risk |

### Recommendations

1. Whitelist member roles in trigger; ignore privileged roles from client metadata.  
2. Force `profiles.status = 'pending'` on signup.  
3. Make `user_roles` the only privilege source after backfill.  
4. Add rate limiting / WAF / Edge Function gate in front of identifier resolution.  
5. Complete operational email path (PRD track C) instead of optional EmailJS-only admin notify.

---

## 4. Authorization & RLS

### Verified Facts

- `profiles`: authenticated users SELECT own row (setup/migrations).  
- `user_roles`: RLS enabled; self-read policy (migrations 001/002).  
- `registrations`: public INSERT; manager wilaya SELECT + admin SELECT (migration 003).  
- Review mutations go through `review_registration_status` RPC (migration 007) — managers wilaya-scoped; admins broader.  
- Dashboards call authenticated RPC; tests assert no `service_role` key usage from client JS.

### Gaps

| Gap | Tag |
|-----|-----|
| Fresh `setup.sql` does not create `user_roles` | Verified Fact |
| Migration `008_admin_audit_and_roles.sql` referenced in PRODUCT_CONSTITUTION but **absent** from `supabase/migrations/` | Verified Fact |
| No RLS domains for listings, tickets, notifications, animals | Verified Fact |
| Dual migration lineages (numbered 001–007 vs timestamped Phase 0) risk operator confusion | Verified Fact |

### Recommendation

Publish a single **canonical migration path** document for production, staging, and greenfield. Treat missing audit migration as a release blocker for “Admin Operations complete.”

---

## 5. Database architecture

### Tables present in greenfield setup

`member_id_counters` · `profiles` · `registrations` · `contact_messages` · `feedback_tickets`

### Documented / assumed on existing projects

`user_roles` (RLS migrations assume it) · possibly legacy `breeders`

### Not present (Verified Fact: no SQL definitions found)

Animals · herds · vaccinations · treatments · ownership events · listings · orders · purchase requests · ratings · notifications inbox · support tickets (product model) · hub_cards · media objects · QR objects · audit log table

**Recommendation:** Keep Phase 0 schema minimal. Add commerce tables only after Member Ops acceptance criteria and Founder marketplace policy decisions.

---

## 6. Dashboards / Smart Workspaces

### Verified Facts

- Member account UI: profile, request status, invite share, password recovery (`js/mdz-dashboards.mjs`).  
- Manager UI: wilaya-filtered registration queue; approve/reject.  
- Admin UI: national registration stats + approve/reject.  
- Product constitution mandates Smart Workspace language and Hub; runtime Hub engine largely not implemented.

### Contradiction

Draft Master Constitution speaks extensively of rich role dashboards (feed, AI, commissions, etc.). Existing Founder-approved PRODUCT_CONSTITUTION **rejects** “Dashboard” as product language and postpones most of that surface behind Phase gates.

**Recommendation:** Keep Smart Workspace terminology. Treat rich operational panels as phased workspace sections, not a second parallel dashboard design system.

---

## 7. Marketplace architecture

### Verified Facts

- “Market” section primarily drives role registration CTAs.  
- Exchange board shows meat/milk/feed price tables with wilaya sorting/pagination.  
- `/api/livestock-prices` and `assets/market-engine.js` generate **synthetic/reference** prices for 58 wilayas — not marketplace clearing prices.  
- No listing create/edit/sold lifecycle in DB.

### Recommendations

1. Relabel UI copy to **Indicative / reference prices**.  
2. Marketplace MVP = listings + purchase requests + ticket-linked negotiation — not payments, not auctions.  
3. Do not build five vertical marketplaces in parallel.

---

## 8. Messaging & notifications

### Verified Facts

- Contact form → `contact_messages`  
- Feedback form → `feedback_tickets`  
- Registration admin notify via EmailJS (optional)  
- Product PRDs define Support & Messages Center + Notification Center — **not shipped** as server-backed inbox

### Recommendation

Implement PRD tracks D + E as designed (tickets, not chat). Reject draft Year-1 voice/video/group chat.

---

## 9. QR, membership cards, PDF, media

| Capability | Status | Tag |
|------------|--------|-----|
| Site QR image | Exists in UI | Verified Fact |
| Member/animal QR verification pages | Explicitly deferred in UI copy | Verified Fact |
| Printable membership cards / PDF engine | Not found as system | Verified Fact |
| Media storage pipeline | Not found (no Storage policies/tables in migrations reviewed) | Verified Fact |

**Recommendation:** QR after identity trust is solid. Cards/PDF after approval workflow + brand system approval.

---

## 10. Livestock & veterinary

### Verified Facts

- Vet registration collects license, clinic, specialty, experience, services, QR acceptance flags.  
- Breeder registration collects farm-oriented fields.  
- No medical record tables or visit workflows in SQL.  
- UI marketing describes animal passport, ownership transfer, theft freeze, Eid flows — **aspirational copy**.

### Recommendation

Separate **marketing vision** from **shipped capabilities** in the UI. Unshipped modules should be labeled “coming” or removed from primary hero claims until buildable.

---

## 11. Algerian livestock ecosystem — research summary

| Finding | Tag | Source type |
|---------|-----|-------------|
| Algeria ran General Census of Agriculture (RGA) 2024; >1.2M exploitations reported in press | Verified Fact (press) | El Watan / Ouest Tribune / ministry-related coverage |
| Earlier ministerial communications cited large corrections to livestock headcount estimates (e.g., ~21.7M animals vs higher prior claims) | Verified Fact (press) | El Watan reporting on census rationale |
| Sheep markets (souks) rely on intermediaries; prices opaque; quality/weight standards weak | Verified Fact (academic) | LRRD studies (Tiaret / Chlef regions) |
| Seasonality and Aid El-Adha dominate demand spikes | Verified Fact (academic + press) | LRRD; MADRP seasonal interventions |
| State digital experiments exist (e.g., Adhahi.dz for imported sacrificial sheep; QR tracking claims in press) | Verified Fact (press) | Algerie360 / ministry announcements |
| MawashiDZ users’ smartphone habits, trust thresholds, preferred payments | **Assumption / unknown** | Requires field research |
| Exact national digital payment adoption among rural breeders | **Assumption / unknown** | Requires research |

**Recommendation:** Position MawashiDZ as complementary trust/operations layer for private commerce — not as a competitor claiming to replace official state platforms without legal clarity.

---

## 12. Strengths to preserve

1. Algeria-first geo model (58 wilayas) wired into registration.  
2. Multilingual foundation (AR primary).  
3. Hardened member ID allocation path.  
4. Operator review RPC with wilaya fence intent.  
5. Growing automated test culture (`npm test`).  
6. Product documentation discipline (constitution, PDRs, PRD acceptance criteria).  
7. Explicit non-goals in Support & Messages PRD (anti-chat).

---

## 13. Weaknesses / technical debt

1. Monolithic `index.html` size and dual `public/` sync burden.  
2. Schema/docs drift (`setup.sql` vs migrations vs missing 008).  
3. Privilege model dual-path (`user_roles` vs `profiles.role`).  
4. Aspirational UI vs shipped capability mismatch.  
5. Synthetic exchange branding risk.  
6. No audit log table in repo migrations despite product claims.  
7. Hub architecture approved on paper before Member Ops gates complete — good sequencing in ROADMAP; risk of premature Hub PRs.

---

## 14. Confidence

| Area | Confidence |
|------|------------|
| Code/migration facts in this audit | **High** |
| Production DB exact live schema | **Medium** (drift reports exist; live introspect not re-run here) |
| Algerian market academic patterns | **Medium-High** for studied regions; **Low** for nationwide uniformity |
| User willingness to adopt digital livestock tools | **Low** until field research |

---

## 15. Immediate engineering priorities (Recommendations)

Ordered for risk reduction, not feature glory:

1. Close privilege escalation paths on signup + manager fallback.  
2. Ship real audit logging migration + tests.  
3. Finish Member Ops acceptance criteria (approve/reject/request-info + notifications).  
4. Honest labeling of price board.  
5. Canonical migration guide.  
6. Only then: listing MVP schema design under Founder marketplace policy.
