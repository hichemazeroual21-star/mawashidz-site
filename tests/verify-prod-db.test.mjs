import assert from 'node:assert/strict';
import {
  FUNCTION_VOLATILITY,
  MUTATING_DENYLIST,
  SAFE_PROBES,
  assertProbeSafe,
  classify,
  probeFunction,
  probeRlsCount,
  probeTable,
} from '../scripts/verify-prod-db.mjs';

assert.equal(classify(404, '{"code":"PGRST205"}'), 'ABSENT_TABLE');
assert.equal(classify(404, '{"code":"PGRST202"}'), 'ABSENT_FUNCTION');
assert.equal(classify(401, '{"code":"42501"}'), 'DENIED');
assert.equal(classify(200, '[]'), 'REACHABLE');
assert.equal(classify(500, '{}'), 'UNKNOWN');

assert.equal(SAFE_PROBES.length, 11);
for (const probe of SAFE_PROBES) {
  assert.ok(
    ['IMMUTABLE', 'STABLE'].includes(FUNCTION_VOLATILITY[probe.fn]),
    `${probe.fn} must be IMMUTABLE or STABLE`,
  );
  assertProbeSafe(probe);
}

const expectedParameterizedArgs = new Map([
  ['resolve_login_identifier', ['lookup_value']],
  ['mdz_role_prefix', ['member_role']],
  ['normalize_algerian_phone', ['phone_input']],
  ['mdz_msg_registration_id', ['p_message']],
  ['mdz_is_test_registration_email', ['p_email']],
  ['mdz_registration_id_missing', ['p_registration_id']],
  ['mdz_is_real_pending_registration', ['p_email', 'p_registration_id']],
]);
for (const [fn, argNames] of expectedParameterizedArgs) {
  const probe = SAFE_PROBES.find((candidate) => candidate.fn === fn);
  assert.deepEqual(Object.keys(probe.args).sort(), argNames);
}

for (const fn of MUTATING_DENYLIST) {
  assert.throws(
    () => probeFunction({ fn }),
    /Refusing mutating function/,
    `${fn} must be structurally denied`,
  );
}
assert.throws(
  () => probeFunction({ fn: 'mdz_next_registration_id' }),
  /Refusing mutating function/,
);
assert.throws(
  () => probeFunction({ fn: 'unverified_function', args: {} }),
  /not approved/,
);
assert.throws(
  () => probeFunction({ fn: 'mdz_role_prefix', args: {} }),
  /argument signature is not approved/,
);

{
  let request;
  const fetchImpl = async (url, init) => {
    request = { url, init };
    return new Response('[]', { status: 200 });
  };
  const result = await probeTable('registrations', { fetchImpl });
  assert.deepEqual(result, { name: 'registrations', status: 'REACHABLE' });
  assert.match(request.url, /\/registrations\?select=\*&limit=0$/);
  assert.equal(request.init.method, 'GET');
}

{
  let request;
  const fetchImpl = async (url, init) => {
    request = { url, init };
    return new Response(null, {
      status: 200,
      headers: { 'Content-Range': '*/0' },
    });
  };
  const result = await probeRlsCount('profiles', { fetchImpl });
  assert.deepEqual(result, { status: 'REACHABLE', count: 0 });
  assert.equal(request.init.method, 'HEAD');
  assert.equal(request.init.headers.Prefer, 'count=exact');
  assert.equal(request.init.headers.Range, '0-0');
}

{
  const requests = [];
  const probe = SAFE_PROBES.find(
    ({ fn }) => fn === 'mdz_registration_id_missing',
  );
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    return new Response(
      JSON.stringify({ code: 'PGRST202', message: 'signature not found' }),
      { status: 404 },
    );
  };
  const result = await probeFunction(probe, { fetchImpl });
  assert.deepEqual(result, {
    name: 'mdz_registration_id_missing',
    status: 'UNRESOLVED',
  });
  assert.equal(requests.length, 1, 'PGRST202 must not trigger an empty-body retry');
  assert.deepEqual(JSON.parse(requests[0].init.body), probe.args);
}

{
  const probe = SAFE_PROBES.find(
    ({ fn }) => fn === 'mdz_assert_admin_caller',
  );
  const fetchImpl = async () =>
    new Response(JSON.stringify({ code: 'PGRST202' }), { status: 404 });
  const result = await probeFunction(probe, { fetchImpl });
  assert.equal(result.status, 'ABSENT_FUNCTION');
}

console.log('  ✓ read-only production database prober');
