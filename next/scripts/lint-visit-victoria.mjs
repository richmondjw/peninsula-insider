#!/usr/bin/env node
/**
 * lint-visit-victoria.mjs - the licence gate for Visit Victoria photographs.
 *
 * Every photograph from the Victoria Content Hub is used under a licence with
 * conditions (ops/records/visit-victoria/README.md). This gate fails the build
 * when a use breaks one, so a condition is enforced by code rather than
 * remembered by whoever next edits a page:
 *
 *   credit        the credit names Visit Victoria ("..., courtesy of Visit
 *                 Victoria"); the licence asks for creator and supplier
 *   caption       a caption names the region (the use must be "titled correctly
 *                 and identify the region")
 *   licence       an image served from /images/visit-victoria/ carries
 *                 license "visit-victoria" and recorded rights, and a
 *                 "visit-victoria" licence is never claimed for anything else
 *   work          the Work is in a download catalogue and is neither excluded
 *                 (closed venue) nor out of region
 *   file          the web derivative exists
 *   uses          permittedUses never grants "derivative" or "commercial"
 *   paid          no Visit Victoria photograph on a featured-partner venue or
 *                 on the partner and advertising pages
 *   ledger        every placement is in the where-used ledger, so a takedown
 *                 can find it (record new ones with
 *                 `node ops/scripts/visit-victoria/record-placements.mjs`)
 *
 * Reads records, writes nothing (ops/records/README.md).
 *
 *   node scripts/lint-visit-victoria.mjs          # from next/
 *
 * House rules: no em-dashes, no exclamation marks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(NEXT, '..');
const require = createRequire(path.join(NEXT, 'package.json'));
const YAML = require('yaml');
const CONTENT = path.join(NEXT, 'src/content');
const PUBLIC = path.join(NEXT, 'public');
const REC = path.join(REPO, 'ops/records/visit-victoria');
const VV_DIR = '/images/visit-victoria/';

// Every catalogued Work, across download batches.
const works = new Map();
for (const d of fs.readdirSync(REC).filter((x) => x.startsWith('download-'))) {
  const f = path.join(REC, d, 'catalogue.json');
  if (!fs.existsSync(f)) continue;
  for (const w of JSON.parse(fs.readFileSync(f, 'utf8')).works) works.set(w.assetKey, w);
}
const ledger = JSON.parse(fs.readFileSync(path.join(REC, 'placements.json'), 'utf8'));
const placed = new Set(ledger.placements.filter((p) => p.surface === 'site').map((p) => `${p.entity}|${p.src}`));

function* files(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* files(p);
    else if (/\.(json|md|mdx)$/.test(e.name)) yield p;
  }
}
function* sourceFiles(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* sourceFiles(p);
    else if (/\.(astro|css|js|mjs|ts|json|md|mdx)$/.test(e.name)) yield p;
  }
}
function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  try { return YAML.parse(m[1]); } catch { return null; }
}

const failures = [];
const fail = (where, rule, msg) => failures.push(`${where}: [${rule}] ${msg}`);
let checked = 0;

for (const file of files(CONTENT)) {
  const rel = path.relative(CONTENT, file);
  const collection = rel.split(path.sep)[0];
  let data;
  try {
    const text = fs.readFileSync(file, 'utf8');
    data = file.endsWith('.json') ? JSON.parse(text) : frontmatter(text);
  } catch { continue; }
  if (!data || typeof data !== 'object') continue;
  const slug = data.slug ?? path.basename(file).replace(/\.(json|mdx?)$/, '');
  const entity = `${collection}/${slug}`;
  const refs = [['heroImage', data.heroImage], ['photo', data.photo], ...(Array.isArray(data.gallery) ? data.gallery.map((g, i) => [`gallery[${i}]`, g]) : [])]
    .filter(([, r]) => r && typeof r === 'object' && typeof r.src === 'string');

  for (const [field, ref] of refs) {
    const servedFromLibrary = ref.src.startsWith(VV_DIR);
    const claimsLicence = ref.license === 'visit-victoria';
    if (!servedFromLibrary && !claimsLicence) continue;
    checked++;
    const where = `${rel} ${field}`;
    if (!servedFromLibrary) { fail(where, 'licence', `claims license "visit-victoria" but is not served from ${VV_DIR} (${ref.src})`); continue; }
    if (!claimsLicence) fail(where, 'licence', `served from ${VV_DIR} but license is "${ref.license ?? 'unset'}"`);
    if (ref.rightsStatus !== 'recorded') fail(where, 'licence', 'rightsStatus is not "recorded"');
    if (!/courtesy of Visit Victoria/i.test(ref.credit ?? '')) fail(where, 'credit', `credit must name Visit Victoria ("..., courtesy of Visit Victoria"), got "${ref.credit ?? ''}"`);
    if (!/Mornington Peninsula/i.test(ref.caption ?? '')) fail(where, 'caption', `caption must name the region, got "${ref.caption ?? ''}"`);
    const key = (ref.src.match(/\/(vv-\d+)-/) || [])[1];
    const w = key && works.get(key);
    if (!w) fail(where, 'work', `${key ?? ref.src} is in no download catalogue`);
    else if (w.status !== 'available') fail(where, 'work', `${key} is ${w.status}${w.statusReason ? ` (${w.statusReason})` : ''}`);
    if (!fs.existsSync(path.join(PUBLIC, ref.src.split('?')[0]))) fail(where, 'file', `missing derivative ${ref.src}`);
    const badUse = (ref.permittedUses ?? []).filter((u) => u === 'derivative' || u === 'commercial');
    if (badUse.length) fail(where, 'uses', `permittedUses grants ${badUse.join(', ')}`);
    if (collection === 'venues' && data.featuredPartner === true) fail(where, 'paid', 'featured-partner venue: Visit Victoria photographs are not licensed for paid placements');
    if (!placed.has(`${entity}|${ref.src}`)) fail(where, 'ledger', `not in ops/records/visit-victoria/placements.json (run ops/scripts/visit-victoria/record-placements.mjs)`);
  }
}

// Page-level uses (hub heroes, link previews, homepage doors) live in one data
// file; the same rules apply, keyed as pages/<key> in the ledger.
const PAGE_IMAGES = path.join(NEXT, 'src/data/visit-victoria-page-images.json');
if (fs.existsSync(PAGE_IMAGES)) {
  for (const [key, ref] of Object.entries(JSON.parse(fs.readFileSync(PAGE_IMAGES, 'utf8')).images ?? {})) {
    checked++;
    const where = `src/data/visit-victoria-page-images.json ${key}`;
    if (!ref.src?.startsWith(VV_DIR) || ref.license !== 'visit-victoria' || ref.rightsStatus !== 'recorded') fail(where, 'licence', 'must be a recorded visit-victoria photograph served from ' + VV_DIR);
    if (!/courtesy of Visit Victoria/i.test(ref.credit ?? '')) fail(where, 'credit', `credit must name Visit Victoria, got "${ref.credit ?? ''}"`);
    if (!/Mornington Peninsula/i.test(ref.caption ?? '')) fail(where, 'caption', `caption must name the region, got "${ref.caption ?? ''}"`);
    const k = (ref.src?.match(/\/(vv-\d+)-/) || [])[1];
    const w = k && works.get(k);
    if (!w) fail(where, 'work', `${k ?? ref.src} is in no download catalogue`);
    else if (w.status !== 'available') fail(where, 'work', `${k} is ${w.status}`);
    if (!fs.existsSync(path.join(PUBLIC, (ref.src ?? '').split('?')[0]))) fail(where, 'file', `missing derivative ${ref.src}`);
    if (!placed.has(`pages/${key}|${ref.src}`)) fail(where, 'ledger', 'not in ops/records/visit-victoria/placements.json (run ops/scripts/visit-victoria/record-placements.mjs)');
  }
}

// AI transformations and other non-technical derivatives need separate written
// permission. Keep an unresolved derivative out of reader-facing source even
// when its original photographs remain valid for ordinary editorial use.
const HOME_MOTION_RECORD = path.join(REPO, 'ops/records/homepage-motion/2026-10-02.json');
if (fs.existsSync(HOME_MOTION_RECORD)) {
  const record = JSON.parse(fs.readFileSync(HOME_MOTION_RECORD, 'utf8'));
  const asset = String(record.asset ?? '').replace(/^next\/public/, '');
  const unresolved = /written licence not independently inspected/i.test(record.source_clearance ?? '');
  if (asset && unresolved) {
    for (const file of sourceFiles(path.join(NEXT, 'src'))) {
      if (fs.readFileSync(file, 'utf8').includes(asset)) {
        fail(path.relative(NEXT, file), 'derivative', `${asset} has no independently inspected written permission for its recorded AI transformation`);
      }
    }
  }
}

// Paid surfaces must not carry library photographs at all.
for (const dir of ['src/pages/partners', 'src/pages/partner-with-us', 'src/components/partners']) {
  const abs = path.join(NEXT, dir);
  if (!fs.existsSync(abs)) continue;
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (fs.readFileSync(p, 'utf8').includes(VV_DIR)) fail(path.relative(NEXT, p), 'paid', 'references a Visit Victoria photograph on a partner or advertising page'); } };
  walk(abs);
}

if (failures.length) {
  console.error(`Visit Victoria licence gate: ${failures.length} problem(s) across ${checked} licensed image use(s)\n`);
  for (const f of failures.slice(0, 80)) console.error('  ' + f);
  if (failures.length > 80) console.error(`  ... and ${failures.length - 80} more`);
  console.error('\nTerms and house rules: ops/records/visit-victoria/README.md');
  process.exit(1);
}
console.log(`Visit Victoria licence gate: OK (${checked} licensed image use(s), ${works.size} catalogued Works).`);
