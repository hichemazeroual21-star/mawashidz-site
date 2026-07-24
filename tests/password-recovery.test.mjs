#!/usr/bin/env node
import assert from 'node:assert/strict';

const sessionStore = new Map();
const localStore = new Map();
globalThis.sessionStorage = {
  getItem: (k) => (sessionStore.has(k) ? sessionStore.get(k) : null),
  setItem: (k, v) => { sessionStore.set(String(k), String(v)); },
  removeItem: (k) => { sessionStore.delete(k); },
};
globalThis.localStorage = {
  getItem: (k) => (localStore.has(k) ? localStore.get(k) : null),
  setItem: (k, v) => { localStore.set(String(k), String(v)); },
  removeItem: (k) => { localStore.delete(k); },
};

function fakeJwt(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `hdr.${body}.sig`;
}

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
  accessTokenIndicatesRecovery,
  decodeJwtPayload,
} = await import('../js/password-recovery.mjs');

assert.equal(isRecoveryAuthType('recovery'), true);
assert.equal(isRecoveryAuthType('signup'), false);
assert.equal(shouldEnterPasswordRecovery({ type: 'recovery', expectRecovery: false }), true);
assert.equal(shouldEnterPasswordRecovery({ type: 'signup', expectRecovery: true }), false, 'stale expect must not override signup');
assert.equal(shouldEnterPasswordRecovery({ type: 'invite', expectRecovery: true }), false);
assert.equal(shouldEnterPasswordRecovery({ type: '', expectRecovery: true }), true, 'no token + expect → recovery fallback');
assert.equal(shouldEnterPasswordRecovery({ type: 'signup', expectRecovery: false }), false);

const recoveryJwt = fakeJwt({ amr: ['recovery'], sub: 'u1' });
const objectAmrJwt = fakeJwt({ amr: [{ method: 'recovery' }], sub: 'u1' });
const signupJwt = fakeJwt({ amr: ['password'], sub: 'u1' });
assert.equal(accessTokenIndicatesRecovery(recoveryJwt), true);
assert.equal(accessTokenIndicatesRecovery(objectAmrJwt), true);
assert.equal(accessTokenIndicatesRecovery(signupJwt), false);
assert.equal(shouldEnterPasswordRecovery({ type: 'signup', expectRecovery: false, accessToken: recoveryJwt }), true);
assert.equal(shouldEnterPasswordRecovery({ type: '', expectRecovery: false, accessToken: signupJwt }), false);
assert.equal(shouldEnterPasswordRecovery({ type: '', expectRecovery: true, accessToken: signupJwt }), false, 'decodable non-recovery JWT beats stale expect');
assert.equal(shouldEnterPasswordRecovery({ type: '', expectRecovery: true, accessToken: recoveryJwt }), true);
assert.equal(decodeJwtPayload(recoveryJwt)?.sub, 'u1');

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
assert.equal(localStore.get('mdz_expect_recovery'), '1');
markRecoveryActive();
assert.equal(isRecoveryActive(), true);
assert.equal(isRecoveryExpected(), false);
assert.equal(localStore.get('mdz_password_recovery'), '1');
clearRecoveryActive();
assert.equal(isRecoveryActive(), false);

console.log('  ✓ password-recovery helpers');
