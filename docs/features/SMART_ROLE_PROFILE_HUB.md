# Product Vision: Smart Role Workspaces

**Founder Vision – Smart Role Workspaces (Mandatory Product Direction)**

| | |
|--|--|
| **Status** | Proposed — **mandatory direction** for all workspace and Hub work |
| **Owner** | Product / Founder / MawashiDZ |
| **Audience** | Engineering (Cursor), design, ops |
| **Constraint** | Ship in **dedicated branches and PRs**. Do **not** mix with registration, Auth, or existing RLS changes unless an approved migration explicitly covers them. |

This document is **one product vision**: role workspaces, Smart Hub framework, notification center, search, security, and phased engineering. It is **not** a feature wishlist. Treat it as **how MawashiDZ is built** for the next several years.

---

## Core principle

**The member profile is no longer an account page.**

It becomes the **primary daily workspace** for every member inside MawashiDZ.

Every role must log in and immediately find:

- Information relevant to them
- Their operational tasks
- Their business activity
- Their notifications
- Their statistics
- The actions they perform most often

**Objective:** members open MawashiDZ **every day**, not only when buying or selling.

> **Golden rule:** This is not a content portal. This is not a settings page. This is the **daily operational workspace** for every MawashiDZ member.

---

## Universal workspace structure

Every workspace combines **five pillars**:

1. **Daily insights** (Hub cards, local context, trends)
2. **Operational management** (listings, orders, requests, cases)
3. **Quick actions** (create, approve, message, publish)
4. **Statistics & performance** (views, conversions, regional activity)
5. **Notifications & workflow** (unified notification center + tasks)

The interface must **prioritize actions over articles**.

```text
┌─────────────────────────────────────────────────────────┐
│  Workspace shell (role + rank resolved server-side)      │
│  ┌─────────────┐  ┌──────────────────────────────────┐ │
│  │ Global      │  │ Pillar 1: Daily insights (Hub)   │ │
│  │ search      │  │ Pillar 2–4: Role operations        │ │
│  │ + Notif.    │  │ Pillar 5: Notifications & tasks    │ │
│  │   center    │  └──────────────────────────────────┘ │
│  └─────────────┘                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Role hierarchy, routing & privacy

Workspaces and data access follow a **strict rank order**. A member must **never** see another rank’s **private operational surface** or **internal-only fields** reserved for higher ranks.

### Rank order (low → high)

| Rank | Typical roles | Workspace |
|------|----------------|-----------|
| **R1 — Member** | `buyer`, `breeder`, `vet`, `feed` (and other member `user_type` values) | Role-specific member workspace (sections below) |
| **R2 — Wilaya manager** | `manager` | Wilaya Manager Workspace (**one wilaya only**) |
| **R3 — Platform admin** | `admin` | Founder/Admin Workspace (subset per policy) |
| **R4 — Founder / super** | `founder`, `super_admin` | Full Founder/Admin Workspace |

**Effective rank** = highest role granted in `user_roles` (resolved server-side). UI may show **one primary workspace** with optional entry points (e.g. manager who is also a breeder sees manager workspace as default; breeder tools remain available only for **their own** commercial data, not wilaya-wide admin).

### Privacy rules (non-negotiable)

| Rule | Meaning |
|------|---------|
| **No upward leakage** | R1 never sees R2+ internal queues, audit detail, suspension reasons for *other* users, or cross-wilaya aggregates. |
| **Wilaya fence** | R2 sees **only** data tied to their assigned wilaya (members, listings, reports, alerts scoped to that wilaya). **Never** another wilaya. |
| **Professional boundaries** | Veterinarians **never** modify ownership, prices, or commercial listing fields (see Veterinarian Workspace). |
| **Admin surface** | Provider toggles, national alerts, global CMS, role grants, and audit exports are **R3/R4 only**—never exposed via hidden DOM alone. |
| **Search & notifications** | Results and notification payloads are **filtered by rank + RLS**; search must not return fields the caller’s rank cannot read via normal APIs. |
| **Escalation visibility** | Manager temporary actions and evidence are visible to R2 within wilaya; **final policy decisions** and platform-wide escalation notes are R3/R4. |

Implement: **RLS + RPC** as source of truth; workspace UI is a view on authorized data only.

---

## 1. Breeder workspace (Breeder Dashboard)

The breeder manages his livestock business **entirely** from this workspace.

### Livestock listings

Create livestock listings; draft before publishing; edit or archive; set price (negotiable or fixed); quantity; breed; species; gender; age; approximate weight; wilaya & commune; delivery / pickup; photos; QR / animal profile integration when available.

### Listing management

Active; pending review; rejected (with reasons **for their own** listings); sold; expired; performance (views, saves, buyer contacts).

### Buyer requests

Incoming purchase requests; conversations; reservation status; sold status; history.

### Daily Hub (cards + tasks)

Today’s tip; local weather; feed prices; livestock prices; disease alerts; biosecurity; vaccination reminders; farm health reminders; profile completion; trusted breeder progress.

---

## 2. Veterinarian workspace

The veterinarian manages **professional** activity—not commerce.

### Professional profile

Clinic; service area; working hours; availability.

### Veterinary activity

Assigned requests; animal health records; visit notes; vaccination history; recommendations; health certificates (within permissions).

### Knowledge

Official disease alerts; veterinary guidance; suggest educational content; review queue.

### Statistics

Consultations; active requests; ratings; regional activity (aggregated, privacy-safe).

**Veterinarians must never modify ownership, prices, or commercial information.**

---

## 3. Feed seller workspace

### Products

Add products; prices; stock; delivery; pickup; promotions; categories.

### Management

Orders; inventory; low stock alerts; product statistics; demand trends.

### Daily information

Storage guidance; feed quality; market trends; seasonal recommendations.

---

## 4. Buyer workspace

### Buying

Saved animals; purchase requests; reservation history; messages; QR explanation; health information; recommended listings; price alerts; new animals nearby.

### Daily information

Buying tips; healthy animal checklist; new offers; seasonal advice.

---

## 5. Wilaya manager workspace

Wilaya managers supervise operations **inside their wilaya only**.

### Visibility (wilaya-scoped only)

Membership requests; breeders; veterinarians; feed sellers; buyers (where operationally needed); livestock listings; feed listings; reports; disease alerts; statistics; municipal activity. **Never data from other wilayas.**

### Operational permissions

Review membership applications (approve, reject, request additional information); temporarily suspend accounts; review livestock and feed listings; hide inappropriate content; handle reports; contact members; publish **approved local** announcements; generate wilaya reports.

### Restrictions

Managers must **never**: access another wilaya; modify Founder/Admin roles; change platform policies; modify Auth; modify RLS; delete audit logs; delete users permanently; publish national alerts without approval; modify global content providers; grant themselves permissions.

### Dashboard sections

- **Urgent tasks:** pending applications; reports; listings awaiting review; verification requests
- **Statistics:** members; listings; veterinarians; feed sellers; new registrations; open reports
- **Activity:** municipality activity; growth; new members; marketplace activity
- **Member management:** search; review; suspend; approve; reject; request documents
- **Listings:** pending; active; flagged; hidden; sold
- **Local alerts:** weather; animal health; local announcements; market information
- **Audit log:** every action recorded

### Escalation

Sensitive cases escalate: **Manager → temporary action → evidence → Founder/Admin review → final decision**.

---

## 6. Founder / Admin workspace

The Founder manages the **entire platform**.

| Area | Scope |
|------|--------|
| **Members** | Roles; status; approval; suspension; audit |
| **Wilaya managers** | Assign; remove; performance |
| **Content** | Cards; providers; sources; CMS; moderation |
| **Platform** | Analytics; adoption; engagement; marketplace; reports; alerts |
| **Configuration** | Enable or disable **providers** without changing the UI shell |

Founder analytics (card views, articles read, wilaya activity, alert opens, engagement by role) uses hub + workspace events—see **Analytics**.

---

## Smart Hub philosophy

The Smart Hub is a **modular framework inside MawashiDZ**, not a separate product.

Every future service becomes a **Card** (optional deep link for heavy flows). **Never** create separate member dashboards if a Card (+ workspace section) can solve discovery and daily use.

```text
Hub Engine (mdz-hub-core)
│
├── Weather Card
├── Disease Alerts Card
├── Feed Prices Card
├── Today in your wilaya Card     ← Hero (see below)
├── AI Assistant Card
├── Insurance Card                 (future)
├── Financing Card                 (future)
├── Equipment Marketplace Card     (future)
├── Training Card
├── QR Statistics Card
├── Local Events Card
└── …
```

**Product rule:** insurance, financing, equipment market, labs, AI, etc. → **register Card Provider**; do not add a new top-level “account tab” for each service.

---

## Card Provider architecture

Every Card Provider defines only:

| Concern | Description |
|---------|-------------|
| **Data source** | RPC, Edge Function, normalized feed, or composite orchestrator |
| **Refresh policy** | TTL, stale-while-revalidate, on-visible |
| **Visibility rules** | Role, rank, wilaya, `profiles.status`, feature flags |
| **Cache** | Keys for offline / SWR |
| **Priority** | Rank for top-4 vs lazy tier |

The **UI must never depend directly on external APIs.** Shell renders `card_type` + `payload` + `meta` only.

**Client layout (target):**

```text
js/mdz-hub-core.mjs          ← registry, rank, lazy, offline, events
js/hub/providers/*.mjs     ← one module per provider
js/mdz-account-hub.mjs       ← attaches Hub to workspace shell
js/mdz-workspace-shell.mjs   ← (future) pillars, search, notifications
```

**Server (P0 minimal):** `hub_cards` registry row per provider (`enabled`, `default_rank`, `roles[]`, `refresh_seconds`).

---

## «Today in your wilaya» / Today in your wilaya

**Hero Card** — first of the **top four** when wilaya is set.

| Row | Content |
|-----|---------|
| 🌤️ | Weather |
| 🐑 | Livestock prices |
| 🌾 | Feed prices |
| 🚨 | Animal health alerts |
| 📅 | Local events |
| 📰 | Important news |

Implemented as a **composite Card Provider** (orchestrator), not six full-width cards on mobile.

---

## Performance

- Load only the **four most important** cards on open.
- Everything else: **lazy loading**, **dynamic import** per provider, **cache**, **offline** support.
- Hub module: lazy-imported from workspace; isolated fetches so one slow provider does not block the shell.

---

## Offline

When offline, show **cached** information. Display:

> **Last updated: X minutes ago**  
> **آخر تحديث: منذ X دقيقة**

Never show **empty** dashboards if any cached payload exists.

---

## Analytics

Track (append-only events; use analytics to **improve the product**, not only to collect data):

| Signal | Purpose |
|--------|---------|
| `impression` | Card in viewport |
| `dwell_ms` / reading time | Attention |
| `cta_click` | Link or primary action |
| `hide` | User disabled card |
| `dismiss` | Not relevant / swiped away |
| `return` | Revisited same card type later |

Founder dashboard: most viewed cards, read content, active wilayas, opened alerts, engagement by role.

---

## AI ready

Architecture must allow **“MawashiDZ AI Assistant”** as `card_type: 'assistant'` + future `mdz-hub-assistant.mjs` and Edge Function—**without redesigning** the Hub shell. Assistant consumes **normalized hub context** (role, wilaya, alerts, prices), not DOM scraping.

---

## Content engine (provider-agnostic)

External and editorial content flows through a **normalization layer**—not straight into UI.

```text
┌──────────────┐     ┌─────────────────────┐     ┌─────────────┐
│  Providers   │ --> │  hub_content_engine │ --> │  hub_feed   │
│  WOAH, FAO,  │     │  normalize, tag,    │     │  (RPC/view) │
│  DZ official,│     │  locale, role_tags  │     └──────┬──────┘
│  weather,    │     └─────────────────────┘            │
│  market API  │                                        v
└──────────────┘                              ┌─────────────────┐
                                              │  Card renderer  │
                                              └─────────────────┘
```

New provider = **ingest adapter** + config; card renderer unchanged. Founders enable/disable providers in configuration **without UI redeploy**.

---

## Security

- Permissions enforced **server-side** (RLS + RPC). **Never** rely on hidden buttons alone.
- Every sensitive operation: secure authorization, RPC where appropriate, **complete audit log** (align with `admin_audit_log` pattern).
- Managers and admins: all mutating actions logged; no silent bypass of wilaya or rank rules.

---

## Unified notification center (cross-cutting)

**One notification center** for the entire workspace:

- Purchase requests and messages
- Approvals and rejections
- Health and market alerts
- Offers and platform notices
- Wilaya/local announcements (scoped by rank)

**Requirements:**

- Mark as read / mark all read
- Filter by type (requests, messages, alerts, admin, marketplace, …)
- Deep link into the correct workspace section or card context
- Server-backed inbox (not browser-only); RLS per recipient
- Badge counts on workspace shell; respect rank (no R1 seeing R3-only system alerts)

**Phasing:** minimal event types in P1; expand with marketplace and manager workflows.

---

## Global search (cross-cutting)

**One search bar** inside the workspace (permission-aware):

| Entity (examples) | Who may search |
|-------------------|----------------|
| Own listings, requests, messages | R1 (own data) |
| Members, listings, reports (wilaya) | R2 within wilaya |
| Platform-wide members, content, providers | R3/R4 |

Search must use the **same authorization** as list/detail APIs—no “search bypass.” Results grouped by type; empty state explains scope (“Search your listings” vs “Search wilaya members”). Saves time for **members and operations**.

**Phasing:** P2+ after workspace shell; start with listings + members (manager/founder) behind RPC.

---

## Hub principles (engineering)

| Principle | Meaning |
|-----------|---------|
| **No static homepage** | Generated from data + rules + time |
| **Always alive** | Freshness, TTL, seasonal rules |
| **Role-native** | Templates per role; no one-size feed |
| **Practical over editorial** | Actions and snippets first |

**Personalization (roadmap):** role → wilaya → season → activity → interests. Persist via `profiles.hub_preferences` jsonb first; dedicated table only if needed. Even v1 uses **role templates**, not one global grid.

**Engagement (later):** daily tip, weekly summary, badges, trusted level, profile completion, smart reminders—reserve card types and event names early.

---

## CMS & governance (content)

| Capability | Who |
|------------|-----|
| Create draft | Editor / vet (gated) |
| Review | Admin / founder |
| Publish | Founder / `super_admin` |
| Vet suggest | Queue → review |
| Audit | Same discipline as admin audit |

States: `draft` | `in_review` | `published` | `archived`. **No browser PATCH** for publish—use RPC / Edge Functions.

---

## UX principles

- Card-first, mobile-first, RTL-safe; MawashiDZ visual language
- Freshness indicators; teach empty states (“Set wilaya to see Today in your wilaya”)
- Reuse dashboard card patterns from `mdz-dashboards.mjs` where appropriate—**different data paths** per rank

---

## P0 database MVP (minimal tables)

Do **not** design a large schema before usage is proven.

| Table | Purpose |
|-------|---------|
| **`hub_cards`** | Registry: `card_id`, `provider_key`, `default_rank`, `roles[]`, `refresh_seconds`, `enabled`, metadata jsonb |
| **`hub_engagement_events`** | `user_id`, `card_id`, `event_type`, `props`, `created_at` |
| **`hub_feed_items`** | **Optional in P0** — add when server-side editorial/ingest is required |

**Defer:** CMS tables, per-provider ingest tables, rollup views, `hub_user_preferences` table (use jsonb first), notification/search tables until P2+ (design hooks in this doc).

**P0 done when:** migration + RLS; founders can toggle `hub_cards.enabled`; members can insert own engagement events.

---

## Technical approach

```text
openAccount / workspace entry
  └─ mdz-workspace-shell (future) or account modal bridge
       ├─ resolve rank, role, wilaya (server-trusted)
       ├─ notification center + search (phased)
       ├─ mdz-hub-core: top 4 + lazy + offline + events
       └─ role workspace panels (listings, requests, … phased)
```

---

## Phased delivery

| Phase | Deliverable | Touches stable core? |
|-------|-------------|----------------------|
| **P0** | This vision + **minimal** `hub_cards` + `hub_engagement_events` migration | No runtime |
| **P1** | `mdz-hub-core`, providers, top-4, offline, **Today in your wilaya**, analytics | Workspace/Hub only |
| **P2** | Preferences jsonb; optional `hub_feed_items`; notification center MVP; search MVP (scoped) | New tables/RPC as needed |
| **P3** | Breeder listing/request workspace sections (MVP); CMS RPC | Hub + marketplace modules |
| **P4** | Vet / buyer / feed workspaces; manager dashboard alignment | Wilaya RLS unchanged unless approved |
| **P5** | External ingest; ranking v1 |
| **P6** | Founder analytics + engagement cards |
| **P7** | AI assistant provider |

Each phase: **one branch, one PR**, green `npm test`.

---

## Acceptance criteria (P1 — Hub proof)

1. Hub Engine: **≤4 cards** on open; rest lazy-loaded.
2. **Today in your wilaya** when wilaya set.
3. At least one live or cached data provider (weather and/or prices).
4. Offline shows cache + last-updated label.
5. Analytics: impression + at least one of `cta_click`, `dwell_ms`, `hide`.
6. No regression on registration, login, or existing admin RPCs.
7. No horizontal scroll at 320px.
8. Rank rules: member UI does not expose founder-only provider toggles or cross-wilaya manager data.

---

## Non-goals

- Replacing Supabase Auth or `openAccount` flow in Hub P1
- Changing `registrations` insert or `member_id` allocation in Hub PRs
- Unlimited UGC without moderation
- Long-form article portal as primary UX

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Scope creep | Phase gates; founder approves each workspace expansion |
| Rank leakage | RLS + RPC; search/notifications use same rules |
| Health advice liability | Source links; no diagnostic claims |
| Performance | Top-4, lazy providers, dynamic import |
| P0 schema bloat | Minimal tables per founder directive |
| Offline blank UI | IndexedDB/cache + stale copy |

---

## References

- Account UI today: `js/mdz-dashboards.mjs` → `renderAccountDashboard`
- Admin audit: `supabase/migrations/008_admin_audit_and_roles.sql`
- News/prices: `netlify/functions/news.mjs`, `assets/market-engine.js`

---

## Decision requested

Approve **this document as mandatory product direction**, then **P0 + P1** after admin operations (008) is live in production.

**Implementers:** build **mdz-hub-core** + Card Providers and **workspace shell** toward the five pillars—**not** a monolithic settings page. New services = **cards** + workspace sections. Respect **rank order and wilaya fence** in every API and UI surface.
