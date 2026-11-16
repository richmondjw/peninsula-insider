#!/usr/bin/env node
/**
 * record-placements.mjs
 *
 * Brings the where-used ledger (ops/records/visit-victoria/placements.json) up
 * to date with the content tree: every Visit Victoria photograph a page uses
 * gets a placement row, so a takedown finds it. Run it after placing a library
 * photograph by hand; the build's licence gate (next/scripts/lint-visit-victoria.mjs)
 * names what is missing.
 *
 * Deliberately separate from the gate: the gate reads the record, this writes it
 * (ops/records/README.md). Rows are only ever added. A placement that is no
 * longer in the tree is reported, not deleted: the record of a past use is
 * itself evidence.
 *
 *   node ops/scripts/visit-victoria/record-placements.mjs            # report
 *   node ops/scripts/visit-victoria/record-placements.mjs --write    # append missing rows
 *
 * House rules: no em-dashes, no exclamation marks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(path.join(REPO, 'next/package.json'));
const YAML = require('yaml');
const CONTENT = path.join(REPO, 'next/src/content');
const LEDGER = path.join(REPO, 'ops/records/visit-victoria/placements.json');
const WRITE = process.argv.includes('--write');

const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
const have = new Set(ledger.placements.filter((p) => p.surface === 'site').map((p) => `${p.entity}|${p.src}`));

function* files(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* files(p);
    else if (/\.(json|md|mdx)$/.test(e.name)) yield p;
  }
}
const seen = new Set();
const missing = [];
for (const file of files(CONTENT)) {
  const rel = path.relative(CONTENT, file);
  const collection = rel.split(path.sep)[0];
  const text = fs.readFileSync(file, 'utf8');
  let data;
  try {
    if (file.endsWith('.json')) data = JSON.parse(text);
    else { const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/); data = m ? YAML.parse(m[1]) : null; }
  } catch { continue; }
  if (!data) continue;
  const slug = data.slug ?? path.basename(file).replace(/\.(json|mdx?)$/, '');
  const entity = `${collection}/${slug}`;
  const refs = [['heroImage', data.heroImage], ['photo', data.photo], ...(Array.isArray(data.gallery) ? data.gallery.map((g, i) => [`gallery[${i}]`, g]) : [])];
  for (const [field, ref] of refs) {
    if (!ref?.src?.startsWith('/images/visit-victoria/')) continue;
    const k = `${entity}|${ref.src}`;
    seen.add(k);
    if (!have.has(k)) missing.push({ assetKey: (ref.src.match(/\/(vv-\d+)-/) || [])[1] ?? null, surface: 'site', entity, field, src: ref.src, role: 'recorded-from-tree', recordedAt: new Date().toISOString() });
  }
}
const pageImagesFile = path.join(REPO, 'next/src/data/visit-victoria-page-images.json');
if (fs.existsSync(pageImagesFile)) {
  for (const [key, ref] of Object.entries(JSON.parse(fs.readFileSync(pageImagesFile, 'utf8')).images ?? {})) {
    const k = `pages/${key}|${ref.src}`;
    seen.add(k);
    if (!have.has(k)) missing.push({ assetKey: (ref.src.match(/\/(vv-\d+)-/) || [])[1] ?? null, surface: 'site', entity: `pages/${key}`, field: ref.role, src: ref.src, page: ref.page, role: 'page-image', recordedAt: new Date().toISOString() });
  }
}
const gone = ledger.placements.filter((p) => p.surface === 'site' && !seen.has(`${p.entity}|${p.src}`) && !p.removedFromTree);

console.log(`missing from ledger: ${missing.length}`);
missing.slice(0, 40).forEach((m) => console.log(`  + ${m.entity} ${m.field} ${m.src}`));
console.log(`in ledger but no longer on the site: ${gone.length}${gone.length ? ' (kept as history; marked with removedFromTree on --write)' : ''}`);
if (WRITE && (missing.length || gone.length)) {
  const now = new Date().toISOString();
  for (const g of gone) g.removedFromTree = now;
  ledger.placements.push(...missing);
  ledger.lastSyncedAt = now;
  fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 1) + '\n');
  console.log('ledger updated');
}
