#!/usr/bin/env node
/**
 * Phase 1 elevated helpers + migrations 010/011/012 static reviews.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseReviewReason,
  renderNotificationsPanel,
  renderSupportPanel,
  renderOperatorSupportQueue,
  ticketStatusLabel,
  openReasonDialog,
} from '../js/mdz-member-ops.mjs';

assert.equal(parseReviewReason(''), '');
assert.equal(parseReviewReason('{"review_reason":"وثائق ناقصة"}'), 'وثائق ناقصة');
assert.equal(parseReviewReason('not-json'), '');

const t = (k) => k;
const html = renderNotificationsPanel(t, [{
  id: 1,
  title: 'approved',
  body: 'ok',
  event_type: 'registration_approved',
  created_at: '2026-07-24T10:00:00Z',
  read_at: null,
  link_path: '#account-request',
}], { safeText: (s) => String(s || '') });
assert.match(html, /mdz-item/);
assert.match(html, /notif-mark-read/);
assert.match(html, /notifTypeFilter/);
assert.match(html, /is-unread/);

const ticketsHtml = renderSupportPanel(t, [], { safeText: (s) => String(s || '') });
assert.match(ticketsHtml, /ticket-create/);
assert.match(ticketsHtml, /ticketType/);
assert.match(ticketsHtml, /mdz-empty/);

assert.equal(ticketStatusLabel(t, 'waiting_for_member'), 'ticketStatusWaitingMember');

const opsHtml = renderOperatorSupportQueue(t, [{
  id: 9,
  ticket_code: 'TKT-1',
  subject: 'Help',
  status: 'open',
  priority: 'normal',
  wilaya: 'Alger',
  updated_at: '2026-07-24T10:00:00Z',
}], { safeText: (s) => String(s || '') });
assert.match(opsHtml, /opsSupportTitle|ops-support|mdz-ops-support/);
assert.match(opsHtml, /ops-ticket-open/);

assert.equal(typeof openReasonDialog, 'function');

const m010 = join(process.cwd(), 'supabase/migrations/010_notifications_tickets_email_outbox.sql');
const m011 = join(process.cwd(), 'supabase/migrations/011_review_notify_email_hooks.sql');
const m012 = join(process.cwd(), 'supabase/migrations/012_phase1_quality_elevation.sql');
assert.ok(existsSync(m010));
assert.ok(existsSync(m011));
assert.ok(existsSync(m012));
const sql010 = readFileSync(m010, 'utf8');
const sql011 = readFileSync(m011, 'utf8');
const sql012 = readFileSync(m012, 'utf8');

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

// 012 elevation gates
assert.match(sql012, /review_reason/i);
assert.match(sql012, /status = 'processing'/i);
assert.match(sql012, /locked_at/i);
assert.match(sql012, /count_my_unread_notifications/i);
assert.match(sql012, /mdz_is_platform_admin\(\)/);
assert.match(sql012, /drop function if exists public\.mdz_is_platform_admin\(uuid\)/i);
assert.match(sql012, /rejection reason required/i);
assert.match(sql012, /mdz_audit_admin_action/i);
assert.match(sql012, /ticket_member_reply/i);
// Policy rewrite before drop (ordering safety)
const dropIdx = sql012.search(/drop function if exists public\.mdz_is_platform_admin\(uuid\)/i);
const policyIdx = sql012.search(/create policy "support_tickets: member read own"/i);
assert.ok(policyIdx > 0 && dropIdx > policyIdx, 'policies must be rewritten before dropping uuid helpers');

const worker = readFileSync(join(process.cwd(), 'worker.mjs'), 'utf8');
assert.match(worker, /process-email-outbox/);
assert.match(worker, /email-outbox\.mjs/);
assert.match(worker, /async scheduled/);

const wrangler = readFileSync(join(process.cwd(), 'wrangler.jsonc'), 'utf8');
assert.match(wrangler, /\*\/2 \* \* \* \*/);

const dash = readFileSync(join(process.cwd(), 'js/mdz-dashboards.mjs'), 'utf8');
assert.match(dash, /openReasonDialog/);
assert.ok(!/window\.prompt/.test(dash) || dash.includes('openReasonDialog'), 'reject flow should prefer dialog');
assert.match(dash, /opsSupportMount/);

const ds = join(process.cwd(), 'assets/mdz-design-system.css');
assert.ok(existsSync(ds));
assert.match(readFileSync(ds, 'utf8'), /--mdz-brand/);

console.log('  ✓ phase1 elevated member-ops + migrations 010/011/012 + worker cron');
