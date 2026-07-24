#!/usr/bin/env node
/**
 * Worker API route smoke tests (no network — prices only; news needs RSS).
 */
import assert from 'node:assert/strict';
import worker from '../worker.mjs';

const env = {
  ASSETS: {
    fetch: async (req) => new Response(`static:${new URL(req.url).pathname}`, { status: 200 }),
  },
};

const pricesRes = await worker.fetch(new Request('https://mawashidz.com/api/livestock-prices'), env);
assert.equal(pricesRes.status, 200, 'prices endpoint must return 200');
const prices = await pricesRes.json();
assert.ok(Array.isArray(prices.rows) && prices.rows.length > 0, 'prices must include rows');
assert.ok(prices.products?.length, 'prices must include products');

const staticRes = await worker.fetch(new Request('https://mawashidz.com/index.html'), env);
assert.equal(staticRes.status, 200, 'static assets must fall through to ASSETS');
assert.match(await staticRes.text(), /^static:/, 'unknown paths must delegate to ASSETS binding');

console.log('  ✓ Worker API routes: prices OK, static fallback OK');
