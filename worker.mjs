/**
 * Cloudflare Worker — API routes + static assets fallback.
 * Handlers are shared with Netlify Functions (same modules).
 *
 * Requires wrangler assets.binding = "ASSETS" and run_worker_first = ["/api/*"].
 */
import newsHandler from './netlify/functions/news.mjs';
import pricesHandler from './netlify/functions/prices.mjs';

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

export default {
  async fetch(request, env) {
    const pathname = normalizeApiPath(new URL(request.url).pathname);

    if (pathname === '/api/livestock-news' || pathname === '/api/livestock-prices') {
      if (request.method === 'HEAD') {
        return new Response(null, {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': pathname === '/api/livestock-prices'
              ? 'public, max-age=0, must-revalidate'
              : 'public, max-age=60, stale-while-revalidate=120',
          },
        });
      }
      if (request.method !== 'GET') {
        return jsonError(405, 'method-not-allowed');
      }
      try {
        const handler = pathname === '/api/livestock-news' ? newsHandler : pricesHandler;
        return await handler(request);
      } catch (error) {
        console.error(`${pathname} error`, error);
        return jsonError(503, pathname === '/api/livestock-news' ? 'news-handler-failed' : 'prices-handler-failed');
      }
    }

    return serveAssets(request, env);
  },
};
