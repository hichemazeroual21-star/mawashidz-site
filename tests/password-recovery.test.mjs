#!/usr/bin/env node
import assert from 'node:assert/strict';

const store = new Map();
globalThis.sessionStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(String(k), String(v)); },
  removeItem: (k) => { store.delete(k); },
};

const {
  shouldEnterPasswordRecovery,
  validateNewPassword,
  buildUpdatePasswordRequest,
  isRecoveryAuthType,
  markRecoveryExpected,
  clearRecoveryExpected,
  markRecoveryActive,
  clearRecoveryActive,
  isRecoveryActive,
  isRecoveryExpected,
} = await import('../js/password-recovery.mjs');

assert.equal(isRecoveryAuthType('recovery'), true);
assert.equal(isRecoveryAuthType('signup'), false);
assert.equal(shouldEnterPasswordRecovery({ type: 'recovery', expectRecovery: false }), true);
assert.equal(shouldEnterPasswordRecovery({ type: 'signup', expectRecovery: true }), true);
assert.equal(shouldEnterPasswordRecovery({ type: 'signup', expectRecovery: false }), false);

const short = validateNewPassword('123', '123', (k) => k);
assert.equal(short.ok, false);
assert.equal(short.message, 'resetPasswordTooShort');

const mismatch = validateNewPassword('password1', 'password2', (k) => k);
assert.equal(mismatch.ok, false);
assert.equal(mismatch.message, 'resetPasswordMismatch');

const ok = validateNewPassword('password1', 'password1', (k) => k);
assert.equal(ok.ok, true);

const req = buildUpdatePasswordRequest('tok', 'password1', 'https://example.supabase.co/auth/v1', 'pub');
assert.equal(req.url, 'https://example.supabase.co/auth/v1/user');
assert.equal(req.init.method, 'PUT');
assert.equal(req.init.headers.Authorization, 'Bearer tok');
assert.equal(JSON.parse(req.init.body).password, 'password1');
assert.ok(!String(req.init.body).includes('tok'), 'token must not appear in body');

clearRecoveryActive();
clearRecoveryExpected();
markRecoveryExpected();
assert.equal(isRecoveryExpected(), true);
markRecoveryActive();
assert.equal(isRecoveryActive(), true);
assert.equal(isRecoveryExpected(), false);
clearRecoveryActive();
assert.equal(isRecoveryActive(), false);

console.log('  ✓ password-recovery helpers');
