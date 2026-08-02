/**
 * Cloudflare Worker — API routes + static assets + scheduled email outbox drain.
 */
import defaultNewsHandler from './netlify/functions/news.mjs';
import defaultPricesHandler from './netlify/functions/prices.mjs';
import { processEmailOutbox } from './netlify/functions/email-outbox.mjs';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const HSTS_VALUE = 'max-age=31536000; includeSubDomains';

function jsonError(status, code) {
  return new Response(JSON.stringify({ error: code }), { status, headers: JSON_HEADERS });
}

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('Strict-Transport-Security', HSTS_VALUE);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function redirectToHttps(request) {
  const target = new URL(request.url);
  target.protocol = 'https:';
  return new Response(null, {
    status: 308,
    headers: {
      Location: target.toString(),
      'Cache-Control': 'no-store',
    },
  });
}

function normalizeApiPath(pathname) {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

async function serveAssets(request, env) {
  if (!env?.ASSETS?.fetch) {
    console.error('ASSETS binding missing — check wrangler.jsonc assets.binding');
    return jsonError(500, 'assets-binding-missing');
  }
  return env.ASSETS.fetch(request);
}

async function asHead(response) {
  return new Response(null, { status: response.status, headers: response.headers });
}

async function sha256Hex(value) {
  const input = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', input);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function supabaseHeaders(key) {
  const headers = {
    apikey: key,
    'Content-Type': 'application/json',
  };
  if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
  return headers;
}

function supabaseBaseUrl(env) {
  return String(env?.SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
}

async function consumeAuthBudget(request, env, identifier) {
  if (!env?.LOGIN_IDENTIFIER_RATE_LIMITER?.limit || !env?.LOGIN_IP_RATE_LIMITER?.limit) {
    console.error('login rate-limit bindings unavailable');
    return { available: false, allowed: false };
  }
  try {
    const identifierHash = await sha256Hex(identifier.toLowerCase());
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const [identifierBudget, ipBudget] = await Promise.all([
      env.LOGIN_IDENTIFIER_RATE_LIMITER.limit({ key: identifierHash }),
      env.LOGIN_IP_RATE_LIMITER.limit({ key: ip }),
    ]);
    return {
      available: true,
      allowed: Boolean(identifierBudget?.success && ipBudget?.success),
    };
  } catch {
    console.error('login rate-limit check failed');
    return { available: false, allowed: false };
  }
}

async function readJsonBody(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 4096) return { error: jsonError(413, 'request-too-large') };
  const text = await request.text();
  if (text.length > 4096) return { error: jsonError(413, 'request-too-large') };
  try {
    return { value: JSON.parse(text) };
  } catch {
    return { error: jsonError(400, 'invalid-request') };
  }
}

async function resolveIdentifierEmail(identifier, baseUrl, serverKey, fetchImpl) {
  if (identifier.includes('@')) return identifier.toLowerCase();
  const resolved = await fetchImpl(`${baseUrl}/rest/v1/rpc/resolve_login_identifier`, {
    method: 'POST',
    headers: supabaseHeaders(serverKey),
    body: JSON.stringify({ lookup_value: identifier }),
  });
  if (!resolved.ok) throw new Error('resolver-unavailable');
  return String(await resolved.json() || '').trim().toLowerCase();
}

async function loginWithIdentifier(request, env, fetchImpl = fetch) {
  if (request.method !== 'POST') return jsonError(405, 'method-not-allowed');

  const parsed = await readJsonBody(request);
  if (parsed.error) return parsed.error;
  const body = parsed.value;

  const identifier = String(body?.identifier || '').trim();
  const password = String(body?.password || '');
  if (!identifier || identifier.length > 320 || !password || password.length > 1024) {
    return jsonError(400, 'invalid-request');
  }

  const budget = await consumeAuthBudget(request, env, identifier);
  if (!budget.available) return jsonError(503, 'rate-limit-unavailable');
  if (!budget.allowed) {
    const limited = jsonError(429, 'rate_limited');
    limited.headers.set('Retry-After', '60');
    return limited;
  }

  const baseUrl = supabaseBaseUrl(env);
  const serverKey = String(env?.SUPABASE_SERVICE_ROLE_KEY || env?.SUPABASE_SECRET_KEY || '').trim();
  if (!baseUrl || !serverKey) {
    console.error('server-side login configuration unavailable');
    return jsonError(503, 'auth-service-unavailable');
  }

  let email;
  try {
    email = await resolveIdentifierEmail(identifier, baseUrl, serverKey, fetchImpl);
  } catch {
    return jsonError(503, 'auth-service-unavailable');
  }
  // Keep miss/hit flows structurally identical to reduce identifier enumeration.
  if (!email) email = `missing-${(await sha256Hex(identifier)).slice(0, 24)}@invalid.invalid`;

  const tokenResponse = await fetchImpl(`${baseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: serverKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  let tokenBody = {};
  try {
    tokenBody = await tokenResponse.json();
  } catch {
    return jsonError(503, 'auth-service-unavailable');
  }
  if (!tokenResponse.ok) {
    if (tokenResponse.status === 429) {
      const limited = jsonError(429, 'rate_limited');
      limited.headers.set('Retry-After', '60');
      return limited;
    }
    return jsonError(401, 'invalid_credentials');
  }
  return new Response(JSON.stringify(tokenBody), { status: 200, headers: JSON_HEADERS });
}

async function recoverWithIdentifier(request, env, fetchImpl = fetch) {
  if (request.method !== 'POST') return jsonError(405, 'method-not-allowed');
  const parsed = await readJsonBody(request);
  if (parsed.error) return parsed.error;
  const body = parsed.value;
  const identifier = String(body?.identifier || '').trim();
  if (!identifier || identifier.length > 320) return jsonError(400, 'invalid-request');
  const budget = await consumeAuthBudget(request, env, identifier);
  if (!budget.available) return jsonError(503, 'rate-limit-unavailable');
  if (!budget.allowed) {
    const limited = jsonError(429, 'rate_limited');
    limited.headers.set('Retry-After', '60');
    return limited;
  }
  const baseUrl = supabaseBaseUrl(env);
  const serverKey = String(env?.SUPABASE_SERVICE_ROLE_KEY || env?.SUPABASE_SECRET_KEY || '').trim();
  if (!baseUrl || !serverKey) return jsonError(503, 'auth-service-unavailable');

  let email;
  try {
    email = await resolveIdentifierEmail(identifier, baseUrl, serverKey, fetchImpl);
  } catch {
    return jsonError(503, 'auth-service-unavailable');
  }
  if (!email) email = `missing-${(await sha256Hex(identifier)).slice(0, 24)}@invalid.invalid`;
  const redirectBase = String(env?.PUBLIC_SITE_URL || 'https://mawashidz.com').replace(/\/+$/, '');
  const recovery = await fetchImpl(
    `${baseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(`${redirectBase}/#auth-callback`)}`,
    {
      method: 'POST',
      headers: { apikey: serverKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    },
  );
  if (recovery.status === 429) {
    const limited = jsonError(429, 'rate_limited');
    limited.headers.set('Retry-After', '60');
    return limited;
  }
  if (!recovery.ok) return jsonError(503, 'auth-service-unavailable');
  // Uniform success for found and missing identifiers prevents account enumeration.
  return new Response(JSON.stringify({ ok: true }), { status: 202, headers: JSON_HEADERS });
}

async function runEmailOutbox(env) {
  const secret = env.EMAIL_OUTBOX_SECRET || '';
  if (!secret) {
    console.error('email outbox cron skipped: EMAIL_OUTBOX_SECRET unset');
    return new Response(JSON.stringify({ error: 'email-outbox-secret-required' }), { status: 503 });
  }
  const req = new Request('https://mawashidz.com/api/process-email-outbox', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
  });
  return processEmailOutbox(req, env);
}

export function createWorker(deps = {}) {
  const newsHandler = deps.newsHandler || defaultNewsHandler;
  const pricesHandler = deps.pricesHandler || defaultPricesHandler;
  const emailOutboxHandler = deps.emailOutboxHandler || ((req, env) => processEmailOutbox(req, env));
  const loginHandler = deps.loginHandler
    || ((request, env) => loginWithIdentifier(request, env, deps.fetchImpl || fetch));
  const recoveryHandler = deps.recoveryHandler
    || ((request, env) => recoverWithIdentifier(request, env, deps.fetchImpl || fetch));

  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (url.protocol === 'http:') return redirectToHttps(request);
      const pathname = normalizeApiPath(url.pathname);

      if (pathname === '/api/auth/login') {
        try {
          return withSecurityHeaders(await loginHandler(request, env));
        } catch {
          console.error('server-side login failed');
          return withSecurityHeaders(jsonError(503, 'auth-service-unavailable'));
        }
      }

      if (pathname === '/api/auth/recover') {
        try {
          return withSecurityHeaders(await recoveryHandler(request, env));
        } catch {
          console.error('server-side recovery failed');
          return withSecurityHeaders(jsonError(503, 'auth-service-unavailable'));
        }
      }

      if (pathname === '/api/process-email-outbox') {
        try {
          return withSecurityHeaders(await emailOutboxHandler(request, env));
        } catch {
          console.error('email outbox failed');
          return withSecurityHeaders(jsonError(503, 'email-outbox-failed'));
        }
      }

      if (pathname === '/api/livestock-news' || pathname === '/api/livestock-prices') {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          return withSecurityHeaders(jsonError(405, 'method-not-allowed'));
        }
        try {
          const handler = pathname === '/api/livestock-news' ? newsHandler : pricesHandler;
          const response = await handler(request);
          return withSecurityHeaders(request.method === 'HEAD' ? await asHead(response) : response);
        } catch {
          console.error(`${pathname} failed`);
          const failed = jsonError(
            503,
            pathname === '/api/livestock-news' ? 'news-handler-failed' : 'prices-handler-failed',
          );
          return withSecurityHeaders(request.method === 'HEAD' ? await asHead(failed) : failed);
        }
      }

      return withSecurityHeaders(await serveAssets(request, env));
    },

    async scheduled(_controller, env, ctx) {
      ctx.waitUntil(
        runEmailOutbox(env).then((res) => {
          console.log('email outbox cron', res.status);
        }).catch((err) => console.error('email outbox cron failed', err)),
      );
    },
  };
}

export default createWorker();
