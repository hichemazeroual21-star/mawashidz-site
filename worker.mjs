/**
 * Cloudflare Worker — API routes + static assets fallback.
 * Handlers are shared with Netlify Functions (same modules).
 *
 * Requires wrangler assets.binding = "ASSETS" and run_worker_first = ["/api/*"].
 */
import defaultNewsHandler from './netlify/functions/news.mjs';
import defaultPricesHandler from './netlify/functions/prices.mjs';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

function jsonError(status, code) {
  return new Response(JSON.stringify({ error: code }), { status, headers: JSON_HEADERS });
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

/** Strip body for HEAD while preserving status/headers from the real handler. */
async function asHead(response) {
  return new Response(null, { status: response.status, headers: response.headers });
}

/**
 * @param {{ newsHandler?: Function, pricesHandler?: Function }} [deps]
 */
export function createWorker(deps = {}) {
  const newsHandler = deps.newsHandler || defaultNewsHandler;
  const pricesHandler = deps.pricesHandler || defaultPricesHandler;

  return {
    async fetch(request, env) {
      const pathname = normalizeApiPath(new URL(request.url).pathname);

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
  };
}

export default createWorker();
