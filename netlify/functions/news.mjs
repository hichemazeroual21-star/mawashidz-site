/*
 * MawashiDZ — official, current-month livestock news only.
 * Google News is used for discovery; an item is published only when its
 * original <source url> belongs to the explicit official-source registry.
 */

const CATEGORY_QUERIES = {
  weather: 'الطقس الجزائر تحذير أرصاد مربي',
  feed: 'الأعلاف الجزائر شعير ذرة نخالة مربي',
  livestock: 'المواشي الأغنام الأبقار الماعز الجزائر',
  health: 'الصحة الحيوانية بيطري تلقيح وباء الجزائر',
  official: 'وزارة الفلاحة الجزائر مواشي قرار بلاغ',
  prices: 'أسعار اللحوم الأغنام الجزائر سوق الجملة',
};

export const OFFICIAL_NEWS_SOURCES = Object.freeze([
  { domain: 'madr.gov.dz', label: 'وزارة الفلاحة والتنمية الريفية والصيد البحري', scope: 'dz', priority: 100 },
  { domain: 'aps.dz', label: 'وكالة الأنباء الجزائرية', scope: 'dz', priority: 95 },
  { domain: 'joradp.dz', label: 'الجريدة الرسمية للجمهورية الجزائرية', scope: 'dz', priority: 100 },
  { domain: 'meteo.dz', label: 'الديوان الوطني للأرصاد الجوية', scope: 'dz', priority: 100 },
  { domain: 'woah.org', label: 'المنظمة العالمية لصحة الحيوان', scope: 'international', priority: 95 },
  { domain: 'fao.org', label: 'منظمة الأغذية والزراعة للأمم المتحدة', scope: 'international', priority: 95 },
]);

const LIVESTOCK_KEYWORDS = /مواشي|ماشية|أغنام|ضأن|أبقار|بقر|ماعز|إبل|لحوم|لحم|أعلاف|شعير|ذرة|نخالة|فلاحة|زراع|بيطر|حيوان|تلقيح|مربي|سلالة|ذبح|جزارة|سوق الجملة|ONAB|الفلاحة|الريف|مرعى|أرصاد|طقس|أمطار|حرارة|جفاف|وباء|مرض|لقاح|livestock|animal health|veterinary|cattle|sheep|goat|feed|fodder|weather|drought/i;
const HEALTH_KEYWORDS = /بيطر|صحة حيوان|تلقيح|لقاح|وباء|مرض|حيوان|ماشية|مواشي|WOAH|FAO|إنفلونزا|جمرة|طاعون|animal health|veterinary|disease|outbreak|vaccin/i;
const OFFICIAL_KEYWORDS = /وزارة|قرار|مرسوم|بلاغ|رسمي|فلاحة|تنمية ريفية|حكومة|مجلس|ولاية|تعميم|decree|official|ministry|communiqu/i;
const EXCLUDE_KEYWORDS = /كرة|مباراة|فيديو|مسلسل|فنان|انتخاب|جريمة|حادث مرور|فضيحة|football|match|celebrity/i;

const MAX_PER_CATEGORY = 6;
const MAX_TOTAL_ITEMS = 18;
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

function safeHttpsUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
}

function normalizedHostname(value) {
  const parsed = safeHttpsUrl(value);
  return parsed ? parsed.hostname.toLowerCase().replace(/^www\./, '') : '';
}

export function officialSourceFor(value) {
  const hostname = normalizedHostname(value);
  if (!hostname) return null;
  return OFFICIAL_NEWS_SOURCES.find(({ domain }) => hostname === domain || hostname.endsWith(`.${domain}`)) || null;
}

export function currentMonthWindow(now = new Date()) {
  const value = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(value.getTime())) throw new TypeError('invalid current date');
  const start = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
  const end = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 1));
  return { start, end, key: start.toISOString().slice(0, 7) };
}

export function isPublishedThisMonth(value, now = new Date()) {
  const published = new Date(value);
  if (!Number.isFinite(published.getTime())) return false;
  const { start, end } = currentMonthWindow(now);
  const futureTolerance = new Date(now).getTime() + 5 * 60 * 1000;
  return published >= start && published < end && published.getTime() <= futureTolerance;
}

function isLivestockRelevant(title, description) {
  const text = `${title} ${description}`;
  if (EXCLUDE_KEYWORDS.test(text)) return false;
  return LIVESTOCK_KEYWORDS.test(text);
}

function sourceNode(block) {
  const match = block.match(/<source\b([^>]*)>([\s\S]*?)<\/source>/i);
  if (!match) return { name: '', url: '' };
  const urlMatch = match[1].match(/\burl=["']([^"']+)["']/i);
  return { name: decodeEntities(match[2]), url: decodeEntities(urlMatch?.[1] || '') };
}

export function parseRssItems(xml, category, now = new Date()) {
  const items = [];
  const blocks = String(xml || '').match(/<item>[\s\S]*?<\/item>/gi) || [];
  for (const block of blocks) {
    const pick = (tag) => {
      const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
      return match ? decodeEntities(match[1]) : '';
    };
    const title = pick('title');
    const url = safeHttpsUrl(pick('link'));
    const description = pick('description') || pick('content:encoded') || '';
    const publishedAt = pick('pubDate');
    const sourceNodeValue = sourceNode(block);
    const officialSource = officialSourceFor(sourceNodeValue.url);

    if (!title || !url || !officialSource) continue;
    if (!isPublishedThisMonth(publishedAt, now)) continue;
    if (!isLivestockRelevant(title, description)) continue;

    items.push({
      category,
      title,
      description: description.slice(0, 280),
      url: url.href,
      sourceUrl: safeHttpsUrl(sourceNodeValue.url)?.href || '',
      source: officialSource.label,
      sourceDomain: officialSource.domain,
      scope: officialSource.scope,
      publishedAt: new Date(publishedAt).toISOString(),
      trust: officialSource.priority,
      official: true,
    });
  }
  return items.slice(0, MAX_PER_CATEGORY);
}

function monthQuery(query, now) {
  const { start } = currentMonthWindow(now);
  return `${query} after:${start.toISOString().slice(0, 10)}`;
}

async function fetchCategory(category, query, { fetchImpl, now }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const search = monthQuery(query, now);
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(search)}&hl=ar&gl=DZ&ceid=DZ:ar`;
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'MawashiDZ-NewsBot/1.11 (+https://mawashidz.com)' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return parseRssItems(await response.text(), category, now);
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

export function sortNews(items) {
  return [...items].sort((a, b) => {
    const dateDiff = new Date(b.publishedAt) - new Date(a.publishedAt);
    return dateDiff || (b.trust || 0) - (a.trust || 0);
  });
}

function buildStreams(items) {
  const health = sortNews(items.filter((item) => {
    const text = `${item.title} ${item.description}`;
    return item.category === 'health' || HEALTH_KEYWORDS.test(text);
  }));
  const official = sortNews(items.filter((item) => OFFICIAL_KEYWORDS.test(`${item.title} ${item.description}`)));
  return {
    health: health.slice(0, 5),
    official: official.slice(0, 5),
    healthFeatured: health[0] || null,
    officialFeatured: official[0] || null,
  };
}

export function createNewsHandler({ fetchImpl = fetch, now = () => new Date() } = {}) {
  return async function handler() {
    const checkedAt = now();
    const results = await Promise.allSettled(
      Object.entries(CATEGORY_QUERIES).map(([category, query]) => fetchCategory(category, query, { fetchImpl, now: checkedAt })),
    );
    const items = dedupeItems(sortNews(
      results.filter((result) => result.status === 'fulfilled').flatMap((result) => result.value),
    )).slice(0, MAX_TOTAL_ITEMS);
    const month = currentMonthWindow(checkedAt).key;

    if (!items.length) {
      return new Response(JSON.stringify({
        error: 'no-official-current-month-news',
        updatedAt: checkedAt.toISOString(),
        items: [],
        policy: { officialOnly: true, period: 'current-month', month },
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
      });
    }

    return new Response(JSON.stringify({
      updatedAt: checkedAt.toISOString(),
      items,
      streams: buildStreams(items),
      policy: { officialOnly: true, period: 'current-month', month },
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=300',
      },
    });
  };
}

export default createNewsHandler();
