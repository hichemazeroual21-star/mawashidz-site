# MawashiDZ product roadmap

**Type:** Implementation & delivery plan — **not** product requirements.  
**Requirements:** [MEMBER_OPERATIONS_AND_COMMUNICATION.md](./MEMBER_OPERATIONS_AND_COMMUNICATION.md) and section PRDs.  
**Vision (Hub mechanics):** [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md)  
**Strategic SSOT:** [../constitution/MAWASHIDZ_CONSTITUTION.md](../constitution/MAWASHIDZ_CONSTITUTION.md) v3.0 FROZEN  
**Canonical phase order:** [../constitution/ROADMAP.md](../constitution/ROADMAP.md) — **Animals before Hub**; this file keeps Phase 1 track detail.

**Last updated:** 2026-07-24

Each **track** = own branch(es), PR(s), `npm test` green. No mixing unrelated Auth/RLS changes unless approved migration says so.

---

## Long-term sequence (aligned to constitution)

```text
Phase 0 — Foundation hardening          ← constitution ROADMAP
Phase 1 — Member Operations & Communication
Phase 2 — Livestock Identity + QR + media
Phase 3 — Marketplace MVP
Phase 4 — Smart Workspace & Hub polish (on real objects)
Phase 5+ — Professional depth / mobile / AI (gated)
```

Detail for Phase 1 sections lives in PRDs; **order below is engineering delivery for Phase 1 tracks**.

---

## Phase 1 — Member Operations & Communication (execution)

**PRD umbrella:** [MEMBER_OPERATIONS_AND_COMMUNICATION.md](./MEMBER_OPERATIONS_AND_COMMUNICATION.md)

| Track | Deliverable | PRD | Engineering notes | Status |
|-------|-------------|-----|-------------------|--------|
| **A** | Registration review + **Admin operations** | [MEMBER_OPERATIONS.md](./MEMBER_OPERATIONS.md) §1–2 | RPC `review_registration_status` + audit (008/012); dashboards + reason dialog | **Elevated in PR** — verify prod apply |
| **B** | Password recovery | §3 | Supabase Auth templates + UX | Verify prod |
| **C** | Email architecture | §4 | Outbox + Worker + Resend + **cron `*/2`** + processing lease (012) | **Elevated in PR** — needs secrets |
| **D** | Notification center | §5 | Inbox + unread badge + type filter + deep links | **Elevated in PR** |
| **E.1** | Ticket model + RLS | [SUPPORT_AND_MESSAGES_CENTER.md](./SUPPORT_AND_MESSAGES_CENTER.md) | Schema, policies, no-arg privilege helpers | **Elevated in PR** |
| **E.2** | Admin / support messages |同上 | Operator queue UI + thread + status | **Elevated in PR** |
| **E.3** | Wilaya manager messages |同上 | Wilaya fence RLS + manager dashboard queue | **Elevated in PR** |
| **E.4** | Notification ↔ ticket deep links | §5 + Support | `#account-support` / `#account-inbox` / `#account-request` | **Elevated in PR** |
| **E.5** | Audit + internal notes | Support §4 | Staff notes RPC + UI; manager reviews audited | **Elevated in PR** |
| **E.6** | Member-to-member (linked) | Support §1C | After marketplace hooks | Later |

**Honesty gate:** Phase 1 is **not** declared production-complete until migrations **010–012** are applied on Supabase, Worker cron+secrets are live, and acceptance smoke passes. Phase 2 remains **blocked**.

**Gates:** **A** production before **E** at scale; **D** before **E.4**; Phase 1 Must tracks before constitution Phase 2 (Livestock Identity).

---

## After Phase 1 — follow constitution ROADMAP

Do **not** start Hub P0 immediately after Phase 1.

Per [../constitution/ROADMAP.md](../constitution/ROADMAP.md):

1. **Livestock Identity** (animals, ownership events, QR, media)  
2. **Marketplace MVP**  
3. **Then** Smart Workspace / Hub polish on real objects  

Hub P0 branch (`cursor/smart-profile-hub-p0-6004`) waits until constitution Phase 2 exit criteria are met (or Founder amends sequencing).

AI assistant remains Phase 7 / NON-GOAL for Years 1–2 unless amended.

---

## Parallel work (independent)

| Item | Branch |
|------|--------|
| Exchange wilaya UX | `cursor/exchange-wilaya-preview-6004` |
| Dashboard premium UI | `cursor/dashboard-premium-ui-6004` |

---

## Gates before Livestock Identity (constitution Phase 2)

- [x] Product library on `main`  
- [ ] Phase 0 foundation hardening exit criteria  
- [ ] PRD acceptance criteria **§1–2** (track A) in production  
- [ ] Tracks **B–D** acceptance met  
- [ ] Support & Messages **E.1–E.3** minimum viable  
- [ ] Relevant Founder Decisions for public trust claims (FD-02, FD-06 as applicable)  

---

## Success metrics (ops)

Approval latency, recovery success rate, notification delivery, ticket first-response time, then Hub engagement per constitution.
