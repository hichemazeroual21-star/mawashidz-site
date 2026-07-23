# MawashiDZ product roadmap (Smart Workspace & Hub)

**Last updated:** 2026-07-23  
**Authority:** [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md) + Founder-approved execution sequence

This roadmap is **product/engineering delivery order**, not a calendar. Each phase is **one branch, one PR**, green `npm test`, and **no** mixing with registration, Auth, or existing RLS unless an approved migration explicitly covers it.

---

## Approved execution sequence (fixed)

| Step | Deliverable | Status (as of doc) |
|------|-------------|---------------------|
| **1** | **Admin Operations** — migration 008, approve/reject, audit, manager/admin dashboards stable | In progress / merge per ops PRs |
| **2** | **Product library** — constitution, PDRs, this roadmap, glossary (`docs/product/`) | This change set |
| **3** | **P0** — minimal schema: `hub_cards`, `hub_engagement_events`; branch `cursor/smart-profile-hub-p0-6004` | Not started |
| **4** | **P1 breeder-first** — `mdz-hub-core`, Card Providers, top-4 + lazy, offline, “Today in your wilaya”, **Breeder Smart Workspace** slice | After P0 + step 1 live |

---

## Hub & workspace phases

| Phase | Deliverable | Touches stable core? |
|-------|-------------|----------------------|
| **P0** | Minimal `hub_cards` + `hub_engagement_events` migration; docs | No runtime |
| **P1** | Hub engine MVP; breeder-first workspace entry; analytics events | Workspace/Hub only |
| **P2** | `profiles.hub_preferences` jsonb; notification center MVP; global search MVP; optional `hub_feed_items` | New RPC/tables as needed |
| **P3** | Breeder listings/requests workspace sections; CMS RPC | Hub + marketplace modules |
| **P4** | Vet, buyer, feed Smart Workspaces; wilaya manager alignment | Wilaya RLS only if approved |
| **P5** | External ingest (WOAH/FAO, etc.); ranking v1 | Workers/cron separate |
| **P6** | Founder analytics workspace; engagement cards | Admin/founder surfaces |
| **P7** | AI assistant Card Provider | New module + Edge |

---

## Parallel / related work (not Hub P0)

| Item | Branch (example) | Notes |
|------|------------------|--------|
| Exchange wilaya UX (10 + expand) | `cursor/exchange-wilaya-preview-6004` | Public market board; independent of Hub P0 |
| Dashboard premium UI | `cursor/dashboard-premium-ui-6004` | Visual polish |
| Roles chrome fix | `cursor/fix-roles-chrome-6004` | Auth chrome after roles fetch |

---

## Gates before starting P0 code

- [ ] Founder: constitution + PDRs merged  
- [ ] Admin Operations (008) live in production  
- [ ] Explicit approval to open `cursor/smart-profile-hub-p0-6004`  

---

## Success signals (see constitution)

Operational metrics over vanity time-on-page: listings published, response times, completed operations, weekly return, profile completion—combined with Hub engagement events.
