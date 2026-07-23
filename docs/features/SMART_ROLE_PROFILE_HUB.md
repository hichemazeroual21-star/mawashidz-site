# Feature Proposal: Smart Role-Based Profile Hub

**Status:** Proposed (not implemented)  
**Owner:** Product / MawashiDZ  
**Target:** Post–admin-operations foundation (read-only dashboards + RPC approve/reject live)  
**Constraint:** Implement in a **dedicated branch and PR**. Do **not** modify registration, Auth, existing RLS policies, or other stable production paths in the same change set.

---

## Executive summary

Transform **«حسابي» / Mon compte** from a static settings screen into a **Smart Hub**: a role-aware home that delivers **actionable value daily**—not a wall of articles.

Success is measured by **return visits**, **time-to-value after login**, and **perceived professionalism** of the member profile—not by article count.

---

## Problem today

- The account area correctly shows identity, status, and tabs (profile, request, invites, security).
- It does **not** answer: *“Why should I open MawashiDZ today?”*
- Admin/founder tooling is separate; **member-facing value** is still mostly on the public homepage and news modules.

---

## Vision

When a member opens their account, they see a **living dashboard**: cards, icons, short insights, and light stats—**personalized by registration role** (`profiles.role` / `user_type`) and optionally **user preferences** (which cards to show).

The hub **complements** marketplace and registration; it does **not** replace them.

---

## Hub framework (not a separate product)

Smart Hub is **not** a side project or a one-off account redesign. It is the **MawashiDZ Hub Engine**—a **framework inside the platform**. Any future capability (insurance, financing, equipment marketplace, labs, AI, training, events, QR analytics, etc.) **does not get a new top-level “service page”** as the primary member entry; it **registers a new Card** in the Hub.

```text
Hub Engine (mdz-hub-core)
│
├── Weather Card
├── Disease Alerts Card
├── Feed Prices Card
├── Today in your wilaya Card  ← flagship composite (see below)
├── AI Assistant Card
├── Insurance Card              (future)
├── Equipment Marketplace Card  (future)
├── Events Card
├── Training Card
├── QR Statistics Card
└── … (new card = hours, not days)
```

**Rule for product and engineering:** if a feature is member-facing and recurring, default delivery path is **Card Provider + optional deep link**, not a new account tab or standalone route—unless there is a strong reason (legal checkout flows may still have dedicated pages, but **discovery** stays in the Hub).

---

## Card Provider model

Each card is implemented as a **Card Provider**: a small contract the Hub Engine understands. The **shell UI** (grid, skeletons, RTL, lazy regions) knows only **normalized card payloads**—never WOAH, a weather API, or insurance backend details.

| Provider responsibility | Description |
|-------------------------|-------------|
| **Data source** | Where payload comes from (RPC, Edge Function, client adapter reading cached feed, composite of other providers). |
| **Audience** | Who may see it: roles, wilaya rules, feature flags, `profiles.status`. |
| **Refresh policy** | TTL, stale-while-revalidate, “on scroll into view”, push invalidation later. |
| **Rank / slot** | Default order, priority tier (above-the-fold vs deferred), personalization hooks. |

| UI responsibility | Description |
|-------------------|-------------|
| Render `card_type` + `payload` + `meta` (title, icon, freshness, CTAs). |
| Enforce lazy boundaries and offline shell. |
| Emit **engagement events** (see Analytics). |

**Adding a service** = register provider id in config/registry + implement `fetchPayload(context)` (+ optional server ingest). **No change** to card chrome or account layout.

Suggested client layout (conceptual):

```text
js/mdz-hub-core.mjs          ← engine: registry, rank, lazy, offline cache keys
js/hub/providers/*.mjs       ← one module per card provider
js/mdz-account-hub.mjs       ← wires engine into account modal only
```

Server-side mirror for P0+: minimal `hub_cards` registry row per provider (visibility, default_rank, refresh_seconds)—not one table per future product.

---

## Founder notes (long-term vision)

> **Golden rule:** The profile is no longer an account page. It is the member’s **personal workspace** inside MawashiDZ.

This Smart Hub is **not** a settings screen with articles bolted on. It is intended to become each member’s **default daily destination** on the platform—designed once so new services (AI, new data providers, engagement mechanics) can plug in **without rebuilding the page every year**.

### Principles (non-negotiable for implementers)

| Principle | Meaning for engineering |
|-----------|-------------------------|
| **No static homepage** | Cards and feeds are **generated** from data + rules + time; avoid hard-coded HTML blocks that never change. |
| **Always alive** | TTL, refresh timestamps, “new since last visit”, seasonal rules. |
| **Role-native** | Layout and ranking differ by role; never one generic feed for everyone. |
| **Practical over editorial** | Prefer actionable snippets (price move, alert, task, reminder) over long reads. |

### Daily workspace (target experience)

On each visit, the member should be able to see—**as cards, not walls of text**:

- News and updates **for their role**
- Weather in **their wilaya**
- Health alerts (when available)
- Market prices (livestock / feed as applicable)
- Notifications (platform + hub)
- Recent activity (their listings, requests, hub interactions)
- Suggested **tasks** (complete profile, verify animal, read alert, etc.)

MVP may ship a subset; **schema and card types** must allow all of the above later.

### Smart personalization (ranking, not only show/hide)

Card order and prominence should eventually consider:

1. **Role** (`profiles.role` / `user_type`)
2. **Wilaya** (and later daira/commune if useful)
3. **Season** (hemisphere-agnostic rules: Ramadan, heat, breeding season templates)
4. **Prior activity** (opens, dismissals, last seen card types—privacy-preserving aggregates)
5. **Explicit interests** (user toggles + inferred from marketplace behavior)

**Do not** ship a single default grid for all users. Even v1 should use **role templates**; v1.1+ adds scoring.

Persist preferences and ranking hints **server-side** (`profiles.hub_preferences` jsonb first; dedicated `hub_user_preferences` table only if jsonb becomes insufficient).

### Engagement layer (later phases—design hooks now)

Reserve card types and event names for:

- **Daily tip** (one card, rotates)
- **Weekly summary** (digest card + optional email later)
- **Achievement badges** (display-only at first)
- **Trusted member level** (ties to `profiles.status`, tenure, verified actions)
- **Profile completion** (progress meter card)
- **Smart reminders** (rule-based before ML)

Implementation can wait; **event logging** should start in P1 (see **Analytics** below)—schema can stay one append-only table with flexible `event_type` + JSON `props` to avoid premature column explosion.

### AI-ready architecture

From day one, treat **“MawashiDZ AI Assistant”** as a **pluggable surface**:

- Dedicated card slot: `card_type: 'assistant'` (placeholder → chat panel later)
- Assistant consumes the same **normalized hub context** (role, wilaya, recent alerts, prices)—not ad-hoc DOM scraping
- No coupling between `mdz-account-hub.mjs` and a specific LLM vendor; future module `mdz-hub-assistant.mjs` + Edge Function

### Content engine (provider-agnostic)

Do **not** hard-wire the UI to WOAH, FAO, or one weather API.

```text
┌──────────────┐     ┌─────────────────────┐     ┌─────────────┐
│  Providers   │ --> │  hub_content_engine │ --> │  hub_feed   │
│  WOAH, FAO,  │     │  normalize, tag,    │     │  (RPC/view) │
│  DZ official,│     │  locale, role_tags  │     └──────┬──────┘
│  weather,    │     └─────────────────────┘            │
│  market API  │                                        v
└──────────────┘                              ┌─────────────────┐
                                              │  Card renderer  │
                                              │  (stable UI)    │
                                              └─────────────────┘
```

Adding a provider = new **ingest adapter** + mapping config; **card renderer and account UI unchanged**.

### Founder dashboard (analytics product)

Founders need **usage truth**, not guesswork. Plan an admin view (separate from member hub UI) showing:

- Most viewed **card types**
- Most read **content items**
- Most active **wilayas**
- Most opened **alerts**
- **Engagement rate by role** (DAU/WAU on hub, clicks per role)

Requires append-only **hub events** (or equivalent) and aggregated views or nightly rollups—aligned with `admin_audit_log` access model. Event richness matters (see **Analytics**).

### Flagship card: «اليوم في ولايتك» / Today in your wilaya

A **composite Card Provider** that may become the **daily habit** hook for MawashiDZ—one scannable card, one wilaya context:

| Row | Content |
|-----|---------|
| 🌤️ | Weather for member’s wilaya |
| 🐑 | Livestock price highlight |
| 🌾 | Feed price highlight |
| 🚨 | Health alert (if any) |
| 📅 | Nearby ag event (when calendar exists) |
| 📰 | One important role-relevant headline |

Implementation: **orchestrator provider** that calls other providers (or reads normalized feed slices)—not six separate above-the-fold cards on mobile. Target **P1 hero slot** (first of the “top 4”).

### Implications for phased delivery

| Phase | Must include (vision-aligned) |
|-------|-------------------------------|
| **P0 — Minimal schema** | Prove the framework; **smallest table set** (see **P0 database MVP** below)—defer CMS tables, per-provider ingest tables, and heavy rollups until usage is real. |
| **P1 — Engine + MVP cards** | `mdz-hub-core`, registry, **top-4 eager + lazy rest**, offline cache, **Today in your wilaya** + 1–2 atomic providers (weather/prices), engagement events |
| **P2** | `hub_user_preferences` server-side + hide/dismiss; optional normalized `hub_feed_items` when editorial/external volume justifies it |
| **P3** | CMS RPC + vet suggest |
| **P4** | Ranking v1 (role + wilaya + season) |
| **P5** | External ingest workers per content provider |
| **P6** | Founder analytics dashboard + engagement product cards |
| **P7** | AI assistant provider slot |

---

## Goals

| Goal | Description |
|------|-------------|
| **Role relevance** | Breeders, vets, feed sellers, and buyers each see a distinct default layout. |
| **Habit formation** | Daily or weekly reasons to return (tips, alerts, weather, prices). |
| **Trust** | Content sourced or labeled from reputable references; path for Algerian official sources later. |
| **Governance** | CMS-style workflow: draft → review → publish; vet suggestions; founder approval; audit log. |
| **No regression** | Zero changes to signup pipeline, session handling, or dashboard RLS in the hub MVP PR. |

---

## Non-goals (this initiative)

- Replacing Supabase Auth or `openAccount` session flow.
- Changing `registrations` insert or Phase 0 `member_id` allocation.
- Building a full social network or unlimited UGC without moderation.
- Shipping long-form article pages as the primary UX (cards and snippets first).

---

## Role-based hub content (v1 scope)

### Breeder (موال)

- Tip of the day (short).
- Feeding guidance (seasonal snippets).
- Biosecurity and prevention checklist.
- Disease / health alerts (aggregated, not alarmist).
- Weather for member’s wilaya (`profiles.wilaya`).
- Livestock and feed price highlights (reuse or extend existing price/news engines where possible).
- Reminders (e.g. vaccination windows—static templates first).
- Curated short videos/articles (title + link + 2-line summary).

### Veterinarian (طبيب بيطري)

- Latest health alerts (region-aware when data allows).
- Latest veterinary guidance cards.
- **Suggest content** (submission → review queue).
- Cases flagged for review (operational queue—future integration with tickets).
- Light regional stats (aggregated, privacy-safe).

### Feed seller (بائع أعلاف)

- Storage and quality tips.
- Market trend cards.
- Technical articles (short).
- **My offers / products** (links to future marketplace listings).

### Buyer (مشتري)

- How to choose an animal (checklist card).
- QR / animal ID explainer (ties to MDZ passport narrative).
- Pre-purchase tips.
- New listings highlights.
- Relevant offers.

---

## Trusted content sources (architecture)

See **Content engine** under Founder notes. Providers include:

| Source | Use |
|--------|-----|
| **WOAH / WAHIS** | Official animal health alerts and disease events (API or curated sync—respect terms of use). |
| **FAO** | General livestock guidance; cite and link out. |
| **Algerian official** | Pluggable provider interface; no hard dependency until URLs/APIs are approved. |
| **Editorial (MawashiDZ)** | Founder-approved posts in `hub_content` tables. |

All external items stored as **normalized records**: `source_id`, `title`, `summary`, `url`, `fetched_at`, `locale`, `role_tags[]`.

---

## Personalization (recommended v1.1)

- Per-user **card visibility** preferences (show/hide hub widgets).
- Persisted in `profiles.hub_preferences` (JSON) or `member_hub_settings` table—**not** `localStorage` only (so preferences follow the user across devices).
- Default layout per role; user overrides merge on top.
- **Roadmap:** card **ordering** via smart personalization signals (see Founder notes)—visibility is step one only.

This small feature significantly increases **ownership** and perceived product quality.

---

## CMS & permissions (aligned with admin RPC direction)

| Capability | Who |
|------------|-----|
| Create draft | Editor / vet (role-gated) |
| Review | Admin / founder |
| Publish | Founder (or `super_admin`) |
| Suggest article | Vet → queue |
| Audit | Same pattern as `admin_audit_log` (extend or sibling table) |

States: `draft` | `in_review` | `published` | `archived`.

**No direct PostgREST PATCH** from the browser for publish actions—use **RPC / Edge Functions** like `admin_set_profile_status`.

---

## UX principles

- **Card-first**, not article-first: icon, title, one metric or one sentence, optional CTA.
- **Scannable** on mobile (primary audience).
- **Freshness indicators**: “Updated 2h ago”, live dot where data is real-time.
- **Empty states** that teach (“Connect your wilaya in profile to see weather”).
- **RTL-safe**; reuse existing MawashiDZ visual language (greens, gold accents for premium actions).

Wireframes can mirror admin dashboard card patterns already introduced in `mdz-dashboards.mjs` without copying admin data paths.

### Performance (mobile-first)

- **Do not** fetch and render ~20 cards on account open.
- **Eager:** load and paint only the **top 4** cards by rank (include **Today in your wilaya** when wilaya is set).
- **Deferred:** remaining providers load via **intersection observer** (scroll into view) or explicit “Load more”—each provider fetch is isolated so one slow API does not block the shell.
- Hub module stays **lazy-imported**; providers can be **dynamic import** per card id.
- Budget: first meaningful paint for top 4 on mid-tier mobile; show skeletons with stable layout (no CLS).

### Offline-first

When the network fails or is slow, the Hub **must not** go blank.

- Persist **last successful payload** per provider (and composite wilaya card) in **IndexedDB** or Cache API keyed by `(user_id, card_id, wilaya)`.
- Show cached content with clear stale UX, e.g. **«آخر تحديث: منذ 35 دقيقة»** / *Last updated: 35 min ago*.
- Prefer showing stale tips, prices, and alerts over empty states.
- Online refresh updates cache in background (stale-while-revalidate).

### Analytics (beyond “opened”)

Log structured events (single `hub_engagement_events` table with `event_type` + `props` jsonb is enough for P0–P1):

| Event / signal | Why it matters |
|----------------|----------------|
| `impression` | Card entered viewport |
| `dwell_ms` / read time | Estimated attention |
| `cta_click` | Followed link or primary action |
| `dismiss` | Swiped away or “not relevant” |
| `hide` | User turned off card (preference) |
| `return` | Same card type opened again in a later session |

After months, founders can answer: **what breeders actually care about** vs what nobody reads—feeds product and provider retirement.

---

## P0 database MVP (minimal tables)

**Founder directive:** do not design a large schema before real usage. P0 migration should be **the minimum** to register providers, store optional shared feed rows, and append events.

| Table (P0) | Purpose |
|------------|---------|
| **`hub_cards`** | Registry: `card_id`, `provider_key`, `default_rank`, `roles[]`, `refresh_seconds`, `enabled`, metadata jsonb. |
| **`hub_feed_items`** (optional at first) | Normalized snippets for editorial + ingested content **only if** P1 needs server-side feed; otherwise start with client providers + cache and add this in P2 when CMS/ingest ships. |
| **`hub_engagement_events`** | Append-only: `user_id`, `card_id`, `event_type`, `props`, `created_at`. |

**Defer until needed:** separate `content_provider` table, `hub_card_definitions` duplicate of registry, `hub_user_preferences` table (can use `profiles.hub_preferences` jsonb column in P1), nightly rollup views, CMS workflow tables (P3).

**P0 success criterion:** migration applies cleanly; RLS allows authenticated read on published feed (if table exists) and insert-own events; founders can enable/disable cards via `hub_cards.enabled` without redeploying UI chrome.

---

## Technical approach (high level)

```text
┌─────────────────────────────────────────┐
│  accountModal / openAccount             │
│  └─ import mdz-hub-core (lazy)          │
│       ├─ resolve context (role, wilaya)   │
│       ├─ rank providers → top 4 eager     │
│       ├─ hydrate from offline cache       │
│       ├─ lazy-fetch on scroll / idle      │
│       ├─ log engagement (async)           │
│       └─ render via card shell only       │
└─────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  Card Providers (client + optional RPC) │
│  weather, prices, wilaya-today, …       │
└─────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  Supabase (P0 minimal)                  │
│  hub_cards (registry)                   │
│  hub_feed_items (when needed)           │
│  hub_engagement_events                  │
│  RLS: read feed; insert own events      │
│  Admin: RPC for registry / CMS later    │
└─────────────────────────────────────────┘
```

**Integration point:** `renderAccountHub` in `js/mdz-account-hub.mjs` delegates to **`js/mdz-hub-core.mjs`**; one dynamic import from account modal—**do not** bloat `index.html` beyond that.

**Tests:** unit tests for role → default card set; contract tests for feed RPC; layout tests for hub overflow on 320px width.

---

## Phased delivery (recommended)

| Phase | Deliverable | Touches stable core? |
|-------|-------------|----------------------|
| **P0 — Spec + minimal schema** | This doc + migration for **P0 database MVP** only (`hub_cards`, events; feed optional) | No runtime change |
| **P1 — Hub engine MVP** | `mdz-hub-core`, Card Providers, top-4 + lazy, offline cache, **Today in your wilaya**, analytics | Account UI only |
| **P2 — CMS RPC** | Draft/review/publish + audit | New tables + RPC |
| **P3 — Vet suggest + buyer/feed layouts** | Role expansions | Hub module only |
| **P4 — External ingest** | WOAH/FAO jobs (scheduled) | Worker/cron separate from site |

Each phase: **one branch, one PR**, green `npm test`, `verify:prod` unchanged unless new static assets are added.

---

## Acceptance criteria (MVP — Breeder hub)

1. **Hub Engine** loads; **≤4 cards** fetch/render on open; additional cards appear only after lazy trigger (scroll or load-more).
2. **Today in your wilaya** visible when `profiles.wilaya` is set (composite or clear empty state if data missing).
3. At least **one atomic provider** uses live or cached platform data (weather and/or prices).
4. **Offline:** with network disabled after one successful visit, user still sees last payloads with **last updated** label.
5. **Analytics:** impression + at least one of `cta_click`, `dwell_ms`, or `hide` recorded to `hub_engagement_events`.
6. No change to registration success rate, login error rate, or admin RPC behavior (regression check).
7. Mobile layout: no horizontal scroll on 320px (layout tests).
8. **Hide preference** may ship P1.1; not a blocker for P1 engine proof.

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Scope creep (“full CMS”) | Phase gates; founder approves P2 before build |
| Unvetted health advice | Disclaimer + link to source; no diagnostic claims |
| API dependency failures | Cached fallback cards; degrade gracefully |
| Performance | Top-4 eager; provider-level lazy load; dynamic import per provider |
| Over-engineered P0 schema | Founder rule: minimal tables; add `hub_feed_items`/CMS when proven |
| Blank offline UX | IndexedDB/cache + stale timestamp copy |

---

## References

- Current account UI: `js/mdz-dashboards.mjs` → `renderAccountDashboard`
- Admin audit pattern: `supabase/migrations/008_admin_audit_and_roles.sql` (when merged)
- News/prices: `netlify/functions/news.mjs`, `assets/market-engine.js` (evaluate reuse)

---

## Decision requested

Approve **P0 + P1** as the next product epic after admin operations (008) is live in production, implemented **only** on `cursor/smart-profile-hub-*` branches without mixing registration or Auth changes.

**Implementers:** read **Hub framework**, **Card Provider model**, **Founder notes**, **P0 database MVP**, **Performance**, **Offline-first**, and **Analytics** before coding. Build **mdz-hub-core** + providers—not a monolithic account page. New platform services ship as **cards**, not new profile tabs.
