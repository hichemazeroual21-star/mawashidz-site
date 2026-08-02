# Founder Decisions

**Status:** Binding once marked **Decided**  
**Constitution:** v3.0 frozen  
**Rule:** Engineering may proceed on foundation (Phase 0) without these. Marketplace, broker UX depth, public trust claims, and certificates wait for relevant decisions.

Legend: `Proposed` · `Decided` · `Deferred`

---

## Decision register

| ID | Decision | Options | CTO recommendation | Status | Blocks |
|----|----------|---------|-------------------|--------|--------|
| **FD-01** | Broker membership | A) Extend breeder B) Distinct type thin C) Ignore brokers | **B** | Proposed | Broker registration UX, schema enum |
| **FD-02** | Listing ↔ animal | A) Animal required for every listing B) Optional link without levels C) Hybrid: quick listing + upgradeable professional evidence | **C** | **Decided — Founder, 2026-08-02** | — |
| **FD-03** | Year-1 payments | A) Cash/offline only B) Escrow C) Mobile money | **A** | Proposed | Any money movement |
| **FD-04** | Business model Y1–2 | A) Free core B) Freemium tools C) Ads D) Take rate | **A then B later; no ads Y1–2** | Proposed | Monetization code |
| **FD-05** | Geography focus | A) Algeria-only 5y B) MENA prep now | **A** | Proposed | i18n/legal sprawl |
| **FD-06** | Retention vs erasure | Counsel + classification matrix | Ledgers immutable; PII soft-delete/anonymize per law | Proposed | Privacy policy, purge jobs |
| **FD-07** | Vet verification | A) Human review only B) Auto C) Ministry API | **A** until regulation clear | Proposed | Verified vet badge |
| **FD-08** | Anonymous browse | A) Public browse B) Login wall | **A**; act requires auth | Proposed | Listing RLS read policies |
| **FD-09** | Hub vs Animals order | A) Hub first B) Animals first | **B** (settled in Constitution v3) | **Decided** (strategy) | — |
| **FD-10** | Wilaya staffing Y1 | A) All 58 B) Priority wilayas + escalate | **B** | Proposed | Ops hiring, escalation UX |
| **FD-11** | Positioning | Identity+trust vs seasonal portals vs classifieds | **Identity + trusted commerce** | **Decided** (strategy) | Marketing copy |
| **FD-12** | Medical AI | A) Forbidden until governance B) Allow | **A** | **Decided** (strategy) | AI features |

---

## How to decide

1. Founder marks Status = `Decided` and records date + choice in [DECISION_LOG.md](./DECISION_LOG.md).  
2. Engineering implements only `Decided` irreversible options.  
3. Changing a `Decided` item requires Constitution amendment process.

---

## Open vs settled

**Settled in Constitution v3 (no further debate without amendment):**
- Animals before Hub (FD-09)  
- Identity + commerce thesis (FD-11)  
- Medical AI forbidden until governance (FD-12)  
- Tickets before open chat  
- NON-GOALS list for Years 1–2  
- Distinct broker *direction* recommended; **FD-01 still needs Founder checkmark**

**Still need Founder checkmark before marketplace public launch:** FD-01, FD-03, FD-04, FD-05, FD-06, FD-07, FD-08, FD-10.

### FD-02 binding interpretation

- Year 1 includes an easy livestock selling path: add photos, livestock type/count, asking price (fixed or negotiable), location and a short description.
- Publishing the basic listing does **not** require a professional profile or a pre-registered animal.
- A professional path exists from day one as optional enrichment: animal/lot linkage, ownership evidence, veterinary evidence, weight and traceability fields.
- One listing upgrades in place from basic to professional; sellers never re-enter the same listing.
- Evidence labels describe exactly what was checked. A basic listing is not labeled “untrusted,” and professional evidence is never implied when absent.
- “Sold” records the commercial outcome; MawashiDZ does not move money or provide escrow in Years 1–2.

**Do not treat Proposed items as Decided.** Decision Log entries (e.g. D-005 broker direction) record *engineering recommendation / direction*, not Founder ratification. Schema and public trust claims wait for Status = **Decided**.

**Authorization model (open):** Constitution §3.1 vs current `mdz_is_wilaya_manager` bridge — see [ADR-003](../adr/003-membership-vs-elevation.md) (Proposed).
