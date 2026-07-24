# MawashiDZ Implementation Roadmap

**Version:** 1.0  
**Date:** 2026-07-24  
**Status:** Recommendation — requires Founder approval before execution  
**Authority:** Subordinate to [MAWASHIDZ_CONSTITUTION.md](./MAWASHIDZ_CONSTITUTION.md)  
**Based on:** Constitution v2.0 · Gap Analysis v1.0 · Repository review · [product/ROADMAP.md](../product/ROADMAP.md)

> Every phase below is a **Recommendation** unless labeled otherwise.  
> **Do not start a phase until its gates are met.**

---

## Principles for this roadmap

1. **Stabilize operations before growth features.**
2. **Animals before marketplace transactions.**
3. **Tickets before open messaging.**
4. **Research before broker role and monetization.**
5. **Founder decisions before irreversible schema.**
6. **One track per branch/PR** — do not mix Auth/RLS with Hub/marketplace.

---

## Current state (Verified Fact)

```text
✅ Marketing site + i18n (AR/EN/FR/DE)
✅ Auth: signup, login (email/phone/member ID), password recovery
✅ Sequential member IDs (MDZ-*)
✅ Registration review (admin + wilaya manager) via RLS/RPC
✅ Livestock price board (simulated) + news RSS
✅ Security tests for Phase 0 flows
✅ Product library (PRODUCT_CONSTITUTION, PRDs, PDRs)

❌ Smart Workspaces / Hub
❌ Notification center
❌ Support ticket messaging
❌ Animals / herds / health / ownership
❌ QR identity system
❌ Transactional marketplace
❌ Storage / media uploads
❌ Audit log on main (migration 008 on branch only)
❌ CI workflow
❌ Canonical fresh-install schema (setup.sql incomplete)
```

---

## Pre-conditions (blockers)

Complete these before Phase A expands into product features.

| # | Blocker | Why | Owner | Classification |
|---|---------|-----|-------|----------------|
| B1 | **Founder decision session** | Business model, marketplace policy, broker role, AI policy, data retention | Founder | Recommendation |
| B2 | **Legal counsel engagement** | ToS, Privacy, veterinary disclaimers | Founder | Recommendation |
| B3 | **Field research plan approved** | Breeders, brokers, buyers, vets, markets | Founder + Product | Recommendation |
| B4 | **Canonical schema baseline** | `user_roles` CREATE, `registrations.status`, merge setup + 002–007 | Engineering | Verified Fact (gap) |
| B5 | **Migration 008 on main** | Admin audit log required for Track A acceptance | Engineering | Verified Fact (gap) |
| B6 | **CI (`npm test` on PR)** | Prevent regressions before scale | Engineering | Verified Fact (gap) |

**Gate:** B4 + B5 + B6 should complete before any new member-facing feature work.  
**Gate:** B1 should complete before marketplace schema design.

---

## Phase map (recommended)

```text
Phase 0   Foundation hardening          ← NOW (extend existing Phase 0)
    ↓
Phase 1   Member Operations             ← product ROADMAP Phase 1 (in progress)
    ↓
Phase 2   Smart Workspace shell + Hub   ← product ROADMAP Phase 2
    ↓
Phase 3   Livestock Identity            ← NEW (missing from current product roadmap)
    ↓
Phase 4   Marketplace MVP               ← after research + Founder policy
    ↓
Phase 5   Professional depth            ← vet workflows, feed seller, broker (if justified)
    ↓
Phase 6   Scale & trust                 ← mobile app, offline, payments (if approved)
    ↓
Phase 7   Intelligence                  ← AI only with data + governance
```

This extends (does not replace) [product/ROADMAP.md](../product/ROADMAP.md). Where they conflict, this document explains why; Founder chooses.

---

## Phase 0 — Foundation hardening

**Goal:** Make fresh installs and production ops trustworthy.

| Track | Deliverable | Must / Should | Depends on |
|-------|-------------|----------------|------------|
| 0.1 | Canonical `setup.sql` + single migration path | **Must** | — |
| 0.2 | Create `user_roles` in repo schema | **Must** | 0.1 |
| 0.3 | Add `registrations.status` to setup | **Must** | 0.1 |
| 0.4 | Merge audit log (migration 008) to main | **Must** | — |
| 0.5 | GitHub Actions CI (`npm test`) | **Must** | — |
| 0.6 | Expand `docs/database-schema.md` | Should | 0.1–0.4 |
| 0.7 | Rate-limit / harden public INSERT endpoints | Should | — |
| 0.8 | Document backup + incident response stubs | Should | — |

**Exit criteria:** Fresh Supabase project can be installed from docs alone; CI green on PR; audit log available to admins.

**Complexity:** Low–medium (schema/docs/ops). Low product risk if scoped carefully.

---

## Phase 1 — Member Operations & Communication

**Goal:** Operators can run the platform; members get outcomes and support channels.

Aligns with existing tracks A–E in [product/ROADMAP.md](../product/ROADMAP.md).

| Track | Deliverable | Status | Must / Should |
|-------|-------------|--------|----------------|
| 1.A | Registration review + Admin operations + audit | In progress | **Must** |
| 1.B | Password recovery verified in production | Verify | **Must** |
| 1.C | Operational email (Resend/Brevo) | Not started | **Must** |
| 1.D | Notification center (server-backed inbox) | Not started | **Must** |
| 1.E.1–E.3 | Ticket model + admin/wilaya messaging | Not started | **Must** |
| 1.E.4–E.5 | Ticket ↔ notification deep links + internal notes | Not started | Should |
| 1.E.6 | Member-to-member messaging | Later | Could (after Phase 4 hooks) |
| 1.F | Show rejection reasons in member account UI | Missing | **Must** |
| 1.G | Request-more-info workflow | Missing | Should |

**Exit criteria:** Admin can approve/reject/suspend with audit trail; member sees outcome; support tickets work wilaya-scoped; notifications deliver for core events.

**Do not start Phase 2 Hub P0 until Phase 1 minimum viable (A–E.3 + D) meets acceptance** — **Verified Fact** (existing product gate).

---

## Phase 2 — Smart Workspace shell + Hub

**Goal:** Role-aware daily home with Hub cards — breeder-first.

| Step | Deliverable | Must / Should |
|------|-------------|----------------|
| 2.P0 | `hub_cards` + `hub_engagement_events` + RLS | **Must** |
| 2.P1 | `mdz-hub-core`, top-4 cards, offline cache, “Today in your wilaya” | **Must** |
| 2.Shell | Workspace shell + Quick Actions (not settings page) | **Must** |
| 2.Breeder | Breeder workspace skeleton (empty states → first listing CTA) | **Must** |
| 2.P2 | Preferences jsonb, notification deep links into workspace | Should |
| 2.Search | Scoped global search MVP | Could |

**Exit criteria:** Breeder opens MawashiDZ and sees actionable Hub + empty-state guidance; no regression on Auth/admin RPCs.

**Reject in this phase:** Full marketplace CRUD, AI assistant, multi-vertical cards that lack data sources.

---

## Phase 3 — Livestock Identity (NEW — Critical)

**Goal:** Animals become first-class entities before anyone can sell them.

> **Recommendation:** Current product roadmap jumps from Hub → Marketplace without animal entities. That is a structural gap. Insert this phase.

| Track | Deliverable | Must / Should |
|-------|-------------|----------------|
| 3.1 | Domain model: `animals`, `herds`, `ownership_events` | **Must** |
| 3.2 | Breeder animal CRUD (create, edit, archive) | **Must** |
| 3.3 | Ownership transfer RPC (immutable event log) | **Must** |
| 3.4 | Death / culling event | Should |
| 3.5 | Vaccination / treatment records (vet-authored path stub) | Should |
| 3.6 | Member QR + animal QR generation + verification page | **Must** |
| 3.7 | Membership card PDF (single document type first) | Should |
| 3.8 | Storage buckets + image upload for animals | **Must** |

**Exit criteria:** Breeder can register an animal, view ownership history, generate QR; verification page works online; photos stored securely.

**Founder gates before 3.3:** Ownership verification policy, data retention for animal records.

**Complexity:** Medium–high (new schema, RLS, media). Highest leverage domain investment before commerce.

---

## Phase 4 — Marketplace MVP

**Goal:** Trusted listings and purchase requests — not a full exchange platform.

**Gates (all required):**
- Phase 1 and Phase 3 exit criteria met
- Founder marketplace policy documented
- Minimum field research complete (buyer trust signals, seller listing habits)

| Track | Deliverable | Must / Should |
|-------|-------------|----------------|
| 4.1 | Listing lifecycle: draft → review → active → sold/archived | **Must** |
| 4.2 | Wilaya manager listing moderation | **Must** |
| 4.3 | Buyer purchase requests + listing-linked threads | **Must** |
| 4.4 | Favorites / saved searches | Should |
| 4.5 | Reporting / hide inappropriate content | **Must** |
| 4.6 | Dispute escalation stub (manager → founder) | Should |
| 4.7 | Payment recording (cash confirmation only) | Could |

**Reject in this phase:** Escrow, cryptocurrency, auctions, equipment/feed verticals, featured ads (until business model decided).

**Exit criteria:** Breeder publishes listing linked to animal; buyer requests purchase; manager can hide/flag; sale updates ownership event.

---

## Phase 5 — Professional depth

**Goal:** Vet and feed seller workspaces; broker only if research justifies.

| Track | Deliverable | Condition |
|-------|-------------|-----------|
| 5.1 | Veterinarian Smart Workspace (cases, notes, certificates) | After Phase 3 health stubs |
| 5.2 | Professional vet verification workflow | After Founder + regulatory research |
| 5.3 | Feed seller workspace (catalog, stock) | After Phase 4 proof |
| 5.4 | Broker capabilities | **Only if** field research says distinct role needed; else extend breeder |
| 5.5 | Breeding lifecycle (mating → offspring) | Should |
| 5.6 | Educational content CMS (draft → review → publish) | Should |

---

## Phase 6 — Scale & trust

**Goal:** Mobile-first depth, offline, and optional payments.

| Track | Deliverable | Condition |
|-------|-------------|-----------|
| 6.1 | Progressive Web App or native mobile | After Phase 4 usage metrics |
| 6.2 | Offline read sync (Hub + animal cards) | After conflict model design |
| 6.3 | Offline writable sync | **Long-Term Idea** — postpone until Phase 6.2 proven |
| 6.4 | Payment partner integration | Founder decision + legal |
| 6.5 | Transport / equipment marketplace cards | After livestock marketplace stable |
| 6.6 | Multi-region / DR maturity | Year 3+ |

---

## Phase 7 — Intelligence

**Goal:** AI only where measurable value exists.

| Track | Deliverable | Condition |
|-------|-------------|-----------|
| 7.1 | Hub AI assistant card (P7) | Normalized Hub context + Founder AI policy |
| 7.2 | Fraud / duplicate listing detection | Marketplace event volume |
| 7.3 | Price suggestions | Historical sale data + explainability |
| 7.4 | Medical suggestions | **Rejected until** veterinary liability framework + professional review |

---

## MoSCoW summary

### Must Have (next 5 delivery horizons)

1. Schema baseline + CI + audit log  
2. Phase 1 ops (email, notifications, tickets)  
3. Breeder Smart Workspace + Hub P0/P1  
4. Animals + ownership events + QR + media  
5. Marketplace listings + requests + moderation  

### Should Have

- Rejection reasons + request-info  
- Vaccination records  
- Membership card PDF  
- Vet workspace  
- Dispute escalation  

### Could Have

- Cash payment confirmation  
- Global search  
- Feed marketplace  
- Breeding lifecycle  

### Won't Implement (without new evidence)

- Blockchain / crypto  
- Microservices  
- E2E chat encryption (v1)  
- Voice/video messaging (v1)  
- AI pricing / medical advice (v1)  
- Separate CEO database role  
- Automatic 58 wilaya manager assignment  

---

## Version mapping (five-year view)

| Version | Focus | Business value | Technical value | Risk if skipped |
|---------|-------|----------------|-----------------|-----------------|
| **v1.x** | Phase 0–1 | Trustworthy ops | Stable Auth/RLS/audit | Chaos at scale |
| **v2.x** | Phase 2–3 | Daily breeder habit + animal identity | Schema foundation for commerce | Marketplace without truth |
| **v3.x** | Phase 4 | Commerce begins | Listing/order state machines | Premature monetization |
| **v4.x** | Phase 5–6 | Professional ecosystem | Mobile/offline | Fragmented verticals |
| **v5.x** | Phase 7 + national maturity | Differentiation | AI + DR | Hype without data |

---

## Parallel work (safe)

These may run alongside Phase 0–1 if they do not touch Auth/RLS:

| Work | Constraint |
|------|------------|
| Exchange / news UX polish | Public APIs only |
| Brand / visual system docs | Founder owns brand |
| Field research interviews | No code dependency |
| Legal document drafting | External counsel |
| Glossary / VISION.md / FOUNDER_DECISIONS.md | Documentation |

---

## Explicit non-goals for the next major release

- Replacing Supabase Auth  
- Rewriting `index.html` as a full SPA framework migration  
- Building all role workspaces simultaneously  
- Launching paid ads  
- Government API integration  

---

## Recommended next actions (ordered)

| Priority | Action | Classification | Confidence |
|----------|--------|----------------|------------|
| 1 | Founder reviews Constitution v2.0 + this roadmap | Recommendation | High |
| 2 | Founder completes decision table (Gap Analysis §3) | Recommendation | High |
| 3 | Engineering: Phase 0.1–0.5 (schema + CI + audit) | Recommendation | High |
| 4 | Complete Phase 1 tracks A–E.3 | Recommendation | High |
| 5 | Approve & start field research | Recommendation | High |
| 6 | Hub P0 after Phase 1 gates | Recommendation | Medium |
| 7 | Design Phase 3 animal schema (ADR) after B1 | Recommendation | Medium |
| 8 | Marketplace only after research + Phase 3 | Recommendation | High |

---

## Relationship to existing product ROADMAP.md

| Existing | This document |
|----------|---------------|
| Phase 1 Member Ops | **Confirmed** — keep |
| Phase 2 Hub | **Confirmed** — keep gates |
| Phase 3+ Marketplace | **Revised** — insert Livestock Identity first |
| AI as next after marketplace | **Revised** — AI is Phase 7, after data exists |

**Recommendation:** After Founder approval, update `docs/product/ROADMAP.md` to include Phase 3 Livestock Identity explicitly. Until then, this file is the advisory strategic roadmap.

---

## Review cadence

- Review before every major release  
- Amend when Founder decisions change scope  
- Never implement features that fail the Constitution design gate  

---

## Document history

| Version | Date | Summary |
|---------|------|---------|
| 1.0 | 2026-07-24 | Initial recommended implementation roadmap from Constitution gap analysis |
