/**
 * MawashiDZ — account v2, wilaya manager & admin dashboards (v1.10.0)
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

function renderDashHero(variant, title, desc, liveLabel) {
  return `<div class="dash-hero ${variant}">
    <div class="dash-hero-glow" aria-hidden="true"></div>
    <p class="dash-kicker">MawashiDZ</p>
    <h3>${title}</h3>
    <p class="dash-lead">${desc}</p>
    <span class="dash-source"><span class="dash-live-dot" aria-hidden="true"></span>${liveLabel}</span>
  </div>`;
}

function renderQueueTable(t, rows, safeText, registrationRoleLabel) {
  if (!rows.length) {
    return `<div class="dash-empty"><span class="dash-empty-icon" aria-hidden="true">📋</span><p>${escapeHtml(t('dashEmptyQueue'))}</p></div>`;
  }
  const head = `<thead><tr>
    <th>${escapeHtml(t('acctRegId'))}</th>
    <th>${escapeHtml(t('acctFullName'))}</th>
    <th>${escapeHtml(t('acctRole'))}</th>
    <th>${escapeHtml(t('wilaya'))}</th>
    <th>${escapeHtml(t('acctStatus'))}</th>
  </tr></thead>`;
  const body = rows.slice(0, 50).map((row) => `<tr>
    <td dir="ltr">${escapeHtml(safeText(row.registration_id || row.registrationId || '—', 40))}</td>
    <td>${escapeHtml(safeText(row.full_name || row.first_name, 80))}</td>
    <td>${escapeHtml(registrationRoleLabel(row.role || row.user_type))}</td>
    <td>${escapeHtml(safeText(row.wilaya, 60))}</td>
    <td>${escapeHtml(safeText(row.status || t('accountPending'), 40))}</td>
  </tr>`).join('');
  return `<div class="dash-table-wrap"><table class="dash-table">${head}<tbody>${body}</tbody></table></div>`;
}

export function renderManagerDashboard(t, ctx) {
  const { wilaya, rows, source, safeText, registrationRoleLabel } = ctx;
  return `${renderDashHero(
    'manager',
    escapeHtml(t('mgrDashTitle')),
    escapeHtml(t('mgrDashDesc', { wilaya: wilaya || t('laterValue') })),
    escapeHtml(t('dashSourceLive')),
  )}
  <div class="dash-stats">
    <article class="stat-card stat-total"><strong>${rows.length}</strong><span>${escapeHtml(t('mgrDashPending'))}</span></article>
    <article class="stat-card stat-vet"><strong>${rows.filter((r) => String(r.role) === 'vet').length}</strong><span>${escapeHtml(t('roleVet'))}</span></article>
    <article class="stat-card stat-breeder"><strong>${rows.filter((r) => String(r.role) === 'breeder').length}</strong><span>${escapeHtml(t('roleBreeder'))}</span></article>
  </div>
  ${renderQueueTable(t, rows, safeText, registrationRoleLabel)}
  <p class="dash-callout">${escapeHtml(t('mgrDashNote'))}</p>`;
}

export function renderAdminDashboard(t, ctx) {
  const { stats, rows, source, safeText, registrationRoleLabel } = ctx;
  return `${renderDashHero(
    'admin',
    escapeHtml(t('adminDashTitle')),
    escapeHtml(t('adminDashDesc')),
    escapeHtml(t('dashSourceLive')),
  )}
  <div class="dash-stats admin">
    <article class="stat-card stat-total"><strong>${stats.total}</strong><span>${escapeHtml(t('adminStatTotal'))}</span></article>
    <article class="stat-card stat-vet"><strong>${stats.vets}</strong><span>${escapeHtml(t('roleVet'))}</span></article>
    <article class="stat-card stat-breeder"><strong>${stats.breeders}</strong><span>${escapeHtml(t('roleBreeder'))}</span></article>
    <article class="stat-card stat-manager"><strong>${stats.managers}</strong><span>${escapeHtml(t('roleManager'))}</span></article>
  </div>
  ${renderQueueTable(t, rows, safeText, registrationRoleLabel)}
  <p class="dash-callout">${escapeHtml(t('adminDashNote'))}</p>`;
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
