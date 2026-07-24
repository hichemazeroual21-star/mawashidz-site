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

export function statusProgressStep(status) {
  const map = { pending: 1, approved: 3, active: 3, rejected: 2, suspended: 2 };
  return map[String(status || 'pending').toLowerCase()] || 1;
}

export function parseRoles(rows) {
  return [...new Set((rows || []).map((r) => String(r.role || '').toLowerCase()).filter(Boolean))];
}

export function hasAdminAccess(roles) {
  return roles.some((r) => ADMIN_ROLES.has(r));
}

export function hasManagerAccess(roles, profileRole) {
  if (hasAdminAccess(roles)) return true;
  if (roles.some((r) => MANAGER_ROLES.has(r))) return true;
  return String(profileRole || '').toLowerCase() === 'manager';
}

/** Client-side gate before RPC — server RLS/RPC remains source of truth. */
export function canReviewRegistration(roles, actorWilaya, rowWilaya, { asAdmin, profileRole } = {}) {
  if (asAdmin || hasAdminAccess(roles || [])) return true;
  // Honor profiles.role=manager when user_roles has no manager row.
  if (!hasManagerAccess(roles || [], profileRole)) return false;
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
  const tabs = [
    ['profile', t('acctTabProfile')],
    ['request', t('acctTabRequest')],
    ['invites', t('acctTabInvites')],
    ['security', t('acctTabSecurity')],
  ];
  return `<div class="acct-tabs" role="tablist">${tabs.map(([id, label]) =>
    `<button type="button" class="acct-tab${active === id ? ' on' : ''}" data-acct-tab="${id}" role="tab" aria-selected="${active === id}">${escapeHtml(label)}</button>`
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
    return `<div class="member-data-grid">
      <div class="member-data"><small>${escapeHtml(t('acctRegId'))}</small><b dir="ltr">${escapeHtml(safeText(p.registration_id, 60) || '—')}</b></div>
      <div class="member-data"><small>${escapeHtml(t('wilaya'))}</small><b>${escapeHtml(safeText(p.wilaya, 120) || '—')}</b></div>
      <div class="member-data"><small>${escapeHtml(t('daira'))}</small><b>${escapeHtml(safeText(p.daira, 120) || '—')}</b></div>
      <div class="member-data"><small>${escapeHtml(t('commune'))}</small><b>${escapeHtml(safeText(p.commune, 120) || '—')}</b></div>
    </div>
    ${renderStatusProgress(t, p.status)}
    <p class="acct-tab-note">${escapeHtml(t('acctRequestNote'))}</p>`;
  }

  if (tab === 'invites') {
    return `${renderInvitePanel(t, p.invite_code, safeText)}
    <p class="acct-tab-note">${escapeHtml(t('acctInvitesNote'))}</p>`;
  }

  if (tab === 'security') {
    return `<div class="member-data-grid">
      <div class="member-data"><small>${escapeHtml(t('email'))}</small><b dir="ltr">${escapeHtml(safeText(p.email, 120) || '—')}</b></div>
      <div class="member-data"><small>${escapeHtml(t('phone'))}</small><b dir="ltr">${escapeHtml(safeText(p.phone, 30) || '—')}</b></div>
    </div>
    <p class="acct-tab-note">${escapeHtml(t('acctSecurityNote'))}</p>
    <button class="btn ghost" type="button" id="acctForgotBtn">${escapeHtml(t('forgotPassword'))}</button>`;
  }

  return `<div class="member-data-grid">
    <div class="member-data"><small>${escapeHtml(t('acctFullName'))}</small><b>${escapeHtml(fullName)}</b></div>
    <div class="member-data"><small>${escapeHtml(t('acctMemberId'))}</small><b dir="ltr">${escapeHtml(memberId)}</b></div>
    <div class="member-data"><small>${escapeHtml(t('acctRole'))}</small><b>${escapeHtml(registrationRoleLabel(p.role))}</b></div>
    <div class="member-data"><small>${escapeHtml(t('acctStatus'))}</small><b>${escapeHtml(status)}</b></div>
    <div class="member-data"><small>${escapeHtml(t('wilaya'))}</small><b>${escapeHtml(safeText(p.wilaya, 120) || '—')}</b></div>
    <div class="member-data"><small>${escapeHtml(t('phone'))}</small><b dir="ltr">${escapeHtml(safeText(p.phone, 30) || '—')}</b></div>
  </div>`;
}

export function renderAccountDashboard(t, profile, helpers) {
  const { safeText, registrationRoleLabel, statusLabel } = helpers;
  const p = profile || {};
  const memberId = p.member_id ? safeText(p.member_id, 40) : '—';
  const fullName = safeText(p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(), 180) || t('acctDefaultName');

  return `${renderAccountTabs(t, 'profile')}
    <div class="acct-panel" id="acctPanel">
      <div class="member-hero">
        <span class="member-id-chip" dir="ltr">${escapeHtml(memberId)}</span>
        <h2 class="member-name">${escapeHtml(fullName)}</h2>
        <p class="member-role">${escapeHtml(t('accountOf'))} ${escapeHtml(registrationRoleLabel(p.role))}</p>
        <span class="member-status-pill">${escapeHtml(statusLabel(p.status))}</span>
      </div>
      ${renderAccountPanel(t, p, 'profile', helpers)}
    </div>
    <div class="acct-actions">
      <button class="btn ghost" type="button" id="logoutBtn">${escapeHtml(t('logoutBtn'))}</button>
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
    return `<span class="dash-status-chip ${status}">${escapeHtml(String(row.status || status))}</span>`;
  }
  return `<div class="dash-row-actions">
    <button type="button" class="btn primary dash-action" data-review-action="approved" data-registration-id="${regId}" data-wilaya="${wilaya}">${escapeHtml(t('dashApprove'))}</button>
    <button type="button" class="btn ghost dash-action" data-review-action="rejected" data-registration-id="${regId}" data-wilaya="${wilaya}">${escapeHtml(t('dashReject'))}</button>
  </div>`;
}

function renderQueueCards(t, rows, safeText, registrationRoleLabel) {
  return `<div class="dash-card-list">${rows.map((row) => {
    const name = safeText(row.full_name || row.first_name, 80) || '—';
    const regId = safeText(row.registration_id || row.registrationId || '—', 40);
    return `<article class="dash-card">
      <header>
        <strong title="${escapeHtml(name)}">${escapeHtml(truncateLabel(name, 48))}</strong>
        <span class="dash-status-chip ${statusKey(row.status)}">${escapeHtml(safeText(row.status || t('accountPending'), 40))}</span>
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

function renderQueueTable(t, rows, safeText, registrationRoleLabel) {
  if (!rows.length) {
    return `<div class="dash-empty">${escapeHtml(t('dashEmptyQueue'))}</div>`;
  }
  const head = `<thead><tr>
    <th>${escapeHtml(t('acctRegId'))}</th>
    <th>${escapeHtml(t('acctFullName'))}</th>
    <th>${escapeHtml(t('acctRole'))}</th>
    <th>${escapeHtml(t('wilaya'))}</th>
    <th>${escapeHtml(t('acctStatus'))}</th>
    <th>${escapeHtml(t('dashActions'))}</th>
  </tr></thead>`;
  const body = rows.slice(0, 50).map((row) => {
    const name = safeText(row.full_name || row.first_name, 80) || '—';
    const regId = safeText(row.registration_id || row.registrationId || '—', 40);
    return `<tr data-registration-id="${escapeHtml(String(row.registration_id || '').trim())}">
    <td dir="ltr" title="${escapeHtml(regId)}">${escapeHtml(truncateLabel(regId, 22))}</td>
    <td title="${escapeHtml(name)}">${escapeHtml(truncateLabel(name, 28))}</td>
    <td>${escapeHtml(registrationRoleLabel(row.role || row.user_type))}</td>
    <td>${escapeHtml(safeText(row.wilaya, 60))}</td>
    <td><span class="dash-status-chip ${statusKey(row.status)}">${escapeHtml(safeText(row.status || t('accountPending'), 40))}</span></td>
    <td>${rowActionsHtml(t, row)}</td>
  </tr>`;
  }).join('');
  return `<div class="dash-table-wrap"><table class="dash-table">${head}<tbody>${body}</tbody></table></div>
  ${renderQueueCards(t, rows.slice(0, 50), safeText, registrationRoleLabel)}`;
}

export function renderManagerDashboard(t, ctx) {
  const { wilaya, rows, safeText, registrationRoleLabel } = ctx;
  return `<div class="dash-hero manager">
    <h3>${escapeHtml(t('mgrDashTitle'))}</h3>
    <p>${escapeHtml(t('mgrDashDesc', { wilaya: wilaya || t('laterValue') }))}</p>
    <span class="dash-source">${escapeHtml(t('dashSourceLive'))}</span>
  </div>
  <div class="dash-stats">
    <article><strong>${rows.length}</strong><span>${escapeHtml(t('mgrDashPending'))}</span></article>
    <article><strong>${rows.filter((r) => String(r.role) === 'vet').length}</strong><span>${escapeHtml(t('roleVet'))}</span></article>
    <article><strong>${rows.filter((r) => String(r.role) === 'breeder').length}</strong><span>${escapeHtml(t('roleBreeder'))}</span></article>
  </div>
  <div id="dashQueueMount">${renderQueueTable(t, rows, safeText, registrationRoleLabel)}</div>
  <p class="dash-note" id="dashActionStatus" aria-live="polite"></p>
  <p class="dash-note">${escapeHtml(t('mgrDashNote'))}</p>`;
}

export function renderAdminDashboard(t, ctx) {
  const { stats, rows, safeText, registrationRoleLabel } = ctx;
  return `<div class="dash-hero admin">
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
  <div id="dashQueueMount">${renderQueueTable(t, rows, safeText, registrationRoleLabel)}</div>
  <p class="dash-note" id="dashActionStatus" aria-live="polite"></p>
  <p class="dash-note">${escapeHtml(t('adminDashNote'))}</p>`;
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
  const rows = await fetchRegistrationsLive(token, restUrl, apiKey, wilaya);
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
  profileRole,
  onDone,
}) {
  if (!root) return () => {};
  let busy = false;
  const statusEl = root.querySelector('#dashActionStatus');

  const handler = async (event) => {
    const btn = event.target.closest('[data-review-action]');
    if (!btn || !root.contains(btn)) return;
    const action = btn.getAttribute('data-review-action');
    const registrationId = btn.getAttribute('data-registration-id');
    const rowWilaya = btn.getAttribute('data-wilaya') || '';
    if (!action || !registrationId) return;

    if (!canReviewRegistration(roles, actorWilaya, rowWilaya, { asAdmin, profileRole })) {
      if (statusEl) statusEl.textContent = t('dashNoAccess');
      return;
    }

    if (busy) return;
    busy = true;
    root.querySelectorAll('[data-review-action]').forEach((el) => { el.disabled = true; });
    if (statusEl) statusEl.textContent = t('dashReviewWorking');

    try {
      await reviewRegistrationStatus(token, restUrl, apiKey, registrationId, action);
      if (statusEl) statusEl.textContent = action === 'approved' ? t('dashReviewApproved') : t('dashReviewRejected');
      if (typeof onDone === 'function') await onDone({ registrationId, action });
    } catch (error) {
      console.error('review_registration_status failed', error);
      if (statusEl) statusEl.textContent = t('dashReviewFailed');
      root.querySelectorAll('[data-review-action]').forEach((el) => { el.disabled = false; });
    } finally {
      busy = false;
    }
  };

  root.addEventListener('click', handler);
  return () => root.removeEventListener('click', handler);
}
