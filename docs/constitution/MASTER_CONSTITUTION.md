# MAWASHIDZ MASTER CONSTITUTION

**Version:** 2.0 (Improved)  
**Status:** Living Constitution — candidate for Founder ratification  
**Date:** 2026-07-24  
**Supersedes:** Draft Master Constitution fragments (v1.0 draft)  
**Does not silently supersede:** `docs/product/PRODUCT_CONSTITUTION.md` v1.4 (Smart Workspace / Hub)

---

## 0. How to use this document

This Constitution defines **identity, principles, governance, architectural constraints, and five-year product boundaries** for MawashiDZ.

It is **not** a sprint backlog.  
It is **not** permission to build every idea listed as “long-term.”  
It **is** the filter through which every feature, schema change, and role must pass.

### Binding rules

1. Implementation follows the Constitution. Never the opposite.
2. Frontend restrictions are not security. Server-side authorization (RLS + RPC) is mandatory.
3. Every feature must answer: *What real problem does this solve, for whom, how often?*
4. Prefer simplicity that survives five years over cleverness that impresses for one release.
5. Distinguish Verified Facts, Assumptions, Recommendations, and Long-Term Ideas in all analysis.

### Design gate (inherited and retained)

> Which Smart Workspace / operational role benefits from this feature?  
> If the answer is **none**, reconsider.

(See also: `docs/product/PRODUCT_CONSTITUTION.md`.)

---

## 1. Identity

### 1.1 What MawashiDZ is

**Verified Fact (product intent in repo docs):** MawashiDZ positions itself as Algeria’s digital livestock reference — registration, trust, market information, and future operational workspaces — not merely a brochure site.

**Constitutional definition (Recommendation — Founder ratification required):**

MawashiDZ is a **trust and operations platform** for Algeria’s livestock economy:

- Identity and verification of participants  
- Operational workspaces for breeders, buyers, veterinarians, feed sellers, and operators  
- Commerce facilitation (listings, requests, negotiation support)  
- Market and education signals that reduce information asymmetry  
- Traceability primitives (member identity, later animal/QR identity) when security and law allow

### 1.2 What MawashiDZ is not

MawashiDZ is **not**:

- A social network  
- A general chat application  
- A government registry (unless a formal legal partnership exists)  
- A bank or payment processor by default  
- A blockchain / cryptocurrency product  
- An AI product marketed as intelligence theater  

### 1.3 Mission (Founder must finalize)

**Assumption until Founder decides:** Become the most trusted digital companion for Algerian livestock professionals and buyers — reducing fraud, paperwork friction, and information opacity.

**Five-year success definition (Recommendation):** National recognition among breeders and buyers as the default place to verify who they are dealing with and to manage livestock commerce workflows — measured by weekly active operators, completed listing→request→sale cycles, and verified veterinarian participation — **not** by vanity page views alone.

---

## 2. Core principles

| Principle | Meaning |
|-----------|---------|
| Technology serves people | UX follows real farm/market workflows |
| Trust before growth | Never monetize in a way that destroys trust |
| Security before convenience | Least privilege; server enforcement |
| Research before assumptions | Field research gates major modules |
| Architecture before implementation | Schema and permissions designed around entities, not pages |
| Quality before quantity | Fewer excellent workflows beat many shallow ones |
| Maintainability before shortcuts | Prefer readable monolith evolution over premature microservices |
| Reality before opinions | Code and user evidence override wishlist prose |
| Honesty before marketing | Do not present synthetic data as live market trades |
| Constitution before code | Code adapts to ratified rules |

---

## 3. Current platform reality (summary)

Full evidence: [TECHNICAL_AUDIT.md](./TECHNICAL_AUDIT.md).

| Area | Reality (Verified Fact) |
|------|-------------------------|
| Stack | SPA (`index.html` + modules), Supabase Auth/DB, Cloudflare Worker + Netlify functions |
| Identity | Profiles, registrations, sequential `member_id`, login by email/phone/member_id |
| Roles | `breeder`, `vet`, `feed`, `buyer`, `manager`, `ambassador`, `partner` (+ admin ranks in code) |
| Operator tools | Approve/reject registrations (wilaya-scoped managers; national admins) |
| Marketplace | **Not built** as transactional listings; “Market” is largely registration marketing |
| Exchange board | **Reference/synthetic** wilaya prices — not completed trades |
| Messaging | Contact + feedback intake only; Support & Messages Center is PRD, not shipped |
| Livestock records | Marketing/copy only — no animal/vaccination/ownership tables |
| QR | Public site QR exists; member/animal verification pages deferred in code comments |
| Smart Hub | Constitution + PDRs exist; Hub engine tables/runtime largely not shipped |
| i18n | AR / EN / FR / DE |

**Recommendation:** Treat the product as **Phase 0–1 identity & operations platform**, not as a completed livestock ecosystem. Public copy must not over-promise unfinished modules.

---

## 4. Product philosophy

### 4.1 Problem-first features

A feature ships only if:

1. It solves a verified or researched user problem  
2. A primary beneficiary role is named  
3. Usage frequency is plausible  
4. A simpler alternative was considered and rejected with reason  
5. Security, maintenance, and five-year cost are acceptable  

### 4.2 Smart Workspace model (binding)

Retained from Founder-approved product constitution:

- Use **Smart Workspace**, not “Dashboard”, in product language for new work  
- Five pillars: Daily insights · Operational management · Quick actions · Statistics · Notifications  
- **Action before content**  
- Guided empty states  
- Rank order R1→R4 with **no upward leakage** and **wilaya fence** for managers  

### 4.3 Hub as modular framework

Future services (equipment, transport, insurance, labs, AI assistant) enter as **Card Providers + workspace sections**, not as separate account paradigms.

**No Card → SQL.** Data access through Provider → Service → RPC → RLS.

---

## 5. Roles & governance

### 5.1 Roles that exist for a reason

| Role | Purpose | Near-term status |
|------|---------|------------------|
| Founder / CEO | Highest authority; strategy; emergency controls | Binding |
| Platform Admin | Operations with **assigned** permissions | Binding |
| Wilaya Manager (58) | Local registration & local moderation only | Binding |
| Support Employee | Least-privilege task permissions | Planned |
| Breeder | Core operator of livestock commerce & herd records | Binding (identity live; ops partial) |
| Veterinarian | Professional health workflows — **never** commercial ownership/price edits | Binding (registration live) |
| Feed seller | Feed commerce | Binding (registration live) |
| Buyer | Discovery, requests, trust verification | Binding (registration live) |
| Broker | Intermediation | **Not a separate role until research proves need** |
| Ambassador / Partner | Existing in code prefixes | Clarify purpose or deprecate carefully |

### 5.2 Broker decision (Constitutional recommendation)

**Reject creating a dedicated Broker role in Year 1.**

**Reason:** Algerian sheep markets rely heavily on *maquignons* / intermediaries (Verified Fact from academic market studies — see FIELD_RESEARCH_AGENDA). Digital needs may be real, but the current codebase has no broker entity, and premature role sprawl increases RLS complexity.

**Recommendation:** Start with **Breeder capabilities + optional “acts as intermediary” profile flag** after field research. Promote to dedicated role only if permission boundaries cannot be expressed otherwise.

### 5.3 Permission philosophy

- Least privilege everywhere  
- Permissions assigned individually to employees — never “admin by default”  
- Effective privileged rank from **`user_roles` (server-side)** — not client-claimed `profiles.role` alone  
- Wilaya managers: **never** other wilayas, global settings, employee grants, CEO data, or audit deletion  

### 5.4 Immutable / auditable data

Never permanently destroy:

- Audit / security logs  
- Registration & approval history  
- Permission / role changes  
- Ownership transfer history (when livestock exists)  
- Veterinary / vaccination history (when exists)  

Soft-delete or archive user content; hard-delete only under documented legal process with Founder + legal review.

---

## 6. Security constitution

### 6.1 Non-negotiables

1. Never trust the frontend.  
2. Sensitive mutations only via authorized RPC / Edge Functions.  
3. Signup metadata must **not** be able to self-grant privileged roles or `approved` status.  
4. Public inserts must be constrained (rate limits, column allowlists, anti-spam).  
5. Search and notifications obey the same authorization as list/detail APIs.  
6. Secrets never committed; publishable keys only where intentional.  
7. Session recovery and password reset must resist enumeration where policy requires.  

### 6.2 Critical near-term security debts (Verified Fact → Recommendation)

| Issue | Classification | Action |
|-------|----------------|--------|
| `handle_new_user()` copies client `role`/`status` from metadata | Verified Fact | **Critical fix** — whitelist member roles; force `pending` |
| `review_registration_status` accepts `profiles.role = manager` fallback | Verified Fact | Prefer `user_roles` only; remove insecure fallback after data migration |
| Referenced `008_admin_audit_and_roles.sql` missing in repo | Verified Fact | Ship audit migration or remove false references |
| Synthetic prices presented as “live exchange” | Verified Fact | Relabel as **reference index** until real sources exist |
| `resolve_login_identifier` anon callable | Verified Fact | Keep if needed for login UX; add rate limiting / monitoring |

---

## 7. Domain architecture (entities, not pages)

Design tables around business entities. Near-term domain map:

### Phase A — Identity & operations (now / immediate)

`auth.users` · `profiles` · `registrations` · `user_roles` · audit logs · notifications · support tickets  

### Phase B — Commerce MVP (after Phase 1 gates)

`animals` (or listing-first if research prefers) · `listings` · `listing_media` · `purchase_requests` · `conversations` (ticket-linked)  

### Phase C — Health

`vet_cases` · `vaccinations` · `health_certificates` (vet-authored; immutable history)  

### Phase D — Traceability

QR identity objects · membership cards / PDF · ownership events  

### Explicitly deferred until justified

Microservices · blockchain · end-to-end encrypted social chat · payments ledger · government API integrations · international multi-country tenancy  

**Normalize first.** Denormalize only with measured performance need.

---

## 8. Communications

### 8.1 Binding messaging model

Adopt **Support & Messages Center** (existing PRD):

- Tickets with reason, status, priority, linked objects  
- Member ↔ platform, Member ↔ wilaya manager first  
- Member ↔ member **only** when linked to listing/request/order/vet case  
- **No** primary “DM anyone” product  
- Archive, do not hard-delete  

### 8.2 Draft ideas that are rejected or postponed

| Idea from draft | Decision |
|-----------------|----------|
| Voice messages, video sharing, typing indicators, read receipts as Year-1 messaging | **Postpone** — complexity without Phase B commerce |
| End-to-end encryption as default | **Long-Term Idea** — encrypted transport + DB access controls first; E2EE conflicts with moderation/audit needs |
| WhatsApp as core product channel | **Founder decision** — may be notification bridge later; not primary datastore |
| Group conversations | **Won’t implement** until clear operator need |

### 8.3 Notifications

One server-backed notification center. Start with: approve/reject/request-info, ticket replies, security alerts. Prefer quiet defaults over notification spam.

---

## 9. Marketplace constitution

### 9.1 Honesty rule

Until MawashiDZ records **real** listings and transactions:

- Price boards must be labeled **reference / indicative**  
- Do not imply completed trades, official government prices, or live auction clearing  

### 9.2 Commerce principles

1. Listing quality and verification beat listing volume.  
2. Negotiation remains human; platform provides structure and trust signals.  
3. Veterinary data may support trust but never become unsupervised medical advice.  
4. Brokers (if later) must be identifiable; anonymous intermediation is a fraud risk.  
5. Disputes need a documented escalation path before national scale.

### 9.3 Marketplace modules (Long-Term Ideas — Hub-compatible)

Livestock · Feed · Equipment · Transport · Veterinary services · Labs · Insurance — each as Card Provider + workspace sections after research and Founder priority.

---

## 10. Livestock & veterinary workflows

### 10.1 Livestock lifecycle (target model)

Register animal → identify (tag/QR when ready) → health events → breeding events → listing → ownership transfer → death / archive  

**Recommendation:** Do **not** build full herd ERP before listing MVP. Many breeders may only need commerce-grade animal profiles first. Confirm with field research.

### 10.2 Veterinary boundaries (binding)

Veterinarians may author health records and certificates within permission.  
Veterinarians **must never** modify ownership, prices, or commercial listing fields.

### 10.3 Medical liability

**Founder + legal review required** before any certificate language, diagnostic claims, or AI medical suggestions. Platform provides tooling and audit trails — not clinical responsibility theater.

---

## 11. QR & membership

### 11.1 Principles

- QR is an **identity pointer**, not a secret by itself.  
- Offline payload may contain non-sensitive identifiers only.  
- Full verified records require online authorization checks.  
- Assume forgery attempts; design verification UX that fails closed.

### 11.2 Membership cards

Verified members may receive printable/PDF cards with Member ID, role, wilaya, verification status, QR.  
Ship after identity/approval flows are trustworthy — not as decoration before trust exists.

---

## 12. Media, PDF, brand, education

| Area | Rule |
|------|------|
| Media | Compress, limit size, scan/moderate uploads; no unbounded storage growth |
| PDF | Generate only documents with operational value (cards, reports, certificates) |
| Brand | Founder owns identity; engineering implements approved system |
| Education | Role-specific, practical, below actionable tasks in Hub ranking |

---

## 13. Offline, mobile, performance

### Offline

Algeria’s connectivity varies (**Assumption** for specifics by wilaya — research required). Offline scope:

1. Cached Hub cards with “last updated”  
2. Membership / previously synced animal identity view  
3. Draft forms queued with conflict rules  

Never allow offline writes that silently violate ownership or approval integrity.

### Mobile

Assume **mobile-primary**. Bandwidth-aware images. No deep navigation mazes.

### Performance

Measure. Index deliberately. Paginate. Lazy-load Hub providers. Avoid premature caching layers and microservices.

---

## 14. AI policy

AI may assist with:

- Listing quality suggestions  
- Duplicate / fraud heuristics  
- Price **ranges** with sources and uncertainty  
- Search / knowledge retrieval  

AI must **not**:

- Be marketed as infallible  
- Issue unsupervised medical diagnoses  
- Auto-approve registrations or listings without human policy  
- Obscure why a recommendation was made  

**Founder approval required** before any AI that influences purchase or medical decisions.

---

## 15. Business & legal (Founder-owned)

Engineering may recommend; Founder decides:

- Free vs premium vs enterprise  
- Advertising policy (trust-first)  
- Veterinary subscription models  
- Terms, privacy, retention, dispute policy  
- Algeria-only vs later expansion  

**Rule:** Revenue never outranks user trust.

---

## 16. Documentation & testing standards

### Documentation tree (target)

```text
/docs
  /constitution     ← this library (platform SSOT)
  /product          ← PRDs, Smart Workspace constitution, PDRs, glossary
  /adr              ← engineering decisions
  /architecture
  /security
  /api
  /testing
  /risks            ← may symlink/point to constitution RISK_REGISTER
```

### Testing (mandatory culture)

Unit · integration · security · layout/mobile · regression · permission tests for every new RLS/RPC  

No sensitive RPC ships without automated denial tests for anon/unauthorized roles.

---

## 17. Decision log & living process

Every major decision records:

Decision · Reason · Alternatives · Rejected alternatives · Impact · Review date  

See `docs/constitution/decisions/` and `docs/product/PRODUCT_DECISIONS/`.

Review this Constitution:

- Before each major product release  
- When roles, RLS, or marketplace policy change  
- When better engineering practice invalidates an old constraint  

---

## 18. Explicit non-goals (next 24 months unless Founder overrides)

- Microservices split  
- Cryptocurrency / blockchain livestock registry  
- Social feed / stories  
- Unlinked member chat  
- Decorative analytics without operational metrics  
- Building all five marketplaces in parallel  
- International multi-country launch  
- AI assistant as launch marketing centerpiece  
- Replacing Supabase Auth in Hub workstreams  

---

## 19. Ratification

| Item | Status |
|------|--------|
| Draft reconstruction | Complete — see DRAFT_RECONSTRUCTION.md |
| Technical audit | Complete — see TECHNICAL_AUDIT.md |
| Critical evaluation | Complete — see GAP_ANALYSIS.md |
| Founder ratification of Master Constitution v2.0 | **Pending** |
| Merge conflicts with PRODUCT_CONSTITUTION.md | Listed for Founder — do not auto-overwrite |

Until Founder ratification, treat this document as the **authoritative analysis and proposed Constitution**. Near-term engineering continues to obey existing approved product docs and ROADMAP gates.

---

## Version history

| Version | Date | Summary |
|---------|------|---------|
| 1.0 draft | 2026-07 | Fragmented ChatGPT constitution draft (reconstructed in DRAFT_RECONSTRUCTION.md) |
| **2.0** | 2026-07-24 | Improved Constitution after repository audit + critical evaluation |
