# MawashiDZ Constitution Library

**Status:** Living strategic documentation  
**Version:** 1.0  
**Date:** 2026-07-24  
**Audience:** Founder, engineering, product, future maintainers

---

## Purpose

This folder is the **platform-wide constitutional library** for MawashiDZ.

It was produced by reconstructing the draft Master Constitution fragments, auditing the repository, researching the Algerian livestock context (where sources allow), and critically evaluating every major idea.

**The Constitution is the source of truth. Implementation follows the Constitution. Never the opposite.**

---

## Document map

| Document | Role |
|----------|------|
| **[MASTER_CONSTITUTION.md](./MASTER_CONSTITUTION.md)** | Binding platform Constitution (improved, 5-year guide) |
| **[TECHNICAL_AUDIT.md](./TECHNICAL_AUDIT.md)** | Verified repository reality vs vision |
| **[GAP_ANALYSIS.md](./GAP_ANALYSIS.md)** | Missing topics, field research, founder decisions, rejection list, risks |
| **[FIELD_RESEARCH_AGENDA.md](./FIELD_RESEARCH_AGENDA.md)** | What must be learned from real users before building |
| **[FOUNDER_DECISIONS.md](./FOUNDER_DECISIONS.md)** | Decisions that require Founder approval |
| **[RISK_REGISTER.md](./RISK_REGISTER.md)** | Technical, business, security, operational risks |
| **[FEATURE_DISCIPLINE.md](./FEATURE_DISCIPLINE.md)** | What not to build / postpone / simplify |
| **[FIVE_YEAR_ROADMAP.md](./FIVE_YEAR_ROADMAP.md)** | Must / Should / Could / Won’t + version horizons |
| **[DRAFT_RECONSTRUCTION.md](./DRAFT_RECONSTRUCTION.md)** | Clean reconstruction of the original draft (provenance) |
| **[decisions/](./decisions/)** | Decision log entries for constitutional choices |

---

## Relationship to existing product docs

| Existing document | Relationship |
|-------------------|--------------|
| `docs/product/PRODUCT_CONSTITUTION.md` | **Remains binding** for Smart Workspace / Hub product direction (v1.4). The Master Constitution incorporates and **does not silently override** it. Conflicts are listed in GAP_ANALYSIS and require Founder amendment via PDR. |
| `docs/product/ROADMAP.md` | Remains the **near-term delivery plan**. FIVE_YEAR_ROADMAP.md extends horizons; does not replace Phase 1 gates. |
| `docs/product/MEMBER_OPERATIONS*.md` | Remain the Phase 1 PRDs. |
| `docs/product/SUPPORT_AND_MESSAGES_CENTER.md` | Remains messaging PRD — **ticket model wins** over social chat ideas in the draft. |
| `docs/product/GLOSSARY.md` | Canonical product terms; Master Constitution adds platform-level terms without forking casually. |
| `docs/adr/` | Engineering ADRs remain for technical mechanics. |

### Precedence order (when documents conflict)

1. **Founder-approved PDR** that explicitly supersedes a clause  
2. **Master Constitution** (this library) for platform identity, governance, security philosophy, and 5-year scope  
3. **PRODUCT_CONSTITUTION.md** for Smart Workspace / Hub specifics  
4. **Section PRDs** for acceptance criteria of a phase  
5. **ROADMAP.md** for delivery order  
6. **Implementation / code** — must be brought into compliance; code never rewrites the Constitution by accident

---

## Classification rule (mandatory)

Every substantive statement in analysis documents must be tagged:

| Tag | Meaning |
|-----|---------|
| **Verified Fact** | Confirmed by code, migrations, tests, official docs, or cited research |
| **Assumption** | Believed useful but not verified |
| **Recommendation** | Proposed improvement with justification |
| **Long-Term Idea** | Valuable later; not for near-term implementation |

Never mix tags inside one conclusion.

---

## How to amend

1. Propose change in a PR under `docs/constitution/`.  
2. If the change affects product identity, monetization, legal posture, marketplace policy, or security philosophy → **Founder approval required**.  
3. Record the decision under `docs/constitution/decisions/`.  
4. Update related PDRs / ROADMAP when execution order changes.  
5. Bump version in MASTER_CONSTITUTION.md header.

---

## Reading order

1. This README  
2. [TECHNICAL_AUDIT.md](./TECHNICAL_AUDIT.md) — what exists today  
3. [MASTER_CONSTITUTION.md](./MASTER_CONSTITUTION.md) — what must guide the next five years  
4. [GAP_ANALYSIS.md](./GAP_ANALYSIS.md) + [FOUNDER_DECISIONS.md](./FOUNDER_DECISIONS.md)  
5. [FEATURE_DISCIPLINE.md](./FEATURE_DISCIPLINE.md) + [RISK_REGISTER.md](./RISK_REGISTER.md)  
6. [FIVE_YEAR_ROADMAP.md](./FIVE_YEAR_ROADMAP.md)
