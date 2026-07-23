# MawashiDZ product roadmap

**Type:** Implementation & delivery plan — **not** product requirements.  
**Requirements:** [MEMBER_OPERATIONS_AND_COMMUNICATION.md](./MEMBER_OPERATIONS_AND_COMMUNICATION.md) and section PRDs.  
**Vision (Hub+):** [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md)

**Last updated:** 2026-07-23

Each **track** = own branch(es), PR(s), `npm test` green. No mixing unrelated Auth/RLS changes unless approved migration says so.

---

## Long-term sequence (product)

```text
Phase 1 — Member Operations & Communication
    ↓
Phase 2 — Smart Workspace & Hub
    ↓
Marketplace (modules + workspace cards)
    ↓
AI assistant (Hub Card Provider)
```

Detail for Phase 1 sections lives in PRDs; **order below is engineering delivery**.

---

## Phase 1 — Member Operations & Communication (execution)

**PRD umbrella:** [MEMBER_OPERATIONS_AND_COMMUNICATION.md](./MEMBER_OPERATIONS_AND_COMMUNICATION.md)

| Track | Deliverable | PRD | Engineering notes | Status |
|-------|-------------|-----|-------------------|--------|
| **A** | Registration review + **Admin operations** | [MEMBER_OPERATIONS.md](./MEMBER_OPERATIONS.md) §1–2 | RPC `admin_set_profile_status`, audit log, dashboards; migration **008** | In progress |
| **B** | Password recovery | §3 | Supabase Auth templates + UX | Verify prod |
| **C** | Email architecture | §4 | Supabase Auth + Resend/Brevo operational | Not started |
| **D** | Notification center | §5 | Server-backed inbox, event hooks from A | Not started |
| **E.1** | Ticket model + RLS | [SUPPORT_AND_MESSAGES_CENTER.md](./SUPPORT_AND_MESSAGES_CENTER.md) | Schema, policies | Not started |
| **E.2** | Admin / support messages |同上 | Typed requests, queues | Not started |
| **E.3** | Wilaya manager messages |同上 | Wilaya fence | Not started |
| **E.4** | Notification ↔ ticket deep links | §5 + Support | After D + E.1 | Not started |
| **E.5** | Audit + internal notes | Support §4 | Staff-only notes API | Not started |
| **E.6** | Member-to-member (linked) | Support §1C | After marketplace hooks | Later |

**Gates:** **A** production before **E** at scale; **D** before **E.4**; **A–E** (min. viable) before Hub **P0**.

---

## Phase 2 — Smart Workspace & Hub

| Step | Deliverable | Doc |
|------|-------------|-----|
| **P0** | `hub_cards`, `hub_engagement_events` | Constitution |
| **P1** | `mdz-hub-core`, breeder-first | Constitution |
| **P2–P7** | Preferences, search, CMS, ingest, analytics, AI slot | Constitution |

**Branch (P0):** `cursor/smart-profile-hub-p0-6004` — after Phase 1 gates.

---

## Phase 3+ — Horizon (no new PRD until PDR)

| Horizon | Direction |
|---------|-----------|
| **Marketplace** | Listings, orders—cards + workspace; constitution marketplace compatibility |
| **AI** | `mdz-hub-assistant` Card Provider; constitution P7 |

---

## Parallel work (independent)

| Item | Branch |
|------|--------|
| Exchange wilaya UX | `cursor/exchange-wilaya-preview-6004` |
| Dashboard premium UI | `cursor/dashboard-premium-ui-6004` |

---

## Gates before Smart Workspace P0

- [x] Product library on `main`  
- [ ] PRD acceptance criteria **§1–2** (track A) in production  
- [ ] Tracks **B–D** acceptance met  
- [ ] Support & Messages **E.1–E.3** (+ E.5 audit) minimum viable  
- [ ] Founder approval for Hub P0 branch  

---

## Success metrics (ops)

Approval latency, recovery success rate, notification delivery, ticket first-response time, then Hub engagement per constitution.
