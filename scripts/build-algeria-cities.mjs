#!/usr/bin/env node
/**
 * Rebuild assets/algeria_cities.json from the official othmanus/algeria-cities dataset
 * with trimmed and corrected Arabic wilaya / daira / commune names.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const normalizeSrc = readFileSync(join(root, 'assets/algeria-location-normalize.js'), 'utf8');
const normalizeArabicLocationName = vm.runInNewContext(
  `${normalizeSrc}\nnormalizeArabicLocationName;`,
  {},
  { filename: 'algeria-location-normalize.js' }
);
if (typeof normalizeArabicLocationName !== 'function') {
  throw new Error('Failed to load normalizeArabicLocationName');
}

const sourcePath = process.argv[2] || '/tmp/algeria_official.json';
const raw = JSON.parse(readFileSync(sourcePath, 'utf8'));
if (!Array.isArray(raw)) throw new Error('Expected flat array source JSON');

const rows = raw.map((item) => ({
  wilaya_code: String(item.wilaya_code || '').padStart(2, '0'),
  wilaya_name: normalizeArabicLocationName(item.wilaya_name),
  daira_name: normalizeArabicLocationName(item.daira_name),
  commune_name: normalizeArabicLocationName(item.commune_name),
  commune_name_ascii: item.commune_name_ascii || '',
  daira_name_ascii: item.daira_name_ascii || '',
  wilaya_name_ascii: item.wilaya_name_ascii || '',
})).filter((r) => r.wilaya_name && r.daira_name && r.commune_name);

const wilayas = new Set(rows.map((r) => r.wilaya_name));
const dairas = new Set(rows.map((r) => `${r.wilaya_name}|${r.daira_name}`));
const outPath = join(root, 'assets/algeria_cities.json');
writeFileSync(outPath, JSON.stringify(rows));

console.log(`Wrote ${rows.length} communes, ${wilayas.size} wilayas, ${dairas.size} dairas → ${outPath}`);
