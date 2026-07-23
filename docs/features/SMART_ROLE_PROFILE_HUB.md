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

Persist preferences and ranking hints **server-side** (`hub_user_preferences`, `hub_engagement_events`).

### Engagement layer (later phases—design hooks now)

Reserve card types and event names for:

- **Daily tip** (one card, rotates)
- **Weekly summary** (digest card + optional email later)
- **Achievement badges** (display-only at first)
- **Trusted member level** (ties to `profiles.status`, tenure, verified actions)
- **Profile completion** (progress meter card)
- **Smart reminders** (rule-based before ML)

Implementation can wait; **event logging** (`hub_card_impression`, `hub_card_click`) should be in P1 schema so Founder Dashboard has data later.

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

Requires `hub_engagement_events` (append-only) and aggregated views or nightly rollups—aligned with `admin_audit_log` access model.

### Implications for phased delivery

| Phase | Must include (vision-aligned) |
|-------|-------------------------------|
| P0 schema | `hub_card_definitions`, `hub_feed_items`, `hub_user_preferences`, `hub_engagement_events`, `content_provider` registry |
| P1 UI | Role templates + at least one **live** provider + impression logging |
| P2 CMS | Editorial workflow + vet suggest |
| P3 | Ranking v1 (role + wilaya + season) |
| P4 | External ingest workers per provider |
| P5 | Founder analytics dashboard + engagement cards |
| P6 | AI assistant slot |

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

---

## Technical approach (high level)

```text
┌─────────────────────────────────────────┐
│  accountModal / openAccount             │
│  └─ import hub module (lazy)            │
│       ├─ resolve role + wilaya + prefs    │
│       ├─ fetch hub_feed (RPC; ranked)   │
│       ├─ log impressions (async)        │
│       └─ render cards (+ AI slot stub)  │
└─────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  Content engine + Supabase              │
│  hub_providers, hub_feed_items,         │
│  hub_card_definitions,                  │
│  hub_user_preferences,                  │
│  hub_engagement_events                  │
│  RLS: read published for authenticated  │
│  Writes: RPC only (editor/admin)        │
└─────────────────────────────────────────┘
```

**Integration point:** extend `renderAccountDashboard` or add `renderAccountHub(t, profile, helpers)` in a **new** `js/mdz-account-hub.mjs` loaded only from account modal—**do not** bloat `index.html` monolith beyond one dynamic import.

**Tests:** unit tests for role → default card set; contract tests for feed RPC; layout tests for hub overflow on 320px width.

---

## Phased delivery (recommended)

| Phase | Deliverable | Touches stable core? |
|-------|-------------|----------------------|
| **P0 — Spec + schema** | This doc + migration draft for `hub_*` tables (separate PR) | No runtime change |
| **P1 — Breeder hub MVP** | Static + cached cards; weather/prices hooks | Account UI only |
| **P2 — CMS RPC** | Draft/review/publish + audit | New tables + RPC |
| **P3 — Vet suggest + buyer/feed layouts** | Role expansions | Hub module only |
| **P4 — External ingest** | WOAH/FAO jobs (scheduled) | Worker/cron separate from site |

Each phase: **one branch, one PR**, green `npm test`, `verify:prod` unchanged unless new static assets are added.

---

## Acceptance criteria (MVP — Breeder hub)

1. Logged-in breeder sees **≥6 cards** with role-relevant placeholders or live data.
2. At least **one** card uses existing platform data (e.g. wilaya weather or livestock prices).
3. User can **hide one card** and preference persists after reload (when P1.1 ships).
4. No change to registration success rate, login error rate, or admin RPC behavior (regression check).
5. Lighthouse/mobile layout: no new horizontal scroll on 320px (layout tests).

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Scope creep (“full CMS”) | Phase gates; founder approves P2 before build |
| Unvetted health advice | Disclaimer + link to source; no diagnostic claims |
| API dependency failures | Cached fallback cards; degrade gracefully |
| Performance | Lazy-load hub module; limit feed to N cards |

---

## References

- Current account UI: `js/mdz-dashboards.mjs` → `renderAccountDashboard`
- Admin audit pattern: `supabase/migrations/008_admin_audit_and_roles.sql` (when merged)
- News/prices: `netlify/functions/news.mjs`, `assets/market-engine.js` (evaluate reuse)

---

## Decision requested

Approve **P0 + P1** as the next product epic after admin operations (008) is live in production, implemented **only** on `cursor/smart-profile-hub-*` branches without mixing registration or Auth changes.

**Implementers:** read **Founder notes (long-term vision)** before writing schema or UI; optimize for extensibility (content engine, engagement events, AI slot), not for a one-off “articles tab”.
