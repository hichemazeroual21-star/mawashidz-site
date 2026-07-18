/*
 * MawashiDZ — الأخبار المتخصصة لقطاع المواشي
 * تُستدعى عبر /api/livestock-news (انظر netlify.toml).
 * تجمع أخبارًا عربية مفلترة حسب التصنيف من Google News RSS (الجزائر).
 */

const CATEGORY_QUERIES = {
  weather: 'الطقس الجزائر تحذير أرصاد',
  feed: 'الأعلاف الجزائر أسعار الشعير',
  livestock: 'المواشي الأغنام الجزائر',
  health: 'الصحة الحيوانية بيطري الجزائر تلقيح',
  official: 'وزارة الفلاحة والتنمية الريفية الجزائر',
};

const MAX_PER_CATEGORY = 4;
const FETCH_TIMEOUT_MS = 8000;

function decodeEntities(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

function parseRssItems(xml, category) {
  const items = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const block of blocks.slice(0, MAX_PER_CATEGORY)) {
    const pick = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return m ? decodeEntities(m[1]) : '';
    };
    const title = pick('title');
    const url = pick('link');
    if (!title || !url) continue;
    items.push({
      category,
      title,
      description: '',
      url,
      source: pick('source') || 'Google News',
      publishedAt: new Date(pick('pubDate') || Date.now()).toISOString(),
    });
  }
  return items;
}

async function fetchCategory(category, query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ar&gl=DZ&ceid=DZ:ar`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'MawashiDZ-NewsBot/1.0 (+https://mawashidz.com)' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return parseRssItems(await response.text(), category);
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler() {
  const results = await Promise.allSettled(
    Object.entries(CATEGORY_QUERIES).map(([category, query]) => fetchCategory(category, query)),
  );
  const items = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  // لا نُرجع نجاحًا وهميًا: عند فشل كل المصادر نعيد 503 ليعرض الموقع حالته الحقيقية.
  if (!items.length) {
    return new Response(JSON.stringify({ error: 'news-sources-unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  return new Response(JSON.stringify({ updatedAt: new Date().toISOString(), items }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800',
    },
  });
}
