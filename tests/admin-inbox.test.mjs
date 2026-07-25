#!/usr/bin/env node
/**
 * Admin inbox (TD-013) — fetch + render; no public SELECT assumed.
 */
import assert from 'node:assert/strict';
import {
  fetchAdminInbox,
  renderAdminInbox,
  renderAdminDashboard,
} from '../js/mdz-dashboards.mjs';

const t = (k) => ({
  adminInboxTitle: 'صندوق التواصل',
  adminInboxContact: 'اتصال',
  adminInboxFeedback: 'ملاحظة',
  adminInboxEmpty: 'لا رسائل بعد',
  adminDashTitle: 'Admin',
  adminDashDesc: 'desc',
  adminStatTotal: 'total',
  roleVet: 'vet',
  roleBreeder: 'breeder',
  roleManager: 'manager',
  opsSupportTitle: 'support',
  opsReviewsEyebrow: 'reviews',
  adminDashNote: 'note',
  dashSourceLive: 'live',
  dashEmptyQueue: 'empty',
}[k] || k);

const safeText = (v, n = 80) => String(v || '').slice(0, n);

// Empty inbox
const emptyHtml = renderAdminInbox(t, { contact: [], feedback: [] }, safeText);
assert.match(emptyHtml, /mdz-admin-inbox/);
assert.match(emptyHtml, /لا رسائل بعد/);

// Mixed inbox escapes HTML
const filled = renderAdminInbox(t, {
  contact: [{ full_name: '<b>Ali</b>', message: 'hello<script>', created_at: '2026-07-25T10:00:00Z' }],
  feedback: [{ full_name: 'Sara', details: 'note', created_at: '2026-07-25T11:00:00Z' }],
}, safeText);
assert.match(filled, /صندوق التواصل/);
assert.match(filled, /&lt;b&gt;Ali&lt;\/b&gt;/);
assert.ok(!filled.includes('<script>'));
assert.match(filled, /Sara/);

// Dashboard includes inbox section
const dash = renderAdminDashboard(t, {
  stats: { total: 0, vets: 0, breeders: 0, managers: 0 },
  rows: [],
  inbox: {
    contact: [{ full_name: 'X', message: 'm', created_at: '2026-07-25T12:00:00Z' }],
    feedback: [],
  },
  safeText,
  registrationRoleLabel: (r) => r || '',
});
assert.match(dash, /mdz-admin-inbox/);
assert.match(dash, /dashQueueMount/);

// fetchAdminInbox hits both tables with auth header
const calls = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), auth: init?.headers?.Authorization });
  if (String(url).includes('contact_messages')) {
    return new Response(JSON.stringify([{ id: 1, full_name: 'C', message: 'hi', created_at: '2026-07-25' }]), { status: 200 });
  }
  if (String(url).includes('feedback_tickets')) {
    return new Response(JSON.stringify([{ id: 2, full_name: 'F', details: 'd', created_at: '2026-07-25' }]), { status: 200 });
  }
  return new Response('[]', { status: 404 });
};
const inbox = await fetchAdminInbox('jwt', 'https://x.supabase.co/rest/v1', 'pub');
assert.equal(inbox.contact.length, 1);
assert.equal(inbox.feedback.length, 1);
assert.equal(calls.length, 2);
assert.ok(calls.every((c) => c.auth === 'Bearer jwt'));
assert.ok(calls.some((c) => c.url.includes('contact_messages')));
assert.ok(calls.some((c) => c.url.includes('feedback_tickets')));

// Forbidden responses → empty arrays (UI still safe)
globalThis.fetch = async () => new Response(JSON.stringify({ message: 'denied' }), { status: 401 });
const denied = await fetchAdminInbox('bad', 'https://x.supabase.co/rest/v1', 'pub');
assert.deepEqual(denied.contact, []);
assert.deepEqual(denied.feedback, []);
assert.equal(denied.contactStatus, 401);
globalThis.fetch = originalFetch;

console.log('  ✓ admin inbox fetch + render (TD-013)');
