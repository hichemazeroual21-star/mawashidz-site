# Technical Debt Register

Lightweight living list. Add items when shipping shortcuts. Clear when fixed.

| ID | Debt | Why incurred | Risk if ignored | Target phase | Status |
|----|------|--------------|-----------------|--------------|--------|
| TD-001 | Dual migration paths (001–009 vs timestamped) | Legacy production compatibility | Fresh install / drift | ADR-002 accepted; blank-install drill pending | **Mitigated** |
| TD-002 | `setup.sql` vs full RPC parity | setup is baseline; 003–009 add RPCs | Incomplete fresh ops without 003–009 | Documented in README | Mitigated |
| TD-003 | `user_roles` missing from old setup | Assumed pre-existing DB | Fresh install fail | Phase 0 — fixed in setup + 008 | **Closed** |
| TD-004 | Monolithic `index.html` | Speed of iteration | Maintainability | Ongoing extract | Open |
| TD-005 | Open INSERT policies | Early public forms | Spam/abuse | Phase 0.6 — length checks + phone rate guard | **Mitigated** |
| TD-006 | No CI workflow | Not yet added | Regressions | Phase 0.5 — `.github/workflows/ci.yml` | **Closed** |
| TD-007 | `docs/database-schema.md` incomplete | Docs lag | Wrong mental model | Phase 0.7 — expanded | **Closed** |
| TD-008 | Audit log missing on main | Parallel work | No forensic trail | Phase 0.4 — migration 008 | **Closed** |
| TD-009 | Role alias sprawl (`manager` / `wilaya_mgr`) | Historical naming | Authz bugs | Phase 1 | Open |
| TD-010 | Dual product vs constitution roadmaps | Parallel docs | Confusion | Constitution ROADMAP | **Closed** |
| TD-011 | `registrations.status` missing from old setup | Legacy schema | Dashboard/RPC break | Phase 0 — setup + 009 | **Closed** |
| TD-012 | Edge/WAF rate limits not configured | Needs Cloudflare/Supabase ops | Residual spam | Ops follow-up | Open |
| TD-013 | Contact/feedback admin read RLS absent | Phase 1 messaging | Blind inbox | Phase 1 | Open |
| TD-014 | Email claim race / missing processing state | Phase 1 MVP speed | Duplicate sends | Phase 1 elevation — 012 lease | **Closed** |
| TD-015 | No email cron | Phase 1 MVP | Outbox never drains | Worker cron `*/2` | **Closed** |
| TD-016 | No operator Support Center UI | Phase 1 MVP | Ops half missing | Manager/admin queue UI | **Closed** |
| TD-017 | Notification deep links unused | Phase 1 MVP | Dead links | Hash + Open handlers + `#admin-dash` | **Closed** |
| TD-018 | Probeable SECURITY DEFINER helpers | Phase 1 MVP | Info disclosure | No-arg helpers in 012 | **Closed** |
| TD-019 | Manager review audit gap | Phase 1 MVP | Forensic hole | Audit all reviews in 012 | **Closed** |
| TD-020 | Prototype UI (prompt, enums) | Phase 1 MVP | Trust/UX | Dialog only; `window.prompt` removed from reject | **Closed** |
| TD-021 | Modal-hosted product shell | Static-site architecture | Not workspace-class IA | Full Smart Workspace = Future after Phase 2–3; light shell only if Board prompts | Open |
| TD-022 | No live RLS integration tests | Static SQL tests only | False confidence | Phase 1 follow-up | Open |
| TD-027 | Support fetch error ≡ empty | Catch collapses to empty list | Ops trust loss | Distinguish error/retry vs empty (MDZ-P1-UX-002 candidate) | Open |
| TD-028 | Raw enums in review/ops priority UI | MVP speed | Non-human status language | Status/priority lexicon i18n (MDZ-P1-UX-003) | Open |
| TD-029 | Dual marketing vs product chrome | Brochure + DS coexist | Visual inconsistency | Align account/ops to DS tokens (MDZ-P1-UX-006) | Open |
| TD-030 | Incomplete a11y (bell EN label, dialog focus trap) | MVP | A11y gate fail | Localize bell + focus trap (MDZ-P1-UX-004) | Open |
| TD-031 | Support list missing skeleton | Incomplete triad | Loading inconsistency | Match notifications skeleton (MDZ-P1-UX-005) | Open |
| TD-023 | Outbox attempt exhaustion while awaiting Resend | Elevation 012 claim bump | Stranded mail without key | 013 awaiting_* attempt undo | **Closed** |
| TD-024 | Duplicate send after Resend OK / mark fail | Crash window | Double email | Idempotency-Key + `provider_message_id` reconcile | **Closed** |
| TD-025 | Service-role accepted as outbox HTTP bearer | Convenience fallback | Authz bypass risk | Require distinct `EMAIL_OUTBOX_SECRET` | **Closed** |
| TD-026 | Non-atomic 1-arg claim fallback | Pre-012 compat | Race / double send | Fail-closed; drop 1-arg claim | **Closed** |

**Rule:** Do not add product features that increase debt in Open Phase 0 Must items without fixing or explicitly accepting risk in the PR.
