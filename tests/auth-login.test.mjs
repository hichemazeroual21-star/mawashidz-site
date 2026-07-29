import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  handleLogin,
  handleRecover,
} from '../netlify/functions/auth-login.mjs';

const ENV = Object.freeze({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
});
const source = readFileSync(
  new URL('../netlify/functions/auth-login.mjs', import.meta.url),
  'utf8',
);
assert.doesNotMatch(source, /console\./, 'auth routes must never log sensitive inputs');

function request(path, body, method = 'POST') {
  const init = { method };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  return new Request(`https://mawashidz.com${path}`, init);
}

function fetchSequence(responses) {
  const calls = [];
  let index = 0;
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const response = responses[index++];
    if (response instanceof Error) throw response;
    if (typeof response === 'function') return response({ url: String(url), init });
    if (!response) throw new Error(`unexpected fetch call ${index}`);
    return response;
  };
  return { calls, fetchImpl };
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

{
  const response = await handleLogin(request('/api/login', undefined, 'GET'));
  assert.equal(response.status, 405);
  assert.deepEqual(await response.json(), { error: 'method-not-allowed' });
}

{
  const response = await handleRecover(
    request('/api/recover', undefined, 'GET'),
  );
  assert.equal(response.status, 405);
}

{
  const response = await handleLogin(request('/api/login', '{'));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'invalid-request' });
}

{
  const response = await handleLogin(
    request('/api/login', { identifier: '', password: '' }),
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'invalid-request' });
}

{
  for (const runtimeEnv of [
    {},
    { SUPABASE_URL: ENV.SUPABASE_URL },
    { SUPABASE_SERVICE_ROLE_KEY: ENV.SUPABASE_SERVICE_ROLE_KEY },
    {
      SUPABASE_URL: 'https://attacker.invalid',
      SUPABASE_SERVICE_ROLE_KEY: ENV.SUPABASE_SERVICE_ROLE_KEY,
    },
  ]) {
    let fetchCalled = false;
    const response = await handleLogin(
      request('/api/login', {
        identifier: 'member@example.com',
        password: 'not-logged',
      }),
      runtimeEnv,
      {
        fetchImpl: async () => {
          fetchCalled = true;
          throw new Error('must not call invalid configuration');
        },
      },
    );
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'login-unavailable' });
    assert.equal(fetchCalled, false);
  }
}

let loginFailureText;
{
  const session = {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    user: { id: 'user-id', email: 'member@example.com' },
  };
  const sessionText = JSON.stringify(session);
  const stub = fetchSequence([
    new Response(sessionText, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  ]);
  const response = await handleLogin(
    request('/api/login', {
      identifier: ' MEMBER@Example.COM ',
      password: 'correct-password',
    }),
    ENV,
    { fetchImpl: stub.fetchImpl },
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), sessionText, 'GoTrue session must pass through unchanged');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(stub.calls.length, 1, 'email login must not call resolver');
  assert.match(stub.calls[0].url, /\/auth\/v1\/token\?grant_type=password$/);
  assert.doesNotMatch(stub.calls[0].url, /resolve_login_identifier/);
  assert.deepEqual(JSON.parse(stub.calls[0].init.body), {
    email: 'member@example.com',
    password: 'correct-password',
  });
  assert.equal(stub.calls[0].init.headers.apikey, ENV.SUPABASE_SERVICE_ROLE_KEY);
  assert.equal(
    stub.calls[0].init.headers.Authorization,
    `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}`,
  );

  const withoutAllowedEmail = structuredClone(session);
  delete withoutAllowedEmail.user.email;
  assert.doesNotMatch(JSON.stringify(withoutAllowedEmail), /@/);
}

{
  const stub = fetchSequence([
    jsonResponse(200, 'resolved@example.com'),
    jsonResponse(200, {
      access_token: 'phone-access',
      user: { email: 'resolved@example.com' },
    }),
  ]);
  const response = await handleLogin(
    request('/api/login', {
      identifier: '0550000000',
      password: 'phone-password',
    }),
    ENV,
    { fetchImpl: stub.fetchImpl },
  );

  assert.equal(response.status, 200);
  assert.equal(stub.calls.length, 2);
  assert.match(
    stub.calls[0].url,
    /\/rest\/v1\/rpc\/resolve_login_identifier$/,
  );
  assert.deepEqual(JSON.parse(stub.calls[0].init.body), {
    lookup_value: '0550000000',
  });
  assert.equal(stub.calls[0].init.headers.apikey, ENV.SUPABASE_SERVICE_ROLE_KEY);
  assert.equal(
    stub.calls[0].init.headers.Authorization,
    `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}`,
  );
}

{
  const stub = fetchSequence([
    jsonResponse(200, null),
    jsonResponse(400, { error: 'dummy user not found' }),
  ]);
  const response = await handleLogin(
    request('/api/login', {
      identifier: 'MDZ-U-999999',
      password: 'same-password',
    }),
    ENV,
    { fetchImpl: stub.fetchImpl },
  );

  assert.equal(response.status, 401);
  loginFailureText = await response.text();
  assert.equal(loginFailureText, '{"error":"invalid-credentials"}');
  assert.equal(stub.calls.length, 2, 'resolution miss must still make dummy GoTrue call');
  assert.match(stub.calls[1].url, /\/auth\/v1\/token\?grant_type=password$/);
  assert.deepEqual(JSON.parse(stub.calls[1].init.body), {
    email: '__mdz_login_probe__@example.invalid',
    password: 'same-password',
  });
  assert.equal(stub.calls[1].init.headers.apikey, ENV.SUPABASE_SERVICE_ROLE_KEY);
  assert.doesNotMatch(loginFailureText, /@|same-password|service-role/);
}

{
  const stub = fetchSequence([
    new Error('resolver network failure'),
    jsonResponse(400, { error: 'dummy user not found' }),
  ]);
  const response = await handleLogin(
    request('/api/login', {
      identifier: 'MDZ-U-999998',
      password: 'network-password',
    }),
    ENV,
    { fetchImpl: stub.fetchImpl },
  );
  assert.equal(response.status, 401);
  assert.equal(await response.text(), loginFailureText);
  assert.equal(stub.calls.length, 2, 'resolver errors must still make dummy GoTrue call');
}

{
  const stub = fetchSequence([
    jsonResponse(200, 'resolved@example.com'),
    jsonResponse(400, {
      error_description: 'bad password for resolved@example.com',
    }),
  ]);
  const response = await handleLogin(
    request('/api/login', {
      identifier: '0550000000',
      password: 'wrong-password',
    }),
    ENV,
    { fetchImpl: stub.fetchImpl },
  );

  assert.equal(response.status, 401);
  assert.equal(
    await response.text(),
    loginFailureText,
    'resolution miss and bad password responses must be byte-identical',
  );
}

{
  const outcomes = [];

  outcomes.push(await handleRecover(request('/api/recover', '{')));
  outcomes.push(
    await handleRecover(
      request('/api/recover', { identifier: 'member@example.com' }),
      {},
    ),
  );

  const unresolved = fetchSequence([
    jsonResponse(200, null),
    jsonResponse(200, {}),
  ]);
  outcomes.push(
    await handleRecover(
      request('/api/recover', { identifier: 'MDZ-U-999999' }),
      ENV,
      { fetchImpl: unresolved.fetchImpl },
    ),
  );
  assert.equal(
    unresolved.calls.length,
    2,
    'recovery miss must still make dummy recover call',
  );
  assert.match(
    unresolved.calls[0].url,
    /\/rest\/v1\/rpc\/resolve_login_identifier$/,
  );
  const dummyRecoverUrl = new URL(unresolved.calls[1].url);
  assert.equal(dummyRecoverUrl.pathname, '/auth/v1/recover');
  assert.equal(
    dummyRecoverUrl.searchParams.get('redirect_to'),
    'https://mawashidz.com/#auth-callback',
  );
  assert.deepEqual(JSON.parse(unresolved.calls[1].init.body), {
    email: '__mdz_login_probe__@example.invalid',
  });

  const upstreamFailure = fetchSequence([
    jsonResponse(500, { message: 'email provider unavailable' }),
  ]);
  outcomes.push(
    await handleRecover(
      request('/api/recover', { identifier: 'member@example.com' }),
      ENV,
      { fetchImpl: upstreamFailure.fetchImpl },
    ),
  );

  const texts = [];
  for (const response of outcomes) {
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    texts.push(await response.text());
  }
  assert.deepEqual(
    texts,
    Array(texts.length).fill('{"ok":true}'),
    'all recovery outcomes must be byte-identical',
  );
}

{
  const stub = fetchSequence([jsonResponse(200, {})]);
  const response = await handleRecover(
    request('/api/recover', {
      identifier: ' MEMBER@Example.COM ',
      redirect_to: 'https://attacker.invalid/steal',
    }),
    ENV,
    { fetchImpl: stub.fetchImpl },
  );

  assert.equal(response.status, 200);
  assert.equal(stub.calls.length, 1, 'email recovery must not call resolver');
  const recoverUrl = new URL(stub.calls[0].url);
  assert.equal(recoverUrl.pathname, '/auth/v1/recover');
  assert.equal(
    recoverUrl.searchParams.get('redirect_to'),
    'https://mawashidz.com/#auth-callback',
  );
  assert.deepEqual(JSON.parse(stub.calls[0].init.body), {
    email: 'member@example.com',
  });
  assert.equal(stub.calls[0].init.headers.apikey, ENV.SUPABASE_SERVICE_ROLE_KEY);
}

{
  const stub = fetchSequence([
    jsonResponse(200, 'resolved@example.com'),
    jsonResponse(200, {}),
  ]);
  await handleRecover(
    request('/api/recover', { identifier: '0550000000' }),
    ENV,
    { fetchImpl: stub.fetchImpl },
  );
  assert.equal(stub.calls.length, 2);
  assert.match(
    stub.calls[0].url,
    /\/rest\/v1\/rpc\/resolve_login_identifier$/,
  );
  const recoverUrl = new URL(stub.calls[1].url);
  assert.equal(recoverUrl.pathname, '/auth/v1/recover');
  assert.equal(
    recoverUrl.searchParams.get('redirect_to'),
    'https://mawashidz.com/#auth-callback',
  );
}

console.log('  ✓ server-side login and recovery anti-enumeration');
