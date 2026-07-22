#!/usr/bin/env node
import assert from 'node:assert/strict';
import { dashboardErrorMessageKey } from '../js/mdz-dashboards.mjs';

assert.equal(dashboardErrorMessageKey({ status: 403 }), 'dashLoadForbidden');
assert.equal(dashboardErrorMessageKey({ status: 401 }), 'dashLoadForbidden');
assert.equal(dashboardErrorMessageKey({ status: 500 }), 'dashLoadHttp');
assert.equal(dashboardErrorMessageKey({ status: 404 }), 'dashLoadHttp');
assert.equal(dashboardErrorMessageKey(new TypeError('fetch failed')), 'dashLoadNetwork');
assert.equal(dashboardErrorMessageKey({}), 'dashLoadNetwork');

console.log('dashboard load error classification: 6 assertions OK');
