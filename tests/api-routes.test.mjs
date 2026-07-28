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
assert.deepEqual(wrangler.assets?.run_worker_first, ['/api/*'], 'API routes must run worker first');

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

// --- prices (real handler) ---
{
  const res = await call('/api/livestock-prices');
  assert.equal(res.status, 200, 'prices endpoint must return 200');
  const prices = await res.json();
  assert.ok(Array.isArray(prices.rows) && prices.rows.length > 0, 'prices must include rows');
  assert.ok(prices.products?.length, 'prices must include products');
}

// trailing slash
{
  assert.equal((await call('/api/livestock-prices/')).status, 200);
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
  assert.match(await res.text(), /^static:/);
}

// unknown /api/* still falls through to static assets
{
  const res = await call('/api/not-a-real-route');
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'static:/api/not-a-real-route');
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

// login/recover routes are Worker-owned, POST-only, and dependency-injectable
{
  let loginCalls = 0;
  let recoverCalls = 0;
  const authWorker = createWorker({
    loginHandler: async () => {
      loginCalls++;
      return new Response(JSON.stringify({ access_token: 'test-token' }), {
        status: 200,
      });
    },
    recoverHandler: async () => {
      recoverCalls++;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
  });

  const login = await authWorker.fetch(
    new Request('https://mawashidz.com/api/login/', { method: 'POST' }),
    env,
  );
  assert.equal(login.status, 200);
  assert.equal(loginCalls, 1);

  const recover = await authWorker.fetch(
    new Request('https://mawashidz.com/api/recover', { method: 'POST' }),
    env,
  );
  assert.equal(recover.status, 200);
  assert.equal(recoverCalls, 1);

  assert.equal((await call('/api/login', { method: 'GET' })).status, 405);
  assert.equal((await call('/api/recover', { method: 'GET' })).status, 405);
}

console.log('  ✓ Worker API routes: auth, prices, news, methods, HEAD, ASSETS guard');

