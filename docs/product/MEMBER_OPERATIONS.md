# Member Operations (sections 1–5)

Part of **[Member Operations & Communication](./MEMBER_OPERATIONS_AND_COMMUNICATION.md)** — **not** Support & Messages (see [SUPPORT_AND_MESSAGES_CENTER.md](./SUPPORT_AND_MESSAGES_CENTER.md)).

| | |
|--|--|
| **Constraint** | Dedicated branches/PRs per track; **RPC + RLS + audit** |

Vision and ranks: [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md).

---

## 1. Registration review

Product workflow for new members (founder, admin, wilaya manager within wilaya).

| Capability | Detail |
|------------|--------|
| Approve / reject / request information | Rank-scoped |
| View profile | Registration + profile context |
| Member-visible outcomes | Reject reasons for **own** request only |
| Wilaya manager | **Wilaya fence only** |

Triggers notifications and dashboard statistics (see **Admin operations**).

---

## 2. Admin operations

**Official engineering name** for the administration layer—**not** a replacement for registration review; it **implements** it securely.

| Capability | Detail |
|------------|--------|
| **Secure RPC** | `admin_set_profile_status` and related; no browser PostgREST PATCH for sensitive status |
| **Audit log** | `admin_audit_log` pattern; no silent deletes |
| **Dashboards** | Founder/admin and wilaya manager queues (read paths + actions via RPC) |
| **Role grants** | Founder/admin only; managers cannot self-elevate |
| **Migration 008** | Audit + extended admin RPC (when merged/deployed) |

This track is what teams often label **“Admin Operations”** in PRs and migrations.

---

## 3. Password recovery

| Step | Requirement |
|------|-------------|
| Forgot / reset / confirm | Supabase Auth |
| Redirect, expiry, errors | Actionable AR/FR/EN |
| Re-login | Session + profile load |

---

## 4. Email architecture

| Channel | Owner |
|---------|--------|
| Authentication | Supabase Auth |
| Operational | Resend or Brevo — approvals, rejections, status |
| In-app | Feeds notification center |
| Push | Future |

Ticket reply emails: extend in [Support & Messages](./SUPPORT_AND_MESSAGES_CENTER.md).

---

## 5. Notifications (in-app center)

MVP: membership status, platform alerts.  
Later: deep links to tickets (after Support & Messages track).

Mark read, filters, rank-safe payloads.

---

## Delivery tracks (this file only)

| Track | Sections |
|-------|----------|
| **A** | §1 + §2 (review + admin operations) |
| **B** | §3 |
| **C** | §4 |
| **D** | §5 |

Then §6 → [SUPPORT_AND_MESSAGES_CENTER.md](./SUPPORT_AND_MESSAGES_CENTER.md).
