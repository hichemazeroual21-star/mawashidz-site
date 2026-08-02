#!/usr/bin/env node
/**
 * Worker API route tests — routing, methods, ASSETS fallback, trailing slash.
 * News handler is mocked (no live Google RSS in unit suite).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createWorker } from '../worker.mjs';

const root = process.cwd();
const wrangler = JSON.parse(
  readFileSync(join(root, 'wrangler.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, '').replace(/,\s*}/g, '}'),
);

assert.equal(wrangler.name, 'mawashidz-live', 'production worker name must be mawashidz-live');
assert.equal(wrangler.main, 'worker.mjs', 'worker entry must be worker.mjs');
assert.equal(wrangler.assets?.binding, 'ASSETS', 'assets.binding ASSETS is required for env.ASSETS.fetch');
assert.equal(wrangler.assets?.run_worker_first, true, 'all requests must run Worker first for HTTPS redirect/HSTS');
assert.deepEqual(
  wrangler.ratelimits?.map(({ name, simple }) => ({ name, ...simple })),
  [
    { name: 'LOGIN_IDENTIFIER_RATE_LIMITER', limit: 5, period: 60 },
    { name: 'LOGIN_IP_RATE_LIMITER', limit: 30, period: 60 },
  ],
  'login rate-limit bindings must protect identifier and IP dimensions',
);

let newsCalls = 0;
const worker = createWorker({
  newsHandler: async () => {
    newsCalls++;
    return new Response(JSON.stringify({ updatedAt: new Date().toISOString(), items: [{ title: 't' }], streams: {} }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  },
  // prices uses real pure handler via default when not overridden — keep real for snapshot shape
});

const env = {
  ASSETS: {
    fetch: async (req) => new Response(`static:${new URL(req.url).pathname}`, { status: 200 }),
  },
};

async function call(path, init = {}) {
  return worker.fetch(new Request(`https://mawashidz.com${path}`, init), env);
}

function assertSecurityHeaders(response) {
  assert.equal(response.headers.get('strict-transport-security'), 'max-age=31536000; includeSubDomains');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
}

// HTTP is rejected at the Worker boundary before assets/routes; path + query are preserved.
{
  let assetCalls = 0;
  const redirectEnv = { ASSETS: { fetch: async () => { assetCalls++; return new Response('unexpected'); } } };
  const res = await worker.fetch(new Request('http://mawashidz.com/login?next=%2Faccount'), redirectEnv);
  assert.equal(res.status, 308);
  assert.equal(res.headers.get('location'), 'https://mawashidz.com/login?next=%2Faccount');
  assert.equal(assetCalls, 0, 'HTTP request must not reach static assets');
}

// --- prices truth gate (real handler) ---
{
  const res = await call('/api/livestock-prices');
  assert.equal(res.status, 503, 'prices endpoint must fail closed without verified data');
  assertSecurityHeaders(res);
  const prices = await res.json();
  assert.equal(prices.error, 'verified-market-data-unavailable');
  assert.equal(prices.verified, false);
  assert.equal(prices.updatedAt, null);
  assert.deepEqual(prices.rows, [], 'unverified price rows must never be returned');
  assert.deepEqual(prices.products, [], 'unverified products must never be returned');
}

// trailing slash
{
  assert.equal((await call('/api/livestock-prices/')).status, 503);
  assert.equal((await call('/api/livestock-news/')).status, 200);
}

// method gate
{
  const post = await call('/api/livestock-prices', { method: 'POST' });
  assert.equal(post.status, 405);
  assert.equal((await post.json()).error, 'method-not-allowed');

  const newsPost = await call('/api/livestock-news', { method: 'POST' });
  assert.equal(newsPost.status, 405);
}

// HEAD mirrors GET status (and invokes handler — no false 200)
{
  newsCalls = 0;
  const headNews = await call('/api/livestock-news', { method: 'HEAD' });
  assert.equal(headNews.status, 200);
  assert.equal(await headNews.text(), '');
  assert.equal(newsCalls, 1, 'HEAD news must invoke handler for truthful status');

  const failing = createWorker({
    newsHandler: async () => new Response(JSON.stringify({ error: 'news-sources-unavailable' }), { status: 503 }),
  });
  const headFail = await failing.fetch(new Request('https://mawashidz.com/api/livestock-news', { method: 'HEAD' }), env);
  assert.equal(headFail.status, 503, 'HEAD must mirror handler failure status');
}

// news GET wiring (mocked)
{
  const res = await call('/api/livestock-news');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.items));
}

// static fallback
{
  const res = await call('/index.html');
  assert.equal(res.status, 200);
  assertSecurityHeaders(res);
  assert.match(await res.text(), /^static:/);
}

// Auth resolver is server-only and rate-limited on both identifier hash and IP.
{
  const limiterKeys = [];
  const upstream = [];
  const authWorker = createWorker({
    fetchImpl: async (url, init) => {
      upstream.push({ url: String(url), init });
      if (String(url).includes('/rest/v1/rpc/resolve_login_identifier')) {
        return new Response(JSON.stringify('member@example.com'), { status: 200 });
      }
      if (String(url).includes('/auth/v1/token?grant_type=password')) {
        return new Response(JSON.stringify({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`unexpected upstream ${url}`);
    },
  });
  const authEnv = {
    ...env,
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_SECRET_KEY: 'sb_secret_test',
    LOGIN_IDENTIFIER_RATE_LIMITER: { limit: async ({ key }) => { limiterKeys.push(['identifier', key]); return { success: true }; } },
    LOGIN_IP_RATE_LIMITER: { limit: async ({ key }) => { limiterKeys.push(['ip', key]); return { success: true }; } },
  };
  const res = await authWorker.fetch(new Request('https://mawashidz.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.9' },
    body: JSON.stringify({ identifier: 'MDZ-Z-000123', password: 'not-a-real-password' }),
  }), authEnv);
  assert.equal(res.status, 200);
  assertSecurityHeaders(res);
  assert.deepEqual(await res.json(), { access_token: 'access', refresh_token: 'refresh', expires_in: 3600 });
  assert.equal(limiterKeys.length, 2);
  assert.equal(limiterKeys.find(([kind]) => kind === 'identifier')[1].length, 64, 'raw identifier must be hashed');
  assert.deepEqual(limiterKeys.find(([kind]) => kind === 'ip'), ['ip', '203.0.113.9']);
  assert.equal(upstream.length, 2);
  assert.equal(JSON.parse(upstream[0].init.body).lookup_value, 'MDZ-Z-000123');
  assert.equal(upstream[0].init.headers.apikey, 'sb_secret_test');
  assert.equal(upstream[0].init.headers.Authorization, undefined, 'new Supabase secret keys must not be sent as Bearer JWTs');
  assert.deepEqual(JSON.parse(upstream[1].init.body), { email: 'member@example.com', password: 'not-a-real-password' });
}

// Missing rate-limit bindings fail closed before Supabase configuration/upstream access.
{
  let upstreamCalls = 0;
  const authWorker = createWorker({ fetchImpl: async () => { upstreamCalls++; return new Response('{}'); } });
  const res = await authWorker.fetch(new Request('https://mawashidz.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'member@example.com', password: 'x' }),
  }), env);
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'rate-limit-unavailable');
  assert.equal(upstreamCalls, 0);
}

// An exhausted budget is 429 with Retry-After and never reaches Supabase.
{
  let upstreamCalls = 0;
  const authWorker = createWorker({ fetchImpl: async () => { upstreamCalls++; return new Response('{}'); } });
  const limitedEnv = {
    ...env,
    LOGIN_IDENTIFIER_RATE_LIMITER: { limit: async () => ({ success: false }) },
    LOGIN_IP_RATE_LIMITER: { limit: async () => ({ success: true }) },
  };
  const res = await authWorker.fetch(new Request('https://mawashidz.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'member@example.com', password: 'x' }),
  }), limitedEnv);
  assert.equal(res.status, 429);
  assert.equal(res.headers.get('retry-after'), '60');
  assert.equal(upstreamCalls, 0);
}

// Recovery is non-enumerating: a missing identifier returns the same 202 shape.
{
  let recoveryCalls = 0;
  const authWorker = createWorker({
    fetchImpl: async (url, init) => {
      recoveryCalls++;
      if (String(url).includes('resolve_login_identifier')) return new Response('null', { status: 200 });
      assert.match(String(url), /\/auth\/v1\/recover\?redirect_to=/);
      assert.match(JSON.parse(init.body).email, /^missing-[a-f0-9]{24}@invalid\.invalid$/);
      return new Response('{}', { status: 200 });
    },
  });
  const recoveryEnv = {
    ...env,
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_SECRET_KEY: 'sb_secret_test',
    LOGIN_IDENTIFIER_RATE_LIMITER: { limit: async () => ({ success: true }) },
    LOGIN_IP_RATE_LIMITER: { limit: async () => ({ success: true }) },
  };
  const res = await authWorker.fetch(new Request('https://mawashidz.com/api/auth/recover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'MDZ-Z-999999' }),
  }), recoveryEnv);
  assert.equal(res.status, 202);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(recoveryCalls, 2, 'missing and found recovery paths must both call GoTrue');
}

// missing ASSETS binding
{
  const res = await worker.fetch(new Request('https://mawashidz.com/no-such-page'), {});
  assert.equal(res.status, 500);
  assert.equal((await res.json()).error, 'assets-binding-missing');
}

// email outbox route exists and rejects bad method/auth
{
  const emailWorker = createWorker({
    emailOutboxHandler: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
  });
  const post = await emailWorker.fetch(
    new Request('https://mawashidz.com/api/process-email-outbox', { method: 'POST' }),
    env,
  );
  assert.equal(post.status, 200);
  const get = await call('/api/process-email-outbox', { method: 'GET' });
  // default handler returns 405 for GET
  assert.equal(get.status, 405);
}

console.log('  ✓ Worker API routes: HTTPS/HSTS, auth limits, recovery, APIs, HEAD, ASSETS guard');
