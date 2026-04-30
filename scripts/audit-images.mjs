#!/usr/bin/env node
/**
 * audit-images — surface the image-sourcing gap across every PI entity.
 *
 * Reads each content collection, extracts heroImage src/alt/license,
 * detects placeholders (tmp-* licenses, paths containing "placeholder"
 * or "stock"), counts duplicate src reuse across entities, and prints
 * a summary by collection.
 *
 * No external calls. Answers "how big is the problem" before we start
 * sourcing anything.
 *
 * Usage:
 *   node scripts/audit-images.mjs                    # summary
 *   node scripts/audit-images.mjs --duplicates       # list dupe srcs
 *   node scripts/audit-images.mjs --collection eat   # single collection
 *   node scripts/audit-images.mjs --csv > audit.csv  # full per-entity CSV
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { argv } from 'node:process';

const REPO_ROOT = join(import.meta.dirname, '..');
const CONTENT = join(REPO_ROOT, 'next', 'src', 'content');

const COLLECTIONS = [
  { dir: 'venues', label: 'venues', loader: 'json' },
  { dir: 'experiences', label: 'experiences', loader: 'json' },
  { dir: 'places', label: 'places', loader: 'json' },
  { dir: 'tour-operators', label: 'tour-operators', loader: 'json' },
  { dir: 'tours', label: 'tours', loader: 'json' },
  { dir: 'tour-packages', label: 'tour-packages', loader: 'json' },
  { dir: 'itineraries', label: 'itineraries', loader: 'json' },
  { dir: 'species', label: 'species', loader: 'md' },
  { dir: 'fishing-locations', label: 'fishing-locations', loader: 'md' },
  { dir: 'fishing-charters', label: 'fishing-charters', loader: 'md' },
  { dir: 'boat-ramps', label: 'boat-ramps', loader: 'md' },
  { dir: 'boat-hire', label: 'boat-hire', loader: 'md' },
];

const TMP_LICENSES = new Set(['tmp-unsplash', 'tmp-wikimedia', 'tmp-pexels']);

const args = {};
for (let i = 2; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--duplicates') args.duplicates = true;
  else if (a === '--csv') args.csv = true;
  else if (a === '--collection') args.collection = argv[++i];
}

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return null; }
}

function readMdFrontmatter(path) {
  const raw = readFileSync(path, 'utf-8');
  if (!raw.startsWith('---\n')) return null;
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) return null;
  const fm = raw.slice(4, end);
  const obj = {};
  // Tiny YAML extractor for the fields we need.
  const lines = fm.split('\n');
  let inHero = false;
  const heroFields = {};
  for (const line of lines) {
    const heroStart = line.match(/^heroImage:\s*$/);
    if (heroStart) { inHero = true; continue; }
    if (inHero) {
      const sub = line.match(/^\s+(\w+):\s*(.*)$/);
      if (sub) {
        heroFields[sub[1]] = sub[2].replace(/^['"]|['"]$/g, '').trim();
        continue;
      }
      // Indented block ended.
      if (!line.startsWith(' ') && line.trim()) inHero = false;
    }
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) {
      obj[kv[1]] = kv[2].replace(/^['"]|['"]$/g, '').trim();
    }
  }
  if (Object.keys(heroFields).length) obj.heroImage = heroFields;
  return obj;
}

function entityRows(collection) {
  const dir = join(CONTENT, collection.dir);
  if (!existsSync(dir)) return [];
  const ext = collection.loader === 'md' ? ['.md', '.mdx'] : ['.json'];
  const files = readdirSync(dir).filter((f) => ext.some((e) => f.endsWith(e)));
  const rows = [];
  for (const file of files) {
    const path = join(dir, file);
    const data = collection.loader === 'md' ? readMdFrontmatter(path) : readJson(path);
    if (!data) continue;
    const slug = data.slug ?? file.replace(/\.[^.]+$/, '');
    const hero = data.heroImage ?? {};
    const src = hero.src ?? '';
    const alt = hero.alt ?? '';
    const license = hero.license ?? '';
    const status = data.status ?? 'published';
    rows.push({
      collection: collection.label,
      slug,
      file,
      name: data.name ?? data.title ?? slug,
      type: data.type ?? data.locationType ?? data.kind ?? '',
      src,
      alt,
      license,
      status,
      hasImage: !!src,
      isPlaceholder: !src || /placeholder|stock|home-cover/.test(src),
      isTmp: TMP_LICENSES.has(license),
      isVenueKit: license === 'venue-media-kit',
      isOriginal: license === 'original-commissioned',
      isVisitVic: license === 'visit-victoria',
      isCC: /^wikimedia-cc/.test(license),
    });
  }
  return rows;
}

const allRows = COLLECTIONS.flatMap(entityRows);
const filtered = args.collection
  ? allRows.filter((r) => r.collection === args.collection || r.type === args.collection)
  : allRows;

if (args.csv) {
  console.log('collection,slug,name,type,status,src,license,alt,hasImage,isPlaceholder,isTmp');
  for (const r of filtered) {
    console.log([r.collection, r.slug, r.name, r.type, r.status, r.src, r.license, r.alt, r.hasImage, r.isPlaceholder, r.isTmp]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','));
  }
  process.exit(0);
}

if (args.duplicates) {
  const bySrc = new Map();
  for (const r of filtered) {
    if (!r.src) continue;
    if (!bySrc.has(r.src)) bySrc.set(r.src, []);
    bySrc.get(r.src).push(r);
  }
  const dupes = [...bySrc.entries()].filter(([, rows]) => rows.length > 1);
  dupes.sort(([, a], [, b]) => b.length - a.length);
  console.log(`\nDuplicate hero images (${dupes.length} sources reused across multiple entities):\n`);
  for (const [src, rows] of dupes) {
    console.log(`  ${src} (${rows.length}x)`);
    for (const r of rows) console.log(`    - ${r.collection}/${r.slug} — ${r.name}`);
  }
  process.exit(0);
}

// Default: summary by collection.
console.log(`PI image audit — ${allRows.length} entities across ${COLLECTIONS.length} collections.\n`);

const byCollection = {};
for (const r of allRows) {
  if (!byCollection[r.collection]) {
    byCollection[r.collection] = { total: 0, hasImage: 0, placeholder: 0, tmp: 0, venueKit: 0, original: 0, visitVic: 0, cc: 0 };
  }
  const b = byCollection[r.collection];
  b.total++;
  if (r.hasImage) b.hasImage++;
  if (r.isPlaceholder) b.placeholder++;
  if (r.isTmp) b.tmp++;
  if (r.isVenueKit) b.venueKit++;
  if (r.isOriginal) b.original++;
  if (r.isVisitVic) b.visitVic++;
  if (r.isCC) b.cc++;
}

console.log('Collection            Total  WithImg  NoImg  Placehldr  Tmp(Unsplash/etc)  VenueKit  Original  VisitVic  WikiCC');
console.log('-------------------- ------ -------- ------ --------- ------------------ --------- --------- --------- ------');
for (const [name, b] of Object.entries(byCollection)) {
  console.log(
    `${name.padEnd(20)} ${String(b.total).padStart(6)} ${String(b.hasImage).padStart(8)} ${String(b.total - b.hasImage).padStart(6)} ${String(b.placeholder).padStart(9)} ${String(b.tmp).padStart(18)} ${String(b.venueKit).padStart(9)} ${String(b.original).padStart(9)} ${String(b.visitVic).padStart(9)} ${String(b.cc).padStart(6)}`
  );
}

const total = allRows.length;
const tmp = allRows.filter((r) => r.isTmp).length;
const placeholder = allRows.filter((r) => r.isPlaceholder).length;
const noImg = allRows.filter((r) => !r.hasImage).length;

console.log(`\nHeadlines:`);
console.log(`  ${total} entities total`);
console.log(`  ${noImg} have no image at all`);
console.log(`  ${placeholder} are using a placeholder/site-cover fallback`);
console.log(`  ${tmp} are licensed under tmp-* (temporary stock; need replacement)`);

const bySrc = new Map();
for (const r of allRows) {
  if (!r.src) continue;
  if (!bySrc.has(r.src)) bySrc.set(r.src, 0);
  bySrc.set(r.src, bySrc.get(r.src) + 1);
}
const dupeCount = [...bySrc.values()].filter((c) => c > 1).length;
const reuseCount = [...bySrc.values()].filter((c) => c > 1).reduce((sum, c) => sum + c, 0);
console.log(`  ${dupeCount} image sources are reused across ${reuseCount} entities (duplicate problem)`);

console.log(`\nNext: run with --duplicates to see which sources are reused, --csv > audit.csv for the full list.`);
