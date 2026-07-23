# MawashiDZ product roadmap

**Last updated:** 2026-07-23  
**Authority:** [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md) + [MEMBER_OPERATIONS_AND_COMMUNICATION.md](./MEMBER_OPERATIONS_AND_COMMUNICATION.md)

Delivery order is **not** a calendar. Each **track** uses its own branch(es) and PR(s); green `npm test`.

---

## Roadmap tree

```text
ROADMAP
│
├── Phase 1: Member Operations & Communication   → MEMBER_OPERATIONS_AND_COMMUNICATION.md
│      ├── Registration review
│      ├── Admin operations          (RPC, audit, dashboards — incl. migration 008)
│      ├── Password recovery
│      ├── Email architecture
│      ├── Notifications
│      └── Support & messages center   (separate delivery track E)
│
└── Phase 2: Smart Workspace & Hub               → PRODUCT_CONSTITUTION.md
       ├── P0 — hub_cards, engagement events
       ├── P1 — mdz-hub-core, breeder-first
       └── P2–P7 — constitution phased table
```

**Answer (Founder):** *Member Operations & Communication* is the **phase title** for multiple **sections**—Admin Operations remains a named section; Support & Messages is the **last section**, not a second top-level product phase.

---

## Phase 1 — Member Operations & Communication

**Umbrella:** [MEMBER_OPERATIONS_AND_COMMUNICATION.md](./MEMBER_OPERATIONS_AND_COMMUNICATION.md)

| Track | Section | Spec | Status (as of doc) |
|-------|---------|------|---------------------|
| **A** | Registration review + **Admin operations** | [MEMBER_OPERATIONS.md](./MEMBER_OPERATIONS.md) §1–2 | In progress (008) |
| **B** | Password recovery | §3 | Verify production |
| **C** | Email architecture | §4 | Not started |
| **D** | Notifications | §5 | Not started |
| **E** | Support & messages | [SUPPORT_AND_MESSAGES_CENTER.md](./SUPPORT_AND_MESSAGES_CENTER.md) | Not started |

**Gates:** Track **A** live before **E** at scale; **D** before ticket deep-links; **A–E** (min. viable) before Smart Workspace **P0**.

---

## Phase 2 — Smart Workspace & Hub

**Spec:** [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md)

| Step | Deliverable |
|------|-------------|
| **P0** | `hub_cards`, `hub_engagement_events` |
| **P1** | `mdz-hub-core`, breeder-first |
| **P2–P7** | See constitution |

---

## Parallel work

| Item | Notes |
|------|--------|
| Exchange wilaya UX | Independent branch |
| Dashboard premium UI | Visual polish |

---

## Gates before Smart Workspace P0

- [x] Product library on `main`  
- [ ] Phase 1 track **A** (admin operations + review) in production  
- [ ] Tracks **B–D** foundation  
- [ ] Track **E** core (tickets + admin/wilaya messaging)  
- [ ] Founder approval for `cursor/smart-profile-hub-p0-6004`  

---

## Success signals

**Phase 1:** approval latency, recovery success, notification delivery, ticket response time.  
**Phase 2 (Hub):** constitution operational + Hub engagement metrics.
