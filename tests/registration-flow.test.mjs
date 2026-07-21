#!/usr/bin/env node
/**
 * Registration flow unit tests (mocked Supabase / EmailJS).
 */
import assert from 'node:assert/strict';
import {
  runRegistrationPipeline,
  duplicateRegistrationMessage,
  isAuthDuplicateError,
  isRegistrationDuplicateError,
  isRateLimitError,
  REGISTRATION_ERROR,
  EMAIL_WARNING_AR,
  RATE_LIMIT_MESSAGE_AR,
  authDuplicateMessage,
  GENERIC_CONFLICT_MESSAGE_AR,
  REGISTRATION_RECOVERY_WARNING_AR,
} from '../js/registration-flow.mjs';

const results = { passed: [], failed: [] };

function test(name, fn) {
  try {
    fn();
    results.passed.push(name);
  } catch (error) {
    results.failed.push({ name, error: error.message });
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    results.passed.push(name);
  } catch (error) {
    results.failed.push({ name, error: error.message });
  }
}

function makeDeps(overrides = {}) {
  return {
    signUpAccount: async () => ({ user: { user_metadata: { member_id: 'MDZ-F-000001' } }, session: null }),
    memberIdAfterSignup: async () => 'MDZ-F-000001',
    supabaseInsert: async () => true,
    sendRegistrationEmail: async () => ({ status: 200 }),
    ...overrides,
  };
}

const baseContext = {
  email: 'user@example.com',
  password: 'password123',
  authMetadata: { role: 'breeder' },
  registrationPayload: { full_name: 'Test User', phone: '+213555123456', email: 'user@example.com' },
  emailData: { email: 'user@example.com', full_name: 'Test User' },
};

// 1. Signup success + email success
await testAsync('1. signup success + email success', async () => {
  const r = await runRegistrationPipeline(makeDeps(), baseContext);
  assert.equal(r.success, true);
  assert.equal(r.accountCreated, true);
  assert.equal(r.registrationSaved, true);
  assert.equal(r.emailSent, true);
  assert.equal(r.error, null);
});

// 2. Signup success + email failure
await testAsync('2. signup success + email failure', async () => {
  const r = await runRegistrationPipeline(makeDeps({
    sendRegistrationEmail: async () => { throw new Error('EmailJS down'); },
  }), baseContext);
  assert.equal(r.success, true);
  assert.equal(r.accountCreated, true);
  assert.equal(r.emailWarning, EMAIL_WARNING_AR);
  assert.equal(r.error, null);
});

// 3. Duplicate phone (registrations) before account — auth fails path not applicable;
//    duplicate phone on registrations after successful auth
await testAsync('3. duplicate phone on registrations after auth success', async () => {
  const phoneDup = Object.assign(new Error('duplicate key'), {
    code: '23505',
    status: 409,
    details: 'Key (phone)=(+213555123456) already exists. registrations_phone_key',
  });
  const r = await runRegistrationPipeline(makeDeps({
    supabaseInsert: async () => { throw phoneDup; },
  }), baseContext);
  assert.equal(r.success, true);
  assert.equal(r.accountCreated, true);
  assert.equal(r.registrationSaved, true);
  assert.equal(r.registrationWarning, REGISTRATION_RECOVERY_WARNING_AR);
});

// 4. Duplicate email (auth)
await testAsync('4. duplicate email on auth signup', async () => {
  const authDup = Object.assign(new Error('User already registered'), { status: 422 });
  const r = await runRegistrationPipeline(makeDeps({
    signUpAccount: async () => { throw authDup; },
    supabaseInsert: async () => { throw authDup; },
  }), baseContext);
  assert.equal(r.success, false);
  assert.equal(r.error.code, REGISTRATION_ERROR.DUPLICATE_EMAIL);
  assert.equal(r.error.message, authDuplicateMessage());
});

// 5. Database failure before account creation
await testAsync('5. auth failure before account creation', async () => {
  const r = await runRegistrationPipeline(makeDeps({
    signUpAccount: async () => { throw Object.assign(new Error('invalid email'), { status: 400 }); },
  }), baseContext);
  assert.equal(r.success, false);
  assert.equal(r.accountCreated, false);
  assert.equal(r.error.code, REGISTRATION_ERROR.AUTH_FAILED);
});

// 6. Double-click submission — second auth rejected; founding row also duplicate
await testAsync('6. double-click — auth duplicate + registration duplicate', async () => {
  let authCalls = 0;
  const phoneDup = Object.assign(new Error('duplicate key'), {
    code: '23505',
    status: 409,
    details: 'registrations_phone_key',
  });
  const deps = makeDeps({
    signUpAccount: async () => {
      authCalls += 1;
      if (authCalls > 1) throw Object.assign(new Error('User already registered'), { status: 422 });
      return { user: { user_metadata: { member_id: 'MDZ-F-000002' } } };
    },
    supabaseInsert: async () => {
      if (authCalls > 1) throw phoneDup;
      return true;
    },
  });
  const r1 = await runRegistrationPipeline(deps, { ...baseContext, email: 'double@example.com' });
  const r2 = await runRegistrationPipeline(deps, { ...baseContext, email: 'double@example.com' });
  assert.equal(r1.success, true);
  assert.equal(r2.success, false);
  assert.equal(r2.error.message, GENERIC_CONFLICT_MESSAGE_AR);
});

// 7. Network timeout after successful server response (registrations timeout)
await testAsync('7. network timeout on registrations after auth success', async () => {
  const timeout = Object.assign(new Error('aborted'), { name: 'AbortError' });
  const r = await runRegistrationPipeline(makeDeps({
    supabaseInsert: async () => { throw timeout; },
  }), baseContext);
  assert.equal(r.success, true);
  assert.equal(r.accountCreated, true);
  assert.equal(r.registrationWarning !== null, true);
});

// 8. Existing auth user but missing registration row
await testAsync('8. existing auth user — complete missing registration row', async () => {
  const authDup = Object.assign(new Error('User already registered'), { status: 422 });
  let insertCalls = 0;
  const r = await runRegistrationPipeline(makeDeps({
    signUpAccount: async () => { throw authDup; },
    supabaseInsert: async () => { insertCalls += 1; return true; },
  }), baseContext);
  assert.equal(insertCalls, 1);
  assert.equal(r.success, true);
  assert.equal(r.registrationSaved, true);
  assert.match(r.registrationWarning, /حساب|طلب/);
});

// 9. Supabase email rate limit (429 over_email_send_rate_limit)
await testAsync('9. email rate limit — Arabic retry message, no insert, no admin email', async () => {
  const rateLimit = Object.assign(new Error('email rate limit exceeded'), { status: 429 });
  let insertCalls = 0;
  let emailCalls = 0;
  const r = await runRegistrationPipeline(makeDeps({
    signUpAccount: async () => { throw rateLimit; },
    supabaseInsert: async () => { insertCalls += 1; return true; },
    sendRegistrationEmail: async () => { emailCalls += 1; return { status: 200 }; },
  }), baseContext);
  assert.equal(r.success, false);
  assert.equal(r.error.code, REGISTRATION_ERROR.RATE_LIMITED);
  assert.equal(r.error.message, RATE_LIMIT_MESSAGE_AR);
  assert.equal(insertCalls, 0);
  assert.equal(emailCalls, 0);
});

// 10. Duplicate resubmit must NOT spam the admin inbox
await testAsync('10. duplicate recovery — no admin email on resubmit', async () => {
  const authDup = Object.assign(new Error('User already registered'), { status: 422 });
  let emailCalls = 0;
  const r = await runRegistrationPipeline(makeDeps({
    signUpAccount: async () => { throw authDup; },
    supabaseInsert: async () => true,
    sendRegistrationEmail: async () => { emailCalls += 1; return { status: 200 }; },
  }), baseContext);
  assert.equal(r.success, true);
  assert.equal(r.registrationSaved, true);
  assert.equal(emailCalls, 0);
  assert.equal(r.emailSkipped, true);
  assert.equal(r.emailSent, false);
});

test('isRateLimitError detects Supabase 429 and rate-limit text', () => {
  assert.equal(isRateLimitError({ status: 429, message: 'email rate limit exceeded' }), true);
  assert.equal(isRateLimitError({ message: 'over_email_send_rate_limit: rate limit hit' }), true);
  assert.equal(isRateLimitError({ status: 400, message: 'invalid email' }), false);
});

test('duplicateRegistrationMessage — phone constraint returns generic conflict', () => {
  const msg = duplicateRegistrationMessage({
    code: '23505',
    status: 409,
    details: 'registrations_phone_key',
  });
  assert.equal(msg, GENERIC_CONFLICT_MESSAGE_AR);
});

test('duplicateRegistrationMessage — unrelated 500 returns empty', () => {
  assert.equal(duplicateRegistrationMessage({ status: 500, message: 'internal error' }), '');
});

test('isAuthDuplicateError detects Supabase message', () => {
  assert.equal(isAuthDuplicateError({ message: 'User already registered', status: 422 }), true);
});

console.log(`\nRegistration flow tests: ${results.passed.length} passed, ${results.failed.length} failed`);
if (results.failed.length) {
  results.failed.forEach((f) => console.error(`  ✗ ${f.name}: ${f.error}`));
  process.exit(1);
}
results.passed.forEach((name) => console.log(`  ✓ ${name}`));
