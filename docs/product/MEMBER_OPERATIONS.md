# Member Operations — product requirements (§1–5)

Part of **[Member Operations & Communication](./MEMBER_OPERATIONS_AND_COMMUNICATION.md)**.  
**Implementation plan:** [ROADMAP.md](./ROADMAP.md) — not here.

Vision & ranks: [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md).

---

## 1. Registration review

### Goal

New members are reviewed fairly; outcomes are transparent to the applicant and auditable for operators.

### Requirements

- Approve, reject, or request additional information on membership applications.
- Operators view full registration and profile context needed for the decision (rank-scoped).
- Rejection and request-info reasons visible to the **applicant** for their own request.
- Wilaya managers act **only** within their wilaya.
- State changes trigger member notification and operator statistics (see §4–5).

### Permissions

| Actor | May |
|-------|-----|
| Founder / Admin | National queue; all actions |
| Wilaya manager | Wilaya queue only |
| Member | View own application status and messages tied to it |

### UX & scenarios

- Manager opens wilaya queue → sees pending applications with wilaya, role, date.
- Founder rejects with reason → member sees reason in account and notification.
- Manager requests document → member receives clear instructions (notification + later ticket link).

### Acceptance criteria (done when)

- [ ] Founder can **approve** a pending registration; member status updates correctly.
- [ ] Founder can **reject** with reason; member sees reason (own request only).
- [ ] Wilaya manager sees **only** their wilaya; cannot open another wilaya’s queue.
- [ ] **Request information** flow reaches the member with understandable copy.
- [ ] **Audit log** records each approve/reject/request-info (who, when, what).
- [ ] Member receives **notification** (and email when configured) on each outcome.
- [ ] Admin/manager **statistics** reflect queue changes after actions.
- [ ] **No** direct client update of sensitive `status` (authorized server actions only).
- [ ] Automated tests for permissions and happy paths are **green**.

---

## 2. Admin operations

### Goal

Provide the **operator surface** (queues, actions, audit) that implements registration review **securely** at scale.

### Requirements

- Central admin and wilaya manager workspaces show pending work and history.
- All sensitive mutations go through **authorized server actions** (not public table PATCH from browser).
- Immutable **audit trail** for admin/manager actions.
- Role assignment and platform configuration limited to founder/admin per constitution.

### Permissions

As §1; plus: managers **cannot** grant themselves higher roles or change national policy.

### UX & scenarios

- Admin filters registrations by status/wilaya/role.
- After action, queue refreshes without stale rows; audit entry visible to authorized ranks.

### Acceptance criteria (done when)

- [ ] Approve/reject/suspend/request-info from UI call **only** approved server endpoints.
- [ ] **Audit log** queryable for founder/admin; manager sees wilaya-scoped audit where policy allows.
- [ ] Dashboard counts match database after actions (no client-only counters).
- [ ] Manager **cannot** access founder-only configuration (verified by RLS/tests).
- [ ] Regression: registration signup path unchanged for anonymous users.
- [ ] Automated security/permission tests **green**.

*Engineering mapping (RPC names, migrations): ROADMAP track A.*

---

## 3. Password recovery

### Goal

Members who forget passwords recover access **without** support desk intervention in the common case.

### Requirements

- Forgot-password entry from login.
- Email (or approved identifier) reset flow with strength rules and confirmation.
- Clear handling of expired or invalid links.
- Successful reset → login → profile loads.

### Permissions

- Unauthenticated user: initiate reset for own email only.
- No operator can “set password” for member via this flow (separate support process if ever needed).

### UX & scenarios

- User requests reset → sees neutral confirmation (no email enumeration abuse where policy requires).
- Expired link → message explains next step (request again).

### Acceptance criteria (done when)

- [ ] **Forgot password** sends reset link when account exists (per Auth policy).
- [ ] **Reset + confirm** enforces password rules and match validation.
- [ ] **Expired/invalid** token shows actionable error (AR/FR/EN).
- [ ] After reset, user **logs in** and opens account successfully.
- [ ] Flow works on mobile viewport without horizontal scroll.
- [ ] Auth-related automated/layout tests **green**.

---

## 4. Email architecture

### Goal

Members and operators receive **trustworthy** email for auth and operational events.

### Requirements

- **Authentication email** (confirm, reset) via identity provider.
- **Operational email** (approval, rejection, key status changes) via approved transactional provider.
- Templates support AR/FR/EN where product requires.
- Operational emails respect linked context (member id, reference) when applicable.

### Permissions

- Only system events configured by admin/founder send operational mail; members cannot email other members directly via platform mail in this section.

### UX & scenarios

- Member approved → receives operational email with clear subject and link to account.
- Password reset → Auth email arrives with branded, understandable copy.

### Acceptance criteria (done when)

- [ ] Confirm and reset emails deliver in staging/production test accounts.
- [ ] At least **approval** and **rejection** operational templates live and triggered by review actions.
- [ ] Unsubscribe not required for transactional membership mail (product/legal as applicable).
- [ ] Failures logged; no silent drop without ops visibility.
- [ ] Ticket reply emails (if enabled) documented under Support & Messages acceptance.

---

## 5. Notifications (in-app center)

### Goal

Members see **one inbox** for platform events (status, alerts)—not scattered toasts only.

### Requirements

- List notifications with type, time, read/unread.
- Mark one read / mark all read; filter by type where useful.
- Deep link to relevant account area (ticket when Support & Messages is live).
- Payloads respect rank (no cross-wilaya leaks).

### Permissions

- Member sees **own** notifications only.
- System generates notifications from defined events (review outcomes, alerts, later ticket replies).

### UX & scenarios

- Member approved → badge on notification center → opens detail → links to profile/status.
- User clears all → state persists across reload (server-backed).

### Acceptance criteria (done when)

- [ ] Notification appears on **approve/reject** (minimum).
- [ ] **Mark read** / **mark all** persists after reload (not localStorage-only).
- [ ] **Filter by type** works for defined event types.
- [ ] Deep link opens correct screen (profile; ticket when track E live).
- [ ] Member cannot read another user’s notifications (RLS/tests).
- [ ] Mobile layout usable at 320px width.

---

## Section non-goals (§1–5)

- Not a replacement for Support & Messages (complex threads use [SUPPORT_AND_MESSAGES_CENTER.md](./SUPPORT_AND_MESSAGES_CENTER.md)).
- Not marketing bulk email in this section.
- Not push notifications (documented as future in roadmap).
