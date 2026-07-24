import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromeExecutablePath, REPO_ROOT } from './helpers/puppeteer-env.mjs';

const ROOT = REPO_ROOT;
const PORT = 8790;
const SHOTS = path.join(ROOT, 'tests/.artifacts/screenshots/ui-layout');
fs.mkdirSync(SHOTS, { recursive: true });

// ---- tiny static server ----
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
};
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(PORT, r));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await puppeteer.launch({
  executablePath: chromeExecutablePath(),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--lang=ar'],
});

const consoleErrors = [];
const supabaseRequests = [];

async function newPage() {
  const page = await browser.newPage();
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + e.message));
  // Intercept all external network: mock Supabase + EmailJS, block real internet
  await page.setRequestInterception(true);
  page.on('request', async req => {
    const url = req.url();
    if (url.startsWith(`http://localhost:${PORT}`)) return req.continue();
    if (url.includes('fpjvjfgwbfehhcvdirpy.supabase.co')) {
      let body = req.postData();
      if (body === undefined && req.fetchPostData) { try { body = await req.fetchPostData(); } catch {} }
      supabaseRequests.push({ url, method: req.method(), body: body || '' });
      const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
      if (req.method() === 'OPTIONS') return req.respond({ status: 200, headers: cors, body: '' });
      if (url.includes('/auth/v1/signup')) {
        return req.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ id: 'u1', user: { id: 'u1', user_metadata: { member_id: 'MDZ-V-000001' } }, session: null }) });
      }
      if (url.includes('/rest/v1/profiles')) {
        return req.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify([{ member_id: 'MDZ-V-000001', role: 'vet', status: 'pending' }]) });
      }
      if (url.includes('/rpc/allocate_member_id')) {
        return req.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify('MDZ-V-000001') });
      }
      if (url.includes('/rest/v1/registrations')) {
        return req.respond({ status: 201, headers: cors, contentType: 'application/json', body: '' });
      }
      return req.respond({ status: 200, headers: cors, contentType: 'application/json', body: '[]' });
    }
    if (url.includes('cdn.jsdelivr.net/npm/@emailjs')) {
      // serve a stub emailjs that records sends
      return req.respond({ status: 200, contentType: 'application/javascript',
        body: 'window.emailjs={init(){},send(){window.__emailSends=(window.__emailSends||0)+1;return Promise.resolve({status:200})}}' });
    }
    if (url.includes('api.open-meteo.com')) {
      return req.respond({ status: 200, headers: { 'Access-Control-Allow-Origin': '*' }, contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 24, wind_speed_10m: 10, precipitation: 0 } }) });
    }
    // everything else external (news endpoint fallback, google fonts, etc.) -> fail like offline
    return req.abort('failed');
  });
  return page;
}

// ================= TEST 1: load + console + layout on all widths =================
const widths = [320, 360, 390, 412, 620, 768, 1024, 1240, 1366];
for (const w of widths) {
  const page = await newPage();
  await page.setViewport({ width: w, height: 850, isMobile: w < 800, hasTouch: w < 800 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 700));

  const layout = await page.evaluate(() => {
    const q = s => document.querySelector(s);
    const r = el => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height }; };
    const menu = q('.top .menu-btn'), reg = q('.top .actions .btn.primary'), brand = q('.top .brand');
    const login = q('#headerLoginBtn');
    const name = q('.top .brand-copy>span'), langs = q('.header-languages');
    const overlap = (a, b) => !(a.r <= b.l + 1 || b.r <= a.l + 1 || a.b <= b.t + 1 || b.b <= a.t + 1);
    const vis = el => el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
    const nameBox = name ? r(name) : null;
    return {
      docScrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
      menu: vis(menu) ? r(menu) : null,
      reg: vis(reg) ? r(reg) : null,
      login: vis(login) ? r(login) : null,
      brand: vis(brand) ? r(brand) : null,
      langsVisible: vis(langs), langs: vis(langs) ? r(langs) : null,
      nameVisible: vis(name),
      nameClipped: name ? name.scrollWidth > name.clientWidth + 1 : null,
      brandOverlapsMenu: (vis(menu) && vis(brand)) ? overlap(r(menu), r(brand)) : false,
      brandOverlapsReg: (vis(reg) && vis(brand)) ? overlap(r(reg), r(brand)) : false,
      heroH: q('.hero') ? r(q('.hero')).h : 0,
      headerH: q('.top') ? r(q('.top')).h : 0,
      statsCols: q('.trust-strip .stats-grid') ? getComputedStyle(q('.trust-strip .stats-grid')).gridTemplateColumns.split(' ').length : 0,
      newsHiddenDesktop: [...document.querySelectorAll('#news .news-list article')].some(a => getComputedStyle(a).display === 'none'),
    };
  });

  check(`w${w}: no horizontal overflow`, layout.docScrollW <= layout.innerW + 1, `scrollW=${layout.docScrollW}`);
  check(`w${w}: brand name visible & not clipped`, layout.nameVisible && !layout.nameClipped);
  if (w <= 760) {
    check(`w${w}: menu button at far LEFT`, layout.menu && layout.menu.l < 20, layout.menu ? `left=${Math.round(layout.menu.l)}` : 'missing');
    // Row 1: menu + brand. Register moved to row 2 → must sit below the menu row.
    check(`w${w}: action buttons below menu row`, layout.reg && layout.reg.t >= layout.menu.b - 6, layout.reg ? `regTop=${Math.round(layout.reg.t)} menuBottom=${Math.round(layout.menu.b)}` : 'missing');
    // Login + register are one contiguous group (no big empty gap between them).
    check(`w${w}: login & register grouped`, layout.login && layout.reg && Math.min(Math.abs(layout.login.l - layout.reg.r), Math.abs(layout.reg.l - layout.login.r)) < 24,
      (layout.login && layout.reg) ? `gap=${Math.round(Math.min(Math.abs(layout.login.l - layout.reg.r), Math.abs(layout.reg.l - layout.login.r)))}` : 'missing');
    check(`w${w}: brand at RIGHT edge`, layout.brand && layout.brand.r > layout.innerW - 36, layout.brand ? `right=${Math.round(layout.brand.r)}/${layout.innerW}` : 'missing');
    check(`w${w}: no overlap menu/brand`, !layout.brandOverlapsMenu);
    check(`w${w}: languages centered below`, layout.langsVisible && layout.langs.t >= layout.menu.b - 4 && Math.abs((layout.langs.l + layout.langs.r) / 2 - layout.innerW / 2) < 40,
      layout.langs ? `center=${Math.round((layout.langs.l + layout.langs.r) / 2)}/${Math.round(layout.innerW / 2)}` : 'hidden');
  }
  if (w >= 1024) {
    check(`w${w}: desktop stats grid = 4 cols`, layout.statsCols === 4, `cols=${layout.statsCols}`);
  }
  await page.screenshot({ path: `${SHOTS}/full-${w}.png`, fullPage: false });
  if (w === 390 || w === 1366) await page.screenshot({ path: `${SHOTS}/fullpage-${w}.png`, fullPage: true });
  await page.close();
}

// ================= TEST 2: registration flow (mobile 390) =================
{
  const page = await newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  // locations loaded from local asset
  const loc = await page.evaluate(() => ({
    status: document.getElementById('locationStatus')?.textContent || '',
    wilayas: document.getElementById('wilayaSelect')?.options.length - 1,
  }));
  check('locations: 58 wilayas loaded', loc.wilayas === 58, `${loc.wilayas} — "${loc.status}"`);

  // Medea cascade
  await page.evaluate(() => openRegister('vet'));
  await new Promise(r => setTimeout(r, 300));
  const medea = await page.evaluate(() => {
    const w = document.getElementById('wilayaSelect');
    const opt = [...w.options].find(o => o.value.includes('المدية'));
    w.value = opt.value; w.dispatchEvent(new Event('change'));
    const d = document.getElementById('dairaSelect');
    const dairas = d.options.length - 1;
    d.value = [...d.options].find(o => o.value === 'المدية')?.value || d.options[1].value;
    d.dispatchEvent(new Event('change'));
    const c = document.getElementById('communeSelect');
    return { dairas, communes: c.options.length - 1, dairaDisabled: d.disabled, communeDisabled: c.disabled };
  });
  check('Medea: 19 dairas', medea.dairas === 19, `${medea.dairas}`);
  check('Medea: communes list populated', medea.communes > 0 && !medea.communeDisabled, `${medea.communes} communes for daira المدية`);

  // role fields visibility: vet visible, breeder hidden+disabled
  const roleState = await page.evaluate(() => {
    const vetBlock = document.querySelector('.role-fields[data-for="vet"]');
    const breederBlock = document.querySelector('.role-fields[data-for="breeder"]');
    return {
      vetActive: vetBlock.classList.contains('active'),
      vetEnabled: !vetBlock.querySelector('input,select').disabled,
      breederActive: breederBlock.classList.contains('active'),
      breederDisabled: breederBlock.querySelector('input').disabled,
      vetSpecialtyExists: !!document.querySelector('[name="vet_specialty"]'),
      vetExpExists: !!document.querySelector('[name="vet_experience_years"]'),
    };
  });
  check('role fields: vet active+enabled, breeder inactive+disabled',
    roleState.vetActive && roleState.vetEnabled && !roleState.breederActive && roleState.breederDisabled);
  check('vet new fields exist (specialty + experience years)', roleState.vetSpecialtyExists && roleState.vetExpExists);

  // buyer: bio hidden
  const buyerBio = await page.evaluate(() => {
    setRole('buyer');
    const bio = document.getElementById('bioField');
    return { hidden: bio.hidden, disabled: bio.querySelector('textarea').disabled };
  });
  check('buyer: bio/professional field hidden+disabled', buyerBio.hidden && buyerBio.disabled);

  // tabs don't overflow modal on mobile
  const tabsOk = await page.evaluate(() => {
    const tabs = document.querySelector('#registerModal .tabs');
    const box = document.querySelector('#registerModal .modal-box');
    return tabs.getBoundingClientRect().right <= box.getBoundingClientRect().right + 1 &&
           getComputedStyle(tabs).display === 'grid';
  });
  check('register tabs: grid layout, no horizontal overflow', tabsOk);

  // fill the vet form and submit
  await page.evaluate(() => setRole('vet'));
  await page.type('#firstName', 'محمد');
  await page.type('#lastName', 'بن صالح');
  await page.evaluate(() => {
    document.getElementById('birthDate').value = '1990-05-14';
    document.getElementById('mobileOperator').value = '05';
  });
  await page.type('#phoneLocal', '51234567');
  await page.type('#registerEmail', 'test.vet@example.com');
  await page.type('#registerPassword', 'Str0ng!Pass');
  await page.type('#registerPasswordConfirm', 'Str0ng!Pass');
  await page.evaluate(() => {
    const w = document.getElementById('wilayaSelect');
    w.value = [...w.options].find(o => o.value.includes('المدية')).value;
    w.dispatchEvent(new Event('change'));
    const d = document.getElementById('dairaSelect');
    d.value = 'المدية'; d.dispatchEvent(new Event('change'));
    const c = document.getElementById('communeSelect');
    c.value = c.options[1].value;
    document.querySelector('[name="vet_license"]').value = 'VET-4521';
    document.querySelector('[name="clinic_name"]').value = 'عيادة الشفاء';
    document.querySelector('[name="vet_specialty"]').value = 'طب بيطري عام';
    document.querySelector('[name="vet_experience_years"]').value = '7';
    document.querySelector('[name="privacy_accept"]').checked = true;
    document.querySelector('[name="founder_terms"]').checked = true;
  });
  await page.evaluate(() => document.getElementById('registerSubmit').click());
  await new Promise(r => setTimeout(r, 1200));

  const confirmState = await page.evaluate(() => {
    const c = document.getElementById('registerConfirm');
    return { visible: c.style.display === 'block', html: c.innerHTML, cls: c.className, emailSends: window.__emailSends || 0 };
  });
  check('registration: success card shown', confirmState.visible && confirmState.cls.includes('premium-success'));
  check('registration: sequential member id MDZ-V-000001 displayed', confirmState.html.includes('MDZ-V-000001'));
  check('registration: registration id MDZ-REG-2026 displayed', /MDZ-REG-\d{4}-\d{6}/.test(confirmState.html));
  check('registration: admin email attempted via EmailJS stub', confirmState.emailSends >= 1, `sends=${confirmState.emailSends}`);
  await page.screenshot({ path: `${SHOTS}/register-success-390.png` });

  // verify Supabase payloads
  const signup = supabaseRequests.find(r => r.url.includes('/auth/v1/signup') && r.method === 'POST');
  const insert = supabaseRequests.find(r => r.url.includes('/rest/v1/registrations') && r.method === 'POST' && r.body);
  check('supabase: signup called with metadata', !!signup && signup.body.includes('MDZ-REG-') && signup.body.includes('طبيب بيطري'));
  if (insert) {
    const payload = JSON.parse(insert.body);
    const msg = JSON.parse(payload.message);
    check('supabase: phone saved as +213 international', payload.phone === '+213551234567', payload.phone);
    check('supabase: active-role fields present (vet_license/specialty)', msg.vet_license === 'VET-4521' && msg.vet_specialty === 'طب بيطري عام');
    const foreignKeys = ['livestock_count', 'breeder_activity', 'business_name', 'feed_types', 'delivery', 'buyer_interest', 'buyer_delivery', 'qualification', 'manager_plan', 'ambassador_plan', 'partner_business', 'partnership_type'];
    const leaked = foreignKeys.filter(k => k in msg);
    check('supabase: hidden role fields NOT sent', leaked.length === 0, leaked.join(',') || 'clean');
    check('supabase: wilaya without numeric prefix', payload.wilaya === 'المدية', payload.wilaya);
  } else {
    check('supabase: registrations insert called', false);
  }
  await page.close();
}

// ================= TEST 3: registration succeeds even when EmailJS CDN is down =================
{
  const page = await browser.newPage();
  page.on('pageerror', e => consoleErrors.push('NOEMAILJS PAGEERROR: ' + e.message));
  await page.setRequestInterception(true);
  const localReqs = [];
  page.on('request', req => {
    const url = req.url();
    if (url.startsWith(`http://localhost:${PORT}`)) return req.continue();
    if (url.includes('supabase.co')) {
      const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
      if (req.method() === 'OPTIONS') return req.respond({ status: 200, headers: cors, body: '' });
      localReqs.push(url);
      if (url.includes('/auth/v1/signup')) return req.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ id: 'u2', user: { id: 'u2', user_metadata: { member_id: 'MDZ-F-000042' } }, session: null }) });
      if (url.includes('/rest/v1/profiles')) return req.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify([{ member_id: 'MDZ-F-000042', role: 'breeder', status: 'pending' }]) });
      if (url.includes('/rpc/allocate_member_id')) return req.respond({ status: 404, headers: cors, contentType: 'application/json', body: JSON.stringify({ message: 'function not found' }) });
      if (url.includes('/rest/v1/registrations')) return req.respond({ status: 201, headers: cors, body: '' });
      return req.respond({ status: 200, headers: cors, contentType: 'application/json', body: '[]' });
    }
    return req.abort('failed'); // EmailJS CDN dead
  });
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));
  const formsAlive = await page.evaluate(() => typeof openRegister === 'function' && typeof setRole === 'function');
  check('EmailJS CDN down: main script still alive (forms usable)', formsAlive);

  await page.evaluate(() => openRegister('breeder'));
  await page.type('#firstName', 'سعيد');
  await page.type('#lastName', 'عمراني');
  await page.evaluate(() => { document.getElementById('birthDate').value = '1985-01-10'; });
  await page.type('#phoneLocal', '61112233');
  await page.evaluate(() => { document.getElementById('mobileOperator').value = '06'; });
  await page.type('#registerEmail', 'test.breeder@example.com');
  await page.type('#registerPassword', 'Str0ng!Pass');
  await page.type('#registerPasswordConfirm', 'Str0ng!Pass');
  await page.evaluate(() => {
    const w = document.getElementById('wilayaSelect');
    w.value = [...w.options].find(o => o.value.includes('الجلفة')).value;
    w.dispatchEvent(new Event('change'));
    const d = document.getElementById('dairaSelect');
    d.value = d.options[1].value; d.dispatchEvent(new Event('change'));
    const c = document.getElementById('communeSelect');
    c.value = c.options[1].value;
    document.querySelector('[name="privacy_accept"]').checked = true;
    document.querySelector('[name="founder_terms"]').checked = true;
    document.getElementById('registerSubmit').click();
  });
  await new Promise(r => setTimeout(r, 1200));
  const state = await page.evaluate(() => {
    const c = document.getElementById('registerConfirm');
    return { success: c.className.includes('premium-success'), html: c.innerHTML };
  });
  check('EmailJS down: registration still succeeds (no fake network error)', state.success);
  check('EmailJS down: fallback member id format used', /MDZ-F-000042/.test(state.html));
  await page.close();
}

// ================= TEST 4: phone validation =================
{
  const page = await newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 500));
  const phone = await page.evaluate(() => {
    const op = document.getElementById('mobileOperator'), local = document.getElementById('phoneLocal');
    const results = {};
    op.value = '07'; local.value = '1234567'; local.dispatchEvent(new Event('input'));
    results.short = document.getElementById('phoneCombined').value;
    local.value = '12345678'; local.dispatchEvent(new Event('input'));
    results.full = document.getElementById('phoneCombined').value;
    local.value = '12ab345678999'; local.dispatchEvent(new Event('input'));
    results.dirty = { shown: local.value, combined: document.getElementById('phoneCombined').value };
    // contact form: can we now enter all 8 digits?
    const cl = document.getElementById('contactPhoneLocal');
    cl.value = '87654321'; cl.dispatchEvent(new Event('input'));
    results.contact = cl.value;
    return results;
  });
  check('phone: 7 digits rejected (empty combined)', phone.short === '');
  check('phone: 8 digits -> +2137 international (9 national digits)', phone.full === '+213712345678', phone.full);
  check('phone: non-digits stripped, capped at 8', phone.dirty.shown === '12345678' && phone.dirty.combined === '+213712345678', phone.dirty.shown);
  check('contact phone: full 8 digits enterable (maxlength bug fixed)', phone.contact === '87654321', phone.contact);
  await page.close();
}

// ================= TEST 5: header/hero visual on key widths + hero not behind dock =================
{
  const page = await newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 500));
  const hero = await page.evaluate(() => {
    // ضع نهاية الـhero عند أسفل الشاشة (أقصى موضع يمكن أن يصل إليه النص أثناء التمرير الطبيعي)
    const heroEl = document.querySelector('.hero');
    const heroBottomDoc = heroEl.getBoundingClientRect().bottom + window.scrollY;
    window.scrollTo({ top: Math.max(0, heroBottomDoc - window.innerHeight), behavior: 'instant' });
    const dock = document.querySelector('.mobile-dock').getBoundingClientRect();
    const note = document.getElementById('heroNote').getBoundingClientRect();
    const actions = document.querySelector('.hero-actions').getBoundingClientRect();
    const heroBg = getComputedStyle(document.querySelector('.hero'));
    return {
      noteAboveDock: note.bottom <= dock.top + 2,
      actionsAboveDock: actions.bottom <= dock.top + 2,
      bgSize: heroBg.backgroundSize, bgPos: heroBg.backgroundPosition,
      bgHasImage: heroBg.backgroundImage.includes('data:image/webp'),
    };
  });
  check('hero mobile: portrait image applied (cover)', hero.bgHasImage && hero.bgSize.includes('cover'));
  check('hero mobile: object-position mobile-specific (22% at <=420px)', hero.bgPos.includes('22%'), hero.bgPos);
  check('hero mobile: CTA + note not behind bottom dock', hero.noteAboveDock && hero.actionsAboveDock);

  await page.setViewport({ width: 1366, height: 850 });
  await new Promise(r => setTimeout(r, 400));
  const heroDesk = await page.evaluate(() => getComputedStyle(document.querySelector('.hero')).backgroundPosition);
  check('hero desktop: different object-position (40%)', heroDesk.includes('40%'), heroDesk);
  await page.close();
}

// ================= TEST 6: i18n layout stability (AR/EN/FR/DE × key widths) =================
const I18N_LANGS = ['ar', 'en', 'fr', 'de'];
const I18N_WIDTHS = [320, 390, 620, 1024, 1366];
for (const lang of I18N_LANGS) {
  for (const w of I18N_WIDTHS) {
    const page = await newPage();
    await page.setViewport({ width: w, height: 900, isMobile: w < 800, hasTouch: w < 800 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.evaluate((code) => setMawashiLanguage(code), lang);
    await new Promise(r => setTimeout(r, 450));
    const layout = await page.evaluate(() => {
      const q = s => document.querySelector(s);
      const r = el => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width }; };
      const vis = el => el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
      const menu = q('.top .menu-btn'), reg = q('.top .actions .btn.primary'), brand = q('.top .brand');
      const login = q('#headerLoginBtn');
      const name = q('.top .brand-copy>span');
      return {
        lang: document.body.dataset.lang,
        htmlDir: document.documentElement.dir,
        docScrollW: document.documentElement.scrollWidth,
        innerW: window.innerWidth,
        nameClipped: name ? name.scrollWidth > name.clientWidth + 1 : false,
        menu: vis(menu) ? r(menu) : null,
        reg: vis(reg) ? r(reg) : null,
        login: vis(login) ? r(login) : null,
        brand: vis(brand) ? r(brand) : null,
      };
    });
    const tag = `i18n ${lang}@w${w}`;
    check(`${tag}: no horizontal overflow`, layout.docScrollW <= layout.innerW + 1, `scroll=${layout.docScrollW}`);
    check(`${tag}: html dir rtl shell`, layout.htmlDir === 'rtl', layout.htmlDir);
    check(`${tag}: lang applied`, layout.lang === lang, layout.lang);
    check(`${tag}: brand name not clipped`, !layout.nameClipped);
    if (w <= 760) {
      check(`${tag}: action buttons below menu row`, layout.reg && layout.reg.t >= layout.menu.b - 6,
        layout.reg ? `regTop=${Math.round(layout.reg.t)} menuBottom=${Math.round(layout.menu.b)}` : 'missing');
      check(`${tag}: login & register grouped`, layout.login && layout.reg && Math.min(Math.abs(layout.login.l - layout.reg.r), Math.abs(layout.reg.l - layout.login.r)) < 24,
        (layout.login && layout.reg) ? `gap=${Math.round(Math.min(Math.abs(layout.login.l - layout.reg.r), Math.abs(layout.reg.l - layout.login.r)))}` : 'missing');
      check(`${tag}: brand at right`, layout.brand && layout.brand.r > layout.innerW - 40);
    }
    await page.close();
  }
}

// ================= TEST 7: exchange feed pagination (10 + Show more) =================
{
  const page = await newPage();
  await page.setViewport({ width: 390, height: 900, isMobile: true, hasTouch: true });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(() => { location.hash = '#exchange'; });
  await new Promise(r => setTimeout(r, 800));
  await page.evaluate(() => {
    document.querySelector('[data-exchange-tab="feed"]')?.click();
  });
  await new Promise(r => setTimeout(r, 500));
  const before = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#exchangeTableBody tr')].filter(tr => tr.querySelectorAll('td').length >= 3);
    const btn = document.getElementById('exchangeShowMoreBtn');
    const label = document.getElementById('exchangeShowingLabel');
    return {
      rowCount: rows.length,
      btnHidden: !btn || btn.hidden,
      labelText: label?.textContent || '',
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
  check('exchange feed: initial page shows exactly 10 rows', before.rowCount === 10, `rows=${before.rowCount}`);
  check('exchange feed: Show more visible when more exist', before.btnHidden === false);
  check('exchange feed: showing label present', /10/.test(before.labelText), before.labelText);
  check('exchange feed@w390: no horizontal overflow', before.overflow === false);

  await page.click('#exchangeShowMoreBtn');
  await new Promise(r => setTimeout(r, 200));
  const after = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#exchangeTableBody tr')].filter(tr => tr.querySelectorAll('td').length >= 3);
    return { rowCount: rows.length };
  });
  check('exchange feed: Show more loads next batch (20)', after.rowCount === 20, `rows=${after.rowCount}`);

  // Dashboard modal mobile smoke (structure present, no overflow when opened with stub)
  await page.evaluate(() => {
    const box = document.getElementById('adminDashContent');
    if (box) {
      box.innerHTML = `<div class="dash-hero admin"><h3>Admin</h3></div>
        <div class="dash-stats admin"><article><strong>1</strong><span>t</span></article><article><strong>1</strong><span>t</span></article><article><strong>1</strong><span>t</span></article><article><strong>1</strong><span>t</span></article></div>
        <div class="dash-card-list" style="display:grid"><article class="dash-card"><header><strong>اسم طويل جداً للتحقق من الكسر</strong><span class="dash-status-chip pending">pending</span></header>
        <div class="dash-row-actions"><button class="btn primary dash-action">موافقة</button><button class="btn ghost dash-action">رفض</button></div></article></div>`;
    }
    document.getElementById('adminDashModal')?.classList.add('open');
  });
  await new Promise(r => setTimeout(r, 200));
  const dash = await page.evaluate(() => ({
    open: document.getElementById('adminDashModal')?.classList.contains('open'),
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    actionH: document.querySelector('.dash-action')?.getBoundingClientRect().height || 0,
  }));
  check('admin dash modal@w390: opens', dash.open === true);
  check('admin dash modal@w390: no page overflow', dash.overflow === false);
  check('admin dash modal@w390: touch-sized actions', dash.actionH >= 40, `h=${dash.actionH}`);
  await page.close();
}

// ================= console errors summary =================
const realErrors = consoleErrors.filter(e =>
  !e.includes('net::ERR_FAILED') && !e.includes('Failed to load resource') &&
  !e.includes('news unavailable') && !e.includes('ERR_BLOCKED'));
check('console: zero JS errors across all runs', realErrors.length === 0, realErrors.slice(0, 5).join(' || ') || 'clean');

await browser.close();
server.close();

const failed = results.filter(r => !r.ok);
console.log(`\n===== ${results.length - failed.length}/${results.length} checks passed =====`);
if (failed.length) { console.log('FAILED:'); failed.forEach(f => console.log(' -', f.name, f.detail)); process.exit(1); }
