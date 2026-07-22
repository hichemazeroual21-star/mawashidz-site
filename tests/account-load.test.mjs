#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  ACCOUNT_STEP,
  AccountLoadError,
  messageForAccountLoadError,
} from '../js/account-load.mjs';

const t = (key, vars = {}) => {
  const table = {
    accountErrSession: 'SESSION',
    accountErrProfile: 'PROFILE',
    accountErrProfileHttp: `PROFILE_HTTP_${vars.status}`,
    accountErrProfileMissing: 'PROFILE_MISSING',
    accountErrRoles: 'ROLES',
    accountErrRolesHttp: `ROLES_HTTP_${vars.status}`,
    accountErrDashboardModule: 'DASH_MODULE',
    accountErrDashboardRender: 'DASH_RENDER',
    accountErrNetwork: 'NETWORK',
    accountErrUnknown: 'UNKNOWN',
  };
  return table[key] || key;
};

assert.equal(
  messageForAccountLoadError(new AccountLoadError(ACCOUNT_STEP.SESSION, 401), t),
  'SESSION',
);
assert.equal(
  messageForAccountLoadError(new AccountLoadError(ACCOUNT_STEP.PROFILE, 503), t),
  'PROFILE_HTTP_503',
);
assert.equal(
  messageForAccountLoadError(new AccountLoadError(ACCOUNT_STEP.PROFILE, 403), t),
  'SESSION',
);
assert.equal(
  messageForAccountLoadError(new AccountLoadError(ACCOUNT_STEP.PROFILE, null), t),
  'PROFILE',
);
assert.equal(
  messageForAccountLoadError(
    new AccountLoadError(ACCOUNT_STEP.PROFILE, null, new TypeError('Failed to fetch')),
    t,
  ),
  'NETWORK',
);
assert.equal(
  messageForAccountLoadError(new AccountLoadError(ACCOUNT_STEP.PROFILE_MISSING, null), t),
  'PROFILE_MISSING',
);
assert.equal(
  messageForAccountLoadError(new AccountLoadError(ACCOUNT_STEP.ROLES, 500), t),
  'ROLES_HTTP_500',
);
assert.equal(
  messageForAccountLoadError(new AccountLoadError(ACCOUNT_STEP.ROLES, 401), t),
  'SESSION',
);
assert.equal(
  messageForAccountLoadError(new AccountLoadError(ACCOUNT_STEP.ROLES, null), t),
  'ROLES',
);
assert.equal(
  messageForAccountLoadError(
    new AccountLoadError(ACCOUNT_STEP.ROLES, null, new TypeError('network')),
    t,
  ),
  'NETWORK',
);
assert.equal(
  messageForAccountLoadError(new AccountLoadError(ACCOUNT_STEP.DASHBOARD_MODULE, null), t),
  'DASH_MODULE',
);
assert.equal(
  messageForAccountLoadError(new AccountLoadError(ACCOUNT_STEP.DASHBOARD_RENDER, null), t),
  'DASH_RENDER',
);
assert.equal(
  messageForAccountLoadError(new AccountLoadError('other', null), t),
  'UNKNOWN',
);
assert.equal(
  messageForAccountLoadError(new TypeError('Failed to fetch'), t),
  'NETWORK',
);
assert.equal(messageForAccountLoadError(new Error('boom'), t), 'UNKNOWN');

console.log('account-load tests: 15 branches OK');
