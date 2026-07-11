#!/usr/bin/env node
/**
 * test-facets.mjs
 *
 * Smoke test + coverage report for src/lib/facets.ts and src/lib/freshness.ts.
 * Loads real content entries across kinds, prints the derived facets for a
 * 10-entry sample, validates invariants, and reports what percentage of each
 * collection resolves each facet key.
 *
 * Runs on plain Node (24+) via native TypeScript type stripping; no build step.
 *
 * Usage:  node scripts/test-facets.mjs
 * Exit:   0 all assertions pass; 1 any failure.
 */

import { readFile, readdir } from 'node:fs/promises';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NEXT_ROOT = resolve(__dirname, '..');
const CONTENT = resolve(NEXT_ROOT, 'src/content');

const { FACET_OPTIONS, CHIP_PRESETS, getFacets, CANONICAL_PLACES } = await import(
  new URL('../src/lib/facets.ts', import.meta.url).href
);
const { freshnessLabel } = await import(
  new URL('../src/lib/freshness.ts', import.meta.url).href
);

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures++;
    console.error(`  [FAIL] ${msg}`);
  }
}

// ─── loaders ────────────────────────────────────────────────────────────────

function parseFrontmatter(raw) {
  // Normalize CRLF first: a trailing bare \r at the slice boundary breaks
  // the yaml parser on Windows-authored files.
  const text = raw.replace(/\r\n/g, '\n');
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end < 0) return null;
  try {
    return parseYaml(text.slice(3, end));
  } catch {
    return null;
  }
}

async function loadCollection(folder) {
  const dir = join(CONTENT, folder);
  const out = [];
  for (const name of await readdir(dir)) {
    const ext = extname(name);
    if (!['.json', '.md', '.mdx'].includes(ext)) continue;
    const raw = await readFile(join(dir, name), 'utf8');
    const data = ext === '.json' ? JSON.parse(raw) : parseFrontmatter(raw);
    if (data) out.push({ file: name, data });
  }
  return out;
}

const venues = await loadCollection('venues');
const experiences = await loadCollection('experiences');
const events = await loadCollection('events');
const itineraries = await loadCollection('itineraries');
const articles = await loadCollection('articles');
const plansArticles = articles.filter((a) => a.data.section === 'plans');

// ─── 10-entry sample across kinds ───────────────────────────────────────────

const pick = (list, pred) => list.find(pred) ?? list[0];
const sample = [
  ['venue', pick(venues, (v) => v.data.type === 'winery')],
  ['venue', pick(venues, (v) => v.data.type === 'restaurant')],
  ['venue', pick(venues, (v) => ['hotel', 'villa', 'cottage', 'glamping'].includes(v.data.type))],
  ['venue', pick(venues, (v) => v.data.dogFriendly === true)],
  ['experience', pick(experiences, (e) => e.data.type === 'walk')],
  ['experience', pick(experiences, (e) => e.data.type === 'beach')],
  ['event', pick(events, (e) => e.data.place)],
  ['event', pick(events, (e) => !e.data.place && e.data.suburb)],
  ['itinerary', itineraries[0]],
  ['article', plansArticles[0]],
];

console.log('=== facet derivation sample (10 real entries) ===\n');
for (const [kind, entry] of sample) {
  if (!entry) {
    failures++;
    console.error(`  [FAIL] no entry found for sample kind ${kind}`);
    continue;
  }
  const facets = getFacets(kind, entry.data);
  console.log(`${kind}  ${entry.file}`);
  for (const [key, values] of Object.entries(facets)) {
    console.log(`  ${key}: ${values.join(', ')}`);
  }
  if (Object.keys(facets).length === 0) console.log('  (no facets derived)');
  console.log('');

  // Invariant: every emitted value exists in FACET_OPTIONS[key].
  for (const [key, values] of Object.entries(facets)) {
    const allowed = new Set((FACET_OPTIONS[key] ?? []).map((o) => o.value));
    for (const v of values) {
      assert(allowed.has(v), `${entry.file}: ${key}="${v}" not in FACET_OPTIONS.${key}`);
    }
  }
}

// ─── invariants ─────────────────────────────────────────────────────────────

console.log('=== invariants ===');

// FACET_OPTIONS shape
for (const key of ['place', 'cat', 'mood', 'price', 'party', 'date']) {
  assert(Array.isArray(FACET_OPTIONS[key]) && FACET_OPTIONS[key].length > 0, `FACET_OPTIONS.${key} present`);
}
assert(CANONICAL_PLACES.length === 37, `canonical place list has 37 towns (got ${CANONICAL_PLACES.length})`);

// Canonical places match the places collection on disk
const placeFiles = (await readdir(join(CONTENT, 'places')))
  .filter((n) => n.endsWith('.json'))
  .map((n) => n.replace(/\.json$/, ''))
  .sort();
assert(
  JSON.stringify(placeFiles) === JSON.stringify([...CANONICAL_PLACES].sort()),
  'CANONICAL_PLACES matches src/content/places/*.json'
);

// Chip presets reference valid facet keys and values
for (const [surface, chips] of Object.entries(CHIP_PRESETS)) {
  for (const chip of chips) {
    const allowed = new Set((FACET_OPTIONS[chip.key] ?? []).map((o) => o.value));
    assert(allowed.has(chip.value), `CHIP_PRESETS.${surface}: ${chip.key}=${chip.value} is a known option`);
    assert(!/—/.test(chip.label), `CHIP_PRESETS.${surface}: "${chip.label}" has no em-dash`);
  }
}
for (const surface of ['eat', 'stay', 'wine', 'explore', 'plans', 'whatson']) {
  assert(Array.isArray(CHIP_PRESETS[surface]) && CHIP_PRESETS[surface].length >= 3, `CHIP_PRESETS.${surface} has >= 3 chips`);
}

// freshnessLabel behaviour
assert(freshnessLabel('2026-05-14') === 'Reviewed May 2026', `freshnessLabel('2026-05-14') -> ${freshnessLabel('2026-05-14')}`);
assert(freshnessLabel() === null, 'freshnessLabel() -> null');
assert(freshnessLabel('not-a-date') === null, 'freshnessLabel(invalid) -> null');
assert(freshnessLabel(new Date('2026-01-02')) === 'Reviewed January 2026', 'freshnessLabel(Date) works');

// Chip usefulness: each eat/stay/wine/explore chip should match at least one
// live entry, otherwise the preset is a dead filter.
const corpusByKind = [
  ['venue', venues],
  ['experience', experiences],
  ['event', events],
  ['itinerary', itineraries],
  ['article', plansArticles],
];
const allFacets = corpusByKind.flatMap(([kind, list]) =>
  list.map((e) => getFacets(kind, e.data))
);
for (const surface of ['eat', 'stay', 'wine', 'explore', 'plans']) {
  for (const chip of CHIP_PRESETS[surface]) {
    const matches = allFacets.filter((f) => (f[chip.key] ?? []).includes(chip.value)).length;
    assert(matches > 0, `CHIP_PRESETS.${surface} "${chip.label}" (${chip.key}=${chip.value}) matches ${matches} entries`);
  }
}

// ─── coverage report ────────────────────────────────────────────────────────

console.log('\n=== facet coverage (share of entries resolving each key) ===\n');
const KEYS = ['place', 'cat', 'mood', 'price', 'party', 'date'];
console.log('kind          n     ' + KEYS.map((k) => k.padEnd(7)).join(''));
for (const [kind, list] of corpusByKind) {
  const counts = Object.fromEntries(KEYS.map((k) => [k, 0]));
  for (const e of list) {
    const f = getFacets(kind, e.data);
    for (const k of KEYS) if ((f[k] ?? []).length > 0) counts[k]++;
  }
  const pct = (n) => (list.length ? Math.round((100 * n) / list.length) + '%' : 'n/a');
  console.log(
    kind.padEnd(12) +
      String(list.length).padEnd(6) +
      KEYS.map((k) => pct(counts[k]).padEnd(7)).join('')
  );
}

console.log(
  failures === 0
    ? '\ntest-facets: all assertions passed.'
    : `\ntest-facets: ${failures} assertion(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
