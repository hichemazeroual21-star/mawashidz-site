/*
 * MawashiDZ — أخبار قطاع المواشي والزراعة (مصادر موثوقة + فلترة صارمة)
 * /api/livestock-news
 */

const CATEGORY_QUERIES = {
  weather: 'الطقس الجزائر تحذير أرصاد مربي',
  feed: 'الأعلاف الجزائر أسعار الشعير الذرة',
  livestock: 'المواشي الأغنام الأبقار الجزائر سوق',
  health: 'الصحة الحيوانية بيطري الجزائر تلقيح وباء',
  official: 'وزارة الفلاحة والتنمية الريفية الجزائر مواشي قرار',
  prices: 'أسعار اللحوم الأغنام الجزائر سوق الجملة',
};

const OFFICIAL_DOMAINS = [
  'madr.gov.dz', 'aps.dz', 'interieur.gov.dz', 'joradp.dz', 'ons.dz',
  'el-mouradia.dz', 'premier-ministre.gov.dz', 'finance.gov.dz', 'douane.gov.dz',
];

const HEALTH_TRUSTED = [
  'woah.org', 'fao.org', 'madr.gov.dz', 'aps.dz', 'ons.dz', 'who.int',
];

const TRUSTED_SOURCES = [
  ...OFFICIAL_DOMAINS, 'woah', 'fao', 'meteo.dz', 'onab',
];

const LIVESTOCK_KEYWORDS = /مواشي|ماشية|أغنام|ضأن|أبقار|بقر|ماعز|إبل|لحوم|لحم|أعلاف|شعير|ذرة|نخالة|فلاحة|زراع|بيطر|حيوان|تلقيح|مربي|سلالة|ذبح|جزارة|سوق الجملة|ONAB|الفلاحة|الريف|مرعى|أرصاد|طقس|أمطار|حرارة|جفاف|وباء|مرض|لقاح/i;

const HEALTH_KEYWORDS = /بيطر|صحة حيوان|تلقيح|لقاح|وباء|مرض|حيوان|ماشية|مواشي|WOAH|FAO|إنفلونزا|جمرة|طاعون/i;

const OFFICIAL_KEYWORDS = /وزارة|قرار|مرسوم|بلاغ|رسمي|فلاحة|تنمية ريفية|حكومة|مجلس|ولاية|تعميم/i;

const EXCLUDE_KEYWORDS = /كرة|مباراة|فيديو|مسلسل|فنان|انتخاب|جريمة|حادث مرور|فضيحة/i;

const MAX_PER_CATEGORY = 6;
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

function domainIn(url, source, domains) {
  const blob = `${url} ${source}`.toLowerCase();
  return domains.some((d) => blob.includes(d));
}

function isLivestockRelevant(title, description) {
  const text = `${title} ${description}`;
  if (EXCLUDE_KEYWORDS.test(text)) return false;
  return LIVESTOCK_KEYWORDS.test(text);
}

function trustScore(source, url) {
  const blob = `${source} ${url}`.toLowerCase();
  if (OFFICIAL_DOMAINS.some((d) => blob.includes(d))) return 4;
  if (HEALTH_TRUSTED.some((d) => blob.includes(d))) return 3;
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
      official: domainIn(url, source, OFFICIAL_DOMAINS),
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

function sortNews(items) {
  return [...items].sort((a, b) => {
    const trustDiff = (b.trust || 0) - (a.trust || 0);
    if (trustDiff) return trustDiff;
    return new Date(b.publishedAt) - new Date(a.publishedAt);
  });
}

function buildStreams(items) {
  const health = sortNews(items.filter((item) => {
    const text = `${item.title} ${item.description}`;
    return item.category === 'health' || HEALTH_KEYWORDS.test(text);
  }));
  const official = sortNews(items.filter((item) => {
    const text = `${item.title} ${item.description}`;
    return item.official && OFFICIAL_KEYWORDS.test(text);
  }));
  return {
    health: health.slice(0, 5),
    official: official.slice(0, 5),
    healthFeatured: health[0] || null,
    officialFeatured: official[0] || null,
  };
}

export default async function handler() {
  const results = await Promise.allSettled(
    Object.entries(CATEGORY_QUERIES).map(([category, query]) => fetchCategory(category, query)),
  );
  const items = dedupeItems(sortNews(
    results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => r.value),
  ));

  if (!items.length) {
    return new Response(JSON.stringify({ error: 'news-sources-unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const streams = buildStreams(items);

  return new Response(JSON.stringify({
    updatedAt: new Date().toISOString(),
    items,
    streams,
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
    },
  });
}
