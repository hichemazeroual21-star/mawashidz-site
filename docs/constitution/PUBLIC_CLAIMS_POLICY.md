# Public Claims Policy

**Status:** Binding engineering + marketing governance  
**Authority:** Constitution v3.0 trust thesis; Decision Log D-017  
**Goal:** Prevent public trust claims from outrunning shipped phases  

## Rule

Any **public** surface (marketing site, store screenshots, press, App Store text) that describes a capability must match one of:

| Label | Meaning | Allowed when |
|-------|---------|--------------|
| **Available** | Users can complete the flow in production today | Phase exit criteria Verified with live smoke where required |
| **In review / founding** | Membership or ops path exists; outcomes pending human review | Phase 1 registration/review live |
| **Coming** | Explicitly future; not actionable today | Roadmap phase not started or not Verified |
| **Demo / illustrative** | Mock UI; not a live system of record | Clearly marked in UI copy |

## Phase gates (Years 1–2)

| Claim topic | Earliest honest label |
|-------------|----------------------|
| Membership registration + review outcomes | Available after Phase 1 Must exits Verified |
| Support tickets | Available after Phase 1 ticket path Verified |
| Animal passport / ownership ledger | Coming until Phase 2 Verified |
| QR verification API | Coming until Phase 2 Verified |
| Marketplace listing tied to animal | Coming until Phase 3 + FD-02 Decided |
| Feed product catalog / delivery storefront | **NON-GOAL** Years 1–2 — registration-only; do not claim Available |
| Open member↔member chat | **NON-GOAL** Years 1–2 |
| Medical AI | **NON-GOAL** until governance (FD-12) |

## Site sections today

Passport / QR / animal-life blocks on `index.html` must read as **Coming / Demo**, not as a live verification service, until Phase 2 ships.

Feed seller registration may be offered; copy must not promise a live national feed catalog.

## Enforcement

- PR checklist: if marketing copy changes, reviewers apply this table.  
- Violations are Medium trust defects; Critical if they imply safety/verification that does not exist.
