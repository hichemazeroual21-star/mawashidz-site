/**
 * MawashiDZ Cloudflare Worker — API routes + static assets.
 * /api/livestock-news  → news handler (Google News RSS, filtered)
 * /api/livestock-prices → market snapshot
 * everything else       → public/ assets
 */
import newsHandler from '../netlify/functions/news.mjs';
import pricesHandler from '../netlify/functions/prices.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/livestock-news' || path === '/api/livestock-news/') {
      return newsHandler(request, env);
    }
    if (path === '/api/livestock-prices' || path === '/api/livestock-prices/') {
      return pricesHandler(request, env);
    }

    if (path.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'not-found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
