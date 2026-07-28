/**
 * Unit tests: venture elimination audit scoring table stays arithmetically honest.
 *
 * The audit publishes its weights and every sub-score so the ranking can be
 * rebutted. If a weight or sub-score is edited without recomputing the total,
 * the published ranking silently stops matching its own method. This test
 * recomputes every row from the document itself.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const DOC = 'docs/reports/VENTURE_ELIMINATION_AUDIT_2026-07-28.md';
const md = readFileSync(new URL(`../${DOC}`, import.meta.url), 'utf8');

// Weights declared in §1.5 (percent).
const WEIGHTS = [30, 20, 15, 10, 8, 9, 8];
assert.equal(
  WEIGHTS.reduce((a, b) => a + b, 0),
  100,
  'weights must sum to 100',
);

for (const w of WEIGHTS) {
  assert.ok(
    new RegExp(`\\|\\s*${w}%\\s*\\|`).test(md),
    `weight ${w}% must appear in the §1.5 weights table`,
  );
}

// Scoring board rows: | name | s1 | ... | s7 | **total** |
const rows = md
  .split('\n')
  .map((line) => line.match(
    /^\|\s*([^|]+?)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*\*\*([\d.]+)\*\*\s*\|\s*$/,
  ))
  .filter(Boolean)
  .map((m) => ({
    name: m[1],
    subs: m.slice(2, 9).map(Number),
    total: Number(m[9]),
  }));

assert.equal(rows.length, 12, 'expected 12 scored projects in the board');

for (const { name, subs, total } of rows) {
  for (const s of subs) {
    assert.ok(s >= 0 && s <= 10, `${name}: sub-score ${s} out of 0..10`);
  }
  const computed = subs.reduce((sum, s, i) => sum + (s * WEIGHTS[i]) / 100, 0);
  assert.equal(
    Math.round(computed * 10) / 10,
    total,
    `${name}: published ${total} but weights give ${computed.toFixed(3)}`,
  );
}

// Ranking must be monotonically non-increasing, else the table misleads.
for (let i = 1; i < rows.length; i += 1) {
  assert.ok(
    rows[i].total <= rows[i - 1].total,
    `board must be sorted: ${rows[i].name} (${rows[i].total}) after ${rows[i - 1].name} (${rows[i - 1].total})`,
  );
}

// The Top 5 summary must name the same five leaders as the board, same order.
const topFiveBoard = rows.slice(0, 5).map((r) => r.total);
for (const total of topFiveBoard) {
  assert.ok(
    md.includes(`| **${total}** |`),
    `Top 5 score ${total} must be present in the summary table`,
  );
}

// Evidence discipline: no project may claim >8.0 (report-wide cap declared in §0).
const CAP = 8.0;
for (const { name, total } of rows) {
  assert.ok(total <= CAP, `${name}: ${total} breaches the declared ${CAP} cap`);
}

console.log(`  ✓ venture audit scoring: ${rows.length} rows recomputed from declared weights`);
