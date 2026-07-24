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

**Rule:** Do not add product features that increase debt in Open Phase 0 Must items without fixing or explicitly accepting risk in the PR.
