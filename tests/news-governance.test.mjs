#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  OFFICIAL_NEWS_SOURCES,
  createNewsHandler,
  currentMonthWindow,
  isPublishedThisMonth,
  officialSourceFor,
  parseRssItems,
  sortNews,
} from '../netlify/functions/news.mjs';

const NOW = new Date('2026-08-02T12:00:00.000Z');

function rssItem({ title, sourceUrl, source = 'Source', publishedAt, link = 'https://news.google.com/rss/articles/example' }) {
  return `<item><title><![CDATA[${title}]]></title><link>${link}</link><description><![CDATA[خبر رسمي عن المواشي والصحة الحيوانية]]></description><pubDate>${publishedAt || ''}</pubDate><source url="${sourceUrl}">${source}</source></item>`;
}

const xml = `<rss><channel>
  ${rssItem({ title: 'وزارة الفلاحة تعلن إجراءً جديدًا للمواشي', sourceUrl: 'https://www.aps.dz/', source: 'APS', publishedAt: 'Sat, 01 Aug 2026 09:00:00 GMT' })}
  ${rssItem({ title: 'مصدر مقلّد يتحدث عن المواشي', sourceUrl: 'https://aps.dz.evil.example/', publishedAt: 'Sat, 01 Aug 2026 10:00:00 GMT' })}
  ${rssItem({ title: 'خبر رسمي قديم عن المواشي', sourceUrl: 'https://fr.madr.gov.dz/', publishedAt: 'Fri, 31 Jul 2026 23:59:59 GMT' })}
  ${rssItem({ title: 'خبر رسمي بلا تاريخ عن المواشي', sourceUrl: 'https://www.fao.org/' })}
  ${rssItem({ title: 'مباراة كرة رسمية', sourceUrl: 'https://www.aps.dz/', publishedAt: 'Sat, 01 Aug 2026 11:00:00 GMT' })}
</channel></rss>`;

assert.deepEqual(currentMonthWindow(NOW), {
  start: new Date('2026-08-01T00:00:00.000Z'),
  end: new Date('2026-09-01T00:00:00.000Z'),
  key: '2026-08',
});
assert.equal(isPublishedThisMonth('2026-08-01T00:00:00Z', NOW), true);
assert.equal(isPublishedThisMonth('2026-07-31T23:59:59Z', NOW), false);
assert.equal(isPublishedThisMonth('not-a-date', NOW), false);

assert.equal(officialSourceFor('https://fr.madr.gov.dz/actualites')?.domain, 'madr.gov.dz');
assert.equal(officialSourceFor('https://rr-africa.woah.org/en/news')?.domain, 'woah.org');
assert.equal(officialSourceFor('https://aps.dz.evil.example/'), null, 'look-alike host must fail closed');
assert.equal(officialSourceFor('http://www.aps.dz/'), null, 'non-HTTPS source must fail closed');
assert.equal(new Set(OFFICIAL_NEWS_SOURCES.map((source) => source.domain)).size, OFFICIAL_NEWS_SOURCES.length);

const parsed = parseRssItems(xml, 'livestock', NOW);
assert.equal(parsed.length, 1, 'only the official, relevant, current-month item may pass');
assert.equal(parsed[0].sourceDomain, 'aps.dz');
assert.equal(parsed[0].official, true);
assert.equal(parsed[0].publishedAt, '2026-08-01T09:00:00.000Z');

const ordered = sortNews([
  { title: 'older', publishedAt: '2026-08-01T10:00:00Z', trust: 100 },
  { title: 'newer', publishedAt: '2026-08-02T10:00:00Z', trust: 90 },
]);
assert.equal(ordered[0].title, 'newer', 'freshness must outrank source priority inside the official tier');

const okHandler = createNewsHandler({
  now: () => NOW,
  fetchImpl: async () => new Response(xml, { status: 200 }),
});
const okResponse = await okHandler();
assert.equal(okResponse.status, 200);
const okBody = await okResponse.json();
assert.deepEqual(okBody.policy, { officialOnly: true, period: 'current-month', month: '2026-08' });
assert.equal(okBody.items.length, 1, 'duplicates across discovery queries must collapse');

const emptyHandler = createNewsHandler({
  now: () => NOW,
  fetchImpl: async () => new Response('<rss><channel></channel></rss>', { status: 200 }),
});
const emptyResponse = await emptyHandler();
assert.equal(emptyResponse.status, 503, 'no qualifying news must produce an honest unavailable state');
assert.deepEqual((await emptyResponse.json()).items, []);

const index = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
assert.doesNotMatch(index, /NEWS_FALLBACK/, 'the browser must not fabricate fallback news');
assert.doesNotMatch(index, /id="news-specialized"/, 'duplicate news section must stay removed');
assert.match(index, /officialNewsDomain\(item\.sourceUrl\)/, 'browser must independently validate the official source URL');
assert.match(index, /isCurrentMonthNews\(item\.publishedAt\)/, 'browser must independently enforce the month boundary');

console.log('  ✓ News governance: official-only, current-month, deduplicated and fail-closed');
