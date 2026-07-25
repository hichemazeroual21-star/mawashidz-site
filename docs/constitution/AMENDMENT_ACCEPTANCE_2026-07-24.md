# Constitution Amendment Acceptance — 2026-07-24

**Decision on review package:** **ACCEPT WITH AMENDMENTS**  
**Branch:** `cursor/constitution-authority-amendments-4b6e`  
**Scope:** Documentation / ADR / governance only — no RLS behavior change in this PR  

## Proposals disposition

| ID | Proposal | Disposition | Artifact |
|----|----------|-------------|----------|
| A1 | Unify document hierarchy | **Amended** | `docs/product/PRODUCT_CONSTITUTION.md` v1.5 authority + sequencing |
| A2 | Fix review-board governance contradictions | **Amended** | `docs/constitution/INDEPENDENT_REVIEW_BOARD.md` |
| A3 | FD-01 / FD-02 before Phase 3 | **Clarified; Founder action still required** | `FOUNDER_DECISIONS.md`, `DECISION_LOG.md` D-005 note |
| A4 | Membership vs operational elevation | **ADR Proposed; no code change** | `docs/adr/003-membership-vs-elevation.md` |
| A5 | Feed registration-only vs feed workspace | **Amended in Product Constitution + public claims + site copy** | Product Constitution feed note; `PUBLIC_CLAIMS_POLICY.md`; i18n/site labels |
| A6 | Canonical migration path | **ADR Accepted** | `docs/adr/002-canonical-migration-path.md`; TD-001 Mitigated |
| A7 | Public claims ↔ phase gates | **Amended** | `docs/constitution/PUBLIC_CLAIMS_POLICY.md` |
| A8 | Break-glass operational policy | **Template added; Founder drill still required** | `docs/runbooks/break-glass.md` |

## Explicitly not done here

- Marking FD-01/FD-02 **Decided** (Founder only)  
- Changing `mdz_is_wilaya_manager` RLS bridge (waits ADR-003 Founder choice)  
- Field research artifacts  
- Live smoke for Phase 1/2  
- Opening Hub P0 or Phase 2 implementation  

## Residual risks after this PR

- FD-01/02 still Proposed → Phase 3 still gated  
- Break-glass Not Verified until quarterly drill  
- TD-001 not Closed until blank-install Verified  
- Site may still contain aspirational imagery; copy now required to use Coming/Demo labels per policy  
