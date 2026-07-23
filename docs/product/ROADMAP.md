# MawashiDZ product roadmap

**Last updated:** 2026-07-23  
**Authority:** [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md) (vision) + phase specs below (delivery)

Delivery order is **not** a calendar. Each item: dedicated branch(es), PR(s), green `npm test`.

---

## Roadmap tree

```text
ROADMAP
│
├── Phase 1: Member Operations          → MEMBER_OPERATIONS.md
│      ├── Registration review
│      ├── Password recovery
│      ├── Email architecture
│      └── Notifications (in-app center)
│
├── Phase 2: Support & Messages Center  → SUPPORT_AND_MESSAGES_CENTER.md
│      ├── Tickets
│      ├── Admin messages
│      ├── Wilaya manager messages
│      └── Future member-to-member messaging
│
└── Phase 3: Smart Workspace & Hub      → PRODUCT_CONSTITUTION.md
       ├── P0 — hub_cards, engagement events
       ├── P1 — mdz-hub-core, breeder-first
       └── P2–P7 — see constitution phased table
```

---

## Phase 1 — Member Operations

**Spec:** [MEMBER_OPERATIONS.md](./MEMBER_OPERATIONS.md)

| Step | Deliverable | Status (as of doc) |
|------|-------------|---------------------|
| **1.1** | Registration review — RPC, audit, dashboards | In progress (e.g. 008) |
| **1.2** | Password recovery — full Auth UX | Verify production |
| **1.3** | Email — Supabase Auth + operational provider (status events) | Not started |
| **1.4** | Notification center MVP (status/alerts; not full ticketing) | Not started |

**Gate:** Phase 1 core live before starting Phase 2 at scale.

---

## Phase 2 — Support & Messages Center

**Spec:** [SUPPORT_AND_MESSAGES_CENTER.md](./SUPPORT_AND_MESSAGES_CENTER.md)

| Step | Deliverable | Status |
|------|-------------|--------|
| **2.1** | Ticket system (model + RLS) | Not started |
| **2.2** | Admin / support channels | Not started |
| **2.3** | Wilaya manager messaging | Not started |
| **2.4** | Ticket deep links in notifications | Not started |
| **2.5** | Member-to-member (marketplace-linked) | Later |

**Gate:** Tickets + admin/wilaya messaging usable before **Smart Workspace P0**.

---

## Phase 3 — Smart Workspace & Hub

**Spec:** [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md)

| Step | Deliverable |
|------|-------------|
| **P0** | `hub_cards`, `hub_engagement_events` — `cursor/smart-profile-hub-p0-6004` |
| **P1** | `mdz-hub-core`, Card Providers, breeder-first workspace |
| **P2–P7** | Preferences, search, CMS, roles, ingest, analytics, AI |

---

## Product library & parallel work

| Item | Notes |
|------|--------|
| `docs/product/` | Official reference — **merged to main** |
| Exchange wilaya UX | `cursor/exchange-wilaya-preview-6004` — independent |
| Dashboard premium UI | Visual polish — independent |

---

## Gates before Smart Workspace P0

- [x] Product library on `main`  
- [ ] Phase **1** registration review + recovery + email + notifications foundation  
- [ ] Phase **2** ticket system + admin/wilaya messaging (minimum viable)  
- [ ] Founder approval for `cursor/smart-profile-hub-p0-6004`  

---

## Success signals

**Phase 1:** approval latency, recovery success, notification delivery.  
**Phase 2:** ticket response time, escalation quality.  
**Phase 3:** constitution operational + Hub engagement metrics.
