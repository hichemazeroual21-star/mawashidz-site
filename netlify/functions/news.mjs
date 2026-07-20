/*
 * MawashiDZ — أخبار قطاع المواشي والزراعة (مصادر موثوقة + فلترة صارمة)
 * /api/livestock-news
 */

const CATEGORY_QUERIES = {
  weather: 'الطقس الجزائر تحذير أرصاد مربي',
  feed: 'الأعلاف الجزائر أسعار الشعير الذرة',
  livestock: 'المواشي الأغنام الأبقار الجزائر سوق',
  health: 'الصحة الحيوانية بيطري الجزائر تلقيح',
  official: 'وزارة الفلاحة والتنمية الريفية الجزائر مواشي',
  prices: 'أسعار اللحوم الأغنام الجزائر سوق الجملة',
};

const TRUSTED_SOURCES = [
  'madr.gov.dz', 'aps.dz', 'elwatan', 'liberte', 'echorouk', 'ennaharonline',
  'google', 'woah', 'fao', 'meteo.dz', 'onab', 'interieur.gov.dz',
];

const LIVESTOCK_KEYWORDS = /مواشي|ماشية|أغنام|أغنام|ضأن|أبقار|بقر|عجول|عجول|ماعز|إبل|جمال|لحوم|لحم|أعلاف|شعير|ذرة|نخالة|فلاحة|زراع|بيطر|حيوان|تلقيح|مربي|مربّ|سلالة|ذبح|جزارة|سوق الجملة|ONAB|الفلاحة|الريف|مرعى|مراعي|أرصاد|طقس|أمطار|حرارة|جفاف/i;

const EXCLUDE_KEYWORDS = /كرة|مباراة|فيديو|مسلسل|فنان|سياسة داخلية|انتخاب|جريمة|حادث مرور|فضيحة/i;

const MAX_PER_CATEGORY = 5;
const FETCH_TIMEOUT_MS = 9000;

function decodeEntities(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLivestockRelevant(title, description) {
  const text = `${title} ${description}`;
  if (EXCLUDE_KEYWORDS.test(text)) return false;
  return LIVESTOCK_KEYWORDS.test(text);
}

function trustScore(source, url) {
  const blob = `${source} ${url}`.toLowerCase();
  if (TRUSTED_SOURCES.some((s) => blob.includes(s))) return 2;
  return 1;
}

function parseRssItems(xml, category) {
  const items = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const block of blocks) {
    const pick = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return m ? decodeEntities(m[1]) : '';
    };
    const title = pick('title');
    const url = pick('link');
    const description = pick('description') || pick('content:encoded') || '';
    if (!title || !url) continue;
    if (!isLivestockRelevant(title, description)) continue;
    const source = pick('source') || 'Google News';
    items.push({
      category,
      title,
      description: description.slice(0, 280),
      url,
      source,
      publishedAt: new Date(pick('pubDate') || Date.now()).toISOString(),
      trust: trustScore(source, url),
    });
  }
  return items.slice(0, MAX_PER_CATEGORY);
}

async function fetchCategory(category, query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ar&gl=DZ&ceid=DZ:ar`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'MawashiDZ-NewsBot/1.9 (+https://mawashidz.com)' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return parseRssItems(await response.text(), category);
  } finally {
    clearTimeout(timer);
  }
}

function dedupeItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.title.replace(/\s+/g, ' ').trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default async function handler() {
  const results = await Promise.allSettled(
    Object.entries(CATEGORY_QUERIES).map(([category, query]) => fetchCategory(category, query)),
  );
  const items = dedupeItems(
    results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => r.value)
      .sort((a, b) => {
        const trustDiff = (b.trust || 0) - (a.trust || 0);
        if (trustDiff) return trustDiff;
        return new Date(b.publishedAt) - new Date(a.publishedAt);
      }),
  );

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
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
    },
  });
}
