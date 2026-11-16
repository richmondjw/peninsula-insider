#!/usr/bin/env node
/**
 * apply-pass2.mjs
 *
 * Second pass: carries the licensed Visit Victoria photographs already on the site
 * (the entity galleries written by apply-entity-map.mjs) to every other surface
 * where they honestly fit. No new Work is introduced here; every imageRef is copied
 * with its credit, caption and provenance intact.
 *
 *   1. Entity heroes: an entity with licensed photographs of itself, no CMS hero
 *      override, and a hero that is not a venue media-kit or commissioned image
 *      leads with its best licensed photograph.
 *   2. Place galleries: each town gathers photographs of the licensed venues and
 *      experiences in it (they show that town), up to 12.
 *   3. Itinerary galleries: a photograph of each covered stop, up to 9.
 *   4. Region galleries: photographs from the region's places, up to 12.
 *   5. Articles: a missing, broken, placeholder or stand-in hero is replaced when
 *      the article is about a covered entity (depictionStatus actual) or features
 *      one (illustrative, depicts names the venue). Insider Picks are left to the
 *      engine.
 *   6. Events: a weak hero at a covered venue takes that venue's photograph;
 *      depictionStatus is left unrecorded because the photograph shows the venue,
 *      not the event.
 *
 * Heroes are never changed on a page whose CMS hero override is published
 * (ops/records/visit-victoria/cms-hero-overrides-2026-09-29.json); galleries are.
 *
 *   node ops/scripts/visit-victoria/apply-pass2.mjs           # dry run, writes the report
 *   node ops/scripts/visit-victoria/apply-pass2.mjs --write   # applies and appends the ledger
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
const WRITE = process.argv.includes('--write');
const C = path.join(REPO, 'next/src/content');
const PUB = path.join(REPO, 'next/public');
const REC = path.join(REPO, 'ops/records/visit-victoria');

const overrides = JSON.parse(fs.readFileSync(path.join(REC, 'cms-hero-overrides-2026-09-29.json'), 'utf8')).overrides;
const isOverridden = (type, slug) => (overrides[type] ?? []).includes(slug);
const map = JSON.parse(fs.readFileSync(path.join(REC, 'entity-map.json'), 'utf8'));
const cat = new Map(JSON.parse(fs.readFileSync(path.join(REC, `download-${map.batch}`, 'catalogue.json'), 'utf8')).works.map((w) => [w.assetKey, w]));

const TYPE = { venues: 'venue', experiences: 'experience', 'tour-operators': 'tour-operator', tours: 'tour', places: 'place', regions: 'region', itineraries: 'itinerary' };
const KEEP_HERO_LICENCES = new Set(['visit-victoria', 'venue-media-kit', 'original-commissioned']);
const WEAK = new Set(['missing', 'broken-file', 'placeholder', 'stand-in', 'uncleared']);

// ── load JSON collections ──
const store = new Map(); // "coll/slug" -> { file, data, dirty }
for (const coll of Object.keys(TYPE)) {
  const dir = path.join(C, coll);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const file = path.join(dir, f);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    store.set(`${coll}/${data.slug ?? f.replace(/\.json$/, '')}`, { file, data, dirty: false });
  }
}
const isVV = (i) => i?.license === 'visit-victoria' && i.rightsStatus === 'recorded' && i.provenanceReview === 'verified' && i.src;
const photosOf = (d) => [d.heroImage, ...(d.gallery ?? [])].filter(isVV);
const assetKeyOf = (src) => (src.match(/\/(vv-\d+)-/) || [])[1] ?? null;
const orientationOf = (ref) => cat.get(assetKeyOf(ref.src))?.orientation ?? null;
// Shot type from the recorded review annotations: a hero should establish the
// place, so aerial, establishing and wide landscape frames lead.
const annotations = new Map(JSON.parse(fs.readFileSync(path.join(REC, `download-${map.batch}`, 'annotations.json'), 'utf8')).works.map((a) => [a.assetKey, a]));
const SHOT_RANK = { aerial: 0, establishing: 0, wide: 1, interior: 2, food: 3, detail: 4, portrait: 5 };
const ESTABLISHING = /\b(aerial|exterior|facade|building|entrance|terrace|vineyard|vines|view|views|overlooking|coast|bay|lighthouse|pier)\b/i;
const altOf = (r) => annotations.get(assetKeyOf(r.src))?.alt ?? r.alt ?? '';
const heroScore = (r) => (orientationOf(r) === 'landscape' ? 0 : 10) + (SHOT_RANK[annotations.get(assetKeyOf(r.src))?.shotType] ?? 3) + (annotations.get(assetKeyOf(r.src))?.peopleVisible === 'prominent' ? 2 : 0) - (ESTABLISHING.test(altOf(r)) ? 1 : 0);
// An article's hero should match its topic: words in the slug pull photographs
// whose recorded description shares the subject.
const TOPIC = [
  [/winer|wine|cellar|chardonnay|vineyard|pinot/, /vine|vineyard|wine|cellar|barrel|glass/i],
  [/golf/, /golf|green|fairway|tee/i],
  [/spa|soak|thermal|springs|wellness/, /pool|spring|bath|bathing|spa|steam/i],
  [/walk|trail|hike/, /walk|track|boardwalk|path|trail/i],
  [/beach|swim|coast/, /beach|sand|surf|swim|shore|cove/i],
  [/eat|food|lunch|dinner|restaurant|pantry|seafood|breakfast|brunch/, /dish|plate|dining|table|lunch|food|produce/i],
  [/pub|brew|beer/, /beer|brew|pint|bar/i],
  [/market|producer/, /market|stall|produce/i],
  [/kids|family/, /family|children|child/i],
  [/stay|villa|hotel|escape|night/, /suite|room|bed|hotel|villa|lodge/i],
];
function topicRank(slug, refs) {
  const rules = TOPIC.filter(([re]) => re.test(slug)).map(([, want]) => want);
  if (!rules.length) return landscapeFirst(refs);
  return refs.map((r, i) => ({ r, i, hit: rules.some((want) => want.test(altOf(r))) ? 0 : 1 }))
    .sort((a, b) => a.hit - b.hit || heroScore(a.r) - heroScore(b.r) || a.i - b.i).map((x) => x.r);
}
const landscapeFirst = (refs) => refs.map((r, i) => ({ r, i })).sort((a, b) => heroScore(a.r) - heroScore(b.r) || a.i - b.i).map((x) => x.r);

function heroState(h) {
  if (!h?.src) return 'missing';
  if (/^https?:/.test(h.src)) return 'external';
  if (!fs.existsSync(path.join(PUB, h.src.split('?')[0]))) return 'broken-file';
  if (/placeholder/.test(h.src)) return 'placeholder';
  if (h.license === 'visit-victoria') return 'already-vv';
  if (/\/(place|category|explore|region|home)-/.test(h.src) || h.depictionStatus === 'illustrative') return 'stand-in';
  if (/^tmp-|^unknown$/.test(h.license ?? 'unknown')) return 'uncleared';
  return 'own';
}

const placements = [];
const report = { heroUpgrades: [], placeGalleries: [], itineraries: [], regions: [], articles: [], events: [], skipped: [] };
const place = (ref, entity, field, role) => placements.push({ assetKey: assetKeyOf(ref.src), surface: 'site', entity, field, src: ref.src, pass: 2, role });

// Entities that hold licensed photographs of themselves
const vvEntities = [...store].filter(([k, v]) => ['venues', 'experiences', 'tour-operators'].includes(k.split('/')[0]) && photosOf(v.data).length);
const photosByKey = new Map(vvEntities.map(([k, v]) => [k, landscapeFirst(photosOf(v.data))]));

// ── 1. entity hero upgrades ──
for (const [key, entry] of vvEntities) {
  const [coll, slug] = key.split('/');
  const d = entry.data;
  if (isOverridden(TYPE[coll], slug)) continue;
  if (KEEP_HERO_LICENCES.has(d.heroImage?.license)) continue;
  const pool = landscapeFirst((d.gallery ?? []).filter(isVV));
  if (!pool.length) continue;
  const pick = pool[0];
  report.heroUpgrades.push(`${key}: ${d.heroImage?.src ?? '(none)'} -> ${pick.src}`);
  d.gallery = d.gallery.filter((g) => g.src !== pick.src);
  d.heroImage = pick;
  entry.dirty = true;
  place(pick, key, 'heroImage', 'hero-upgrade');
}
// refresh after upgrades
for (const [k] of vvEntities) photosByKey.set(k, landscapeFirst(photosOf(store.get(k).data)));

// ── helper: gather photographs round-robin from a list of entity keys ──
function gather(keys, cap, perEntityFirst = 1) {
  const lists = keys.map((k) => ({ k, refs: [...(photosByKey.get(k) ?? [])] })).filter((x) => x.refs.length);
  const out = []; const seen = new Set();
  for (let round = 0; out.length < cap && lists.some((l) => l.refs.length); round++) {
    for (const l of lists) {
      if (out.length >= cap) break;
      if (round >= perEntityFirst && round > 0 && out.length >= cap) break;
      const ref = l.refs.shift();
      if (ref && !seen.has(ref.src)) { seen.add(ref.src); out.push({ ref, from: l.k }); }
    }
  }
  return out;
}

function setGallery(key, picked, role, cap) {
  const entry = store.get(key);
  const d = entry.data;
  const existing = (d.gallery ?? []);
  const keepVV = existing.filter(isVV);
  const others = existing.filter((g) => !isVV(g));
  const merged = [...keepVV];
  for (const { ref } of picked) if (merged.length < cap && !merged.some((m) => m.src === ref.src)) merged.push(ref);
  if (merged.length === keepVV.length) return 0;
  d.gallery = [...others, ...merged];
  entry.dirty = true;
  merged.slice(keepVV.length).forEach((r, i) => place(r, key, `gallery[${others.length + keepVV.length + i}]`, role));
  return merged.length - keepVV.length;
}

function maybeHero(key, type, slug, candidates, role) {
  const entry = store.get(key); const d = entry.data;
  if (isOverridden(type, slug) || !WEAK.has(heroState(d.heroImage)) || !candidates.length) return false;
  const pick = landscapeFirst(candidates.map((c) => c.ref ?? c))[0];
  d.heroImage = pick;
  entry.dirty = true;
  place(pick, key, 'heroImage', role);
  return true;
}

// ── 2. place galleries ──
const PLACE_OVERRIDE_BY_ENTITY = { 'tour-operators/arthurs-seat-eagle': 'arthurs-seat' };
const entitiesInPlace = new Map();
for (const [k] of vvEntities) {
  const p = PLACE_OVERRIDE_BY_ENTITY[k] ?? store.get(k).data.place;
  if (!p) continue;
  if (!entitiesInPlace.has(p)) entitiesInPlace.set(p, []);
  entitiesInPlace.get(p).push(k);
}
for (const [p, keys] of entitiesInPlace) {
  const key = `places/${p}`;
  if (!store.has(key)) continue;
  keys.sort((a, b) => (photosByKey.get(b)?.length ?? 0) - (photosByKey.get(a)?.length ?? 0));
  const picked = gather(keys, 12);
  const added = setGallery(key, picked, 'place-gallery', 12);
  const hero = maybeHero(key, 'place', p, picked, 'place-hero');
  if (added || hero) report.placeGalleries.push(`${key}: +${added} photographs from ${keys.length} entities${hero ? '; hero set' : ''}`);
}

// ── 3. itineraries ──
for (const [key, entry] of store) {
  if (!key.startsWith('itineraries/')) continue;
  const slug = key.split('/')[1];
  const json = JSON.stringify(entry.data);
  const refs = [...json.matchAll(/"(?:venue|experience|anchorStay|slug|entity|operator)"\s*:\s*"([a-z0-9-]+)"|"altStays"\s*:\s*\[([^\]]*)\]/g)]
    .flatMap((m) => (m[1] ? [m[1]] : (m[2] ?? '').match(/[a-z0-9-]+/g) ?? []));
  const order = [];
  for (const s of refs) for (const coll of ['venues', 'experiences', 'tour-operators']) {
    const k = `${coll}/${s}`;
    if (photosByKey.has(k) && !order.includes(k)) order.push(k);
  }
  if (!order.length) continue;
  const picked = gather(order, 9);
  const added = setGallery(key, picked, 'itinerary-gallery', 9);
  const hero = maybeHero(key, 'itinerary', slug, picked, 'itinerary-hero');
  report.itineraries.push(`${key}: +${added} photographs from ${order.map((o) => o.split('/')[1]).join(', ')}${hero ? '; hero set' : ''}`);
}

// ── 4. regions ──
for (const [key, entry] of store) {
  if (!key.startsWith('regions/')) continue;
  const slug = key.split('/')[1];
  const placesIn = [...store].filter(([k, v]) => k.startsWith('places/') && v.data.regionSlug === slug).map(([k]) => k.split('/')[1]);
  const keys = placesIn.flatMap((p) => entitiesInPlace.get(p) ?? []);
  if (!keys.length) continue;
  keys.sort((a, b) => (photosByKey.get(b)?.length ?? 0) - (photosByKey.get(a)?.length ?? 0));
  const picked = gather(keys, 12);
  const added = setGallery(key, picked, 'region-gallery', 12);
  const hero = maybeHero(key, 'region', slug, picked, 'region-hero');
  report.regions.push(`${key}: +${added} photographs from ${placesIn.length} places${hero ? '; hero set' : ''}`);
}

// ── 5. articles (markdown frontmatter) ──
const q = (v) => JSON.stringify(String(v));
function yamlHero(ref) {
  const lines = ['heroImage:'];
  for (const [k, v] of Object.entries(ref)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) { if (v.length) lines.push(`  ${k}:`, ...v.map((x) => `    - ${q(x)}`)); }
    else if (typeof v === 'boolean') lines.push(`  ${k}: ${v}`);
    else lines.push(`  ${k}: ${q(v)}`);
  }
  return lines.join('\n') + '\n';
}
const HERO_BLOCK = /^heroImage:[ \t]*\r?\n(?:[ \t]+\S.*\r?\n?)*/m;
const slugIndex = [...photosByKey.keys()].map((k) => ({ k, s: k.split('/')[1] })).sort((a, b) => b.s.length - a.s.length);
const placeKeys = [...store.keys()].filter((k) => k.startsWith('places/') && photosOf(store.get(k).data).length);

const articleDir = path.join(C, 'articles');
// No two articles lead with the same photograph while an unused one fits.
const usedArticleHeroes = new Set();
const firstUnused = (refs) => refs.find((r) => !usedArticleHeroes.has(r.src)) ?? null;
for (const f of fs.readdirSync(articleDir).filter((x) => /\.mdx?$/.test(x))) {
  const slug = f.replace(/\.mdx?$/, '');
  if (slug.startsWith('insider-picks')) continue;
  const file = path.join(articleDir, f);
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) continue;
  let fm; try { fm = YAML.parse(m[1]); } catch { continue; }
  if (fm.status === 'draft') continue;
  const state = heroState(fm.heroImage);
  if (!WEAK.has(state)) continue;
  if (isOverridden('article', slug)) { report.skipped.push(`article ${slug}: CMS override`); continue; }
  let ref = null; let role = null;
  const own = slugIndex.find(({ s }) => s.length > 6 && slug.includes(s));
  // "mornington-peninsula" names the whole region, not the town of Mornington.
  const cleaned = `-${slug.replace(/mornington-peninsula/g, '')}-`;
  const ownPlace = placeKeys.find((k) => cleaned.includes(`-${k.split('/')[1]}-`));
  if (own) { const refs = topicRank(slug, photosByKey.get(own.k)); ref = firstUnused(refs) ?? refs[0]; role = 'article-hero-actual'; }
  else if (ownPlace) { const refs = topicRank(slug, photosOf(store.get(ownPlace).data)); ref = firstUnused(refs) ?? refs[0]; role = 'article-hero-actual'; }
  else {
    const related = [...(fm.relatedVenues ?? []), ...(fm.relatedExperiences ?? [])].map((r) => (typeof r === 'string' ? r : r?.slug ?? r?.id));
    const hits = related.map((s) => ['venues', 'experiences'].map((c) => `${c}/${s}`).find((k) => photosByKey.has(k))).filter(Boolean);
    let pick = null;
    for (const k of hits) { pick = firstUnused(topicRank(slug, photosByKey.get(k))); if (pick) break; }
    if (!pick && hits.length) pick = topicRank(slug, photosByKey.get(hits[0]))[0];
    if (pick) { ref = { ...pick, depictionStatus: 'illustrative' }; role = 'article-hero-featured'; }
  }
  if (ref) usedArticleHeroes.add(ref.src);
  if (!ref) continue;
  const newFm = HERO_BLOCK.test(m[1]) ? m[1].replace(HERO_BLOCK, yamlHero(ref)) : m[1].replace(/\s*$/, '\n') + yamlHero(ref);
  report.articles.push(`${slug} [${state}] -> ${ref.src} (${role})`);
  place(ref, `articles/${slug}`, 'heroImage', role);
  if (WRITE) fs.writeFileSync(file, text.replace(m[1], newFm.replace(/\n$/, '')));
}

// ── 6. events ──
const EVENT_ALIASES = [
  [/continental-sorrento/, 'venues/the-continental-sorrento'],
  [/mprg|regional-gallery/, 'experiences/mornington-peninsula-gallery'],
  [/moonlit-sanctuary/, 'tour-operators/moonlit-sanctuary'],
  [/peninsula-hot-springs/, 'venues/peninsula-hot-springs'],
  [/alba-thermal/, 'venues/alba-thermal-springs'],
];
const eventDir = path.join(C, 'events');
for (const f of fs.readdirSync(eventDir).filter((x) => x.endsWith('.json'))) {
  const file = path.join(eventDir, f);
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const slug = d.slug ?? f.replace(/\.json$/, '');
  const state = heroState(d.heroImage);
  if (!WEAK.has(state)) continue;
  if (isOverridden('event', slug)) { report.skipped.push(`event ${slug}: CMS override`); continue; }
  const venue = typeof d.venue === 'string' ? d.venue : d.venue?.slug ?? d.venue?.id;
  let k = venue && ['venues', 'experiences'].map((c) => `${c}/${venue}`).find((x) => photosByKey.has(x));
  if (!k) k = EVENT_ALIASES.find(([re]) => re.test(slug))?.[1];
  if (!k || !photosByKey.has(k)) continue;
  const { depictionStatus, ...rest } = photosByKey.get(k)[0];
  const ref = { ...rest };
  report.events.push(`${slug} [${state}] -> ${ref.src} (${k})`);
  place(ref, `events/${slug}`, 'heroImage', 'event-hero-venue');
  if (WRITE) { d.heroImage = ref; fs.writeFileSync(file, JSON.stringify(d, null, 2) + '\n'); }
}

// ── write ──
let changed = 0;
for (const [, e] of store) if (e.dirty) { changed++; if (WRITE) { const raw = fs.readFileSync(e.file, 'utf8'); fs.writeFileSync(e.file, JSON.stringify(e.data, null, 2) + (raw.endsWith('\n') ? '\n' : '')); } }

const outDir = path.join(REPO, 'ops/reports/visit-victoria');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'pass2.json'), JSON.stringify({ generatedAt: new Date().toISOString(), write: WRITE, changedJsonFiles: changed, placements: placements.length, report }, null, 1) + '\n');
if (WRITE) {
  const lp = path.join(REC, 'placements.json');
  const ledger = JSON.parse(fs.readFileSync(lp, 'utf8'));
  // Merge, never replace: the ledger is the record of every use for takedowns,
  // and a later run of this pass only knows about the rows it made itself.
  const known = new Set(ledger.placements.map((p) => `${p.surface}|${p.entity}|${p.src}`));
  ledger.placements.push(...placements.filter((p) => !known.has(`${p.surface}|${p.entity}|${p.src}`)));
  ledger.pass2At = new Date().toISOString();
  fs.writeFileSync(lp, JSON.stringify(ledger, null, 1) + '\n');
}
for (const [k, v] of Object.entries(report)) { console.log(`\n## ${k} (${v.length})`); v.slice(0, 60).forEach((l) => console.log('  ' + l)); }
console.log(`\njson files changed: ${changed}; placements: ${placements.length}; ${WRITE ? 'WRITTEN' : 'dry run'}`);
