# Five-Year Roadmap (Constitutional Horizon)

**Version:** 1.0  
**Date:** 2026-07-24  
**Relationship:** Extends — does **not** replace — `docs/product/ROADMAP.md` Phase 1–2 gates.

Classification: **Must Have** · **Should Have** · **Could Have** · **Won’t (now)**

---

## Near-term law (Verified Fact)

Existing product ROADMAP order:

```text
Phase 1 — Member Operations & Communication
    ↓
Phase 2 — Smart Workspace & Hub
    ↓
Marketplace modules
    ↓
AI assistant card
```

**Recommendation:** Keep this order. Do not jump to marketplace/AI because the draft Master Constitution listed them as peer visions.

---

## MoSCoW — next 24 months

### Must Have

- Secure identity (no privilege self-grant)  
- Registration review with audit + notifications  
- Password recovery & auth email reliability  
- Support tickets (member ↔ platform / wilaya)  
- Honest labeling of reference prices  
- Canonical migration/deploy documentation  
- Breeder-first Smart Workspace shell (after Phase 1 gates)  
- Livestock **listing MVP** + purchase requests (after Founder marketplace decisions + research Wave A)

### Should Have

- Notification center server inbox  
- Vet professional profile visibility  
- Basic listing moderation for managers  
- Membership card PDF (after trust)  
- Media uploads with limits  
- Seasonal Aid listing mode (Founder-approved)

### Could Have

- Feed product listings  
- Saved searches / price alerts  
- QR member verification pages  
- Limited offline Hub cache  
- Educational cards in Hub  

### Won’t (now)

- Broker CRM / commissions  
- Payments/escrow  
- Blockchain  
- Social chat stack  
- Multi-country  
- Equipment/insurance/labs marketplaces  
- AI diagnosis  
- Microservices  

---

## Version horizons

### Version 1.x — Trust foundation

**Business value:** Members can join, get approved, recover access, contact operators.  
**Technical value:** Hardened Auth/RLS/audit.  
**Dependencies:** Founder legal basics; security fixes.  
**Complexity:** Medium.  
**Risks:** T1–T4, B3.  

Includes: Member Ops tracks A–E minimum; price honesty; migration canon.

### Version 2.x — Daily workspace

**Business value:** Members return for tasks, not only signup.  
**Technical value:** Hub engine + breeder workspace.  
**Dependencies:** Phase 1 gates; P0 schema.  
**Complexity:** Medium-High.  
**Risks:** Scope creep; rank leakage.  

### Version 3.x — Commerce MVP

**Business value:** Listing → request → negotiation → documented outcome.  
**Technical value:** Commerce schema + moderation.  
**Dependencies:** Founder marketplace policy; research Wave A/B.  
**Complexity:** High.  
**Risks:** Cold start; fake listings; disputes.  

### Version 4.x — Health & traceability

**Business value:** Vet-linked trust signals.  
**Technical value:** Cases, vaccinations, certificates, QR verify.  
**Dependencies:** Legal disclaimers; vet supply.  
**Complexity:** High.  
**Risks:** Liability; incomplete records.  

### Version 5.x — Platform maturity

**Business value:** Selective verticals; optional professional tools; stronger analytics.  
**Technical value:** Modular providers; measured scaling.  
**Dependencies:** Proven v3–v4 usage.  
**Complexity:** High.  
**Risks:** Over-expansion; monetization trust conflicts.  

**Long-Term Ideas only when data justifies:** transport, insurance, financing cards, AI assistant, partner APIs, limited offline write sync.

---

## Dependencies diagram

```text
Security hotfix (privilege)
        ↓
Member Ops + Audit
        ↓
Smart Workspace P0/P1 (breeder)
        ↓
Founder marketplace decisions + Field research
        ↓
Listings + purchase requests
        ↓
Moderation + disputes
        ↓
Vet health records / QR
        ↓
Selective new verticals / AI assist
```

---

## Success metrics (operational)

Prefer constitution metrics over vanity:

| Metric | Horizon |
|--------|---------|
| Median time to registration decision | v1 |
| Recovery success rate | v1 |
| Ticket first response time | v1 |
| Weekly returning approved members | v2 |
| Listings published / wilaya | v3 |
| Purchase requests → answered | v3 |
| Documented completed deals (even if offline payment) | v3 |
| Verified vet-authored records count | v4 |

---

## Confidence

Roadmap sequencing confidence: **High** (aligns with existing Founder-approved docs).  
Feature timing beyond v3: **Low** without research + monetization decisions.
