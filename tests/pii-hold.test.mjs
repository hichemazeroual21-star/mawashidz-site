#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createWorker,
  PII_HOLD_ACTIVE,
  PII_HOLD_DECISION_ID,
} from '../worker.mjs';

assert.equal(PII_HOLD_ACTIVE, true, 'production PII hold must default to active');
assert.equal(
  PII_HOLD_DECISION_ID,
  'MDZ-ENG-DEC-2026-08-06-ENFORCE-PII-HOLD-02',
  'hold must remain bound to the Founder-authorized decision',
);

const deployScript = readFileSync(join(process.cwd(), 'scripts/deploy-prod.mjs'), 'utf8');
assert.match(deployScript, /import \{ PII_HOLD_ACTIVE \} from '\.\.\/worker\.mjs'/);
assert.match(
  deployScript,
  /PII_HOLD_ACTIVE \? 'npm run verify:pii-hold' : 'npm run verify:prod'/,
  'break-glass deployment must use the hold-aware verifier while the hold is active',
);
assert.match(
  deployScript,
  /if \(PII_HOLD_ACTIVE\) \{[\s\S]*?skip smoke:email-outbox \(PII hold requires the route to stay blocked\)[\s\S]*?\} else if \(process\.env\.EMAIL_OUTBOX_SECRET\)/,
  'break-glass deployment must not run a positive outbox smoke during the hold',
);

let assetCalls = 0;
let blockedHandlerCalls = 0;
const worker = createWorker({
  loginHandler: async () => { blockedHandlerCalls++; return new Response('unexpected'); },
  recoveryHandler: async () => { blockedHandlerCalls++; return new Response('unexpected'); },
  emailOutboxHandler: async () => { blockedHandlerCalls++; return new Response('unexpected'); },
  newsHandler: async () => { blockedHandlerCalls++; return new Response('unexpected'); },
  pricesHandler: async () => { blockedHandlerCalls++; return new Response('unexpected'); },
});

const env = {
  ASSETS: {
    fetch: async (request) => {
      assetCalls++;
      const pathname = new URL(request.url).pathname;
      assert.equal(pathname, '/build-info.json', 'only build-info may reach static assets during hold');
      return new Response(JSON.stringify({
        version: 'hold-test',
        commit: 'synthetic-test-commit',
        worker: 'mawashidz-live',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    },
  },
};

async function call(path, init = {}) {
  return worker.fetch(new Request(`https://mawashidz.com${path}`, init), env);
}

function assertCommonSecurity(response) {
  assert.equal(response.headers.get('strict-transport-security'), 'max-age=31536000; includeSubDomains');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
}

// Every public document and asset fails closed to the same self-contained holding page.
for (const path of ['/', '/index.html', '/register', '/js/registration-flow.mjs', '/assets/i18n.js']) {
  const response = await call(path);
  assert.equal(response.status, 503, `${path} must be unavailable during the PII hold`);
  assertCommonSecurity(response);
  assert.match(response.headers.get('cache-control') || '', /no-store/);
  assert.equal(response.headers.get('x-mawashidz-hold'), PII_HOLD_DECISION_ID);
  assert.match(response.headers.get('content-security-policy') || '', /default-src 'none'/);
  assert.match(response.headers.get('content-security-policy') || '', /connect-src 'none'/);
  assert.match(response.headers.get('content-security-policy') || '', /script-src 'none'/);
  assert.match(response.headers.get('content-security-policy') || '', /form-action 'none'/);

  const html = await response.text();
  assert.match(html, /التسجيل والدخول وإرسال الطلبات عبر موقع MawashiDZ غير متاح مؤقتاً/);
  assert.doesNotMatch(html, /<form\b/i);
  assert.doesNotMatch(html, /<script\b/i);
  assert.doesNotMatch(html, /<input\b/i);
  assert.doesNotMatch(html, /emailjs/i);
  assert.doesNotMatch(html, /supabase/i);
}
assert.equal(assetCalls, 0, 'blocked public paths must not reach the old asset bundle');

// All application APIs fail before auth, database, email, news, or price handlers run.
for (const [path, init] of [
  ['/api/auth/login', { method: 'POST', body: '{}' }],
  ['/api/auth/recover', { method: 'POST', body: '{}' }],
  ['/api/process-email-outbox', { method: 'POST' }],
  ['/api/livestock-news', {}],
  ['/api/livestock-prices', {}],
  ['/api/unknown-write', { method: 'POST', body: '{}' }],
]) {
  const response = await call(path, init);
  assert.equal(response.status, 503, `${path} must fail closed during hold`);
  assertCommonSecurity(response);
  assert.equal(response.headers.get('retry-after'), '3600');
  assert.equal(response.headers.get('x-mawashidz-hold'), PII_HOLD_DECISION_ID);
  assert.deepEqual(await response.json(), { error: 'pii-hold-active' });
}
assert.equal(blockedHandlerCalls, 0, 'hold must short-circuit every application handler');

// Exact deployment evidence stays observable without reopening any application route.
{
  const response = await call('/build-info.json');
  assert.equal(response.status, 200);
  assertCommonSecurity(response);
  assert.deepEqual(await response.json(), {
    version: 'hold-test',
    commit: 'synthetic-test-commit',
    worker: 'mawashidz-live',
  });
  assert.equal(assetCalls, 1);
}

// HEAD carries the same closed status and headers without a body.
{
  const response = await call('/', { method: 'HEAD' });
  assert.equal(response.status, 503);
  assert.equal(await response.text(), '');
  assertCommonSecurity(response);
}

// The scheduled outbox must not enqueue any work while the hold is active.
{
  let waitUntilCalls = 0;
  await worker.scheduled({}, env, { waitUntil() { waitUntilCalls++; } });
  assert.equal(waitUntilCalls, 0, 'scheduled email outbox must be disabled during hold');
}

// HTTPS redirect remains first at the transport boundary.
{
  const response = await worker.fetch(new Request('http://mawashidz.com/register?source=old'), env);
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), 'https://mawashidz.com/register?source=old');
}

console.log('  ✓ PII hold: no forms/scripts, all app routes blocked, outbox stopped, build evidence preserved');
