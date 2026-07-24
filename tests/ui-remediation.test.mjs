#!/usr/bin/env node
/**
 * MDZ-UI remediation gates (001–012) + regressions for prior P0 notif/prompt fixes.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  renderSupportPanel,
  renderOperatorSupportQueue,
  renderFetchError,
  ticketPriorityLabel,
  openReasonDialog,
  resolveNotificationDeepLink,
} from '../js/mdz-member-ops.mjs';
import {
  renderQueueTable,
  registrationStatusLabel,
  renderRegistrationStatusChip,
} from '../js/mdz-dashboards.mjs';

const root = process.cwd();
const read = (p) => readFileSync(join(root, p), 'utf8');
const tAr = (k, vars) => {
  const pack = {
    statusPending: 'قيد المراجعة',
    statusApproved: 'مقبول / موثّق',
    statusRejected: 'مرفوض',
    statusSuspended: 'موقوف',
    ticketEmptyTitle: 'لا تذاكر بعد',
    ticketEmpty: 'empty-ok',
    ticketCreateTitle: 'فتح',
    ticketType: 'نوع',
    ticketSubject: 'موضوع',
    ticketBody: 'تفاصيل',
    ticketSubmit: 'إرسال',
    ticketTypeInquiry: 'استفسار',
    ticketTypeComplaint: 'شكوى',
    ticketTypeSuggestion: 'اقتراح',
    ticketTypeTechnical: 'تقني',
    ticketTypeVerification: 'تحقق',
    ticketTypeMembership: 'عضوية',
    ticketTypeProfile: 'ملف',
    ticketTypeOther: 'أخرى',
    ticketErrorTitle: 'تعذّر التحميل',
    ticketLoadError: 'فشل جلب التذاكر',
    ticketError: 'خطأ',
    notifRefresh: 'تحديث',
    notifFilterAll: 'الكل',
    ticketStatus: 'الحالة',
    ticketStatusOpen: 'مفتوحة',
    ticketPriority: 'الأولوية',
    ticketPriorityLow: 'منخفضة',
    ticketPriorityNormal: 'عادية',
    ticketPriorityHigh: 'مرتفعة',
    ticketPriorityUrgent: 'عاجلة',
    opsQueueEmpty: 'لا تذاكر',
    opsQueueErrorTitle: 'تعذّر طابور الدعم',
    opsSupportEyebrow: 'تشغيل',
    opsSupportTitle: 'طابور',
    opsSupportSub: 'وصف',
    opsSupportSearch: 'بحث',
    opsSupportSearchPh: '…',
    opsUpdated: 'تحديث',
    opsSelectTicket: 'اختر',
    ticketOpen: 'فتح',
    acctRegId: 'رقم',
    acctFullName: 'اسم',
    acctRole: 'دور',
    wilaya: 'ولاية',
    acctStatus: 'حالة',
    dashActions: 'إجراء',
    dashEmptyQueue: 'فارغ',
    dashApprove: 'موافقة',
    dashReject: 'رفض',
    accountPending: 'قيد',
  };
  let text = pack[k] ?? k;
  if (vars) Object.entries(vars).forEach(([a, b]) => { text = text.replaceAll(`{${a}}`, b); });
  return text;
};

// MDZ-UI-001
{
  const errHtml = renderSupportPanel(tAr, [], { safeText: (s) => s, error: true });
  assert.match(errHtml, /data-mdz-fetch-error/);
  assert.match(errHtml, /supportRetryBtn/);
  assert.doesNotMatch(errHtml, /ticketEmptyTitle|لا تذاكر بعد/);
  const opsErr = renderOperatorSupportQueue(tAr, [], { safeText: (s) => s, error: true });
  assert.match(opsErr, /opsSupportRetryBtn|data-mdz-fetch-error/);
  assert.doesNotMatch(opsErr, /opsQueueEmpty/);
  assert.match(renderFetchError(tAr), /role="alert"/);
}

const indexSrc = read('index.html');
assert.match(indexSrc, /fetchError\s*=\s*true/);
assert.match(indexSrc, /renderSupportSkeleton/);
assert.doesNotMatch(indexSrc, /catch\{tickets=\[\];\}\s*\n?\s*mount\.innerHTML=ops\.renderSupportPanel/);

// MDZ-UI-002
assert.doesNotMatch(read('js/mdz-dashboards.mjs'), /window\.prompt/);

// MDZ-UI-003
assert.equal(resolveNotificationDeepLink('#admin-dash'), 'admin');
assert.equal(resolveNotificationDeepLink('#manager-dash'), 'manager');
assert.match(indexSrc, /surface==='admin'/);

// MDZ-UI-004
{
  assert.equal(registrationStatusLabel(tAr, 'pending'), 'قيد المراجعة');
  assert.equal(registrationStatusLabel(tAr, 'approved'), 'مقبول / موثّق');
  const table = renderQueueTable(
    tAr,
    [{ registration_id: 'R1', full_name: 'Ali', role: 'breeder', wilaya: 'Alger', status: 'pending' },
      { registration_id: 'R2', full_name: 'Sara', role: 'vet', wilaya: 'Oran', status: 'rejected' }],
    (s) => String(s || ''),
    () => 'دور',
  );
  assert.match(table, /قيد المراجعة|مرفوض/);
  assert.doesNotMatch(table, />pending<|>approved<|>rejected</);
  assert.match(renderRegistrationStatusChip(tAr, 'suspended'), /موقوف/);
}

// MDZ-UI-005
assert.equal(ticketPriorityLabel(tAr, 'high'), 'مرتفعة');
{
  const q = renderOperatorSupportQueue(tAr, [{
    id: 1, subject: 'Help', ticket_code: 'T1', wilaya: 'Alger', status: 'open', priority: 'urgent', updated_at: '2026-07-24',
  }], { safeText: (s) => s });
  assert.match(q, /عاجلة/);
  assert.doesNotMatch(q, />urgent<|>normal</);
}

// MDZ-UI-006
assert.match(indexSrc, /data-i18n-aria="notifBellAria"/);
assert.match(read('js/mdz-member-ops.mjs'), /notifBellAriaUnread/);
assert.doesNotMatch(read('js/mdz-member-ops.mjs'), /\$\{n\} unread/);
assert.match(read('assets/i18n.js'), /notifBellAriaUnread/);

// MDZ-UI-007 — focus trap symbols present
{
  const src = read('js/mdz-member-ops.mjs');
  assert.match(src, /previouslyFocused/);
  assert.match(src, /getFocusable/);
  assert.match(src, /e\.key !== 'Tab'|e\.key === 'Tab'/);
  assert.match(src, /Escape/);
  assert.equal(typeof openReasonDialog, 'function');
}

// MDZ-UI-008
assert.match(indexSrc, /min\(960px,98vw\)/);
assert.match(read('js/mdz-dashboards.mjs'), /mdz-ops-command/);
assert.match(read('assets/mdz-design-system.css'), /mdz-ops-mount\.is-thread-open/);

// MDZ-UI-009
assert.match(indexSrc, /id="headerLoginBtn"/);
assert.match(indexSrc, /mdz-btn mdz-btn-ghost/);
assert.match(indexSrc, /id="headerRegisterBtn"/);
assert.match(indexSrc, /mdz-btn mdz-btn-primary/);

// MDZ-UI-010
assert.match(indexSrc, /mountAccountSupport[\s\S]*renderSupportSkeleton/);
assert.match(indexSrc, /mountOperatorSupport[\s\S]*renderSupportSkeleton/);

// MDZ-UI-011
assert.match(read('assets/i18n-content.js'), /passDemoChip:[\s\S]{0,40}Demo/);
assert.match(indexSrc, /passDemoChip">عرض توضيحي/);

// MDZ-UI-012
assert.match(read('js/mdz-dashboards.mjs'), /five primary tabs/);
assert.doesNotMatch(read('js/mdz-dashboards.mjs'), /four primary surfaces/);

console.log('  ✓ MDZ-UI remediation 001–012 gates');
