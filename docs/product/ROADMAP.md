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
