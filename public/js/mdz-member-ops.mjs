/**
 * MawashiDZ Phase 1 — Member Operations (elevated)
 * Notifications, support tickets, operator queue, reason dialog.
 * Server RLS/RPC remain source of truth. Client uses JWT + publishable key only.
 */

export function parseReviewReason(message) {
  if (message == null) return '';
  const raw = String(message).trim();
  if (!raw) return '';
  if (raw.startsWith('{')) {
    try {
      const obj = JSON.parse(raw);
      return String(obj.review_reason || obj.reason || '').trim();
    } catch {
      return '';
    }
  }
  return '';
}

export function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Map notification link_path to an in-app surface id (for deep links). */
export function resolveNotificationDeepLink(link) {
  const l = String(link || '').toLowerCase();
  if (!l) return 'inbox';
  if (l.includes('admin-dash') || (l.includes('#admin') && !l.includes('account'))) return 'admin';
  if (l.includes('manager-dash') || l.includes('#manager')) return 'manager';
  if (l.includes('support')) return 'support';
  if (l.includes('request')) return 'request';
  if (l.includes('inbox') || l.includes('notification')) return 'inbox';
  return 'inbox';
}

export function formatWhen(iso, lang = 'ar') {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(lang === 'ar' ? 'ar-DZ' : lang);
  } catch {
    return String(iso).slice(0, 16).replace('T', ' ');
  }
}

const TICKET_STATUS_KEYS = {
  open: 'ticketStatusOpen',
  in_review: 'ticketStatusInReview',
  waiting_for_member: 'ticketStatusWaitingMember',
  escalated: 'ticketStatusEscalated',
  closed: 'ticketStatusClosed',
};

const TICKET_PRIORITY_KEYS = {
  low: 'ticketPriorityLow',
  normal: 'ticketPriorityNormal',
  high: 'ticketPriorityHigh',
  urgent: 'ticketPriorityUrgent',
};

export function ticketStatusLabel(t, status) {
  const key = TICKET_STATUS_KEYS[status];
  return key ? t(key) : String(status || '—');
}

export function ticketPriorityLabel(t, priority) {
  const p = String(priority || 'normal').toLowerCase();
  const key = TICKET_PRIORITY_KEYS[p];
  return key ? t(key) : t('ticketPriorityNormal');
}

export function statusChip(t, status) {
  const s = String(status || '').toLowerCase();
  return `<span class="mdz-status is-${escapeHtml(s)}">${escapeHtml(ticketStatusLabel(t, s))}</span>`;
}

export function priorityChip(t, priority) {
  const p = String(priority || 'normal').toLowerCase();
  return `<span class="mdz-status is-priority-${escapeHtml(p)}">${escapeHtml(ticketPriorityLabel(t, p))}</span>`;
}

/** Trust-grade fetch failure — never collapse to empty (MDZ-UI-001). */
export function renderFetchError(t, { titleKey = 'ticketErrorTitle', bodyKey = 'ticketError', retryId = 'supportRetryBtn' } = {}) {
  return `<div class="mdz-empty mdz-error" role="alert" data-mdz-fetch-error="1">
    <strong>${escapeHtml(t(titleKey))}</strong>
    <p>${escapeHtml(t(bodyKey))}</p>
    <button type="button" class="mdz-btn mdz-btn-ghost" id="${escapeHtml(retryId)}">${escapeHtml(t('notifRefresh'))}</button>
  </div>`;
}

export async function rpcPost(token, restUrl, apiKey, fn, body) {
  const r = await fetch(`${restUrl}/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body || {}),
  });
  let payload = null;
  try {
    payload = await r.json();
  } catch {
    payload = null;
  }
  if (!r.ok) {
    const err = new Error(payload?.message || payload?.error || `${fn}_failed_${r.status}`);
    err.status = r.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

export function listMyNotifications(token, restUrl, apiKey, { limit = 40, unreadOnly = false } = {}) {
  return rpcPost(token, restUrl, apiKey, 'list_my_notifications', {
    p_limit: limit,
    p_unread_only: unreadOnly,
  });
}

export function markNotificationRead(token, restUrl, apiKey, id) {
  return rpcPost(token, restUrl, apiKey, 'mark_notification_read', {
    p_notification_id: id,
  });
}

export function markAllNotificationsRead(token, restUrl, apiKey) {
  return rpcPost(token, restUrl, apiKey, 'mark_all_notifications_read', {});
}

export function countUnreadNotifications(token, restUrl, apiKey) {
  return rpcPost(token, restUrl, apiKey, 'count_my_unread_notifications', {});
}

export function createSupportTicket(token, restUrl, apiKey, { requestType, subject, body }) {
  return rpcPost(token, restUrl, apiKey, 'create_support_ticket', {
    p_request_type: requestType,
    p_subject: subject,
    p_body: body,
  });
}

export function replySupportTicket(token, restUrl, apiKey, ticketId, body) {
  return rpcPost(token, restUrl, apiKey, 'reply_support_ticket', {
    p_ticket_id: ticketId,
    p_body: body,
  });
}

export function setSupportTicketStatus(token, restUrl, apiKey, ticketId, status) {
  return rpcPost(token, restUrl, apiKey, 'set_support_ticket_status', {
    p_ticket_id: ticketId,
    p_status: status,
  });
}

export function addSupportInternalNote(token, restUrl, apiKey, ticketId, body) {
  return rpcPost(token, restUrl, apiKey, 'add_support_internal_note', {
    p_ticket_id: ticketId,
    p_body: body,
  });
}

export async function fetchMyTickets(token, restUrl, apiKey) {
  const r = await fetch(
    `${restUrl}/support_tickets?select=id,ticket_code,request_type,subject,status,priority,wilaya,created_at,updated_at,linked_registration_id,assigned_to&order=updated_at.desc&limit=40`,
    { headers: { apikey: apiKey, Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) {
    const err = new Error(`tickets_fetch_failed_${r.status}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

/** Staff queue — same table; RLS returns wilaya-scoped or all for admins. */
export async function fetchOperatorTickets(token, restUrl, apiKey, { status = '', q = '' } = {}) {
  let url = `${restUrl}/support_tickets?select=id,ticket_code,request_type,subject,status,priority,wilaya,created_at,updated_at,created_by,assigned_to,linked_registration_id&order=updated_at.desc&limit=80`;
  if (status) url += `&status=eq.${encodeURIComponent(status)}`;
  const r = await fetch(url, {
    headers: { apikey: apiKey, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    const err = new Error(`ops_tickets_failed_${r.status}`);
    err.status = r.status;
    throw err;
  }
  let rows = await r.json();
  if (q) {
    const needle = String(q).toLowerCase();
    rows = rows.filter(
      (tk) =>
        String(tk.subject || '').toLowerCase().includes(needle) ||
        String(tk.ticket_code || '').toLowerCase().includes(needle) ||
        String(tk.request_type || '').toLowerCase().includes(needle),
    );
  }
  return rows;
}

export async function fetchTicketMessages(token, restUrl, apiKey, ticketId) {
  const r = await fetch(
    `${restUrl}/support_messages?select=id,ticket_id,author_id,body,created_at&ticket_id=eq.${encodeURIComponent(ticketId)}&order=created_at.asc`,
    { headers: { apikey: apiKey, Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) {
    const err = new Error(`ticket_messages_failed_${r.status}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

export async function fetchInternalNotes(token, restUrl, apiKey, ticketId) {
  const r = await fetch(
    `${restUrl}/support_internal_notes?select=id,ticket_id,author_id,body,created_at&ticket_id=eq.${encodeURIComponent(ticketId)}&order=created_at.asc`,
    { headers: { apikey: apiKey, Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) {
    const err = new Error(`ticket_notes_failed_${r.status}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

/**
 * Accessible reason dialog — replaces window.prompt for rejections / confirmations.
 * Focus: initial field focus, Tab trap, Escape + restore previous focus (MDZ-UI-007).
 * @returns {Promise<string|null>}
 */
export function openReasonDialog({
  title,
  body,
  label,
  placeholder = '',
  confirmLabel,
  cancelLabel,
  required = true,
  minLength = 3,
  tooShortMessage = '',
} = {}) {
  return new Promise((resolve) => {
    document.getElementById('mdz-reason-dialog')?.remove();
    const previouslyFocused = document.activeElement;

    const backdrop = document.createElement('div');
    backdrop.id = 'mdz-reason-dialog';
    backdrop.className = 'mdz-dialog-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'mdz-reason-title');

    backdrop.innerHTML = `
      <div class="mdz-dialog">
        <h3 id="mdz-reason-title">${escapeHtml(title || '')}</h3>
        ${body ? `<p>${escapeHtml(body)}</p>` : ''}
        <label class="mdz-field" for="mdz-reason-input">
          <span>${escapeHtml(label || '')}</span>
          <textarea id="mdz-reason-input" class="mdz-textarea" rows="4" placeholder="${escapeHtml(placeholder)}"></textarea>
          <span class="mdz-field-hint" id="mdz-reason-hint" hidden></span>
        </label>
        <div class="mdz-dialog-actions">
          <button type="button" class="mdz-btn mdz-btn-ghost" data-act="cancel">${escapeHtml(cancelLabel || 'Cancel')}</button>
          <button type="button" class="mdz-btn mdz-btn-danger" data-act="confirm">${escapeHtml(confirmLabel || 'Confirm')}</button>
        </div>
      </div>`;

    const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusable = () => [...backdrop.querySelectorAll(focusableSelector)];

    const finish = (value) => {
      document.removeEventListener('keydown', onKey, true);
      backdrop.remove();
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        try { previouslyFocused.focus(); } catch { /* ignore */ }
      }
      resolve(value);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(null);
        return;
      }
      if (e.key !== 'Tab') return;
      const nodes = getFocusable();
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) finish(null);
    });
    backdrop.querySelector('[data-act="cancel"]').addEventListener('click', () => finish(null));
    backdrop.querySelector('[data-act="confirm"]').addEventListener('click', () => {
      const val = backdrop.querySelector('#mdz-reason-input').value.trim();
      const hint = backdrop.querySelector('#mdz-reason-hint');
      if (required && val.length < minLength) {
        hint.hidden = false;
        hint.textContent = tooShortMessage || 'Please provide a clearer reason.';
        backdrop.querySelector('#mdz-reason-input')?.focus();
        return;
      }
      finish(val);
    });

    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(backdrop);
    queueMicrotask(() => backdrop.querySelector('#mdz-reason-input')?.focus());
  });
}

export async function updateNotificationBadge(token, restUrl, apiKey, translate = null) {
  const el = document.getElementById('mdzNotifBadge');
  const btn = document.getElementById('mdzNotifBell');
  if (!el || !token) return 0;
  const tt = typeof translate === 'function'
    ? translate
    : (typeof globalThis.t === 'function' ? globalThis.t.bind(globalThis) : (k) => k);
  try {
    const n = Number(await countUnreadNotifications(token, restUrl, apiKey)) || 0;
    if (n > 0) {
      el.hidden = false;
      el.textContent = n > 99 ? '99+' : String(n);
      if (btn) btn.setAttribute('aria-label', tt('notifBellAriaUnread', { n }));
    } else {
      el.hidden = true;
      el.textContent = '';
      if (btn) btn.setAttribute('aria-label', tt('notifBellAria'));
    }
    return n;
  } catch {
    el.hidden = true;
    if (btn) btn.setAttribute('aria-label', tt('notifBellAria'));
    return 0;
  }
}

function filterNotifications(rows, { unreadOnly = false, eventType = '' } = {}) {
  let list = Array.isArray(rows) ? rows.slice() : [];
  if (unreadOnly) list = list.filter((n) => !n.read_at);
  if (eventType) list = list.filter((n) => String(n.event_type || '') === eventType);
  return list;
}

export function renderNotificationsPanel(t, rows, { safeText, unreadOnly = false, eventType = '' } = {}) {
  const all = Array.isArray(rows) ? rows : [];
  const list = filterNotifications(all, { unreadOnly, eventType });
  const types = [
    '',
    'registration_approved',
    'registration_rejected',
    'registration_suspended',
    'ticket_reply',
    'ticket_status',
    'ticket_member_reply',
  ];

  const toolbar = `<div class="mdz-toolbar">
    <label class="mdz-filter-chip${unreadOnly ? ' on' : ''}">
      <input type="checkbox" id="notifUnreadOnly" ${unreadOnly ? 'checked' : ''} style="accent-color:var(--mdz-brand)" />
      ${escapeHtml(t('notifFilterUnread'))}
    </label>
    <select id="notifTypeFilter" class="mdz-select" style="max-width:220px">
      ${types
        .map((tp) => {
          const label = tp ? t(`notifType_${tp}`) || tp : t('notifFilterAll');
          return `<option value="${escapeHtml(tp)}" ${eventType === tp ? 'selected' : ''}>${escapeHtml(label)}</option>`;
        })
        .join('')}
    </select>
    <button type="button" class="mdz-btn mdz-btn-ghost" id="notifMarkAllBtn">${escapeHtml(t('notifMarkAll'))}</button>
    <button type="button" class="mdz-btn mdz-btn-ghost" id="notifRefreshBtn">${escapeHtml(t('notifRefresh'))}</button>
  </div>`;

  if (!list.length) {
    return `${toolbar}
      <div class="mdz-empty" role="status">
        <strong>${escapeHtml(t('notifEmptyTitle'))}</strong>
        <p>${escapeHtml(t('notifEmpty'))}</p>
      </div>`;
  }

  const items = list
    .map((n) => {
      const unread = !n.read_at;
      const title = escapeHtml(safeText ? safeText(n.title, 120) : n.title);
      const body = escapeHtml(safeText ? safeText(n.body, 240) : n.body || '');
      const when = escapeHtml(formatWhen(n.created_at));
      const typeLabel = escapeHtml(t(`notifType_${n.event_type}`) || n.event_type || '');
      const link = n.link_path ? escapeHtml(String(n.link_path)) : '';
      return `<article class="mdz-item${unread ? ' is-unread' : ''}" data-notification-id="${escapeHtml(String(n.id))}" data-link="${link}">
      <header>
        <strong>${title}</strong>
        <time datetime="${escapeHtml(n.created_at || '')}">${when}</time>
      </header>
      ${body ? `<p>${body}</p>` : ''}
      <div class="mdz-toolbar" style="margin:10px 0 0">
        <span class="mdz-meta">${typeLabel}</span>
        ${link ? `<button type="button" class="mdz-btn mdz-btn-ghost notif-open" data-link="${link}" data-notification-id="${escapeHtml(String(n.id))}">${escapeHtml(t('notifOpen'))}</button>` : ''}
        ${unread ? `<button type="button" class="mdz-btn mdz-btn-ghost notif-mark-read" data-notification-id="${escapeHtml(String(n.id))}">${escapeHtml(t('notifMarkRead'))}</button>` : ''}
      </div>
    </article>`;
    })
    .join('');

  return `${toolbar}<div class="mdz-list notif-list">${items}</div>`;
}

export function renderSupportPanel(t, tickets, { safeText, error = false } = {}) {
  const list = Array.isArray(tickets) ? tickets : [];
  const options = [
    ['inquiry', t('ticketTypeInquiry')],
    ['complaint', t('ticketTypeComplaint')],
    ['suggestion', t('ticketTypeSuggestion')],
    ['technical', t('ticketTypeTechnical')],
    ['verification', t('ticketTypeVerification')],
    ['membership_followup', t('ticketTypeMembership')],
    ['profile_change', t('ticketTypeProfile')],
    ['other', t('ticketTypeOther')],
  ]
    .map(([v, label]) => `<option value="${v}">${escapeHtml(label)}</option>`)
    .join('');

  let listBlock;
  if (error) {
    listBlock = renderFetchError(t, {
      titleKey: 'ticketErrorTitle',
      bodyKey: 'ticketLoadError',
      retryId: 'supportRetryBtn',
    });
  } else if (list.length) {
    listBlock = list
      .map(
        (tk) => `<article class="mdz-item ticket-item" data-ticket-id="${escapeHtml(String(tk.id))}">
        <header>
          <strong dir="ltr">${escapeHtml(safeText ? safeText(tk.ticket_code, 40) : tk.ticket_code)}</strong>
          ${statusChip(t, tk.status)}
        </header>
        <p>${escapeHtml(safeText ? safeText(tk.subject, 160) : tk.subject)}</p>
        <div class="mdz-meta">${escapeHtml(formatWhen(tk.updated_at || tk.created_at))}</div>
        <button type="button" class="mdz-btn mdz-btn-ghost ticket-open-btn" data-ticket-id="${escapeHtml(String(tk.id))}" style="margin-top:10px">${escapeHtml(t('ticketOpen'))}</button>
      </article>`,
      )
      .join('');
  } else {
    listBlock = `<div class="mdz-empty"><strong>${escapeHtml(t('ticketEmptyTitle'))}</strong><p>${escapeHtml(t('ticketEmpty'))}</p></div>`;
  }

  return `<div class="mdz-panel ticket-create" style="margin-bottom:16px">
      <h3 class="mdz-title" style="font-size:1.05rem;margin-bottom:12px">${escapeHtml(t('ticketCreateTitle'))}</h3>
      <label class="mdz-field">${escapeHtml(t('ticketType'))}<select id="ticketType" class="mdz-select">${options}</select></label>
      <label class="mdz-field">${escapeHtml(t('ticketSubject'))}<input id="ticketSubject" class="mdz-input" maxlength="200" /></label>
      <label class="mdz-field">${escapeHtml(t('ticketBody'))}<textarea id="ticketBody" class="mdz-textarea" maxlength="10000" rows="4"></textarea></label>
      <button type="button" class="mdz-btn mdz-btn-primary" id="ticketCreateBtn">${escapeHtml(t('ticketSubmit'))}</button>
      <p class="acct-tab-note" id="ticketCreateStatus" aria-live="polite"></p>
    </div>
    <div class="ticket-list mdz-list">${listBlock}</div>
    <div id="ticketThreadMount"></div>`;
}

export function renderTicketThread(t, ticket, messages, { safeText, memberUserId = null, isStaff = false, notes = [] } = {}) {
  const msgs = (messages || [])
    .map((m) => {
      const staffMsg = memberUserId ? m.author_id !== memberUserId : false;
      return `<div class="mdz-msg${staffMsg ? ' is-staff' : ''}">
      <time dir="ltr">${escapeHtml(formatWhen(m.created_at))}</time>
      <p>${escapeHtml(safeText ? safeText(m.body, 2000) : m.body)}</p>
    </div>`;
    })
    .join('');

  const statusControl = isStaff
    ? `<label class="mdz-field" style="max-width:220px">${escapeHtml(t('ticketStatus'))}
        <select id="ticketStatusSelect" class="mdz-select" data-ticket-id="${escapeHtml(String(ticket.id))}">
          ${['open', 'in_review', 'waiting_for_member', 'escalated', 'closed']
            .map(
              (s) =>
                `<option value="${s}" ${ticket.status === s ? 'selected' : ''}>${escapeHtml(ticketStatusLabel(t, s))}</option>`,
            )
            .join('')}
        </select>
      </label>`
    : statusChip(t, ticket.status);

  const notesBlock = isStaff
    ? `<div class="mdz-panel" style="margin:16px 0;padding:14px">
        <h4 style="margin:0 0 8px;font-size:0.9rem">${escapeHtml(t('ticketInternalNotes'))}</h4>
        <div id="ticketNotesList">${
          (notes || []).length
            ? notes
                .map(
                  (n) => `<div class="mdz-msg"><time>${escapeHtml(formatWhen(n.created_at))}</time><p>${escapeHtml(safeText ? safeText(n.body, 2000) : n.body)}</p></div>`,
                )
                .join('')
            : `<p class="mdz-meta">${escapeHtml(t('ticketNoNotes'))}</p>`
        }</div>
        <label class="mdz-field">${escapeHtml(t('ticketAddNote'))}<textarea id="ticketNoteBody" class="mdz-textarea" rows="2" maxlength="10000"></textarea></label>
        <button type="button" class="mdz-btn mdz-btn-ghost" id="ticketNoteBtn" data-ticket-id="${escapeHtml(String(ticket.id))}">${escapeHtml(t('ticketSaveNote'))}</button>
      </div>`
    : '';

  return `<div class="ticket-thread mdz-panel" data-ticket-id="${escapeHtml(String(ticket.id))}">
    <div class="mdz-toolbar" style="justify-content:space-between">
      <button type="button" class="mdz-btn mdz-btn-ghost" id="ticketThreadBack">${escapeHtml(t('ticketBack'))}</button>
      ${statusControl}
    </div>
    <h3 dir="ltr" style="margin:8px 0">${escapeHtml(safeText ? safeText(ticket.ticket_code, 40) : ticket.ticket_code)}</h3>
    <p style="margin:0 0 12px;color:var(--mdz-ink-soft)">${escapeHtml(safeText ? safeText(ticket.subject, 160) : ticket.subject)}</p>
    ${ticket.linked_registration_id ? `<p class="mdz-meta" dir="ltr">${escapeHtml(t('acctRegId'))}: ${escapeHtml(ticket.linked_registration_id)}</p>` : ''}
    <div class="ticket-msgs">${msgs || `<p class="acct-tab-note">${escapeHtml(t('ticketNoMessages'))}</p>`}</div>
    ${notesBlock}
    ${
      ticket.status !== 'closed'
        ? `<label class="mdz-field">${escapeHtml(t('ticketReply'))}<textarea id="ticketReplyBody" class="mdz-textarea" rows="3" maxlength="10000"></textarea></label>
      <button type="button" class="mdz-btn mdz-btn-primary" id="ticketReplyBtn" data-ticket-id="${escapeHtml(String(ticket.id))}">${escapeHtml(t('ticketSendReply'))}</button>`
        : ''
    }
    <p class="acct-tab-note" id="ticketThreadStatus" aria-live="polite"></p>
  </div>`;
}

export function renderOperatorSupportQueue(t, tickets, { safeText, error = false } = {}) {
  const list = Array.isArray(tickets) ? tickets : [];
  const statusOpts = ['', 'open', 'in_review', 'waiting_for_member', 'escalated', 'closed']
    .map((s) => {
      const label = s ? ticketStatusLabel(t, s) : t('notifFilterAll');
      return `<option value="${escapeHtml(s)}">${escapeHtml(label)}</option>`;
    })
    .join('');

  let rows;
  if (error) {
    rows = `<tr><td colspan="5">${renderFetchError(t, {
      titleKey: 'opsQueueErrorTitle',
      bodyKey: 'ticketLoadError',
      retryId: 'opsSupportRetryBtn',
    })}</td></tr>`;
  } else if (list.length) {
    rows = list
      .map(
        (tk) => `<tr>
      <td>
        <div><strong>${escapeHtml(safeText ? safeText(tk.subject, 80) : tk.subject)}</strong></div>
        <div class="mdz-meta" dir="ltr">${escapeHtml(tk.ticket_code || '')} · ${escapeHtml(tk.wilaya || '—')}</div>
      </td>
      <td>${statusChip(t, tk.status)}</td>
      <td>${priorityChip(t, tk.priority)}</td>
      <td><time class="mdz-meta">${escapeHtml(formatWhen(tk.updated_at))}</time></td>
      <td><button type="button" class="mdz-btn mdz-btn-ghost mdz-btn-sm ops-ticket-open" data-ticket-id="${escapeHtml(String(tk.id))}">${escapeHtml(t('ticketOpen'))}</button></td>
    </tr>`,
      )
      .join('');
  } else {
    rows = `<tr><td colspan="5"><div class="mdz-empty"><p>${escapeHtml(t('opsQueueEmpty'))}</p></div></td></tr>`;
  }

  return `<section class="mdz-panel mdz-ops-support" id="mdzOpsSupport">
    <div class="mdz-toolbar mdz-ops-toolbar" style="justify-content:space-between;align-items:flex-start">
      <div>
        <p class="mdz-eyebrow">${escapeHtml(t('opsSupportEyebrow'))}</p>
        <h3 class="mdz-title" style="font-size:1.15rem">${escapeHtml(t('opsSupportTitle'))}</h3>
        <p class="mdz-subtitle">${escapeHtml(t('opsSupportSub'))}</p>
      </div>
      <button type="button" class="mdz-btn mdz-btn-ghost" id="opsSupportRefresh">${escapeHtml(t('notifRefresh'))}</button>
    </div>
    <div class="mdz-toolbar mdz-ops-filters">
      <label class="mdz-field" style="margin:0;min-width:140px">${escapeHtml(t('ticketStatus'))}
        <select id="opsSupportStatus" class="mdz-select">${statusOpts}</select>
      </label>
      <label class="mdz-field" style="margin:0;flex:1">${escapeHtml(t('opsSupportSearch'))}
        <input type="search" id="opsSupportQ" class="mdz-input" placeholder="${escapeHtml(t('opsSupportSearchPh'))}" />
      </label>
    </div>
    <div class="mdz-split mdz-ops-split">
      <div class="dash-table-wrap mdz-ops-list">
        <table class="dash-table mdz-ops-table" id="opsSupportTable">
          <thead><tr>
            <th>${escapeHtml(t('ticketSubject'))}</th>
            <th>${escapeHtml(t('ticketStatus'))}</th>
            <th>${escapeHtml(t('ticketPriority'))}</th>
            <th>${escapeHtml(t('opsUpdated'))}</th>
            <th></th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div id="opsTicketThreadMount" class="mdz-ops-thread"><div class="mdz-empty"><p>${escapeHtml(t('opsSelectTicket'))}</p></div></div>
    </div>
  </section>`;
}

export function renderNotificationsSkeleton() {
  return `<div class="mdz-list">${[1, 2, 3].map(() => '<div class="mdz-skeleton"></div>').join('')}</div>`;
}

export function renderSupportSkeleton() {
  return renderNotificationsSkeleton();
}
