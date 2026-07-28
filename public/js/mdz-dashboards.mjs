/**
 * MawashiDZ — account v2, wilaya manager & admin dashboards (v1.10.0+)
 */

export const ADMIN_ROLES = new Set(['admin', 'founder', 'super_admin']);
export const MANAGER_ROLES = new Set(['wilaya_manager', 'manager', 'wilaya_mgr']);

export function statusKey(status) {
  const s = String(status || 'pending').toLowerCase();
  if (s === 'approved' || s === 'active') return 'approved';
  if (s === 'rejected') return 'rejected';
  if (s === 'suspended') return 'suspended';
  return 'pending';
}

/** Human registration status label — never expose raw enums to operators (MDZ-UI-004). */
export function registrationStatusLabel(t, status) {
  const key = statusKey(status);
  const map = {
    pending: 'statusPending',
    approved: 'statusApproved',
    rejected: 'statusRejected',
    suspended: 'statusSuspended',
  };
  return t(map[key] || 'statusPending');
}

export function statusProgressStep(status) {
  const map = { pending: 1, approved: 3, active: 3, rejected: 2, suspended: 2 };
  return map[String(status || 'pending').toLowerCase()] || 1;
}

export function parseRoles(rows) {
  return [...new Set((rows || []).map((r) => String(r.role || '').toLowerCase()).filter(Boolean))];
}

export function hasAdminAccess(roles) {
  return (roles || []).some((r) => ADMIN_ROLES.has(String(r || '').toLowerCase()));
}

/** Manager elevation comes from user_roles only — never profiles.role (membership type). */
export function hasManagerAccess(roles) {
  if (hasAdminAccess(roles)) return true;
  return (roles || []).some((r) => MANAGER_ROLES.has(String(r || '').toLowerCase()));
}

/** Client-side gate before RPC — server RLS/RPC remains source of truth. */
export function canReviewRegistration(roles, actorWilaya, rowWilaya, { asAdmin } = {}) {
  if (asAdmin || hasAdminAccess(roles || [])) return true;
  if (!hasManagerAccess(roles || [])) return false;
  const a = String(actorWilaya || '').trim();
  const b = String(rowWilaya || '').trim();
  return Boolean(a && b && a === b);
}

export function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderRegistrationStatusChip(t, status) {
  const key = statusKey(status);
  return `<span class="dash-status-chip mdz-status is-${key}">${escapeHtml(registrationStatusLabel(t, status))}</span>`;
}

export function renderStatusProgress(t, status) {
  const step = statusProgressStep(status);
  const labels = [
    t('acctStepSubmitted'),
    t('acctStepReview'),
    t('acctStepApproved'),
  ];
  const items = labels.map((label, i) => {
    const done = i + 1 <= step;
    const active = i + 1 === step;
    return `<div class="acct-progress-step${done ? ' done' : ''}${active ? ' active' : ''}"><span>${i + 1}</span><small>${escapeHtml(label)}</small></div>`;
  }).join('');
  return `<div class="acct-progress" aria-label="${escapeHtml(t('acctProgressAria'))}">${items}</div>`;
}

export function renderAccountTabs(t, active = 'profile') {
  // Elevated IA: five primary tabs (invites live under profile)
  const tabs = [
    ['profile', t('acctTabProfile')],
    ['request', t('acctTabRequest')],
    ['notifications', t('acctTabInbox')],
    ['support', t('acctTabSupport')],
    ['security', t('acctTabSecurity')],
  ];
  return `<div class="acct-tabs mdz-tabs" role="tablist">${tabs.map(([id, label]) =>
    `<button type="button" class="acct-tab mdz-tab${active === id ? ' on' : ''}" data-acct-tab="${id}" role="tab" aria-selected="${active === id}">${escapeHtml(label)}</button>`
  ).join('')}</div>`;
}

export function renderInvitePanel(t, inviteCode, safeText) {
  const code = safeText(inviteCode, 32) || '—';
  return `<div class="invite-panel"><div class="invite-label">${escapeHtml(t('succInviteLabel'))}</div><div class="invite-code" dir="ltr">${escapeHtml(code)}</div><div class="invite-actions"><button type="button" id="copyInviteCode">${escapeHtml(t('succCopyCode'))}</button><button type="button" id="shareInviteLink">${escapeHtml(t('succShareLink'))}</button></div></div>`;
}

export function renderAccountPanel(t, profile, tab, helpers) {
  const { safeText, registrationRoleLabel, statusLabel } = helpers;
  const p = profile || {};
  const memberId = p.member_id ? safeText(p.member_id, 40) : t('acctMemberPending');
  const fullName = safeText(p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(), 180) || t('acctDefaultName');
  const status = statusLabel(p.status);

  if (tab === 'request') {
    const reason = helpers.reviewReason
      ? helpers.reviewReason
      : '';
    const reasonBlock = reason
      ? `<div class="member-data review-reason"><small>${escapeHtml(t('acctReviewReason'))}</small><b>${escapeHtml(reason)}</b></div>`
      : (String(p.status || '').toLowerCase() === 'rejected'
        ? `<p class="acct-tab-note">${escapeHtml(t('acctReviewReasonMissing'))}</p>`
        : '');
    return `<div class="member-data-grid">
      <div class="member-data"><small>${escapeHtml(t('acctRegId'))}</small><b dir="ltr">${escapeHtml(safeText(p.registration_id, 60) || '—')}</b></div>
      <div class="member-data"><small>${escapeHtml(t('wilaya'))}</small><b>${escapeHtml(safeText(p.wilaya, 120) || '—')}</b></div>
      <div class="member-data"><small>${escapeHtml(t('daira'))}</small><b>${escapeHtml(safeText(p.daira, 120) || '—')}</b></div>
      <div class="member-data"><small>${escapeHtml(t('commune'))}</small><b>${escapeHtml(safeText(p.commune, 120) || '—')}</b></div>
      ${reasonBlock}
    </div>
    ${renderStatusProgress(t, p.status)}
    <p class="acct-tab-note">${escapeHtml(t('acctRequestNote'))}</p>`;
  }

  if (tab === 'notifications') {
    return `<div id="acctNotificationsMount"><p class="acct-tab-note">${escapeHtml(t('notifLoading'))}</p></div>`;
  }

  if (tab === 'support') {
    return `<div id="acctSupportMount"><p class="acct-tab-note">${escapeHtml(t('ticketLoading'))}</p></div>`;
  }

  if (tab === 'security') {
    return `<div class="member-data-grid">
      <div class="member-data"><small>${escapeHtml(t('email'))}</small><b dir="ltr">${escapeHtml(safeText(p.email, 120) || '—')}</b></div>
      <div class="member-data"><small>${escapeHtml(t('phone'))}</small><b dir="ltr">${escapeHtml(safeText(p.phone, 30) || '—')}</b></div>
    </div>
    <p class="acct-tab-note">${escapeHtml(t('acctSecurityNote'))}</p>
    <button class="mdz-btn mdz-btn-ghost" type="button" id="acctForgotBtn">${escapeHtml(t('forgotPassword'))}</button>`;
  }

  return `<div class="member-data-grid">
    <div class="member-data"><small>${escapeHtml(t('acctFullName'))}</small><b>${escapeHtml(fullName)}</b></div>
    <div class="member-data"><small>${escapeHtml(t('acctMemberId'))}</small><b dir="ltr">${escapeHtml(memberId)}</b></div>
    <div class="member-data"><small>${escapeHtml(t('acctRole'))}</small><b>${escapeHtml(registrationRoleLabel(p.role))}</b></div>
    <div class="member-data"><small>${escapeHtml(t('acctStatus'))}</small><b>${escapeHtml(status)}</b></div>
    <div class="member-data"><small>${escapeHtml(t('wilaya'))}</small><b>${escapeHtml(safeText(p.wilaya, 120) || '—')}</b></div>
    <div class="member-data"><small>${escapeHtml(t('phone'))}</small><b dir="ltr">${escapeHtml(safeText(p.phone, 30) || '—')}</b></div>
  </div>
  ${renderInvitePanel(t, p.invite_code, safeText)}
  <p class="acct-tab-note">${escapeHtml(t('acctInvitesNote'))}</p>`;
}

export function renderAccountDashboard(t, profile, helpers) {
  const { safeText, registrationRoleLabel, statusLabel } = helpers;
  const p = profile || {};
  const memberId = p.member_id ? safeText(p.member_id, 40) : '—';
  const fullName = safeText(p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(), 180) || t('acctDefaultName');

  return `<div class="mdz-product">
    ${renderAccountTabs(t, 'profile')}
    <div class="acct-panel" id="acctPanel">
      <div class="member-hero mdz-hero-quiet">
        <span class="member-id-chip mdz-chip" dir="ltr">${escapeHtml(memberId)}</span>
        <h2 class="member-name">${escapeHtml(fullName)}</h2>
        <p class="member-role">${escapeHtml(t('accountOf'))} ${escapeHtml(registrationRoleLabel(p.role))}</p>
        <span class="member-status-pill mdz-status is-${escapeHtml(statusKey(p.status))}">${escapeHtml(statusLabel(p.status))}</span>
      </div>
      ${renderAccountPanel(t, p, 'profile', helpers)}
    </div>
    <div class="acct-actions">
      <button class="mdz-btn mdz-btn-ghost" type="button" id="logoutBtn">${escapeHtml(t('logoutBtn'))}</button>
    </div>
  </div>`;
}

function truncateLabel(value, max = 42) {
  const s = String(value || '');
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function rowActionsHtml(t, row) {
  const status = statusKey(row.status);
  const regId = escapeHtml(String(row.registration_id || '').trim());
  const wilaya = escapeHtml(String(row.wilaya || '').trim());
  if (!regId) return `<span class="dash-muted">—</span>`;
  if (status !== 'pending') {
    return renderRegistrationStatusChip(t, row.status);
  }
  return `<div class="dash-row-actions">
    <button type="button" class="mdz-btn mdz-btn-primary mdz-btn-sm dash-action" data-review-action="approved" data-registration-id="${regId}" data-wilaya="${wilaya}">${escapeHtml(t('dashApprove'))}</button>
    <button type="button" class="mdz-btn mdz-btn-ghost mdz-btn-sm dash-action" data-review-action="rejected" data-registration-id="${regId}" data-wilaya="${wilaya}">${escapeHtml(t('dashReject'))}</button>
  </div>`;
}

function renderQueueCards(t, rows, safeText, registrationRoleLabel) {
  return `<div class="dash-card-list">${rows.map((row) => {
    const name = safeText(row.full_name || row.first_name, 80) || '—';
    const regId = safeText(row.registration_id || row.registrationId || '—', 40);
    return `<article class="dash-card">
      <header>
        <strong title="${escapeHtml(name)}">${escapeHtml(truncateLabel(name, 48))}</strong>
        ${renderRegistrationStatusChip(t, row.status)}
      </header>
      <dl>
        <div><dt>${escapeHtml(t('acctRegId'))}</dt><dd dir="ltr" title="${escapeHtml(regId)}">${escapeHtml(truncateLabel(regId, 28))}</dd></div>
        <div><dt>${escapeHtml(t('acctRole'))}</dt><dd>${escapeHtml(registrationRoleLabel(row.role || row.user_type))}</dd></div>
        <div><dt>${escapeHtml(t('wilaya'))}</dt><dd>${escapeHtml(safeText(row.wilaya, 60) || '—')}</dd></div>
      </dl>
      ${rowActionsHtml(t, row)}
    </article>`;
  }).join('')}</div>`;
}

/** Exported for unit coverage (MDZ-UI-004). */
export function renderQueueTable(t, rows, safeText, registrationRoleLabel) {
  if (!rows.length) {
    return `<div class="dash-empty">${escapeHtml(t('dashEmptyQueue'))}</div>`;
  }
  const head = `<thead><tr>
    <th scope="col">${escapeHtml(t('acctRegId'))}</th>
    <th scope="col">${escapeHtml(t('acctFullName'))}</th>
    <th scope="col">${escapeHtml(t('acctRole'))}</th>
    <th scope="col">${escapeHtml(t('wilaya'))}</th>
    <th scope="col">${escapeHtml(t('acctStatus'))}</th>
    <th scope="col">${escapeHtml(t('dashActions'))}</th>
  </tr></thead>`;
  const body = rows.slice(0, 50).map((row) => {
    const name = safeText(row.full_name || row.first_name, 80) || '—';
    const regId = safeText(row.registration_id || row.registrationId || '—', 40);
    return `<tr data-registration-id="${escapeHtml(String(row.registration_id || '').trim())}" class="dash-row">
    <td class="col-id" dir="ltr" title="${escapeHtml(regId)}">${escapeHtml(truncateLabel(regId, 22))}</td>
    <td class="col-name" title="${escapeHtml(name)}">${escapeHtml(truncateLabel(name, 28))}</td>
    <td class="col-meta">${escapeHtml(registrationRoleLabel(row.role || row.user_type))}</td>
    <td class="col-meta">${escapeHtml(safeText(row.wilaya, 60))}</td>
    <td class="col-status">${renderRegistrationStatusChip(t, row.status)}</td>
    <td class="col-actions">${rowActionsHtml(t, row)}</td>
  </tr>`;
  }).join('');
  return `<div class="dash-table-wrap"><table class="dash-table">${head}<tbody>${body}</tbody></table></div>
  ${renderQueueCards(t, rows.slice(0, 50), safeText, registrationRoleLabel)}`;
}

export function renderManagerDashboard(t, ctx) {
  const { wilaya, rows, safeText, registrationRoleLabel } = ctx;
  return `<div class="mdz-product">
  <div class="dash-hero manager mdz-hero-quiet">
    <h3>${escapeHtml(t('mgrDashTitle'))}</h3>
    <p>${escapeHtml(t('mgrDashDesc', { wilaya: wilaya || t('laterValue') }))}</p>
    <span class="dash-source">${escapeHtml(t('dashSourceLive'))}</span>
  </div>
  <div class="dash-stats">
    <article><strong>${rows.length}</strong><span>${escapeHtml(t('mgrDashPending'))}</span></article>
    <article><strong>${rows.filter((r) => String(r.role) === 'vet').length}</strong><span>${escapeHtml(t('roleVet'))}</span></article>
    <article><strong>${rows.filter((r) => String(r.role) === 'breeder').length}</strong><span>${escapeHtml(t('roleBreeder'))}</span></article>
  </div>
  <div id="opsSupportMount" class="mdz-ops-mount mdz-ops-command" aria-label="${escapeHtml(t('opsSupportTitle'))}"><div class="mdz-skeleton" style="height:120px"></div></div>
  <div class="mdz-ops-divider" role="separator"></div>
  <p class="mdz-eyebrow">${escapeHtml(t('opsReviewsEyebrow') || t('mgrDashPending'))}</p>
  <div id="dashQueueMount">${renderQueueTable(t, rows, safeText, registrationRoleLabel)}</div>
  <p class="dash-note" id="dashActionStatus" aria-live="polite"></p>
  <p class="dash-note">${escapeHtml(t('mgrDashNote'))}</p>
  </div>`;
}

export function renderAdminDashboard(t, ctx) {
  const { stats, rows, safeText, registrationRoleLabel } = ctx;
  return `<div class="mdz-product">
  <div class="dash-hero admin mdz-hero-quiet">
    <h3>${escapeHtml(t('adminDashTitle'))}</h3>
    <p>${escapeHtml(t('adminDashDesc'))}</p>
    <span class="dash-source">${escapeHtml(t('dashSourceLive'))}</span>
  </div>
  <div class="dash-stats admin">
    <article><strong>${stats.total}</strong><span>${escapeHtml(t('adminStatTotal'))}</span></article>
    <article><strong>${stats.vets}</strong><span>${escapeHtml(t('roleVet'))}</span></article>
    <article><strong>${stats.breeders}</strong><span>${escapeHtml(t('roleBreeder'))}</span></article>
    <article><strong>${stats.managers}</strong><span>${escapeHtml(t('roleManager'))}</span></article>
  </div>
  <div id="opsSupportMount" class="mdz-ops-mount mdz-ops-command" aria-label="${escapeHtml(t('opsSupportTitle'))}"><div class="mdz-skeleton" style="height:120px"></div></div>
  <div class="mdz-ops-divider" role="separator"></div>
  <p class="mdz-eyebrow">${escapeHtml(t('opsReviewsEyebrow') || t('adminStatTotal'))}</p>
  <div id="dashQueueMount">${renderQueueTable(t, rows, safeText, registrationRoleLabel)}</div>
  <p class="dash-note" id="dashActionStatus" aria-live="polite"></p>
  <p class="dash-note">${escapeHtml(t('adminDashNote'))}</p>
  </div>`;
}

export async function fetchUserRoles(token, restUrl, apiKey) {
  const r = await fetch(`${restUrl}/user_roles?select=role`, {
    headers: { apikey: apiKey, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return [];
  return r.json();
}

export async function fetchRegistrationsLive(token, restUrl, apiKey, wilayaFilter) {
  let url = `${restUrl}/registrations?select=registration_id,full_name,role,user_type,wilaya,status,created_at&order=created_at.desc&limit=80`;
  if (wilayaFilter) {
    url += `&wilaya=eq.${encodeURIComponent(wilayaFilter)}`;
  }
  const r = await fetch(url, {
    headers: { apikey: apiKey, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    const err = new Error(`registrations_fetch_failed_${r.status}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

export async function loadManagerData(token, restUrl, apiKey, wilaya) {
  const scoped = String(wilaya || '').trim();
  if (!scoped) {
    const err = new Error('manager_wilaya_required');
    err.code = 'manager_wilaya_required';
    throw err;
  }
  const rows = await fetchRegistrationsLive(token, restUrl, apiKey, scoped);
  return { rows, source: 'live' };
}

export async function loadAdminData(token, restUrl, apiKey) {
  const rows = await fetchRegistrationsLive(token, restUrl, apiKey, null);
  const stats = {
    total: rows.length,
    vets: rows.filter((r) => r.role === 'vet').length,
    breeders: rows.filter((r) => r.role === 'breeder').length,
    managers: rows.filter((r) => r.role === 'manager').length,
  };
  return { rows, stats, source: 'live' };
}

/**
 * Call SECURITY DEFINER RPC review_registration_status.
 * Never uses service_role; relies on JWT + server checks.
 */
export async function reviewRegistrationStatus(token, restUrl, apiKey, registrationId, newStatus, reason = null) {
  const r = await fetch(`${restUrl}/rpc/review_registration_status`, {
    method: 'POST',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      p_registration_id: String(registrationId || '').trim(),
      p_new_status: String(newStatus || '').trim(),
      p_reason: reason,
    }),
  });
  let payload = null;
  try { payload = await r.json(); } catch { payload = null; }
  if (!r.ok) {
    const err = new Error(payload?.message || payload?.error || `review_failed_${r.status}`);
    err.status = r.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

/** Wire approve/reject buttons; returns disposer. */
export function wireDashboardReviewActions(root, {
  t,
  token,
  restUrl,
  apiKey,
  roles,
  actorWilaya,
  asAdmin,
  onDone,
  isAccessCurrent,
}) {
  if (!root) return () => {};
  let busy = false;
  let alive = true;
  const statusEl = root.querySelector('#dashActionStatus');
  const accessStillValid = () => (
    alive
    && (typeof isAccessCurrent !== 'function' || isAccessCurrent())
  );

  const handler = async (event) => {
    if (!accessStillValid()) return;
    const btn = event.target.closest('[data-review-action]');
    if (!btn || !root.contains(btn)) return;
    const action = btn.getAttribute('data-review-action');
    const registrationId = btn.getAttribute('data-registration-id');
    const rowWilaya = btn.getAttribute('data-wilaya') || '';
    if (!action || !registrationId) return;

    if (!canReviewRegistration(roles, actorWilaya, rowWilaya, { asAdmin })) {
      if (statusEl) statusEl.textContent = t('dashNoAccess');
      return;
    }

    if (busy) return;
    busy = true;

    let reason = null;
    if (action === 'rejected') {
      let entered = null;
      try {
        const ops = await import('./mdz-member-ops.mjs');
        entered = await ops.openReasonDialog({
          title: t('dashRejectTitle') || t('dashReject'),
          body: t('dashRejectReasonHelp') || '',
          label: t('dashRejectReasonPrompt') || 'Rejection reason',
          placeholder: t('dashRejectReasonPh') || '',
          confirmLabel: t('dashReject'),
          cancelLabel: t('cancel') || 'Cancel',
          required: true,
          minLength: 3,
          tooShortMessage: t('dashRejectReasonShort') || '',
        });
      } catch (dialogErr) {
        console.error('openReasonDialog failed', dialogErr);
        busy = false;
        root.querySelectorAll('[data-review-action]').forEach((el) => { el.disabled = false; });
        if (statusEl) statusEl.textContent = t('dashReviewCancelled') || '';
        return;
      }
      if (entered === null) {
        busy = false;
        root.querySelectorAll('[data-review-action]').forEach((el) => { el.disabled = false; });
        if (statusEl) statusEl.textContent = t('dashReviewCancelled') || '';
        return;
      }
      reason = String(entered).trim() || null;
      if (!reason || reason.length < 3) {
        busy = false;
        root.querySelectorAll('[data-review-action]').forEach((el) => { el.disabled = false; });
        if (statusEl) statusEl.textContent = t('dashRejectReasonShort') || t('dashReviewFailed');
        return;
      }
    }

    if (!accessStillValid()) {
      busy = false;
      return;
    }
    root.querySelectorAll('[data-review-action]').forEach((el) => { el.disabled = true; });
    if (statusEl) statusEl.textContent = t('dashReviewWorking');

    try {
      await reviewRegistrationStatus(token, restUrl, apiKey, registrationId, action, reason);
      if (!accessStillValid()) return;
      if (statusEl) statusEl.textContent = action === 'approved' ? t('dashReviewApproved') : t('dashReviewRejected');
      if (typeof onDone === 'function') await onDone({ registrationId, action, reason });
    } catch (error) {
      console.error('review_registration_status failed', error);
      if (statusEl) statusEl.textContent = t('dashReviewFailed');
      root.querySelectorAll('[data-review-action]').forEach((el) => { el.disabled = false; });
    } finally {
      busy = false;
    }
  };

  root.addEventListener('click', handler);
  return () => {
    alive = false;
    root.removeEventListener('click', handler);
  };
}
