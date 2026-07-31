# Governance Framework — Draft 0.9

**Status:** Phase A substance draft — **RETURN FOR REVISION addressed — re-submitted for committee review**  
**Version label:** Draft 0.9 (**not** v1.0)  
**Authority of this document:** Level **0** (after acceptance) — governance map / operating frame — **≠ Authoritative SSOT**  
**Packaging:** Forbidden in this phase (no DOCX / PDF / identity wrap)  
**Database:** No DDL. Migration 017 = FROZEN / historical reference only (Level **4**).

**Revision note (PR #27):** Level semantics corrected to the locked decision (−1 Founding Principles … 4 Historical). Prior Level meanings are withdrawn.

---

## 0. Purpose of Phase A

Deliver the **substance** of how MawashiDZ documents relate, who owns them, how conflicts resolve, and how implementation is gated — using **existing repository documents only**.

Phase B (cover, TOC polish, versioning pages, change log, approval pages, identity, PDF) starts **only after** committee accepts this Phase A draft.

**01** and **02** under `docs/governance/` are **stubs only** and are **not adopted**.

---

## 1. Framework ≠ SSOT

| Claim | Rule |
|-------|------|
| This Framework (Level **0** after acceptance) | Describes levels, owners, conflict order, gates, and review cadence. |
| Authoritative SSOT (Level **1**) | **Constitution v3.0** (present). Other SSOT books per §2 / §9. |
| If this Framework conflicts with Level **1** SSOT | **SSOT wins.** Amend the Framework; do not weaken SSOT via this draft. |
| Marketing Kit | **Absent.** **Not** Authoritative SSOT. Public claims follow existing `PUBLIC_CLAIMS_POLICY.md` (operational / claims process — not a Marketing Kit book). |
| 01 / 02 | Stubs only — **NOT ADOPTED**. |

This Framework may be cited to explain hierarchy. It may **not** invent Corporate / Architecture / Security SSOT books, Marketing Kit, or new strategic NON-GOALS.

---

## 2. Authority levels (locked semantics)

Levels are discrete: **−1, 0, 1, 2, 3, 4**.  
Do **not** write or interpret them as “−1 to −4”.

| Level | Name | Meaning |
|------:|------|---------|
| **−1** | **Founding Principles** | Founding constraints and irreversible Founder principle decisions that bound all lower levels |
| **0** | **Governance Framework** | **This file** (after Phase A acceptance). Hierarchy, owners, gates, health review. **≠ SSOT** |
| **1** | **Authoritative SSOT** | Binding source-of-truth books (present or explicitly ABSENT pending Consolidation) |
| **2** | **Operational** | Runbooks, manuals, tests, checklists, living ops/process docs used to execute |
| **3** | **Decision Layer** | ADR, Decision Log, RFC/CR (and like decision records). Records *why* / chosen option |
| **4** | **Historical** | Evidence, audits, handoffs, archives, closed migration acceptance — **never override** −1…3 |

### Level 1 — Authoritative SSOT book status (no invented books)

| SSOT book | Status | Repo path (if present) |
|-----------|--------|-------------------------|
| **Constitution** | **Present** | `docs/constitution/MAWASHIDZ_CONSTITUTION.md` v3.0 FROZEN |
| **Corporate** | **ABSENT** | — pending Consolidation |
| **Architecture** | **ABSENT** | — pending Consolidation (existing `ARCHITECTURAL_PRINCIPLES.md` is **not** this book; see Level **2**) |
| **Security** | **ABSENT** | — pending Consolidation (017 packs are **Historical**, not Security SSOT) |
| **Product Roadmap** | **Present** | Canonical: `docs/constitution/ROADMAP.md`. Detail (subordinate): `docs/product/ROADMAP.md` |

---

## 3. Owners table

| Level | Primary owner | May change via | Must not |
|-------|---------------|----------------|----------|
| **−1 Founding Principles** | Founder | Decided entry in `FOUNDER_DECISIONS.md` + formal amendment / acceptance record | Be silently edited by implementers or review agents |
| **0 Governance Framework** | Founder + committee (acceptance); maintainers thereafter | Reviewed PR after Phase A acceptance; Founder/committee for semantic changes to levels | Override Level **1** SSOT; claim to be SSOT; ship as v1.0 before Consolidation |
| **1 Authoritative SSOT** | Founder (Constitution / Roadmap); future book owners after Consolidation | Founder-approved amendment + Decision Log for Constitution; reviewed PR for Roadmap with Founder sign-off on phase order | Invent ABSENT books; treat Marketing Kit as SSOT |
| **2 Operational** | Engineering lead / Product (by manual) | Reviewed PR; ops update under checklists | Override −1 / 0 / 1 |
| **3 Decision Layer** | Decision author + reviewer; Founder for founding-impact decisions | New ADR / Decision Log / RFC-CR entry; status Proposed→Accepted | Silently rewrite history; override SSOT without amendment |
| **4 Historical** | Authors of the evidence artifact | Labeled corrections; append-only preferred | Be cited as live SSOT or reopen frozen migrations as live scope |

**Review Board** (`INDEPENDENT_REVIEW_BOARD.md`, Level **2** process): reviews and recommends; does **not** own −1 / 1; does **not** merge or implement; does **not** mutate the database.

**Build / implementer agents:** execute approved Build Prompts under §5; do not amend −1 / 1 without Founder process.

---

## 4. Conflict order

When two documents disagree, apply **in order**:

1. **Level −1 — Founding Principles** (Decided Founder founding decisions; accepted founding amendments).  
2. **Level 1 — Authoritative SSOT**
   - **Constitution v3.0** wins on vision, trust, roles, NON-GOALS, sequencing principles.  
   - **Product Roadmap** (`docs/constitution/ROADMAP.md`) wins on **phase order**; `docs/product/ROADMAP.md` yields as detail.  
   - **Corporate / Architecture / Security** SSOT books: **ABSENT** — cannot be cited as SSOT until Consolidation creates them.  
3. **Level 0 — Governance Framework** — wins only on **governance map / gate procedure** when Level **1** is silent; **never** overrides Level **1** substance.  
4. **Level 3 — Decision Layer** — newer **Accepted** ADR / Decision Log / RFC-CR on the **same** decision wins among peers; cannot override −1 / 1.  
5. **Level 2 — Operational** — yields to −1 / 1 / 0 (procedure) / 3 (on the decided question).  
6. **Level 4 — Historical** — **never overrides**.

This order preserves Constitution-library conflict intent (`docs/constitution/README.md`) under the locked level names. It does **not** replace Constitution SSOT.

---

## 5. Implementation gate path

No production-affecting implementation proceeds without the applicable path below.

```
Intent / Build Prompt
        │
        ▼
[G0] Allowed by Level −1 Founding Principles?
        │ no → STOP (amend or refuse)
        ▼
[G1] Compatible with Level 1 Authoritative SSOT?
     (Constitution; phase order via constitution ROADMAP)
        │ no → STOP (amend SSOT or refuse)
        ▼
[G2] Governance Framework gates (Level 0) followed?
        │ no → STOP
        ▼
[G3] Operational acceptance criteria clear? (Level 2 manuals / PRDs / tests)
        │ no → STOP or return to owner
        ▼
[G4] Decision recorded when required? (Level 3 ADR / Decision Log / RFC-CR)
        │ no → draft decision record first (esp. Auth/DB/RLS/security mechanics)
        ▼
[G5] Architecture Review Checklist + evidence standard applied (Level 2)
        │ fail → REJECT / CONDITIONS (Board)
        ▼
[G6] Implementation on feature branch / new migration N+1 (never “under 017”)
        │
        ▼
[G7] Verify (tests / verify.sql / live smoke as required)
        │ fail → do not claim Verified
        ▼
[G8] Acceptance recorded (Level 4 evidence as needed); then merge / apply (Owner rules)
```

**Hard stops:**

- Review Board: at most **one** Build Prompt per decision cycle.  
- Static review ≠ live Verified where live smoke is required.  
- **Migration 017** is Level **4** FROZEN — any DB change is a **new** migration with its own design, review, verify, and approval (§8).  
- Packaging / DOCX / PDF identity work is **out of Phase A** and is not a product implementation gate.

---

## 6. Governance Health Review (6 months)

| Item | Rule |
|------|------|
| Cadence | At least once every **6 months**, or sooner after a major production incident / Founder founding amendment |
| Owner | Founder (decision) + Review Board (evidence pack) |
| Inputs | Level −1 open Proposed items; Level 1 SSOT freeze + ABSENT-book Consolidation status; Level 3 Proposed vs Accepted; Level 2 stub vs Verified gaps; Level 4 wrongly treated as authority; claims vs live site |
| Outputs | Written health note (**Level 4**) + **0 or 1** Build Prompt if APPROVE WITH CONDITIONS / APPROVE |
| Non-goals | Rebranding; DOCX packaging; inventing SSOT books; reopening Migration 017 |

First scheduled window: **no later than 6 months after committee acceptance of Draft 0.9 Phase A** (date set at acceptance — not claimed here).

---

## 7. Acceptance criteria (Phase A)

Committee may **ACCEPT** this Draft 0.9 Phase A only if all of the following hold:

1. **Framework ≠ SSOT** is explicit; this file is Level **0** after acceptance.  
2. Levels are exactly **−1, 0, 1, 2, 3, 4** with locked names: Founding Principles / Governance Framework / Authoritative SSOT / Operational / Decision Layer / Historical.  
3. Level **1** states Constitution **Present**; Corporate / Architecture / Security **ABSENT** (pending Consolidation); Product Roadmap **Present** (constitution ROADMAP + subordinate product ROADMAP).  
4. Owners table matches these level names.  
5. Conflict order gives Level **1** SSOT substance priority over Level **0** Framework.  
6. Implementation gate path is present and forbids silent production DDL / phase skipping / reopening 017.  
7. Governance Health Review (6 months) is defined.  
8. Migration 017 is **Level 4** historical / FROZEN / out of live scope.  
9. Repo doc → level map (§9) lists **only existing paths**; no invented books; Marketing Kit is **not** Authoritative SSOT.  
10. **01** / **02** remain stubs **not adopted**; document labeled **Draft 0.9**, not v1.0; no DOCX/PDF required for this acceptance.

**Reject / return** if packaging is substituted for substance, if empty DOCX is offered as ready, if 017 is reopened, if level names revert to the withdrawn scheme, or if new “books” are invented without repo files.

---

## 8. Migration 017 — historical reference only (Level 4)

| Fact | Record |
|------|--------|
| Level | **4 — Historical** |
| Status | **COMPLETE AND ACCEPTED** — FROZEN |
| Evidence | `docs/security/MIGRATION_017_ACCEPTANCE_EVIDENCE.md` |
| Design / freeze note | `docs/security/MIGRATION_017_REMEDIATION.md` |
| SQL (historical) | `supabase/migrations/017_harden_reachable_security_definers.sql` (+ verify / partial-manual-rollback) |

**Rules:**

- Do **not** ALTER / GRANT / REVOKE / DROP / CREATE / rollback **under Migration 017 scope**.  
- Do **not** reopen 017 for verify cleanup or repository hygiene.  
- Verify owner-paste cleanup, if any, is **repository maintenance only** — not production work and **not** a reopen of 017.  
- Any future database modification = **new migration number** with its own design, review, acceptance criteria, verification, and approval.  
- 017 is **not** the absent Level **1 Security** SSOT book.

---

## 9. Map — current repository documents → levels

**Only paths that exist today.** Absence is noted; nothing is invented to fill a cell.

### Level −1 — Founding Principles

| Path | Role |
|------|------|
| `docs/constitution/FOUNDER_DECISIONS.md` | Founding / irreversible Founder choices (Proposed / Decided) |
| `docs/constitution/AMENDMENT_ACCEPTANCE_2026-07-24.md` | Accepted founding-amendment dispositions |
| `docs/constitution/STRATEGIC_PHASE_COMPLETE.md` | Strategic freeze declaration (founding closure record) |

### Level 0 — Governance Framework

| Path | Role |
|------|------|
| `docs/governance/GOVERNANCE_FRAMEWORK_DRAFT_0.9.md` | **This draft** — Level 0 **after** Phase A acceptance; until then under review only |
| `docs/governance/README.md` | Governance folder index (points here; not SSOT) |

### Level 1 — Authoritative SSOT

| Path / book | Role |
|-------------|------|
| `docs/constitution/MAWASHIDZ_CONSTITUTION.md` | **Constitution** SSOT — Present |
| `docs/constitution/ROADMAP.md` | **Product Roadmap** (canonical phase sequencing) — Present |
| `docs/product/ROADMAP.md` | Product Roadmap **detail** — Present; yields sequencing to constitution ROADMAP |
| Corporate SSOT book | **ABSENT** (pending Consolidation) |
| Architecture SSOT book | **ABSENT** (pending Consolidation) |
| Security SSOT book | **ABSENT** (pending Consolidation) |

### Level 2 — Operational

| Path | Role |
|------|------|
| `docs/constitution/README.md` | Constitution library index (ops navigation) |
| `docs/constitution/ARCHITECTURAL_PRINCIPLES.md` | Engineering invariants manual — **not** Architecture SSOT book |
| `docs/constitution/PUBLIC_CLAIMS_POLICY.md` | Claims / marketing-label process — **not** Marketing Kit SSOT |
| `docs/constitution/INDEPENDENT_REVIEW_BOARD.md` | Review Board operating manual |
| `docs/constitution/ARCHITECTURE_REVIEW_CHECKLIST.md` | PR review checklist |
| `docs/constitution/STRICT_EVIDENCE_REVIEW_STANDARD.md` | Evidence rules manual |
| `docs/constitution/TECHNICAL_DEBT_REGISTER.md` | Living debt register |
| `docs/product/README.md` | Product library index |
| `docs/product/PRODUCT_CONSTITUTION.md` | Hub / Smart Workspace mechanics manual (subordinate; not Level 1 SSOT) |
| `docs/product/MEMBER_OPERATIONS_AND_COMMUNICATION.md` | Phase 1 umbrella requirements manual |
| `docs/product/MEMBER_OPERATIONS.md` | §§1–5 requirements manual |
| `docs/product/SUPPORT_AND_MESSAGES_CENTER.md` | §6 / track E manual |
| `docs/product/PHASE1_EXECUTION_PLAN.md` | Execution plan |
| `docs/product/GLOSSARY.md` | Shared vocabulary |
| `docs/product/PRODUCT_IMPROVEMENTS_BACKLOG.md` | Non-blocking PI backlog |
| `docs/runbooks/README.md` | Runbook index |
| `docs/runbooks/break-glass.md` | Break-glass runbook |
| `docs/runbooks/backup-restore.md` | Backup/restore runbook |
| `docs/runbooks/incident-response.md` | Incident response runbook |
| `docs/runbooks/email-outbox.md` | Email outbox runbook |
| `docs/design/DESIGN_SYSTEM.md` | UI design system manual |
| `docs/database-schema.md` | Schema reference manual |
| `docs/features/SMART_ROLE_PROFILE_HUB.md` | Redirect stub to product docs |

### Level 3 — Decision Layer

| Path | Role |
|------|------|
| `docs/constitution/DECISION_LOG.md` | Decision Log |
| `docs/adr/README.md` | ADR index |
| `docs/adr/001-member-id-allocation.md` | ADR — Accepted |
| `docs/adr/002-canonical-migration-path.md` | ADR — Accepted |
| `docs/adr/003-membership-vs-elevation.md` | ADR — Proposed |
| `docs/product/PRODUCT_DECISIONS/PDR-001.md` … `PDR-005.md` | Product decision records (PDR) |
| RFC / CR series | **ABSENT** as a dedicated tree — do not invent; use ADR / Decision Log / PDR until Consolidation says otherwise |

### Level 4 — Historical

| Path | Role |
|------|------|
| `docs/security/MIGRATION_017_ACCEPTANCE_EVIDENCE.md` | 017 acceptance — FROZEN historical |
| `docs/security/MIGRATION_017_REMEDIATION.md` | 017 design/freeze — historical |
| `docs/security/RESOLVE_LOGIN_IDENTIFIER_DESIGN.md` | Out-of-band design note (historical / deferred) |
| `supabase/migrations/017_harden_reachable_security_definers.sql` (+ verify / partial-manual-rollback) | 017 SQL artifacts — historical |
| `docs/constitution/PHASE1_INDEPENDENT_AUDIT.md` | Audit evidence |
| `docs/constitution/PHASE1_QUALITY_ELEVATION_REPORT.md` | Elevation report |
| `docs/constitution/PHASE1_UX_BOARD_REVIEW_2026-07-24.md` | UX board review record |
| `docs/constitution/PHASE1_CONTINUOUS_EXCELLENCE_2026-07-24.md` | CE cycle note |
| `docs/runbooks/PHASE1_LIVE_SMOKE_EVIDENCE_2026-07-24.md` | Live smoke evidence |
| `docs/constitution/archive/*` | Pre-freeze archive |
| `docs/handoff/*` | Historical handoffs |
| `docs/reports/*` | Migration 014 reports / SQL |
| `docs/REGISTRATION_FLOW_AUDIT.md` | Audit |
| `docs/PRODUCTION_DRIFT_REPORT.md` | Drift report |
| `docs/PRODUCTION_RECOVERY_MANIFEST.md` | Recovery manifest |
| `docs/PR_REVIEW_REPORT.md` | PR review report |
| `docs/UI_UX_STATUS_REPORT.md` | UI status report |

### Explicitly not Authoritative SSOT / not invented

| Item | Finding |
|------|---------|
| **Marketing Kit** | **Absent.** Not Authoritative SSOT. |
| **Corporate / Architecture / Security SSOT books** | **ABSENT** — pending Consolidation. |
| **Governance Framework v1.0** | **Does not exist.** This file is Draft 0.9 Phase A only. |
| **01 Packaging / 02 Identity** | Stubs only — **NOT ADOPTED**. |
| **DOCX / PDF identity pack** | Not present; **forbidden** before Phase A acceptance. |

---

## 10. Out of scope (Phase A)

- DOCX / PDF / cover / approval signature pages / brand identity kit  
- Declaring v1.0  
- Consolidation of books (prerequisite to v1.0; not done here)  
- Creating Corporate / Architecture / Security SSOT books in this PR  
- Any database DDL  
- Reopening Migration 017  
- Inventing Marketing Kit or other missing books  

---

## 11. Phase B (blocked)

Phase B starts **only** after written committee acceptance of Phase A outputs in this draft.

Expected Phase B themes (not authored here): cover, index polish, versioning block, change log, approval pages, identity, PDF export — still without promoting this Framework to SSOT and without skipping Consolidation before any v1.0 label.

---

## Document control

| Field | Value |
|-------|-------|
| Title | Governance Framework — Draft 0.9 |
| Phase | A — substance only (revised level semantics) |
| Prior committee action | PR #27 RETURN FOR REVISION |
| SSOT | No — Level 0 Framework ≠ Level 1 Authoritative SSOT |
| Next | Committee ACCEPT / REJECT / RETURN on §7 criteria |
