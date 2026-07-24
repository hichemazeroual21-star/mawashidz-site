/**
 * MawashiDZ Phase 1 — notifications, support tickets, review reason helpers.
 * Server RLS/RPC remain source of truth.
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
  try { payload = await r.json(); } catch { payload = null; }
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

export async function fetchMyTickets(token, restUrl, apiKey) {
  const r = await fetch(
    `${restUrl}/support_tickets?select=id,ticket_code,request_type,subject,status,priority,wilaya,created_at,updated_at&order=updated_at.desc&limit=40`,
    { headers: { apikey: apiKey, Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) {
    const err = new Error(`tickets_fetch_failed_${r.status}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
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

export function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderNotificationsPanel(t, rows, { safeText } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) {
    return `<p class="acct-tab-note">${escapeHtml(t('notifEmpty'))}</p>
      <button type="button" class="btn ghost" id="notifRefreshBtn">${escapeHtml(t('notifRefresh'))}</button>`;
  }
  const items = list.map((n) => {
    const unread = !n.read_at;
    const title = escapeHtml(safeText ? safeText(n.title, 120) : n.title);
    const body = escapeHtml(safeText ? safeText(n.body, 240) : (n.body || ''));
    const when = escapeHtml(String(n.created_at || '').slice(0, 16).replace('T', ' '));
    return `<article class="notif-item${unread ? ' unread' : ''}" data-notification-id="${escapeHtml(String(n.id))}">
      <header><strong>${title}</strong><time dir="ltr">${when}</time></header>
      ${body ? `<p>${body}</p>` : ''}
      ${unread ? `<button type="button" class="btn ghost notif-mark-read" data-notification-id="${escapeHtml(String(n.id))}">${escapeHtml(t('notifMarkRead'))}</button>` : ''}
    </article>`;
  }).join('');
  return `<div class="notif-toolbar">
      <button type="button" class="btn ghost" id="notifMarkAllBtn">${escapeHtml(t('notifMarkAll'))}</button>
      <button type="button" class="btn ghost" id="notifRefreshBtn">${escapeHtml(t('notifRefresh'))}</button>
    </div>
    <div class="notif-list">${items}</div>`;
}

export function renderSupportPanel(t, tickets, { safeText } = {}) {
  const list = Array.isArray(tickets) ? tickets : [];
  const options = [
    ['inquiry', t('ticketTypeInquiry')],
    ['complaint', t('ticketTypeComplaint')],
    ['suggestion', t('ticketTypeSuggestion')],
    ['technical', t('ticketTypeTechnical')],
    ['verification', t('ticketTypeVerification')],
    ['membership_followup', t('ticketTypeMembership')],
    ['other', t('ticketTypeOther')],
  ].map(([v, label]) => `<option value="${v}">${escapeHtml(label)}</option>`).join('');

  const rows = list.length
    ? list.map((tk) => `<article class="ticket-item" data-ticket-id="${escapeHtml(String(tk.id))}">
        <header>
          <strong dir="ltr">${escapeHtml(safeText ? safeText(tk.ticket_code, 40) : tk.ticket_code)}</strong>
          <span class="dash-status-chip">${escapeHtml(safeText ? safeText(tk.status, 40) : tk.status)}</span>
        </header>
        <p>${escapeHtml(safeText ? safeText(tk.subject, 160) : tk.subject)}</p>
        <button type="button" class="btn ghost ticket-open-btn" data-ticket-id="${escapeHtml(String(tk.id))}">${escapeHtml(t('ticketOpen'))}</button>
      </article>`).join('')
    : `<p class="acct-tab-note">${escapeHtml(t('ticketEmpty'))}</p>`;

  return `<div class="ticket-create">
      <h3>${escapeHtml(t('ticketCreateTitle'))}</h3>
      <label>${escapeHtml(t('ticketType'))}<select id="ticketType">${options}</select></label>
      <label>${escapeHtml(t('ticketSubject'))}<input id="ticketSubject" maxlength="200" /></label>
      <label>${escapeHtml(t('ticketBody'))}<textarea id="ticketBody" maxlength="10000" rows="4"></textarea></label>
      <button type="button" class="btn primary" id="ticketCreateBtn">${escapeHtml(t('ticketSubmit'))}</button>
      <p class="acct-tab-note" id="ticketCreateStatus" aria-live="polite"></p>
    </div>
    <div class="ticket-list">${rows}</div>
    <div id="ticketThreadMount"></div>`;
}

export function renderTicketThread(t, ticket, messages, { safeText } = {}) {
  const msgs = (messages || []).map((m) => `<div class="ticket-msg">
    <time dir="ltr">${escapeHtml(String(m.created_at || '').slice(0, 16).replace('T', ' '))}</time>
    <p>${escapeHtml(safeText ? safeText(m.body, 2000) : m.body)}</p>
  </div>`).join('');
  return `<div class="ticket-thread" data-ticket-id="${escapeHtml(String(ticket.id))}">
    <h3 dir="ltr">${escapeHtml(safeText ? safeText(ticket.ticket_code, 40) : ticket.ticket_code)}</h3>
    <p>${escapeHtml(safeText ? safeText(ticket.subject, 160) : ticket.subject)}</p>
    <div class="ticket-msgs">${msgs || `<p class="acct-tab-note">${escapeHtml(t('ticketNoMessages'))}</p>`}</div>
    ${ticket.status !== 'closed' ? `<label>${escapeHtml(t('ticketReply'))}<textarea id="ticketReplyBody" rows="3" maxlength="10000"></textarea></label>
      <button type="button" class="btn primary" id="ticketReplyBtn" data-ticket-id="${escapeHtml(String(ticket.id))}">${escapeHtml(t('ticketSendReply'))}</button>` : ''}
    <p class="acct-tab-note" id="ticketThreadStatus" aria-live="polite"></p>
  </div>`;
}
