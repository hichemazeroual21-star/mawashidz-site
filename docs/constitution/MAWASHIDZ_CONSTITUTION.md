# MawashiDZ Master Constitution

**Version:** 3.1
**Status:** FROZEN — strategic architecture phase complete  
**Effective:** 2026-07-24  
**Founder amendment:** 2026-08-02 — quick + professional marketplace paths
**Owner:** Founder  
**Supersedes:** Constitution v2.0 drafts, fragmented chat drafts, conflicting roadmap notes  

**Product thesis (non-negotiable):**

> MawashiDZ is the trusted digital identity and commerce platform for livestock in Algeria.

Every Years 1–2 decision must serve that sentence. If it does not, postpone or delete it.

**Related (subordinate):**
- [ROADMAP.md](./ROADMAP.md) — when to build  
- [FOUNDER_DECISIONS.md](./FOUNDER_DECISIONS.md) — irreversible choices  
- [ARCHITECTURAL_PRINCIPLES.md](./ARCHITECTURAL_PRINCIPLES.md) — engineering invariants  
- [DECISION_LOG.md](./DECISION_LOG.md) — settled why  
- [../product/PRODUCT_CONSTITUTION.md](../product/PRODUCT_CONSTITUTION.md) — Smart Workspace / Hub mechanics only  

**Freeze rule:** Do not reopen strategy unless justified by verified field research, legal requirements, production experience, or a major architectural discovery. Record amendments via Decision Log + Founder approval.

---

## 1. Mission & Scope

### 1.1 Mission

Build the most trusted, secure, scalable, and usable digital livestock identity and commerce platform in Algeria.

### 1.2 Years 1–2 scope (in)

- Member identity, verification, and operator governance  
- Livestock identity (animals, ownership events)  
- QR verification for members and animals  
- Marketplace listings and purchase requests with moderation: quick selling by default, optional professional evidence from day one
- Support tickets and essential notifications  
- Breeder / broker / buyer / thin vet workspaces as needed for the above  

### 1.3 Years 1–2 scope (out) — NON-GOALS

Explicitly **not** goals for Years 1–2:

- Feed, equipment, transport, insurance, or auction marketplaces  
- Voice / video messaging, group chat, E2E encryption  
- Escrow or full payment rails  
- AI assistants, medical AI, or price-AI products  
- Blockchain / cryptocurrency  
- Microservices or multi-region active-active  
- International expansion  
- Government API integration (unless legally mandated)  
- Daily farm ERP completeness (breeding OS, full herd analytics) before identity+commerce works  
- Staffing all 58 wilaya managers on day one  

### 1.4 Horizon (Years 3–5) — not commitments

Architecture must not prevent later: deeper vet tools, feed vertical, mobile apps, offline write sync, payments partners, partner APIs, optional regional expansion — **only after** identity+commerce trust is proven in Algeria.

### 1.5 Design gates

Before any feature:

1. Does it strengthen **trusted livestock identity** or **trusted commerce** in Algeria in Years 1–2?  
2. Which role responsibility does it serve?  
3. Can a simpler design achieve the same outcome?  

If unanswered → do not build.

---

## 2. Core Principles

1. Technology serves people.  
2. Trust before growth and before monetization.  
3. Security before convenience — **server-side RLS + RPC are the source of truth**.  
4. Research before assumptions about Algerian users.  
5. Identity-capable architecture before marketplace launch; basic listings remain easy, while stronger evidence requires explicit animal/role verification.
6. Animals (and ownership truth) before Hub chrome.  
7. Tickets before open member chat.  
8. Quality and maintainability before feature count.  
9. Complexity must justify itself for five years.  
10. Reality over opinions — including this Constitution when evidence contradicts it (via formal amendment only).

---

## 3. Platform Roles & Governance

### 3.1 Rank model

| Rank | Roles | Scope |
|------|-------|-------|
| **R4** | `founder`, `super_admin` | Break-glass + full platform authority |
| **R3** | `admin` | National operations per assigned permissions |
| **R2** | `wilaya_manager` (aliases `manager`, `wilaya_mgr` until normalized) | **One wilaya only** |
| **R1** | `breeder`, `broker`, `buyer`, `vet`, `feed` | Own data; commercial/professional surfaces |

**Two systems (do not conflate):**
- **Membership type** → `profiles.role` (who they are commercially)  
- **Operational elevation** → `user_roles` (admin/manager powers)

### 3.2 Founder vs super_admin

- **Founder:** ownership, policy, break-glass, irreversible product decisions.  
- **super_admin:** technical emergency access; same rank, not a second “CEO.”  
- No separate `ceo` database role.  
- Maintain a **break-glass procedure**: secondary Founder-controlled recovery path, documented offline, tested periodically.

### 3.3 Wilaya managers

- May review registrations, moderate local listings/reports, support local users, view wilaya stats.  
- Must never see other wilayas, change global policy, grant themselves roles, delete audit logs, or permanently delete users.  
- **Year-1 staffing reality:** not all 58 wilayas need managers. Unassigned wilayas escalate to R3/R4.

### 3.4 Membership types (R1)

| Type | Purpose Years 1–2 |
|------|-------------------|
| **Breeder** | Own animals, list owned animals, respond to requests |
| **Broker** | Distinct type — commercial seller/dealer; multi-listings; **not** farm-management clone |
| **Buyer** | Discover, save, request, verify |
| **Veterinarian** | Thin: verified profile + consented health notes on animals |
| **Feed** | Registration reserved; **no catalog product in Years 1–2** |

Broker depth (commissions, CRM) waits for field research. Shared infrastructure: listings, media, messaging hooks — not breeder herd tools.

### 3.5 Least privilege

Permissions are assigned individually. Frontend hiding is UX, not security.

### 3.6 Privacy ranks

No upward leakage. Wilaya fence. Vets never modify ownership or commercial fields. Search and notifications obey the same RLS as APIs.

---

## 4. Trust, Fraud & Verification

Trust is the product. Without it, MawashiDZ is classifieds with livestock photos.

### 4.1 Trust signals (product)

- Verified membership status  
- Animal registration linked to listings (verified path)  
- QR verification pages with clear “what is verified”  
- Wilaya/admin moderation and report handling  
- Visible seller response behavior over time (later metrics)

### 4.2 Fraud surfaces (must design against)

- Fake accounts and stolen phones/emails  
- Fake veterinarians  
- Fake or recycled animal photos; QR/photo swap  
- Speculative spam listings  
- Manager favoritism / insider abuse  
- Scam negotiation outside moderated channels  

### 4.3 Controls (Years 1–2)

- Manual registration review (hybrid)  
- Listing moderation queue  
- User reports → wilaya/admin  
- Rate limits on public inserts and verification endpoints  
- Audit log for all privileged mutations  
- No “verified vet” badge without human review  

### 4.4 Listing ↔ animal rule (Founder Decision FD-02)

**Founder decision (2026-08-02): one marketplace, two creation depths.**

**Quick listing — default in Year 1**

- One primary action: **Add livestock**.
- Minimum fields: photos, species, head count, asking price (fixed or negotiable), wilaya/commune and short description.
- Phone-confirmed members may publish after the applicable safety/moderation checks.
- No professional profile, animal QR or prior animal registration is required for this basic path.

**Professional evidence — optional from day one**

- The same form exposes an optional professional step for animal/lot linkage, ownership evidence, veterinary evidence, weight and traceability.
- The same listing upgrades in place; no duplicate listing and no repeated data entry.
- Labels are evidence-specific: e.g. “identity checked,” “professional role checked,” “animal-linked,” or “veterinary evidence attached.” Never use a generic guarantee.

**Sale completion**

- The flow supports request/contact, negotiation, reservation and **Mark as sold**.
- When a listing is animal-linked, a confirmed sale may create the ownership-transfer event.
- Money movement, escrow and platform guarantees remain NON-GOALS for Years 1–2.

---

## 5. Livestock Identity & Lifecycle

### 5.1 Core entities

- **Animal** — species, identifiers, photos, status, wilaya, owner  
- **Herd** (optional grouping) — not required for MVP  
- **Ownership event** — append-only ledger (register, transfer, sale, death/cull)  
- **Health event** (later thin) — vaccination/treatment; vet-authored when applicable  

### 5.2 Lifecycle (minimum)

```text
Register animal → Own → (optional health notes) → List → Request → Sale/transfer event
                                                      ↘ Archive / death event
```

Breeding OS, weight graphs, feed consumption: **postpone** until identity+commerce habit exists.

### 5.3 Ownership truth

Ownership changes only via RPC that writes an ownership event. No silent UI edits of owner. History is immutable.

---

## 6. QR Trust Model

QR is an **identity pointer**, not a marketing sticker.

### 6.1 Design

1. QR encodes an **opaque public ID** (member or animal) — not sensitive PII.  
2. Online verification hits a **rate-limited API** returning only fields the viewer may see.  
3. Server remains source of truth.  
4. Offline: show last cached verification with explicit **stale** label — never invent freshness.  
5. Printed certificates (later): short-lived signed verification receipts.  

### 6.2 Threats

Forgery, photocopy replay, swapping QR on photos, scraping IDs, social engineering of verification pages.

### 6.3 Non-goals for QR

Blockchain passports, offline cryptographic animal DNA claims, QR for every document type on day one.

---

## 7. Marketplace

### 7.1 MVP

- Listing lifecycle: draft → review → active → sold/archived  
- Linked to animal for verified status  
- Purchase requests + listing-linked threads (after tickets foundation)  
- Moderation, hide, report  
- Favorites (should-have)

### 7.2 Payments philosophy (Years 1–2)

**Cash / offline settlement by default.** Platform may later record “deal confirmed” — not move money. Escrow and payment partners require Founder + legal approval and real volume.

### 7.3 Pricing & browsing

Public browse of active listings without login is preferred for adoption; messaging/requests require authenticated verified-capable accounts (Founder Decision FD-08).

---

## 8. Communication

### 8.1 Order

1. Support & Messages Center (tickets, wilaya-scoped, audited)  
2. Listing-linked threads  
3. Optional general DM between verified users (later)  

### 8.2 Notifications

Server-backed inbox for: registration outcomes, ticket updates, listing/request events, security alerts, wilaya announcements (scoped). User preferences later. Push/SMS/WhatsApp: not Years 1–2.

### 8.3 Rejected near-term

Voice, video, location sharing as core chat, E2E encryption (blocks moderation and disputes).

---

## 9. Smart Workspaces & Hub

### 9.1 Terminology

**Smart Workspace** = operational home. Avoid “Dashboard” in new copy/code names (PDR-001).

### 9.2 Sequencing

**Livestock Identity MVP before Hub framework investment.**  
Hub cards project real objects (animals, listings, requests). Do not build a card engine to display empty weather as the flagship.

### 9.3 Role surfaces (Years 1–2)

| Role | Surface |
|------|---------|
| Breeder | Animals, listings, requests, tickets, notifications |
| Broker | Listings, requests, thin seller tools |
| Buyer | Search/browse, saves, requests, verification |
| Vet | Profile, verification, consented notes |
| Manager | Queues, moderation, wilaya stats |
| Founder/Admin | National ops, audit, roles, config |

Buyer/broker surfaces stay simpler than breeder. Do not clone five pillars for every role.

### 9.4 Hub mechanics

When built: Card Provider pattern, no Card→SQL, top-4 lazy load, offline cache with last-updated — see product constitution. Event bus only when domain events exist.

---

## 10. Data Classification & Privacy

| Class | Examples | Policy |
|-------|----------|--------|
| **Immutable ledger** | Ownership events, approval history, role/permission changes, audit logs, health events once written | Append-only; no hard delete |
| **Soft-delete operational** | Listings, tickets, messages, notifications | Soft-delete + retention window |
| **Media** | Animal photos, documents | Lifecycle: active → cold → delete per policy |
| **Profile PII** | Name, phone, email | Soft-delete / anonymize on lawful erasure where required; legal review owns final rules |

Absolute “never delete anything” is **rejected**. Ledgers are forever; clutter is not.

Retention periods: Founder Decision FD-06 + counsel.

---

## 11. Media & Storage

- Supabase Storage (or equivalent) with bucket RLS  
- Image compression, size limits, MIME allowlists  
- No executable uploads  
- Lifecycle rules from day one (cost control at scale)  
- Watermark policy: Founder brand decision; optional for public listing images later  

---

## 12. Security

- Assume abuse by users and insiders  
- RLS + SECURITY DEFINER RPCs for mutations of status, roles, ownership, moderation  
- Harden public INSERTs (rate limit, validation RPC)  
- Session: Supabase Auth; document expiry expectations  
- Secrets never in git; publishable anon key is expected — RLS must hold  
- Threat model living notes: QR, listings, fake vets, privilege escalation  

---

## 13. Reliability: Backup, DR, Incidents

- **Backup:** Rely on platform automated backups (Supabase) + documented restore drill quarterly  
- **DR:** Document RTO/RPO targets when traffic justifies; Year 1 = restore-from-backup + status communication  
- **Incidents:** Severity levels, Founder/admin notification, postmortem template  
- **Deploy:** Existing Cloudflare Worker path; CI must gate merges (`npm test`)  

---

## 14. API & Modular Evolution

- Prefer versioned RPCs / explicit contracts over ad-hoc REST sprawl  
- Breaking changes require version bump or additive fields  
- Mobile clients later consume same contracts  
- Frontend: extract modules from monolith incrementally — **no big-bang SPA rewrite** as a project  
- Stay on Supabase + edge until measured pain demands change  

---

## 15. Performance & Scale Assumptions

- Indexed queries, pagination, lazy media  
- Hub top-4 when Hub exists  
- Design animal/ownership tables for **millions of rows** (indexes, append-only events) from day one — without premature sharding  
- Revisit read replicas / CDN when metrics show need  

---

## 16. Success Metrics (real KPIs)

Vanity (raw page time) is not primary.

| KPI | Why |
|-----|-----|
| Approved members who register ≥1 animal | Identity adoption |
| Verified listings published | Commerce supply |
| Median time to first operator response | Trust ops |
| Purchase requests answered | Liquidity |
| Completed sale/transfer events | End-to-end value |
| Report resolution time | Safety |
| Weekly active breeders/brokers with animals | Habit |
| Verification page abuse rate | QR security |

---

## 17. Competition & Positioning

Position MawashiDZ as **identity + trusted private commerce**, not as a seasonal import portal and not as generic classifieds.

Do not copy competitor feature lists. Win on verifiable animals, moderated trade, and operator seriousness.

---

## 18. Seasonal Operations (Eid)

Sheep trade spikes around Eid al-Adha. Before first Eid on platform: capacity checklist (registration backlog, listing moderation, support tickets, rate limits, status page). Treat as annual operational event, not a surprise.

---

## 19. AI Policy

- No AI that affects medical, pricing, or trust decisions without Founder AI policy + explainability.  
- Medical AI: forbidden until professional/legal governance exists.  
- Architecture may reserve a future assistant card slot — **do not implement** in Years 1–2.

---

## 20. Documentation & Developer Experience

Canonical tree:

```text
docs/constitution/     ← frozen strategy (this library)
docs/product/          ← PRDs, PDRs, Hub detail
docs/adr/              ← engineering ADRs
docs/runbooks/         ← deploy, incident, restore (create as ops mature)
```

New engineers read: Constitution → Architectural Principles → Roadmap → database-schema → registration/auth handoff docs.

Every major engineering choice that is not in the Constitution gets an ADR or Decision Log entry.

---

## 21. Constitutional Evolution

| Change type | Process |
|-------------|---------|
| Typo / clarity | PR, no Founder block |
| Strategy / roles / trust model | Founder approval + Decision Log |
| Emergency security fix | Ship fix, document amendment within 72h |

Archive historical reviews under `docs/constitution/archive/` — they do not override this file.

---

## 22. Field Research Dependencies

Strategy may proceed; these items **must not be invented**:

- Dealer (*maquignon*) digital willingness and workflows  
- Buyer trust checklist in real markets  
- On-farm identification practices  
- Vet credential norms  
- Payment habits beyond cash assumption  
- Whether breeders register animals before selling  
- Per-wilaya connectivity and device reality  

Until researched, prefer reversible product choices and labeled assumptions in FOUNDER_DECISIONS / research notes.

---

## Version history

| Version | Date | Summary |
|---------|------|---------|
| **3.1** | 2026-08-02 | Founder amendment D-018 / FD-02: quick Year-1 livestock selling plus optional upgradeable professional evidence from day one |
| **3.0** | 2026-07-24 | Frozen strategic constitution — identity+commerce thesis, NON-GOALS, trust/QR/data class, animals-before-Hub, distinct brokers |
| 2.0 | 2026-07-24 | Reconstructed draft from chat fragments |
| 1.x | 2026-07-23 | Product Constitution (Hub) remains subordinate detail |
