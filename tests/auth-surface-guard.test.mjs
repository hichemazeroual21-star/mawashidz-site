#!/usr/bin/env node
/**
 * Static guards for auth/profile/recover surface changes in index.html.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');

assert.match(html, /function userIdFromAccessToken\(token\)/, 'JWT sub helper required');
assert.match(
  html,
  /profiles\?select=\*&id=eq\.\$\{encodeURIComponent\(id\)\}/,
  'fetchMyProfile must always filter by id=eq',
);
assert.ok(!/profiles\?select=\*&limit=1`/.test(html), 'unfiltered profiles?limit=1 must be gone');

assert.match(html, /showToast\(t\('toastRecoverSent'\)\)/, 'forgot-password must show neutral success toast');
assert.match(
  html,
  /const email=id\.includes\('@'\)\?id\.toLowerCase\(\):await resolveLoginEmail\(id\)/,
  'forgot-password must skip resolve RPC for email identifiers',
);
assert.ok(
  html.indexOf("showToast(t('toastRecoverSent'))")
    < html.indexOf('void (async()=>{'),
  'neutral toast must fire before async recover work (anti-enumeration timing)',
);
assert.match(html, /markRecoveryExpected\(\)/, 'forgot-password must mark recovery expectation');
assert.match(html, /id="resetPasswordModal"/, 'reset password modal required');
assert.match(html, /shouldEnterPasswordRecovery/, 'recovery callback must branch to set-password UI');
assert.match(html, /buildUpdatePasswordRequest|\/user'/, 'password update must call auth /user');
assert.match(html, /openResetPasswordModal/, 'set-password UI entrypoint required');
assert.ok(!/type==='recovery'\?t\('authRecoveryOk'\):type==='signup'/.test(html), 'recovery must not fall through to openAccount toast path');

assert.match(
  html,
  /user:uid\?\{id:uid\}:null/,
  'auth-callback must populate session.user.id from access token',
);

assert.ok(!/function describeRegistrationError/.test(html), 'dead describeRegistrationError must be removed');
assert.ok(!/function duplicateRegistrationMessage/.test(html), 'dead duplicateRegistrationMessage must be removed');
assert.match(html, /function showRegistrationError/, 'showRegistrationError remains for pipeline failures');

const mgr = html.match(/async function openManagerDashboard\(\)\{[\s\S]*?\n\}/);
assert.ok(mgr, 'openManagerDashboard must exist');
assert.match(mgr[0], /try\{\s*const profile=/, 'manager profile fetch must be inside try');

assert.match(html, /wireDashboardReviewActions/, 'dashboards must wire approve/reject actions');
assert.match(html, /exchangeShowMoreBtn/, 'exchange show-more control required');
assert.match(html, /mdzExchangeLimit/, 'exchange pagination state required');

console.log('  ✓ Auth/profile/recover surface guards passed');
