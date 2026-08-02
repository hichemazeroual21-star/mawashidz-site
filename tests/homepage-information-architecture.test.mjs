#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const html = readFileSync(join(root, 'index.html'), 'utf8');
const i18n = readFileSync(join(root, 'assets/i18n.js'), 'utf8');
const i18nContent = readFileSync(join(root, 'assets/i18n-content.js'), 'utf8');

const activeSections = [
  'home', 'founding-launch', 'market', 'services', 'exchange', 'news',
  'how', 'trust-public', 'managers', 'security-rewards', 'contact',
];
const deferredSections = [
  'founding-benefits', 'referrals', 'advisory-public', 'site-qr', 'mdz-passport',
  'animal-life', 'eid', 'security', 'identity', 'diaspora', 'ratings', 'tracking', 'advertising', 'news-specialized',
];

for (const id of activeSections) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `active section #${id} must remain available`);
}
for (const id of deferredSections) {
  assert.doesNotMatch(html, new RegExp(`<section[^>]+id=["']${id}["']`), `deferred section #${id} must not be advertised on the homepage`);
}

const desktopNav = html.match(/<nav class="desktop"[^>]*>([\s\S]*?)<\/nav>/)?.[1] || '';
assert.equal((desktopNav.match(/<a\b/g) || []).length, 5, 'desktop navigation must stay focused on five primary destinations');
assert.doesNotMatch(desktopNav, /#(?:founding-launch|managers|services)/, 'secondary destinations belong in the drawer');

const drawer = html.match(/<nav class="menu-grid"[^>]*>([\s\S]*?)<\/nav>/)?.[1] || '';
assert.equal((drawer.match(/class="drawer-group"/g) || []).length, 4, 'drawer must group navigation into four clear areas');
for (const target of ['market', 'exchange', 'services', 'news', 'how', 'trust-public', 'founding-launch', 'managers', 'contact']) {
  assert.match(drawer, new RegExp(`href="#${target}"`), `drawer must expose #${target}`);
}
assert.match(html, /id="drawer" aria-hidden="true"/);
assert.match(html, /id="menuButton"[^>]+aria-controls="drawer"[^>]+aria-expanded="false"/);
assert.match(i18n, /drawerClose\.setAttribute\('aria-label', pack\.closeMenuLabel\)/);
assert.match(html, /event\.key==='Escape'/, 'drawer must close with Escape');
assert.match(html, /id="heroNews" href="#market"/, 'hero secondary action must lead directly to the market');
assert.doesNotMatch(html, /أبقينا الصفحة|homepage stays focused|page d’accueil reste concise|Startseite bleibt klar/, 'drawer copy must guide without discussing internal page design');
assert.doesNotMatch(html, /data-i18n="obs(?:Title|Desc|L[1-4]|Disclaimer)"/, 'news implementation policy must not be exposed in the public UI');
assert.doesNotMatch(
  i18n,
  /migration(?:s|en)?\s+00[37]|service_role|user_roles|بيانات مباشرة من Supabase|Live data from Supabase|Données live Supabase|Live-Daten aus Supabase/,
  'public dashboard copy must not expose deployment or authorization internals'
);
assert.doesNotMatch(
  `${html}\n${i18n}`,
  /heroExplore:\s*'(?:ادخل إلى السوق|Enter the market|Accéder au marché|Zum Markt)'|statDirect:\s*'(?:تواصل مباشر|Direct contact|Contact direct|Direkter Kontakt)'|statVet:\s*'(?:توثيق بيطري|Vet verification|Vérification vétérinaire|Tierärztliche Prüfung)'|أوقفنا المؤشر السابق|We stopped the previous index|Nous avons arrêté l’ancien indice|Wir haben den bisherigen Index eingestellt/,
  'homepage copy must not present unavailable product capabilities or internal history as live value'
);
assert.doesNotMatch(
  i18n,
  /newsDesc:\s*'(?:نُظهر فقط|Only sector-relevant|Uniquement les informations|Nur branchenrelevante)/,
  'news description must stay editorial and concise without exposing publishing rules'
);
assert.doesNotMatch(
  i18nContent,
  /mkt1P:\s*'(?:عرض المواشي|List livestock|Afficher le bétail|Vieh listen)|mkt2P:\s*'(?:صفحة مهنية|Professional page|Page pro|Profiseite)|how3P:\s*'(?:اعرض خدماتك|List services|Proposez services|Services oder Vieh)|NON-GOAL|hors objectifs Y1|غير هدف للسنتين/,
  'role cards must describe available onboarding rather than future marketplace work'
);

for (const key of ['closeMenuLabel', 'drawerTitle', 'drawerIntro', 'drawerGroupMarket', 'drawerGroupTrust', 'drawerGroupCommunity', 'drawerGroupAccount', 'heroExplore']) {
  assert.equal((i18n.match(new RegExp(`\\b${key}:`, 'g')) || []).length, 4, `${key} must exist in all four languages`);
}

console.log('  ✓ Homepage IA: compact, truthful, grouped and accessible');
