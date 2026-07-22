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
│       ├─ resolve role + wilaya + prefs  │
│       ├─ fetch hub_feed (RPC or view)   │
│       └─ render role dashboard cards    │
└─────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  Supabase: hub_content, hub_cards,      │
│  hub_user_preferences, ingest_jobs      │
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
