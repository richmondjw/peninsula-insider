#!/usr/bin/env node
/**
 * build-entity-map.mjs
 *
 * Writes ops/records/visit-victoria/entity-map.json from the proposal report plus a
 * set of per-Work review annotations (alt text and shot attributes), under the bulk
 * decision James recorded on 2026-09-29 (see clarification-2026-09-29.md):
 *
 *   - every reviewed candidate that matches its subject joins the entity's gallery;
 *   - where the current hero needs replacing, the best-ranked matching landscape
 *     Work becomes the hero;
 *   - a Work the reviewer marked as not matching its subject is placed nowhere.
 *
 *   node ops/scripts/visit-victoria/build-entity-map.mjs --annotations <file.json> --approved-by james --alt-by claude-vision-draft
 *
 * House rules: no em-dashes, no exclamation marks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const ANN = arg('--annotations');
const APPROVED_BY = arg('--approved-by');
const ALT_BY = arg('--alt-by') || 'human';
if (!ANN || !APPROVED_BY) { console.error('usage: build-entity-map.mjs --annotations <file> --approved-by <name> [--alt-by <who>]'); process.exit(2); }

const report = JSON.parse(fs.readFileSync(path.join(REPO, 'ops/reports/visit-victoria/proposed-matches.json'), 'utf8'));
const catalogue = JSON.parse(fs.readFileSync(path.join(REPO, report.catalogue), 'utf8'));
const byKey = new Map(catalogue.works.map((w) => [w.assetKey, w]));
const ann = new Map(JSON.parse(fs.readFileSync(ANN, 'utf8')).map((a) => [a.assetKey, a]));

// Captions must name the place and region (terms: "titled correctly"). `place` on an
// entity is a slug, so resolve it to the place page's display name.
const PLACES_DIR = path.join(REPO, 'next/src/content/places');
const placeName = new Map(fs.readdirSync(PLACES_DIR).filter((f) => f.endsWith('.json')).map((f) => {
  const j = JSON.parse(fs.readFileSync(path.join(PLACES_DIR, f), 'utf8'));
  return [j.slug, j.name];
}));
function captionFor(p) {
  const place = p.place ? (placeName.get(p.place) ?? null) : null;
  const parts = [p.name];
  if (place && !p.name.toLowerCase().includes(place.toLowerCase()) && !p.entity.startsWith('places/')) parts.push(place);
  return `${parts.join(', ')}, Mornington Peninsula.`;
}

const BAD_NOTE = /blur|out of focus|text overlay|logo|watermark|unsuitable|not suited to a hero|rather than a hero/i;

// Editorial hero choices made on review (2026-09-29) where the ranked pick was weak.
const HERO_OVERRIDES = {
  'venues/jackalope': 'vv-26070114', // ranked pick was a dark corridor
  'venues/crittenden-estate': 'vv-164290', // ranked pick showed a cottage, not the estate
  'venues/mornington-farmers-market': 'vv-143094', // ranked pick was a close detail
};
const entries = [];
const rejected = [];
for (const p of report.proposals) {
  if (p.action.startsWith('skip')) continue;
  const keys = [...p.heroPick.map((h) => h.assetKey), ...p.galleryPool];
  const ok = keys.filter((k) => {
    const a = ann.get(k);
    if (!a) { rejected.push({ entity: p.entity, assetKey: k, why: 'no annotation' }); return false; }
    if (a.matchesSubject === false) { rejected.push({ entity: p.entity, assetKey: k, why: a.note || 'does not match subject' }); return false; }
    return true;
  });
  let hero = null;
  if (p.action === 'replace hero') {
    hero = (ok.includes(HERO_OVERRIDES[p.entity]) && HERO_OVERRIDES[p.entity])
      || ok.find((k) => byKey.get(k)?.orientation === 'landscape' && !BAD_NOTE.test(ann.get(k).note || ''))
      || null;
  }
  const gallery = ok.filter((k) => k !== hero);
  if (!hero && !gallery.length) continue;
  entries.push({ entity: p.entity, name: p.name, hero, gallery, caption: captionFor(p), previousHero: p.currentHeroSrc });
}

const used = new Set(entries.flatMap((e) => [e.hero, ...e.gallery].filter(Boolean)));
const assets = {};
for (const k of [...used].sort()) {
  const w = byKey.get(k); const a = ann.get(k);
  assets[k] = {
    file: w.file, vvAssetId: w.vvAssetId, sha256: w.sha256, width: w.width, height: w.height,
    credit: w.credit, alt: a.alt, altBy: ALT_BY,
    peopleVisible: a.peopleVisible, shotType: a.shotType, timeOfDay: a.timeOfDay, note: a.note || null,
  };
}

const record = {
  record: 'Visit Victoria entity map (approved)',
  batch: report.batch,
  approvedBy: APPROVED_BY,
  approvedAt: new Date().toISOString(),
  basis: 'Bulk approval 2026-09-29: all reviewed matching candidates to gallery, best matching landscape Work as hero where the hero needs replacing. See clarification-2026-09-29.md.',
  writtenBy: 'ops/scripts/visit-victoria/build-entity-map.mjs',
  entries,
  assets,
  rejected,
};
const out = path.join(REPO, 'ops/records/visit-victoria/entity-map.json');
fs.writeFileSync(out, JSON.stringify(record, null, 1) + '\n');
console.log(JSON.stringify({ entities: entries.length, heroes: entries.filter((e) => e.hero).length, galleryImages: entries.reduce((n, e) => n + e.gallery.length, 0), uniqueAssets: used.size, rejected: rejected.length }, null, 1));
console.log(`wrote ${out}`);
