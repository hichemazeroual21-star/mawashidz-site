/**
 * Cloudflare Worker — API routes + static assets + scheduled email outbox drain.
 */
import defaultNewsHandler from './netlify/functions/news.mjs';
import defaultPricesHandler from './netlify/functions/prices.mjs';
import { processEmailOutbox } from './netlify/functions/email-outbox.mjs';
import { handleLogin, handleRecover } from './netlify/functions/auth-login.mjs';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function jsonError(status, code) {
  return json(status, { error: code });
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
  const loginHandler = deps.loginHandler || ((req, env) => handleLogin(req, env));
  const recoverHandler = deps.recoverHandler || ((req, env) => handleRecover(req, env));

  return {
    async fetch(request, env) {
      const pathname = normalizeApiPath(new URL(request.url).pathname);

      if (pathname === '/api/login') {
        try {
          return await loginHandler(request, env);
        } catch {
          console.error('login handler failed');
          return jsonError(503, 'login-unavailable');
        }
      }

      if (pathname === '/api/recover') {
        try {
          return await recoverHandler(request, env);
        } catch {
          console.error('recover handler failed');
          return json(200, { ok: true });
        }
      }

      if (pathname === '/api/process-email-outbox') {
        try {
          return await emailOutboxHandler(request, env);
        } catch (error) {
          console.error('email outbox error', error);
          return jsonError(503, 'email-outbox-failed');
        }
      }

      if (pathname === '/api/livestock-news' || pathname === '/api/livestock-prices') {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          return jsonError(405, 'method-not-allowed');
        }
        try {
          const handler = pathname === '/api/livestock-news' ? newsHandler : pricesHandler;
          const response = await handler(request);
          return request.method === 'HEAD' ? asHead(response) : response;
        } catch (error) {
          console.error(`${pathname} error`, error);
          const failed = jsonError(
            503,
            pathname === '/api/livestock-news' ? 'news-handler-failed' : 'prices-handler-failed',
          );
          return request.method === 'HEAD' ? asHead(failed) : failed;
        }
      }

      return serveAssets(request, env);
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
