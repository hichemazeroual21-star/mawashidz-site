#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const html = readFileSync(join(root, 'index.html'), 'utf8');
const i18n = readFileSync(join(root, 'assets/i18n.js'), 'utf8');

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

for (const key of ['closeMenuLabel', 'drawerTitle', 'drawerIntro', 'drawerGroupMarket', 'drawerGroupTrust', 'drawerGroupCommunity', 'drawerGroupAccount', 'heroExplore']) {
  assert.equal((i18n.match(new RegExp(`\\b${key}:`, 'g')) || []).length, 4, `${key} must exist in all four languages`);
}

console.log('  ✓ Homepage IA: compact, truthful, grouped and accessible');
