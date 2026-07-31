# Governance Framework — Draft 0.9

**Status:** Phase A substance draft — **for committee review**  
**Version label:** Draft 0.9 (**not** v1.0)  
**Authority of this document:** Governance map / operating frame only — **not** Source of Truth  
**Packaging:** Forbidden in this phase (no DOCX / PDF / identity wrap)  
**Database:** No DDL. Migration 017 = FROZEN / historical reference only.

---

## 0. Purpose of Phase A

Deliver the **substance** of how MawashiDZ documents relate, who owns them, how conflicts resolve, and how implementation is gated — using **existing repository documents only**.

Phase B (cover, table of contents polish, versioning pages, change log pages, approval signature pages, identity, PDF) starts **only after** committee accepts this Phase A draft.

**01** and **02** under `docs/governance/` are **stubs only** and are **not adopted**.

---

## 1. Framework ≠ SSOT

| Claim | Rule |
|-------|------|
| This Framework | Describes levels, owners, conflict order, gates, and review cadence. |
| Source of Truth (SSOT) | Remains **`docs/constitution/MAWASHIDZ_CONSTITUTION.md` v3.0 FROZEN** (D-001). |
| If this Framework conflicts with the Constitution | **Constitution wins.** Amend the Framework; do not weaken the Constitution via this draft. |
| Product Constitution | Subordinate Hub / Smart Workspace mechanics only — **not** platform SSOT. |
| Marketing Kit | **Does not exist** as an authoritative book. **Not** Authoritative SSOT. Public claims follow `PUBLIC_CLAIMS_POLICY.md` only. |

This Framework may be cited to explain hierarchy. It may **not** invent new strategic NON-GOALS, roles, or phase order.

---

## 2. Authority levels

Levels are discrete: **−1, 0, 1, 2, 3, 4**.  
Do **not** write or interpret them as “−1 to −4”.

| Level | Name | Meaning |
|------:|------|---------|
| **−1** | Founder irreversible / amend gate | Decided Founder choices and formal amendments that gate strategy reopen |
| **0** | Strategic SSOT | Frozen Constitution — vision, trust, roles, NON-GOALS, sequencing principles |
| **1** | Constitution library satellites | Binding companions under the Constitution (roadmap order, principles, claims, review rules, debt, checklists) |
| **2** | Product direction | Product requirements, PDRs, product roadmap detail, glossary — subordinate to Levels −1/0/1 on vision and phase order |
| **3** | Engineering & operations detail | ADRs, runbooks, design system, schema references — implement under higher levels |
| **4** | Evidence / history / non-authoritative | Audits, acceptance evidence, handoffs, reports, archive — **do not override** Levels −1…3 |

Higher magnitude of authority = lower level number (−1 outranks 0, 0 outranks 1, …).

---

## 3. Owners table

| Level | Primary owner | May change via | Must not |
|-------|---------------|----------------|----------|
| **−1** | Founder | Decided entry in `FOUNDER_DECISIONS.md` + Decision Log / amendment acceptance | Be silently edited by implementers or review agents |
| **0** | Founder | Founder-approved amendment + Decision Log | Be treated as draft; be overridden by product/marketing text |
| **1** | Founder + designated constitution maintainers | Reviewed PR; Founder sign-off when strategy or claims change | Invent phase order that contradicts Constitution ROADMAP |
| **2** | Founder / Product | Reviewed PR; new PDR for important choices; Founder approval for constitution/PDR amendments | Override Levels −1/0/1 on vision, trust, roles, NON-GOALS, phase order |
| **3** | Engineering (lead) | ADR / runbook PR under Architecture Review Checklist | Ship DB/Auth/RLS changes without gates in §5 |
| **4** | Authors of the evidence artifact | Append-only style updates; corrections labeled | Be cited as live authority over retained policy |

**Review Board** (`INDEPENDENT_REVIEW_BOARD.md`): reviews and recommends; does **not** own Levels −1/0; does **not** merge or implement; does **not** mutate the database.

**Build / implementer agents:** execute approved Build Prompts under §5; do not amend Levels −1/0 without Founder process.

---

## 4. Conflict order

When two documents disagree, apply **in order**:

1. **Level −1** — Decided Founder decisions and accepted amendments.  
2. **Level 0** — `MAWASHIDZ_CONSTITUTION.md` v3.0 (vision, trust, roles, NON-GOALS, sequencing principles).  
3. **Level 1 — phase order** — `docs/constitution/ROADMAP.md` wins on phase sequencing (e.g. Animals before Hub).  
4. **Level 1 — public claims** — `PUBLIC_CLAIMS_POLICY.md` wins on marketing / trust claim labels.  
5. **Level 1 — other constitution satellites** — principles, review board rules, evidence standard, checklists, debt register (as applicable to their subject).  
6. **Level 2 — Product Constitution** — wins **only** on Hub card / Smart Workspace mechanics when Hub is in the constitution phase that allows it; **never** on Years 1–2 scope or phase order.  
7. **Level 2 — approved PDRs** — may refine a Hub mechanic detail after gates; still yield to −1/0/1 on strategy.  
8. **Level 2 — product ROADMAP / PRDs** — track detail; sequencing yields to constitution ROADMAP.  
9. **Level 3** — ADRs and runbooks yield to all of the above on product/strategy conflict; among engineering peers, newer **Accepted** ADR on the same decision wins for that decision.  
10. **Level 4** — archive, handoffs, audits, migration acceptance packs — **never override**.

This order restates and extends the conflict rules already published in `docs/constitution/README.md`; it does not replace the Constitution.

---

## 5. Implementation gate path

No production-affecting implementation proceeds without the applicable path below.

```
Intent / Build Prompt
        │
        ▼
[G0] Allowed by Levels −1 / 0 / 1?
        │ no → STOP (amend or refuse)
        ▼
[G1] Correct phase per constitution ROADMAP?
        │ no → STOP (no Phase N+1 early)
        ▼
[G2] Product / PDR acceptance criteria clear? (if product-facing)
        │ no → STOP or return to Product owner
        ▼
[G3] Engineering design recorded? (ADR when Auth/DB/RLS/security mechanics)
        │ no → draft ADR / design note first
        ▼
[G4] Architecture Review Checklist + evidence standard applied
        │ fail → REJECT / CONDITIONS (Board)
        ▼
[G5] Implementation on a feature branch / migration N+1 (new scope only)
        │
        ▼
[G6] Verify (tests / verify.sql / live smoke as required by phase)
        │ fail → do not claim Verified
        ▼
[G7] Acceptance recorded; only then merge / apply production (Owner rules)
```

**Hard stops:**

- Review Board: at most **one** Build Prompt per decision cycle (`INDEPENDENT_REVIEW_BOARD.md`).  
- Static review ≠ live Verified where live smoke is required.  
- **Migration 017** is closed — do not open follow-up DDL “under 017”; any DB change is a **new** migration with its own design, review, verify, and approval (§8).  
- Packaging / DOCX / PDF identity work is **not** an implementation gate for product code and is **out of Phase A**.

---

## 6. Governance Health Review (6 months)

| Item | Rule |
|------|------|
| Cadence | At least once every **6 months**, or sooner after a major production incident / Founder amendment |
| Owner | Founder (decision) + Review Board (evidence pack) |
| Inputs | Constitution freeze status; open FD Proposed items; ADR Proposed vs Accepted; TECHNICAL_DEBT_REGISTER; PUBLIC_CLAIMS_POLICY vs live site claims; runbook stub vs Verified gaps; Level 4 evidence that was wrongly treated as authority |
| Outputs | Written health note (Level 4 evidence) + **0 or 1** Build Prompt for remediation if APPROVE WITH CONDITIONS / APPROVE |
| Non-goals | Rebranding; DOCX packaging; inventing new books; reopening Migration 017 |

First scheduled window: **no later than 6 months after committee acceptance of Draft 0.9 Phase A** (date to be set at acceptance — not claimed here).

---

## 7. Acceptance criteria (Phase A)

Committee may **ACCEPT** this Draft 0.9 Phase A only if all of the following hold:

1. **Framework ≠ SSOT** is explicit and Constitution v3.0 remains SSOT.  
2. Levels are exactly **−1, 0, 1, 2, 3, 4** (not “−1 to −4”).  
3. Owners table is present and consistent with Founder / Product / Engineering / Review Board roles already in-repo.  
4. Conflict order is present and does not invert constitution README rules.  
5. Implementation gate path is present and forbids silent production DDL / phase skipping.  
6. Governance Health Review (6 months) is defined.  
7. Migration 017 is named **historical reference only** / FROZEN / out of scope.  
8. Repo doc → level map (§9) lists **only existing paths**; no invented books; Marketing Kit is **not** Authoritative SSOT.  
9. **01** / **02** remain stubs **not adopted**; no claim that packaging is ready.  
10. Document is labeled **Draft 0.9**, not v1.0; no DOCX/PDF identity deliverable is required for this acceptance.

**Reject / return** if packaging is substituted for substance, if empty DOCX is offered as ready, if 017 is reopened, or if new “books” are invented without repo files.

---

## 8. Migration 017 — historical reference only

| Fact | Record |
|------|--------|
| Status | **COMPLETE AND ACCEPTED** — FROZEN |
| Evidence | `docs/security/MIGRATION_017_ACCEPTANCE_EVIDENCE.md` |
| Design / freeze note | `docs/security/MIGRATION_017_REMEDIATION.md` |
| SQL (historical) | `supabase/migrations/017_harden_reachable_security_definers.sql` (+ verify / partial-manual-rollback) |

**Rules:**

- Do **not** ALTER / GRANT / REVOKE / DROP / CREATE / rollback **under Migration 017 scope**.  
- Do **not** reopen 017 for verify cleanup or repository hygiene.  
- Verify owner-paste cleanup (e.g. open PR #25 class work), if any, is **repository maintenance only** — not production work and **not** a reopen of 017.  
- Any future database modification = **new migration number** with its own design, review, acceptance criteria, verification, and approval.

In the level map below, 017 artifacts sit at **Level 4** (evidence / history).

---

## 9. Map — current repository documents → levels

**Only paths that exist today.** Absence is noted; nothing is invented to fill a cell.

### Level −1 — Founder irreversible / amend gate

| Path | Role |
|------|------|
| `docs/constitution/FOUNDER_DECISIONS.md` | Irreversible Founder choices (Proposed / Decided) |
| `docs/constitution/DECISION_LOG.md` | Settled why (incl. SSOT freeze D-001) |
| `docs/constitution/AMENDMENT_ACCEPTANCE_2026-07-24.md` | Accepted amendment dispositions |

### Level 0 — Strategic SSOT

| Path | Role |
|------|------|
| `docs/constitution/MAWASHIDZ_CONSTITUTION.md` | Frozen strategic SSOT v3.0 |

### Level 1 — Constitution library satellites

| Path | Role |
|------|------|
| `docs/constitution/ROADMAP.md` | Canonical phase sequencing |
| `docs/constitution/ARCHITECTURAL_PRINCIPLES.md` | Engineering invariants |
| `docs/constitution/PUBLIC_CLAIMS_POLICY.md` | Marketing / trust claims vs phase gates |
| `docs/constitution/INDEPENDENT_REVIEW_BOARD.md` | Review Board operating rules |
| `docs/constitution/ARCHITECTURE_REVIEW_CHECKLIST.md` | PR review gate |
| `docs/constitution/STRICT_EVIDENCE_REVIEW_STANDARD.md` | Evidence / severity rules |
| `docs/constitution/TECHNICAL_DEBT_REGISTER.md` | Known debt |
| `docs/constitution/STRATEGIC_PHASE_COMPLETE.md` | Freeze declaration |
| `docs/constitution/README.md` | Constitution library index + conflict rules |

### Level 2 — Product direction

| Path | Role |
|------|------|
| `docs/product/PRODUCT_CONSTITUTION.md` | Hub / Smart Workspace mechanics (subordinate) |
| `docs/product/MEMBER_OPERATIONS_AND_COMMUNICATION.md` | Phase 1 umbrella PRD |
| `docs/product/MEMBER_OPERATIONS.md` | §§1–5 requirements |
| `docs/product/SUPPORT_AND_MESSAGES_CENTER.md` | §6 / track E |
| `docs/product/ROADMAP.md` | Phase 1 track detail (yields sequencing) |
| `docs/product/PHASE1_EXECUTION_PLAN.md` | Engineering execution plan |
| `docs/product/PRODUCT_DECISIONS/PDR-001.md` … `PDR-005.md` | Accepted product decisions |
| `docs/product/GLOSSARY.md` | Shared vocabulary |
| `docs/product/PRODUCT_IMPROVEMENTS_BACKLOG.md` | Non-blocking PI backlog |
| `docs/product/README.md` | Product library index / ownership |

### Level 3 — Engineering & operations detail

| Path | Role |
|------|------|
| `docs/adr/README.md` | ADR index |
| `docs/adr/001-member-id-allocation.md` | Accepted |
| `docs/adr/002-canonical-migration-path.md` | Accepted |
| `docs/adr/003-membership-vs-elevation.md` | Proposed |
| `docs/runbooks/README.md` | Runbook index |
| `docs/runbooks/break-glass.md` | Break-glass template |
| `docs/runbooks/backup-restore.md` | Backup/restore (stub maturity) |
| `docs/runbooks/incident-response.md` | Incident response (stub maturity) |
| `docs/runbooks/email-outbox.md` | Email outbox ops |
| `docs/design/DESIGN_SYSTEM.md` | UI design system |
| `docs/database-schema.md` | Schema reference |

### Level 4 — Evidence / history / non-authoritative

| Path | Role |
|------|------|
| `docs/security/MIGRATION_017_ACCEPTANCE_EVIDENCE.md` | 017 acceptance — historical |
| `docs/security/MIGRATION_017_REMEDIATION.md` | 017 design/freeze — historical |
| `docs/security/RESOLVE_LOGIN_IDENTIFIER_DESIGN.md` | Out-of-band design note |
| `docs/constitution/PHASE1_INDEPENDENT_AUDIT.md` | Audit evidence |
| `docs/constitution/PHASE1_QUALITY_ELEVATION_REPORT.md` | Elevation report |
| `docs/constitution/PHASE1_UX_BOARD_REVIEW_2026-07-24.md` | UX board review record |
| `docs/constitution/PHASE1_CONTINUOUS_EXCELLENCE_2026-07-24.md` | CE cycle note |
| `docs/runbooks/PHASE1_LIVE_SMOKE_EVIDENCE_2026-07-24.md` | Live smoke evidence |
| `docs/constitution/archive/*` | Pre-freeze / non-authoritative |
| `docs/handoff/*` | Historical handoffs |
| `docs/reports/*` | Migration 014 reports / SQL |
| `docs/REGISTRATION_FLOW_AUDIT.md` | Audit |
| `docs/PRODUCTION_DRIFT_REPORT.md` | Drift report |
| `docs/PRODUCTION_RECOVERY_MANIFEST.md` | Recovery manifest |
| `docs/PR_REVIEW_REPORT.md` | PR review report |
| `docs/UI_UX_STATUS_REPORT.md` | UI status report |
| `docs/features/SMART_ROLE_PROFILE_HUB.md` | Redirect stub only |

### Explicitly not Authoritative SSOT / not mapped as books

| Item | Finding |
|------|---------|
| **Marketing Kit** | **Absent.** Not Authoritative SSOT. Claims → `PUBLIC_CLAIMS_POLICY.md` only. |
| **Governance Framework v1.0** | **Does not exist.** This file is Draft 0.9 Phase A only. |
| **01 Packaging / 02 Identity** | Stubs only — **not adopted** (`01_PACKAGING_STUB.md`, `02_IDENTITY_STUB.md`). |
| **DOCX / PDF identity pack** | Not present; **forbidden** before Phase A acceptance. |

### This Framework’s own placement (after acceptance)

Until committee accepts Phase A, this draft has **no Level assignment as adopted policy**.  
After acceptance, the Framework text is expected to sit as a **Level 1 satellite** (governance map), still **≠ SSOT**, unless the committee assigns otherwise in writing.

---

## 10. Out of scope (Phase A)

- DOCX / PDF / cover / approval signature pages / brand identity kit  
- Declaring v1.0  
- Consolidation of books (prerequisite to v1.0; not done here)  
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
| Phase | A — substance only |
| Created for | Committee + Owner review |
| SSOT | No — Constitution v3.0 remains SSOT |
| Next | Committee ACCEPT / REJECT / RETURN on §7 criteria |
