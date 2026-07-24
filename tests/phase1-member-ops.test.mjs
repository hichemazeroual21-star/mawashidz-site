#!/usr/bin/env node
/**
 * Phase 1 helpers + migration static reviews (010/011).
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseReviewReason,
  renderNotificationsPanel,
  renderSupportPanel,
} from '../js/mdz-member-ops.mjs';

assert.equal(parseReviewReason(''), '');
assert.equal(parseReviewReason('{"review_reason":"وثائق ناقصة"}'), 'وثائق ناقصة');
assert.equal(parseReviewReason('not-json'), '');

const t = (k) => k;
const html = renderNotificationsPanel(t, [{
  id: 1, title: 'approved', body: 'ok', created_at: '2026-07-24T10:00:00Z', read_at: null,
}], { safeText: (s) => String(s || '') });
assert.match(html, /notif-item/);
assert.match(html, /notif-mark-read/);

const ticketsHtml = renderSupportPanel(t, [], { safeText: (s) => String(s || '') });
assert.match(ticketsHtml, /ticket-create/);
assert.match(ticketsHtml, /ticketType/);

const m010 = join(process.cwd(), 'supabase/migrations/010_notifications_tickets_email_outbox.sql');
const m011 = join(process.cwd(), 'supabase/migrations/011_review_notify_email_hooks.sql');
assert.ok(existsSync(m010));
assert.ok(existsSync(m011));
const sql010 = readFileSync(m010, 'utf8');
const sql011 = readFileSync(m011, 'utf8');

assert.match(sql010, /create table if not exists public\.notifications/i);
assert.match(sql010, /create table if not exists public\.support_tickets/i);
assert.match(sql010, /create table if not exists public\.email_outbox/i);
assert.match(sql010, /list_my_notifications/i);
assert.match(sql010, /create_support_ticket/i);
assert.match(sql010, /support_notes: staff read/i);
assert.ok(!/with check\s*\(\s*true\s*\)/i.test(sql010));

assert.match(sql011, /mdz_notify_user/i);
assert.match(sql011, /mdz_enqueue_email/i);
assert.match(sql011, /registrations: member read own/i);
assert.match(sql011, /managers may only approve or reject/i);

const worker = readFileSync(join(process.cwd(), 'worker.mjs'), 'utf8');
assert.match(worker, /process-email-outbox/);
assert.match(worker, /email-outbox\.mjs/);

console.log('  ✓ phase1 member-ops helpers + migrations 010/011 shape');
