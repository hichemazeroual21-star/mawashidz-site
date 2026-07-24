# Technical Debt Register

Lightweight living list. Add items when shipping shortcuts. Clear when fixed.

| ID | Debt | Why incurred | Risk if ignored | Target phase | Status |
|----|------|--------------|-----------------|--------------|--------|
| TD-001 | Dual migration paths (001–007 vs timestamped) | Legacy production compatibility | Fresh install / drift | Phase 0 | Open |
| TD-002 | `setup.sql` incomplete vs production | Incremental hotfixes | Broken new environments | Phase 0 | Open |
| TD-003 | `user_roles` not created in repo setup | Assumed pre-existing DB | Fresh install fail | Phase 0 | Open |
| TD-004 | Monolithic `index.html` | Speed of iteration | Maintainability | Ongoing extract | Open |
| TD-005 | Open INSERT policies on registrations/contact | Early public forms | Spam/abuse | Phase 0.6 | Open |
| TD-006 | No CI workflow | Not yet added | Regressions | Phase 0.5 | Open |
| TD-007 | `docs/database-schema.md` incomplete | Docs lag | Wrong mental model | Phase 0.7 | Open |
| TD-008 | Audit log on branch not main | Parallel work | No forensic trail | Phase 0.4 | Open |
| TD-009 | Role alias sprawl (`manager` / `wilaya_mgr`) | Historical naming | Authz bugs | Phase 1 | Open |
| TD-010 | Dual product vs constitution roadmaps (historical) | Parallel docs | Confusion | Resolved by constitution ROADMAP | Closed |

**Rule:** Do not add product features that increase debt in Open Phase 0 items without fixing or explicitly accepting risk in the PR.
