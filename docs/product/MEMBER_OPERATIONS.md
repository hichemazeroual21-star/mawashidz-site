# Member Operations (Phase 1)

**Mandatory before [Support & Messages Center](./SUPPORT_AND_MESSAGES_CENTER.md) and before Smart Workspace Hub P0**

| | |
|--|--|
| **Status** | Approved product specification |
| **Owner** | Founder / Product / Operations |
| **Roadmap** | [ROADMAP.md](./ROADMAP.md) — Phase 1 |
| **Constraint** | Dedicated branches/PRs; **RPC + RLS + audit**; no hidden-UI-only security |

Member journey covered here:

```text
Registration → review → password recovery → email/notifications → (then messaging phase) → Smart Workspace
```

Vision and rank rules: [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md).

---

## 1. Registration review workflow

Founders, admins, and wilaya managers (wilaya-scoped) run one **auditable** review pipeline.

| Capability | Detail |
|------------|--------|
| **Approve** | Update `profiles.status`; trigger notifications and stats |
| **Reject** | Reason visible to member (own request only) |
| **Request information** | Structured ask; member responds when messaging phase is live |
| **View profile** | Registration + profile context (rank-scoped) |
| **Secure RPC** | `admin_set_profile_status` and related RPCs—not browser PostgREST PATCH |
| **Audit log** | Every approve/reject/suspend/request-info (`admin_audit_log` pattern) |
| **Notifications** | Member informed on state change (hooks into notification center) |
| **Statistics** | Admin/manager dashboards: queue depth and outcomes |
| **Founder / Admin** | National scope |
| **Wilaya manager** | **Wilaya fence only** |

**Implementation:** migration **008** (audit + extended admin RPC) belongs to this pillar.

---

## 2. Password recovery

Complete before Hub launch.

| Step | Requirement |
|------|-------------|
| Forgot password | From login; email or approved identifier |
| Reset / confirm password | Token link; strength and match validation |
| Redirect & re-login | Clear success path |
| Link expiry & errors | Actionable AR/FR/EN copy |

**Supabase Auth**; customize templates where allowed.

---

## 3. Email architecture

| Channel | Owner | Use |
|---------|--------|-----|
| **Authentication emails** | Supabase Auth | Confirm, magic link, password reset |
| **Operational emails** | Resend or Brevo | Approval, rejection, status changes (ticket replies added in Phase 2) |
| **In-app notifications** | MawashiDZ + RLS | Feeds notification center |
| **Push** | Future | Same events as in-app |

---

## 4. Notification center (member)

In-app inbox in account / workspace shell (see constitution).

Examples: membership approved; listing rejected; health alert; *(“manager replied” deep-links to tickets in Phase 2)*.

Requirements: mark read / mark all; filter by type; deep links; **rank-safe** payloads.

---

## Phase 1 execution order

| Order | Deliverable |
|-------|-------------|
| **1.1** | Registration review (RPC, audit, dashboards) |
| **1.2** | Password recovery UX verified in production |
| **1.3** | Email architecture (Auth + operational provider for **status** events) |
| **1.4** | Notification center MVP (status + platform alerts; not full ticketing) |

Then proceed to **[Phase 2 — Support & Messages Center](./SUPPORT_AND_MESSAGES_CENTER.md)**.

---

## Related docs

- [SUPPORT_AND_MESSAGES_CENTER.md](./SUPPORT_AND_MESSAGES_CENTER.md) — tickets and messaging (separate delivery)  
- [ROADMAP.md](./ROADMAP.md) — full tree  
- `docs/REGISTRATION_FLOW_AUDIT.md` — do not break signup
