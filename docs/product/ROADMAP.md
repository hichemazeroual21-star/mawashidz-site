# MawashiDZ product roadmap (Member ops → Smart Workspace & Hub)

**Last updated:** 2026-07-23  
**Authority:** [MEMBER_OPERATIONS_AND_COMMUNICATION.md](./MEMBER_OPERATIONS_AND_COMMUNICATION.md) + [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md)

This roadmap is **product/engineering delivery order**, not a calendar. Each step is **one or more branches/PRs**, green `npm test`, and **no** mixing unrelated registration/Auth/RLS changes unless an approved migration explicitly covers them.

---

## Phase 1 — Member operations & communication (before Hub)

Complete **in order** (see unified spec for detail):

| Step | Deliverable | Status (as of doc) |
|------|-------------|---------------------|
| **1** | **Admin operations** — registration review (approve/reject/request info), RPC, audit, dashboards | In progress (e.g. migration 008 PRs) |
| **2** | **Ticket system** — Support & Messages Center; statuses, priority, links | Not started |
| **3** | **Password recovery** — full Auth recovery UX | Verify production |
| **4** | **Email architecture** — Auth (Supabase) + operational (Resend/Brevo) | Not started |
| **5** | **Notification center** — in-app inbox, filters, deep links | Partially specified in constitution; build here |
| **6** | **Product library** — `docs/product/` constitution, PDRs, this roadmap | In PR |

**After steps 1–5 are live:** proceed to Smart Workspace **P0** below.

---

## Phase 2 — Smart Workspace & Hub (constitution)

| Step | Deliverable | Touches stable core? |
|------|-------------|----------------------|
| **P0** | Minimal `hub_cards` + `hub_engagement_events`; branch `cursor/smart-profile-hub-p0-6004` | No runtime until merged |
| **P1** | `mdz-hub-core`, Card Providers, top-4 + lazy, offline, “Today in your wilaya”, **Breeder Smart Workspace** first | Workspace/Hub only |
| **P2** | `profiles.hub_preferences` jsonb; global search MVP; optional `hub_feed_items` | New RPC/tables as needed |
| **P3** | Breeder listings/requests workspace; CMS RPC | Hub + marketplace modules |
| **P4** | Vet, buyer, feed Smart Workspaces; wilaya manager alignment | Wilaya RLS only if approved |
| **P5** | External ingest; ranking v1 | Workers/cron separate |
| **P6** | Founder analytics; engagement cards | Admin/founder surfaces |
| **P7** | AI assistant Card Provider | New module + Edge |

---

## Parallel work (independent gates)

| Item | Branch (example) | Notes |
|------|------------------|--------|
| Exchange wilaya UX (10 + expand) | `cursor/exchange-wilaya-preview-6004` | Public board |
| Dashboard premium UI | `cursor/dashboard-premium-ui-6004` | Visual polish |
| Roles chrome fix | `cursor/fix-roles-chrome-6004` | Auth chrome |

---

## Gates before Smart Workspace P0

- [ ] [MEMBER_OPERATIONS_AND_COMMUNICATION.md](./MEMBER_OPERATIONS_AND_COMMUNICATION.md) merged as official Phase 1 spec  
- [ ] Step **1** (admin operations) live in production  
- [ ] Steps **2–5** scoped and approved (may ship incrementally; **P0 Hub** waits for ticket + notification foundation)  
- [ ] Founder approval to open `cursor/smart-profile-hub-p0-6004`  

---

## Success signals

**Phase 1:** time to approve/reject, ticket response time, recovery success rate, notification read rates.  
**Phase 2:** constitution operational metrics + Hub engagement events.
