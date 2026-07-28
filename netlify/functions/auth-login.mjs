import {
  normalizeSupabaseUrl,
  validateSupabaseUrlConfig,
} from '../../scripts/lib/supabase-url.mjs';

/**
 * Server-side login identifier resolution and password recovery.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * The resolved email and service-role key must never leave this module.
 */

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const LOGIN_INVALID = Object.freeze({ error: 'invalid-credentials' });
const RECOVER_OK = Object.freeze({ ok: true });
const DUMMY_EMAIL = '__mdz_login_probe__@example.invalid';
const RECOVERY_REDIRECT = 'https://mawashidz.com/#auth-callback';

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function envOf(_request, runtimeEnv, name) {
  return runtimeEnv?.[name] || '';
}

function configuredBaseUrl(raw) {
  const validation = validateSupabaseUrlConfig(raw);
  if (!validation.ok) return '';
  return normalizeSupabaseUrl(raw, { warn: () => {} });
}

function serviceHeaders(serviceKey) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };
}

async function parseJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function resolveIdentifier(baseUrl, serviceKey, identifier, fetchImpl) {
  const clean = String(identifier || '').trim();
  if (!clean) return '';
  if (clean.includes('@')) return clean.toLowerCase();

  try {
    const response = await fetchImpl(
      `${baseUrl}/rest/v1/rpc/resolve_login_identifier`,
      {
        method: 'POST',
        headers: serviceHeaders(serviceKey),
        body: JSON.stringify({ lookup_value: clean }),
      },
    );
    if (!response.ok) return '';
    const resolved = await response.json().catch(() => null);
    return typeof resolved === 'string' && resolved.includes('@')
      ? resolved.trim().toLowerCase()
      : '';
  } catch {
    return '';
  }
}

async function requestPasswordToken(
  baseUrl,
  serviceKey,
  email,
  password,
  fetchImpl,
) {
  return fetchImpl(`${baseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: serviceHeaders(serviceKey),
    body: JSON.stringify({ email, password }),
  });
}

export async function handleLogin(
  request,
  runtimeEnv = {},
  { fetchImpl = fetch } = {},
) {
  if (request.method !== 'POST') {
    return json(405, { error: 'method-not-allowed' });
  }

  const body = await parseJson(request);
  const identifier =
    typeof body?.identifier === 'string' ? body.identifier.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!identifier || !password) {
    return json(400, { error: 'invalid-request' });
  }

  const get = (name) => envOf(request, runtimeEnv, name);
  const baseUrl = configuredBaseUrl(
    get('SUPABASE_URL') || get('MDZ_SUPABASE_URL'),
  );
  const serviceKey =
    get('SUPABASE_SERVICE_ROLE_KEY') || get('MDZ_SERVICE_ROLE_KEY');
  if (!baseUrl || !serviceKey) {
    return json(503, { error: 'login-unavailable' });
  }

  const resolvedEmail = await resolveIdentifier(
    baseUrl,
    serviceKey,
    identifier,
    fetchImpl,
  );

  if (!resolvedEmail) {
    try {
      await requestPasswordToken(
        baseUrl,
        serviceKey,
        DUMMY_EMAIL,
        password,
        fetchImpl,
      );
    } catch {
      // The dummy call is deliberately best-effort; the response stays uniform.
    }
    return json(401, LOGIN_INVALID);
  }

  try {
    const authResponse = await requestPasswordToken(
      baseUrl,
      serviceKey,
      resolvedEmail,
      password,
      fetchImpl,
    );
    if (!authResponse.ok) return json(401, LOGIN_INVALID);

    const sessionBody = await authResponse.text();
    return new Response(sessionBody, { status: 200, headers: JSON_HEADERS });
  } catch {
    return json(401, LOGIN_INVALID);
  }
}

export async function handleRecover(
  request,
  runtimeEnv = {},
  { fetchImpl = fetch } = {},
) {
  if (request.method !== 'POST') {
    return json(405, { error: 'method-not-allowed' });
  }

  const body = await parseJson(request);
  const identifier =
    typeof body?.identifier === 'string' ? body.identifier.trim() : '';
  if (!identifier) return json(200, RECOVER_OK);

  const get = (name) => envOf(request, runtimeEnv, name);
  const baseUrl = configuredBaseUrl(
    get('SUPABASE_URL') || get('MDZ_SUPABASE_URL'),
  );
  const serviceKey =
    get('SUPABASE_SERVICE_ROLE_KEY') || get('MDZ_SERVICE_ROLE_KEY');
  if (!baseUrl || !serviceKey) return json(200, RECOVER_OK);

  const resolvedEmail = await resolveIdentifier(
    baseUrl,
    serviceKey,
    identifier,
    fetchImpl,
  );
  if (!resolvedEmail) return json(200, RECOVER_OK);

  try {
    const recoverUrl = new URL(`${baseUrl}/auth/v1/recover`);
    recoverUrl.searchParams.set('redirect_to', RECOVERY_REDIRECT);
    await fetchImpl(recoverUrl, {
      method: 'POST',
      headers: serviceHeaders(serviceKey),
      body: JSON.stringify({ email: resolvedEmail }),
    });
  } catch {
    // Recovery is deliberately non-enumerating for every upstream outcome.
  }

  return json(200, RECOVER_OK);
}

export default async function handler(request) {
  const pathname = new URL(request.url).pathname.replace(/\/$/, '');
  if (pathname.endsWith('/recover')) {
    return handleRecover(request, process.env);
  }
  return handleLogin(request, process.env);
}
