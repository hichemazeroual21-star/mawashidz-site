#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  UserRolesFetchError,
  mapUserRoleRows,
  fetchUserRoles,
} from '../js/user-roles-fetch.mjs';
import { hasAdminAccess } from '../js/mdz-dashboards.mjs';

assert.deepEqual(mapUserRoleRows([{ role: 'founder' }]), ['founder']);
assert.deepEqual(mapUserRoleRows([{ role: ' Founder ' }]), ['founder']);
assert.deepEqual(mapUserRoleRows([]), []);
assert.deepEqual(mapUserRoleRows([{ role: '' }, { role: 'admin' }]), ['admin']);
assert.equal(hasAdminAccess(['founder']), true);
assert.equal(hasAdminAccess([]), false);

const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => [{ role: 'founder' }],
  });
  const roles = await fetchUserRoles('https://example/rest/v1', 'key', 'token');
  assert.deepEqual(roles, ['founder']);
} finally {
  globalThis.fetch = originalFetch;
}

try {
  globalThis.fetch = async () => ({
    ok: false,
    status: 403,
    json: async () => ({}),
  });
  await assert.rejects(
    () => fetchUserRoles('https://example/rest/v1', 'key', 'token'),
    (err) => err instanceof UserRolesFetchError && err.status === 403,
  );
} finally {
  globalThis.fetch = originalFetch;
}

console.log('user-roles-fetch tests: OK');
