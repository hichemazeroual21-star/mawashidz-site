#!/usr/bin/env node
import assert from 'node:assert/strict';

const BASE_URL = String(process.env.VERIFY_BASE_URL || 'https://mawashidz.com').replace(/\/+$/, '');
const EXPECTED_COMMIT = String(process.env.VERIFY_GIT_COMMIT || '').trim();
const DECISION_ID = 'MDZ-ENG-DEC-2026-08-06-ENFORCE-PII-HOLD-02';
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

async function request(path, init = {}) {
  return fetch(`${BASE_URL}${path}`, {
    redirect: 'follow',
    cache: 'no-store',
    ...init,
  });
}

function assertSecurity(response) {
  assert.equal(response.headers.get('strict-transport-security'), 'max-age=31536000; includeSubDomains');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
}

const buildResponse = await request('/build-info.json');
assert.equal(buildResponse.status, 200, 'production build-info.json must remain available');
assertSecurity(buildResponse);
const build = await buildResponse.json();
assert.equal(build.worker, 'mawashidz-live', 'hold must be served by the production Worker');
assert.ok(build.commit, 'build-info must identify the deployed commit');
if (EXPECTED_COMMIT) {
  assert.equal(build.commit, EXPECTED_COMMIT, 'production hold commit must match the expected main commit');
}

const logoResponse = await request('/brand-logo.png');
assert.equal(logoResponse.status, 200, 'existing MawashiDZ logo must remain visible during the hold');
assertSecurity(logoResponse);
assert.match(logoResponse.headers.get('content-type') || '', /^image\/png/i);
assert.equal(logoResponse.headers.get('cross-origin-resource-policy'), 'same-origin');
const logoBytes = new Uint8Array(await logoResponse.arrayBuffer());
assert.ok(logoBytes.byteLength > 1000, 'brand logo response must not be empty or a placeholder');
assert.deepEqual(Array.from(logoBytes.slice(0, 8)), PNG_SIGNATURE, 'brand logo must be a valid PNG');

for (const path of ['/', '/index.html', '/register', '/js/registration-flow.mjs', '/assets/i18n.js']) {
  const response = await request(path);
  assert.equal(response.status, 503, `${path} must return the PII hold`);
  assertSecurity(response);
  assert.equal(response.headers.get('x-mawashidz-hold'), DECISION_ID);
  assert.match(response.headers.get('cache-control') || '', /no-store/);
  assert.match(response.headers.get('content-security-policy') || '', /img-src 'self'/);
  assert.match(response.headers.get('content-security-policy') || '', /connect-src 'none'/);
  assert.match(response.headers.get('content-security-policy') || '', /script-src 'none'/);
  assert.match(response.headers.get('content-security-policy') || '', /form-action 'none'/);
  const html = await response.text();
  assert.match(html, /مواشي ديزاد قيد التطوير/);
  assert.match(html, /<img class="mark" src="\/brand-logo\.png"/);
  assert.doesNotMatch(html, />م<\/div>/);
  assert.doesNotMatch(html, /الجوانب القانونية|الأمنية|معلومات شخصية|Temporary privacy hold/i);
  assert.doesNotMatch(html, /<form\b|<script\b|<input\b|emailjs|supabase/i);
}

for (const [path, init] of [
  ['/api/auth/login', { method: 'POST', body: '{}' }],
  ['/api/auth/recover', { method: 'POST', body: '{}' }],
  ['/api/process-email-outbox', { method: 'POST' }],
  ['/api/livestock-news', {}],
  ['/api/livestock-prices', {}],
]) {
  const response = await request(path, init);
  assert.equal(response.status, 503, `${path} must fail closed`);
  assertSecurity(response);
  assert.equal(response.headers.get('x-mawashidz-hold'), DECISION_ID);
  assert.deepEqual(await response.json(), { error: 'pii-hold-active' });
}

console.log(`PII hold verified: commit=${build.commit} worker=${build.worker} decision=${DECISION_ID} logo=existing`);
