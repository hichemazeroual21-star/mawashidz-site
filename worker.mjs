/**
 * Cloudflare Worker — API routes + static assets fallback.
 * Serves /api/livestock-news and /api/livestock-prices (ported from Netlify Functions).
 */
import newsHandler from './netlify/functions/news.mjs';
import pricesHandler from './netlify/functions/prices.mjs';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/livestock-news') {
      try {
        return await newsHandler(request);
      } catch (error) {
        console.error('livestock-news error', error);
        return new Response(JSON.stringify({ error: 'news-handler-failed' }), {
          status: 503,
          headers: JSON_HEADERS,
        });
      }
    }

    if (pathname === '/api/livestock-prices') {
      try {
        return await pricesHandler(request);
      } catch (error) {
        console.error('livestock-prices error', error);
        return new Response(JSON.stringify({ error: 'prices-handler-failed' }), {
          status: 503,
          headers: JSON_HEADERS,
        });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
