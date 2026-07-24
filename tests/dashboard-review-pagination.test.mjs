#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  canReviewRegistration,
  hasAdminAccess,
  hasManagerAccess,
  reviewRegistrationStatus,
} from '../js/mdz-dashboards.mjs';
import { paginateExchangeRows, nextExchangeLimit, EXCHANGE_PAGE_SIZE } from '../js/exchange-pagination.mjs';

assert.equal(hasAdminAccess(['member']), false);
assert.equal(hasAdminAccess(['admin']), true);
assert.equal(hasManagerAccess(['wilaya_manager'], null), true);
assert.equal(hasManagerAccess([], 'manager'), true);

assert.equal(canReviewRegistration(['member'], 'الجزائر', 'الجزائر', { asAdmin: false }), false);
assert.equal(canReviewRegistration(['wilaya_manager'], 'الجزائر', 'وهران', { asAdmin: false }), false);
assert.equal(canReviewRegistration(['wilaya_manager'], 'الجزائر', 'الجزائر', { asAdmin: false }), true);
assert.equal(canReviewRegistration(['admin'], 'الجزائر', 'وهران', { asAdmin: true }), true);
assert.equal(canReviewRegistration(['founder'], null, null, { asAdmin: true }), true);

// Unauthorized path must not call fetch — client gate
const calls = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (...args) => { calls.push(args); return new Response('{}', { status: 200 }); };
assert.equal(canReviewRegistration(['authenticated'], 'A', 'A', { asAdmin: false }), false);
assert.equal(calls.length, 0);

// reviewRegistrationStatus uses authenticated RPC endpoint shape
globalThis.fetch = async (url, init) => {
  assert.match(String(url), /\/rpc\/review_registration_status$/);
  assert.equal(init.method, 'POST');
  assert.equal(init.headers.Authorization, 'Bearer user-jwt');
  assert.ok(!JSON.stringify(init).toLowerCase().includes('service_role'));
  const body = JSON.parse(init.body);
  assert.equal(body.p_registration_id, 'MDZ-REG-1');
  assert.equal(body.p_new_status, 'approved');
  return new Response(JSON.stringify({ ok: true, status: 'approved' }), { status: 200 });
};
const result = await reviewRegistrationStatus('user-jwt', 'https://x.supabase.co/rest/v1', 'pub', 'MDZ-REG-1', 'approved');
assert.equal(result.ok, true);

// Simulate forbidden RPC response for unauthorized user
globalThis.fetch = async () => new Response(JSON.stringify({ message: 'insufficient privileges' }), { status: 403 });
await assert.rejects(
  () => reviewRegistrationStatus('user-jwt', 'https://x.supabase.co/rest/v1', 'pub', 'MDZ-REG-1', 'approved'),
  (err) => err.status === 403,
);
globalThis.fetch = originalFetch;

// Pagination
assert.equal(EXCHANGE_PAGE_SIZE, 10);
const rows = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
const first = paginateExchangeRows(rows, 10);
assert.equal(first.visible.length, 10);
assert.equal(first.total, 25);
assert.equal(first.hasMore, true);
assert.deepEqual(first.visible.map((r) => r.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

const secondLimit = nextExchangeLimit(10, 10);
assert.equal(secondLimit, 20);
const second = paginateExchangeRows(rows, secondLimit);
assert.equal(second.visible.length, 20);
assert.equal(second.hasMore, true);

const all = paginateExchangeRows(rows, 30);
assert.equal(all.visible.length, 25);
assert.equal(all.hasMore, false);

const empty = paginateExchangeRows([], 10);
assert.equal(empty.visible.length, 0);
assert.equal(empty.hasMore, false);

const ten = paginateExchangeRows(rows.slice(0, 10), 10);
assert.equal(ten.visible.length, 10);
assert.equal(ten.hasMore, false);

// No duplicates across pages
const ids = [...paginateExchangeRows(rows, 10).visible, ...paginateExchangeRows(rows, 20).visible.slice(10)].map((r) => r.id);
assert.equal(new Set(ids).size, ids.length);

console.log('  ✓ dashboard review auth + exchange pagination');
