import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromeExecutablePath, REPO_ROOT } from './helpers/puppeteer-env.mjs';

const ROOT = REPO_ROOT;
const PORT = 8793;
const SHOTS = path.join(ROOT, 'tests/.artifacts/screenshots/i18n-layout');
fs.mkdirSync(SHOTS, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'application/javascript', '.mjs': 'text/javascript; charset=utf-8' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end('not found');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(PORT, r));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' — ' + detail : ''}`);
};

const LANGS = ['ar', 'en', 'fr', 'de'];
const WIDTHS = [320, 360, 390, 412, 620, 768, 1024, 1240, 1366];

const browser = await puppeteer.launch({
  executablePath: chromeExecutablePath(),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

async function newPage() {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (url.startsWith(`http://localhost:${PORT}`)) return req.continue();
    if (url.includes('api.open-meteo.com')) {
      return req.respond({
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        contentType: 'application/json',
        body: JSON.stringify({ current: { temperature_2m: 24, wind_speed_10m: 10, precipitation: 0 } }),
      });
    }
    return req.abort('failed');
  });
  return page;
}

for (const lang of LANGS) {
  for (const w of WIDTHS) {
    const page = await newPage();
    await page.setViewport({ width: w, height: 900, isMobile: w < 800, hasTouch: w < 800 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.evaluate((code) => setMawashiLanguage(code), lang);
    await new Promise((r) => setTimeout(r, 500));

    const layout = await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const qa = (s) => [...document.querySelectorAll(s)];
      const r = (el) => {
        const b = el.getBoundingClientRect();
        return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height };
      };
      const vis = (el) => el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
      const overlap = (a, b) => !(a.r <= b.l + 1 || b.r <= a.l + 1 || a.b <= b.t + 1 || b.b <= a.t + 1);
      const clipped = (el) => el && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);

      const menu = q('.top .menu-btn');
      const reg = q('.top .actions .btn.primary');
      const brand = q('.top .brand');
      const name = q('.top .brand-copy>span');
      const langs = q('.header-languages');
      const desktop = q('.top .desktop');
      const hero = q('.hero');
      const heroTitle = q('.hero h1');
      const heroBtns = qa('.hero-actions .btn');
      const newsFilters = qa('.news-filter');
      const exchangeTabs = qa('.exchange-tab');
      const dock = qa('.mobile-dock a, .mobile-dock button');
      const modalTabs = qa('#registerModal .tabs .tab');

      const overflowEls = [];
      const walk = (root) => {
        const nodes = root.querySelectorAll('body *');
        for (const el of nodes) {
          const st = getComputedStyle(el);
          if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') continue;
          const rect = el.getBoundingClientRect();
          if (rect.width < 2 || rect.height < 2) continue;
          if (el.scrollWidth > el.clientWidth + 2 && st.overflowX !== 'visible' && st.textOverflow === 'ellipsis') {
            overflowEls.push({ tag: el.tagName, cls: el.className?.slice?.(0, 40), sw: el.scrollWidth, cw: el.clientWidth });
          }
        }
      };

      return {
        lang: document.body.dataset.lang,
        htmlDir: document.documentElement.dir,
        htmlLang: document.documentElement.lang,
        docScrollW: document.documentElement.scrollWidth,
        innerW: window.innerWidth,
        menu: vis(menu) ? r(menu) : null,
        reg: vis(reg) ? r(reg) : null,
        brand: vis(brand) ? r(brand) : null,
        nameClipped: name ? name.scrollWidth > name.clientWidth + 1 : false,
        brandOverlapsMenu: vis(menu) && vis(brand) ? overlap(r(menu), r(brand)) : false,
        brandOverlapsReg: vis(reg) && vis(brand) ? overlap(r(reg), r(brand)) : false,
        desktopVisible: vis(desktop),
        desktopOverflow: desktop ? desktop.scrollWidth > desktop.clientWidth + 2 : false,
        desktopW: desktop ? r(desktop).w : 0,
        heroTitleClipped: heroTitle ? clipped(heroTitle) : false,
        heroBtnOverflow: heroBtns.some((b) => b.scrollWidth > b.clientWidth + 2),
        newsFilterOverflow: newsFilters.some((b) => b.scrollWidth > b.clientWidth + 2),
        exchangeTabOverflow: exchangeTabs.some((b) => b.scrollWidth > b.clientWidth + 2),
        dockOverflow: dock.some((b) => b.scrollWidth > b.clientWidth + 2),
        langsVisible: vis(langs),
        langs: vis(langs) ? r(langs) : null,
        headerH: q('.top') ? r(q('.top')).h : 0,
        regText: reg?.textContent?.trim(),
      };
    });

    const prefix = `${lang}@w${w}`;
    check(`${prefix}: no horizontal overflow`, layout.docScrollW <= layout.innerW + 1, `scroll=${layout.docScrollW}/${layout.innerW}`);
    check(`${prefix}: html dir stays rtl`, layout.htmlDir === 'rtl', layout.htmlDir);
    check(`${prefix}: body data-lang`, layout.lang === lang, layout.lang);
    check(`${prefix}: brand not clipped`, !layout.nameClipped);
    check(`${prefix}: hero title not clipped`, !layout.heroTitleClipped);
    check(`${prefix}: hero buttons fit`, !layout.heroBtnOverflow);
    check(`${prefix}: news filters fit`, !layout.newsFilterOverflow);
    check(`${prefix}: exchange tabs fit`, !layout.exchangeTabOverflow);

    if (w <= 760) {
      check(`${prefix}: menu at left`, layout.menu && layout.menu.l < 20, layout.menu ? `l=${Math.round(layout.menu.l)}` : 'missing');
      check(`${prefix}: register near menu`, layout.reg && Math.abs(layout.reg.l - layout.menu.r) < 24, layout.reg ? `gap=${Math.round(layout.reg.l - layout.menu.r)} reg="${layout.regText}"` : 'missing');
      check(`${prefix}: brand at right`, layout.brand && layout.brand.r > layout.innerW - 40);
      check(`${prefix}: no header overlap`, !layout.brandOverlapsMenu && !layout.brandOverlapsReg);
      if (layout.langsVisible) {
        check(`${prefix}: langs centered`, Math.abs((layout.langs.l + layout.langs.r) / 2 - layout.innerW / 2) < 45);
      }
      check(`${prefix}: dock labels fit`, !layout.dockOverflow);
    }

    if (w >= 1024) {
      check(`${prefix}: desktop nav hidden or scrollable`, !layout.desktopVisible || layout.desktopOverflow || layout.desktopW < layout.innerW * 0.7);
    }

    if (lang === 'de' && (w === 390 || w === 1366)) {
      await page.screenshot({ path: `${SHOTS}/${lang}-${w}.png`, fullPage: w === 1366 });
    }
    await page.close();
  }
}

// Registration modal tabs in EN at mobile
{
  const page = await newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => setMawashiLanguage('de'));
  await page.evaluate(() => openRegister('vet'));
  await new Promise((r) => setTimeout(r, 400));
  const modal = await page.evaluate(() => {
    const box = document.querySelector('#registerModal .modal-box');
    const tabs = document.querySelector('#registerModal .tabs');
    const tabBtns = [...document.querySelectorAll('#registerModal .tabs .tab')];
    return {
      boxW: box.getBoundingClientRect().width,
      tabsW: tabs.getBoundingClientRect().width,
      tabsOverflow: tabs.scrollWidth > tabs.clientWidth + 2,
      tabOverflow: tabBtns.some((t) => t.scrollWidth > t.clientWidth + 2),
      docScrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
    };
  });
  check('de modal: no page overflow', modal.docScrollW <= modal.innerW + 1);
  check('de modal: tabs fit in box', !modal.tabsOverflow && modal.tabsW <= modal.boxW + 2);
  check('de modal: tab labels not clipped', !modal.tabOverflow);
  await page.screenshot({ path: `${SHOTS}/de-register-modal.png` });
  await page.close();
}

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n===== ${results.length - failed.length}/${results.length} passed =====`);
if (failed.length) {
  console.log('FAILED:');
  failed.forEach((f) => console.log(` - ${f.name}${f.detail ? ' — ' + f.detail : ''}`));
  process.exit(1);
}
