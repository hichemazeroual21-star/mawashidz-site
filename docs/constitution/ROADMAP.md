# MawashiDZ Strategic Roadmap

**Version:** 1.0 (Canonical)  
**Status:** FROZEN with Constitution v3.0  
**Authority:** Execution order for strategy — subordinate to [MAWASHIDZ_CONSTITUTION.md](./MAWASHIDZ_CONSTITUTION.md)  
**Supersedes:** `IMPLEMENTATION_ROADMAP.md`, conflicting notes that placed Hub before Livestock Identity  

In-flight engineering tracks in [../product/ROADMAP.md](../product/ROADMAP.md) remain valid for **Phase 1 Member Ops** detail. Where sequencing conflicts, **this document wins**.

---

## Sequence

```text
Phase 0  Foundation hardening
Phase 1  Member operations (email, notifications, tickets)
Phase 2  Livestock Identity MVP + QR + media
Phase 3  Marketplace MVP + moderation
Phase 4  Workspace / Hub polish on real objects
Phase 5  Professional depth (thin vet, broker depth if research)
Phase 6  Mobile PWA / offline read
Phase 7  Intelligence (only with data + AI policy)
```

---

## Phase 0 — Foundation hardening

**Goal:** Fresh installs and privileged ops are trustworthy.

| ID | Work | Type |
|----|------|------|
| 0.1 | Canonical `setup.sql` + single migration path | Must — **in PR (setup v1.10 + 008/009)** |
| 0.2 | `user_roles` created in repo schema | Must — **done in setup + 008** |
| 0.3 | `registrations.status` in setup | Must — **done in setup + 009** |
| 0.4 | Audit log (migration 008) on main | Must — **in PR** |
| 0.5 | CI: `npm test` on PR | Must — **`test:ci` workflow** |
| 0.6 | Rate-limit / harden public INSERTs | Must — **policy checks + phone guard; edge WAF still TD-012** |
| 0.7 | Expand `docs/database-schema.md` | Should — **done** |
| 0.8 | Backup restore note + incident stub runbook | Should — **done** |

### Exit criteria

- [ ] New Supabase project installable from docs alone  
- [ ] CI green on PR  
- [ ] Privileged mutations audited  
- [ ] Public insert abuse mitigated  

**Founder wait:** None for pure engineering.

---

## Phase 1 — Member operations

**Goal:** Operators can run membership; members get outcomes and support.

| ID | Work | Type |
|----|------|------|
| 1.A | Registration review + admin ops + audit UI | Must |
| 1.B | Password recovery verified in production | Must |
| 1.C | Operational email provider | Must |
| 1.D | Notification center (server inbox) | Must |
| 1.E | Tickets + wilaya/admin messaging | Must |
| 1.F | Rejection reasons visible to members | Must |
| 1.G | Request-more-info workflow | Should |

### Exit criteria

- [ ] Approve/reject/suspend with audit trail  
- [ ] Member sees registration outcome  
- [ ] Tickets work with wilaya fence  
- [ ] Core events notify recipients  

**Do not start Phase 2 until Phase 1 Must exit criteria pass** (protects Auth stability).

---

## Phase 2 — Livestock Identity

**Goal:** Animals are first-class; QR verifies online.

| ID | Work | Type |
|----|------|------|
| 2.1 | `animals`, `ownership_events` (+ optional `herds`) | Must |
| 2.2 | Breeder animal CRUD | Must |
| 2.3 | Ownership register/transfer/death RPCs | Must |
| 2.4 | Storage + photo upload pipeline | Must |
| 2.5 | Opaque IDs + QR + verification page | Must |
| 2.6 | Membership card PDF (single type) | Should |
| 2.7 | Thin health event stub | Could |

### Exit criteria

- [ ] Breeder registers animal with photo  
- [ ] Ownership history append-only  
- [ ] QR opens verification page with correct ACL fields  
- [ ] Media limits enforced  

**Founder wait:** FD-02 (listing↔animal), FD-06 (retention) before public promises; schema work may start with reversible defaults.

---

## Phase 3 — Marketplace MVP

**Goal:** Trusted listings and requests — not a payment platform.

**Gates:** Phase 2 exit + FD-01/02/03/08 decided + minimum field research notes on buyer trust / seller listing habits.

| ID | Work | Type |
|----|------|------|
| 3.1 | Listing state machine + animal link for verified | Must |
| 3.2 | Wilaya/admin moderation | Must |
| 3.3 | Purchase requests + listing threads | Must |
| 3.4 | Reports / hide | Must |
| 3.5 | Favorites | Should |
| 3.6 | Deal-confirmed record (no money movement) | Could |

### Exit criteria

- [ ] Verified listing requires animal  
- [ ] Buyer can request; seller can respond  
- [ ] Manager can hide/flag  
- [ ] Sale can write ownership transfer event  

---

## Phase 4 — Workspace / Hub polish

**Goal:** Operational shell around real objects — not empty card framework.

| ID | Work | Type |
|----|------|------|
| 4.1 | Workspace shell + Quick Actions for breeder/broker/buyer | Must |
| 4.2 | Hub cards that project animals/listings/requests (+ optional weather) | Should |
| 4.3 | Preferences jsonb | Should |
| 4.4 | Scoped search | Could |

### Exit criteria

- [ ] Role opens workspace and sees own animals/listings/requests first  
- [ ] No Auth/admin regressions  
- [ ] Empty states guide next action  

---

## Phase 5 — Professional depth

| ID | Work | Gate |
|----|------|------|
| 5.1 | Thin vet workspace + consented notes | Phase 2 + FD-07 |
| 5.2 | Broker depth (clients/commissions) | Field research |
| 5.3 | Feed catalog | Explicitly deferred (NON-GOAL Y1–2) |

---

## Phase 6 — Mobile & offline read

| ID | Work | Gate |
|----|------|------|
| 6.1 | PWA | Usage metrics after Phase 3 |
| 6.2 | Offline read cache | After conflict-free read model |
| 6.3 | Offline write sync | Deferred (Long-Term) |

---

## Phase 7 — Intelligence

Only with event volume + Founder AI policy. Medical AI forbidden until governance.

---

## Deferred features (documented reasons)

| Feature | Reason |
|---------|--------|
| Feed/equipment/transport marketplaces | Dilutes identity+commerce; NON-GOAL Y1–2 |
| Voice/video/E2E chat | Ops/moderation/bandwidth |
| Escrow / payment rails | Legal + FD-03 |
| Hub before animals | Framework without substance |
| Broker as breeder clone | Market-dishonest |
| AI pricing / medical | Liability + no data |
| Microservices / blockchain | Premature complexity |
| Full 58-manager staffing | Ops fiction Year 1 |
| International expansion | Algeria-first |

---

## Parallel safe work

Field research · legal drafting · brand · public exchange/news UX (no Auth/RLS mix) · runbooks

---

## Document history

| Version | Date | Summary |
|---------|------|---------|
| 1.0 | 2026-07-24 | Canonical roadmap — Animals before Hub; Phase exit criteria |
