#!/usr/bin/env node
import assert from 'node:assert/strict';
import { dashRoleFlag } from '../js/mdz-roles.mjs';
import { hasAdminAccess, hasManagerAccess } from '../js/mdz-dashboards.mjs';

/** Previous inline logic from index.html (must stay equivalent). */
function legacyDashRoleFlag(kind, roles, profileRole) {
  if (kind === 'admin') return roles.some((r) => ['admin', 'founder', 'super_admin'].includes(r));
  return (
    roles.some((r) => ['wilaya_manager', 'manager', 'wilaya_mgr', 'admin', 'founder', 'super_admin'].includes(r)) ||
    String(profileRole || '').toLowerCase() === 'manager'
  );
}

const ROLE_STRINGS = [
  '',
  'admin',
  'founder',
  'super_admin',
  'wilaya_manager',
  'manager',
  'wilaya_mgr',
  'breeder',
  'vet',
  'user',
  'MANAGER',
  'Founder',
];

let failed = 0;
for (const role of ROLE_STRINGS) {
  const roles = role ? [role] : [];
  for (const profileRole of [undefined, '', 'manager', 'breeder']) {
    for (const kind of ['admin', 'manager']) {
      const a = dashRoleFlag(kind, roles, profileRole);
      const b = legacyDashRoleFlag(kind, roles, profileRole);
      if (a !== b) {
        console.error(`Mismatch kind=${kind} roles=${JSON.stringify(roles)} profile=${profileRole}: module=${a} legacy=${b}`);
        failed++;
      }
      if (kind === 'admin') {
        assert.equal(hasAdminAccess(roles), a);
      } else {
        assert.equal(hasManagerAccess(roles, profileRole), a);
      }
    }
  }
}

if (failed) {
  console.error(`mdz-roles tests: ${failed} mismatch(es)`);
  process.exit(1);
}
console.log('mdz-roles tests: legacy parity + dashboard helpers OK');
