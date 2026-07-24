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

console.log('  ✓ Auth/profile/recover surface guards passed');
