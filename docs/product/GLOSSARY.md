# MawashiDZ product glossary

**Last updated:** 2026-07-23  

Use these terms consistently in specs, PRs, and UI copy. See [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md) for full context.

| Term | Definition |
|------|------------|
| **Smart Workspace** | Role-specific **operational home** (see, do, manage, track, sell, buy)—not a passive dashboard. |
| **Dashboard** (avoid) | Legacy/product term for information-only screens; use **Smart Workspace** for new work. |
| **Smart Hub** | Modular **card framework** inside the workspace (daily insights pillar). |
| **Hub Engine** | Client core (`mdz-hub-core`): registry, rank, lazy load, offline cache, events. |
| **Card** | Single scannable unit in the Hub (weather, action alert, “Today in your wilaya”, etc.). |
| **Card Provider** | Module defining a card’s source, visibility, refresh, cache, and priority; **no direct SQL**. |
| **Design gate** | Question before any feature: *“Which workspace benefits from it?”* |
| **Today in your wilaya** | Hero composite card: weather, prices, alerts, events, headline—for member’s wilaya. |
| **Quick Actions bar** | Fixed top strip (add listing, messages, notifications, stats, profile)—does not scroll away. |
| **Action before content** | Hub prioritizes tasks/alerts over generic tips (e.g. missing price vs “tip of the day”). |
| **Rank R1–R4** | R1 member → R2 wilaya manager → R3 admin → R4 founder/super; **no upward data leakage**. |
| **Wilaya fence** | Managers see only their assigned wilaya’s data. |
| **PDR** | Product Decision Record — why we chose an approach; see `PRODUCT_DECISIONS/`. |
| **Product Constitution** | Binding product direction document; canonical path `docs/product/PRODUCT_CONSTITUTION.md`. |
| **Event bus** | Domain events (e.g. `AnimalListed`) fan out to Hub, stats, notifications, analytics. |
| **P0 minimal schema** | `hub_cards` + `hub_engagement_events`; defer large CMS/ingest tables until proven. |
| **Notification center** | Unified inbox—Phase 1 in [MEMBER_OPERATIONS.md](./MEMBER_OPERATIONS.md); ticket links in Phase 2 [SUPPORT_AND_MESSAGES_CENTER.md](./SUPPORT_AND_MESSAGES_CENTER.md). |
| **Support & Messages Center** | Purpose-bound messaging (not “chat”); becomes **tickets**. |
| **Ticket** | Thread with status, priority, wilaya, links to registration/listing/animal. |
| **Internal notes** | Staff-only notes on ticket/registration; founder, admin, assigned wilaya manager. |
| **Global search** | Permission-aware workspace search; same rules as list/detail APIs. |
| **Trusted Breeder** | Lifecycle stage after sales/ratings; see breeder lifecycle in constitution. |
| **ADR** | Architecture Decision Record (engineering); lives in `docs/adr/`, complements PDR. |

### Arabic UI phrases (reference)

| Concept | Arabic (product) |
|---------|------------------|
| Smart Workspace | مساحة عمل ذكية |
| Today in your wilaya | اليوم في ولايتك |
| Show my wilaya first | إظهار ولايتي أولًا |
| Start your first listing | ابدأ أول عرض لك |
