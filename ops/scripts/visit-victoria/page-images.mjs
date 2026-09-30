#!/usr/bin/env node
/**
 * page-images.mjs
 *
 * Builds next/src/data/visit-victoria-page-images.json: the licensed Visit
 * Victoria photographs used by page files rather than content records (hub
 * heroes, link-preview images, homepage doors). Each entry copies the imageRef
 * of a photograph already on the site, so credit, caption and alt text come from
 * the record, never retyped. Pages read their image from this file; so do the
 * licence gate, the credits page and record-placements.mjs, so these uses are
 * credited, checked and ledgered like any other.
 *
 * Chosen from Search Console priorities, 2026-09-30 (batch 1).
 *
 *   node ops/scripts/visit-victoria/page-images.mjs [--write]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const C = path.join(REPO, 'next/src/content');
const OUT = path.join(REPO, 'next/src/data/visit-victoria-page-images.json');

// key: [page it serves, role, source entity, asset key (null = the entity's hero)]
const USES = {
  'eat-hub': ['/eat/', 'link preview', 'venues/trofeo-estate', 'vv-169287'],
  'wine-hub': ['/wine/', 'link preview', 'venues/montalto', null],
  'stay-hub': ['/stay/', 'link preview', 'venues/jackalope', null],
  'spas-hub': ['/explore/spas-and-wellness/', 'link preview', 'venues/peninsula-hot-springs', 'vv-160851'],
  'golf-hub': ['/explore/golf/', 'hero and link preview', 'experiences/flinders-golf-club', null],
  'best-restaurants': ['/eat/best-restaurants/', 'hero', 'venues/merricks-general-wine-store', null],
  'home-door-stay': ['/', 'homepage Stay door', 'venues/jackalope', null],
  // Batch 4: hubs whose on-page hero is a published CMS override, so only the
  // link preview (and the Pagefind result image that mirrors it) changes.
  'whats-on-hub': ['/whats-on/', 'link preview', 'venues/mornington-farmers-market', 'vv-143094'],
  'explore-hub': ['/explore/', 'link preview', 'places/cape-schanck', 'vv-161977'],
  'places-hub': ['/explore/places/', 'link preview', 'places/mornington', 'vv-163846'],
  'hot-springs-hub': ['/explore/hot-springs/', 'link preview', 'venues/peninsula-hot-springs', 'vv-161941'],
  'boating-hub': ['/boating/', 'link preview', 'places/sorrento', 'vv-22100103'],
  'plans-hub': ['/explore/plans/', 'link preview', 'experiences/gunnamatta-ocean-beach', 'vv-25061207'],
  'about-hero': ['/about/', 'hero', 'places/cape-schanck', 'vv-161977'],
  'about-bay': ['/about/', 'supporting photograph', 'places/sorrento', 'vv-22100103'],
};

const out = { record: 'Visit Victoria photographs used by page files', writtenBy: 'ops/scripts/visit-victoria/page-images.mjs', images: {} };
for (const [key, [page, role, entity, assetKey]] of Object.entries(USES)) {
  const d = JSON.parse(fs.readFileSync(path.join(C, `${entity}.json`), 'utf8'));
  const refs = [d.heroImage, ...(d.gallery ?? [])].filter((r) => r?.license === 'visit-victoria');
  const ref = assetKey ? refs.find((r) => r.src.includes(`/${assetKey}-`)) : (d.heroImage?.license === 'visit-victoria' ? d.heroImage : refs[0]);
  if (!ref) throw new Error(`${key}: no licensed photograph ${assetKey ?? '(hero)'} on ${entity}`);
  out.images[key] = { page, role, entity, ...ref };
  console.log(`${key.padEnd(18)} ${page.padEnd(30)} ${ref.src}`);
}
if (process.argv.includes('--write')) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`wrote ${path.relative(REPO, OUT)}`);
}
