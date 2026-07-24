# MawashiDZ Constitution Library

**Last updated:** 2026-07-24

This folder holds the **master strategic constitution** and supporting governance documents for MawashiDZ.

## Document hierarchy

| Document | Role | Authority |
|----------|------|-----------|
| **[MAWASHIDZ_CONSTITUTION.md](./MAWASHIDZ_CONSTITUTION.md)** | Master strategic constitution (vision, governance, roles, platform systems, engineering principles) | **Highest authority** for platform direction |
| **[CONSTITUTION_GAP_ANALYSIS.md](./CONSTITUTION_GAP_ANALYSIS.md)** | Gap analysis, risk register, field research needs, implementation reality check | Advisory — reviewed before major releases |
| **[../product/PRODUCT_CONSTITUTION.md](../product/PRODUCT_CONSTITUTION.md)** | Smart Workspace & Hub implementation detail (v1.4) | Subordinate to master constitution; wins on Hub/workspace mechanics until superseded by PDR |
| **[../product/ROADMAP.md](../product/ROADMAP.md)** | Delivery plan and phase gates | Execution order only — not requirements |

**Rule:** Implementation follows the Constitution. Never the opposite.

When documents conflict:
1. **MAWASHIDZ_CONSTITUTION.md** wins on vision, governance, and platform identity.
2. **PRODUCT_CONSTITUTION.md** wins on Smart Workspace / Hub technical patterns until a PDR supersedes.
3. **ROADMAP.md** defines *when*, not *what*.

## Governance

- Constitution changes require **Founder approval** via reviewed PR.
- Gap analysis should be updated after major architecture or product shifts.
- Every conclusion in gap analysis must be labeled: **Verified Fact**, **Assumption**, **Recommendation**, or **Long-Term Idea**.
