#!/usr/bin/env node
/**
 * apply-walks.mjs - Search Console batch 3: the Cape Schanck and Mornington
 * walk pages take Visit Victoria photographs already approved and placed on
 * their place pages (places/cape-schanck, places/mornington). No new Works, so
 * no new alt text or derivatives; the ref, credit and provenance are copied
 * from the place gallery and only the caption and depiction status change.
 *
 * A photograph is `actual` when it shows the walk itself (the lighthouse on the
 * lighthouse circuit, the boardwalk on the boardwalk) and `illustrative` when it
 * only shows the same coast (no Work shows the London Bridge coastal track).
 *
 *   node ops/scripts/visit-victoria/apply-walks.mjs [--write]
 *
 * Then: record-placements.mjs --write, lint:visit-victoria, build.
 * House rules: no em-dashes, no exclamation marks.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const C = path.join(REPO, 'next/src/content');
const WRITE = process.argv.includes('--write');
const read = (k) => JSON.parse(fs.readFileSync(path.join(C, `${k}.json`), 'utf8'));
const pool = new Map();
for (const k of ['places/cape-schanck', 'places/mornington']) {
  for (const g of read(k).gallery ?? []) if (g.license === 'visit-victoria') pool.set(g.src.match(/\/(vv-\d+)-/)[1], g);
}

const PLAN = {
  'experiences/cape-schanck-lighthouse-walk': {
    caption: 'Cape Schanck Lighthouse, Mornington Peninsula.',
    // Lead with a landscape frame: the stage crops a portrait lead to a close-up.
    hero: ['vv-161977', 'actual'],
    gallery: [['vv-118016', 'actual'],['vv-143808', 'actual'], ['vv-161978', 'actual'], ['vv-162411', 'actual'], ['vv-143799', 'actual']],
  },
  'experiences/cape-schanck-boardwalk': {
    caption: 'Cape Schanck Boardwalk, Mornington Peninsula.',
    hero: ['vv-161979', 'actual'],
    gallery: [['vv-161980', 'actual'], ['vv-161981', 'actual'], ['vv-161984', 'actual'], ['vv-161983', 'actual']],
  },
  'experiences/coastal-walk-cape-schanck': {
    caption: 'The coast at Cape Schanck, where the walk begins, Mornington Peninsula.',
    hero: ['vv-143799', 'illustrative'],
    gallery: [],
  },
  'experiences/mornington-foreshore-walk': {
    caption: 'Mills Beach bathing boxes on the Mornington foreshore, Mornington Peninsula.',
    hero: ['vv-163844', 'actual'],
    gallery: [['vv-163841', 'actual'], ['vv-162001', 'actual'], ['vv-163830', 'actual']],
  },
};

const report = [];
for (const [entity, plan] of Object.entries(PLAN)) {
  const f = path.join(C, `${entity}.json`);
  const raw = fs.readFileSync(f, 'utf8');
  // Keep the file's own line endings so the diff shows only the photographs.
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const d = JSON.parse(raw);
  const ref =([key, status]) => {
    const g = pool.get(key);
    if (!g) throw new Error(`${entity}: ${key} is not on a place gallery`);
    return { ...g, caption: plan.caption, depictionStatus: status };
  };
  const was = d.heroImage?.src;
  d.heroImage = ref(plan.hero);
  d.gallery = plan.gallery.map(ref);
  report.push(`${entity}: hero ${plan.hero[0]} (${plan.hero[1]}, was ${was}), gallery ${d.gallery.length}`);
  if (WRITE) fs.writeFileSync(f, (JSON.stringify(d, null, 2) + '\n').replace(/\n/g, eol));
}
console.log(report.join('\n'));
console.log(WRITE ? 'written' : 'dry run');
