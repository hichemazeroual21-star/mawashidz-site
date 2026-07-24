#!/usr/bin/env node
/**
 * Phase 1 elevated helpers + migrations 010/011/012/013 static reviews.
 * Covers P0/P1 gate issues: NOTIF-001, UX-001, CONST-001/002/003, EMAIL migration 013.
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
  resolveNotificationDeepLink,
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

// MDZ-P1-NOTIF-001
assert.equal(resolveNotificationDeepLink('#admin-dash'), 'admin');
assert.equal(resolveNotificationDeepLink('#manager-dash'), 'manager');
assert.equal(resolveNotificationDeepLink('#support'), 'support');
assert.equal(resolveNotificationDeepLink('#request'), 'request');
assert.equal(resolveNotificationDeepLink('#account-notifications'), 'inbox');

const m010 = join(process.cwd(), 'supabase/migrations/010_notifications_tickets_email_outbox.sql');
const m011 = join(process.cwd(), 'supabase/migrations/011_review_notify_email_hooks.sql');
const m012 = join(process.cwd(), 'supabase/migrations/012_phase1_quality_elevation.sql');
const m013 = join(process.cwd(), 'supabase/migrations/013_email_outbox_p0_hardening.sql');
assert.ok(existsSync(m010));
assert.ok(existsSync(m011));
assert.ok(existsSync(m012));
assert.ok(existsSync(m013));
const sql010 = readFileSync(m010, 'utf8');
const sql011 = readFileSync(m011, 'utf8');
const sql012 = readFileSync(m012, 'utf8');
const sql013 = readFileSync(m013, 'utf8');

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
assert.match(sql012, /#admin-dash/);
const dropIdx = sql012.search(/drop function if exists public\.mdz_is_platform_admin\(uuid\)/i);
const policyIdx = sql012.search(/create policy "support_tickets: member read own"/i);
assert.ok(policyIdx > 0 && dropIdx > policyIdx, 'policies must be rewritten before dropping uuid helpers');

// 013 P0 email hardening
assert.match(sql013, /provider_message_id/);
assert.match(sql013, /awaiting_/);
assert.match(sql013, /greatest\(0, attempts - 1\)/i);
assert.match(sql013, /drop function if exists public\.mdz_claim_email_outbox\(int\)/i);
assert.match(sql013, /drop function if exists public\.mdz_mark_email_outbox\(bigint, text, text\)/i);

const worker = readFileSync(join(process.cwd(), 'worker.mjs'), 'utf8');
assert.match(worker, /process-email-outbox/);
assert.match(worker, /email-outbox\.mjs/);
assert.match(worker, /async scheduled/);
assert.match(worker, /EMAIL_OUTBOX_SECRET/);
assert.doesNotMatch(worker, /EMAIL_OUTBOX_SECRET\)\s*\|\|\s*.*SERVICE_ROLE/);

const wrangler = readFileSync(join(process.cwd(), 'wrangler.jsonc'), 'utf8');
assert.match(wrangler, /\*\/2 \* \* \* \*/);

// MDZ-P1-UX-001: no window.prompt on reject path
const dash = readFileSync(join(process.cwd(), 'js/mdz-dashboards.mjs'), 'utf8');
assert.match(dash, /openReasonDialog/);
assert.doesNotMatch(dash, /window\.prompt/);
assert.doesNotMatch(dash, /window\.confirm/);
assert.match(dash, /opsSupportMount/);
assert.match(dash, /openReasonDialog failed/);

const indexHtml = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
assert.match(indexHtml, /resolveNotificationDeepLink/);
assert.match(indexHtml, /surface==='admin'/);
assert.match(indexHtml, /openAdminDashboard/);

const ds = join(process.cwd(), 'assets/mdz-design-system.css');
assert.ok(existsSync(ds));
assert.match(readFileSync(ds, 'utf8'), /--mdz-brand/);

// MDZ-CONST-001 / MDZ-CONST-002
const productConst = readFileSync(join(process.cwd(), 'docs/product/PRODUCT_CONSTITUTION.md'), 'utf8');
assert.doesNotMatch(productConst, /أضف أول منتج/);
assert.doesNotMatch(productConst, /Add your first product/);
assert.match(productConst, /الكتالوج غير متاح بعد|catalog not available yet/i);
assert.match(productConst, /Phase 2: Livestock Identity/);
assert.match(productConst, /Phase 3: Marketplace/);
assert.match(productConst, /Phase 4: Smart Workspace \+ Hub/);
assert.doesNotMatch(productConst, /Admin ops → Smart Workspace \+ Hub → Marketplace/);
assert.match(productConst, /Deprecated:[\s\S]*Hub immediately after Admin ops/);

// MDZ-CONST-003
const i18n = readFileSync(join(process.cwd(), 'assets/i18n-content.js'), 'utf8');
assert.match(i18n, /passDemoChip: 'عرض توضيحي — موثق بيطريًا \(Demo\)'/);
assert.match(i18n, /passDemoChip: 'Demo — Vet verified \(not live\)'/);
assert.doesNotMatch(i18n, /passDemoChip: '✓ موثق بيطريًا'/);
assert.doesNotMatch(i18n, /passDemoChip: '✓ Vet verified'/);

console.log('  ✓ phase1 elevated member-ops + migrations 010–013 + NOTIF/UX/CONST gates');
