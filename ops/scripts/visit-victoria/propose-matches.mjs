#!/usr/bin/env node
/**
 * propose-matches.mjs
 *
 * Proposes which Visit Victoria Works depict which site entities, for a human to
 * approve. It never writes an entity file and never writes the approved map
 * (ops/records/visit-victoria/entity-map.json); approval is a separate human act.
 *
 * Matching is deterministic: an explicit alias table first, then token overlap
 * between the Work's normalised subject and entity names. Anything the aliases do
 * not settle is reported as unmatched rather than guessed.
 *
 *   node ops/scripts/visit-victoria/propose-matches.mjs [--batch 2026-09-28]
 *
 * Writes ops/reports/visit-victoria/proposed-matches.{json,md}.
 * House rules: no em-dashes, no exclamation marks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const args = process.argv.slice(2);
const BATCH = args[args.indexOf('--batch') + 1] && args.includes('--batch') ? args[args.indexOf('--batch') + 1] : '2026-09-28';
const CATALOGUE = path.join(REPO, 'ops/records/visit-victoria', `download-${BATCH}`, 'catalogue.json');
const CONTENT = path.join(REPO, 'next/src/content');
const OUT = path.join(REPO, 'ops/reports/visit-victoria');

// Subject (as normalised by catalogue.mjs, matched as a case-insensitive regex) ->
// entity keys "collection/slug". Where one subject covers several entities (an
// estate with a restaurant and villas), every listed entity is a candidate.
// A subject mapped to [] is deliberately unplaced (scenic stock, or no entity yet).
const ALIASES = [
  [/^Pt\. Leo Estate$/i, ['venues/pt-leo-estate']],
  [/Rare Hare|Kackalope/i, ['venues/rare-hare']],
  [/Doot Doot Doot|Flaggerdoot/i, ['venues/jackalope']],
  [/^Jackalope/i, ['venues/jackalope']],
  [/Moonah Links/i, ['experiences/moonah-links']],
  [/St Andrews Beach Golf/i, ['experiences/st-andrews-beach-golf-course']],
  [/St Andrews Beach Brewery/i, ['venues/st-andrews-beach-brewery']],
  [/The Dunes Golf/i, ['experiences/the-dunes-golf-links']],
  [/Flinders Golf/i, ['experiences/flinders-golf-club']],
  [/Moonraker/i, ['tour-operators/moonraker-charters']],
  [/Polperro Dolphin|Chinaman's Hat/i, ['tour-operators/polperro-dolphin-swims', 'tours/polperro-dolphin-swim']],
  [/Ocean Eight/i, ['venues/ocean-eight']],
  [/National Golf Course/i, ['experiences/the-national-golf-club']],
  [/Sorrento Back Beach|Diamond Bay/i, ['experiences/sorrento-back-beach']],
  [/Fort Nepean/i, ['experiences/point-nepean-fort-walk', 'places/point-nepean']],
  // Scenic Works depict the town itself, so they are actual for the place page.
  [/^(Sorrento (Pier|Village|Long Pier|aerial|shopping strip)|Fishing boats, Sorrento)/i, ['places/sorrento']],
  [/^(Portsea|London Bridge)/i, ['places/portsea']],
  [/Bathing Boxes at Mornington|SUP at Mills Beach/i, ['places/mornington']],
  [/Millionaire's Walk/i, ['places/sorrento']], // Sorrento foreshore, not Mount Martha
  // Unverified subject; hold until a human has looked at it.
  [/^The Eagle Mount Martha$/i, []],
  [/Polperro Winery/i, ['venues/polperro']],
  [/Lindenderry/i, ['venues/lindenderry']],
  [/Eco Lodges - Peninsula Hot Springs/i, ['venues/peninsula-hot-springs-eco-lodges']],
  [/Peninsula Hot Springs/i, ['venues/peninsula-hot-springs']],
  [/Alba Thermal/i, ['venues/alba-thermal-springs']],
  [/Montalto/i, ['venues/montalto']],
  [/Paringa Estate/i, ['venues/paringa-estate']],
  [/Avani/i, ['venues/avani-wines']],
  [/Epicurean/i, ['venues/epicurean-red-hill']],
  [/Green Olive/i, ['venues/green-olive-red-hill']],
  [/Arthurs Seat (Eagle|cable car)/i, ['tour-operators/arthurs-seat-eagle', 'tours/arthurs-seat-eagle-gondola']],
  [/Mornington Peninsula Regional Gallery/i, ['experiences/mornington-peninsula-gallery']],
  [/Bass and Flinders/i, ['venues/bass-and-flinders']],
  [/Merricks General/i, ['venues/merricks-general-wine-store']],
  [/Red Hill Brewery/i, ['venues/red-hill-brewery']],
  [/Red Gum BBQ/i, ['venues/red-gum-bbq']],
  [/Trofeo/i, ['venues/trofeo-estate']],
  [/Crittenden/i, ['venues/crittenden-estate']],
  [/Moonlit Sanctuary/i, ['tour-operators/moonlit-sanctuary']],
  [/Continental Sorrento/i, ['venues/the-continental-sorrento']],
  [/Mornington Farmers Market/i, ['venues/mornington-farmers-market']],
  [/Point Nepean|Fort Nepean/i, ['experiences/point-nepean-national-park', 'places/point-nepean']],
  [/Cape Schanck/i, ['places/cape-schanck']],
];

const COLLECTIONS = ['venues', 'experiences', 'tour-operators', 'tours', 'places'];
const STOP = new Set(['the', 'at', 'and', 'of', 'a', 'in', 'on', 'mornington', 'peninsula', 'vic', 'victoria', 'australia']);
const tokens = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((t) => t && !STOP.has(t));

function loadEntities() {
  const out = new Map();
  for (const c of COLLECTIONS) {
    const dir = path.join(CONTENT, c);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      let j; try { j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
      const key = `${c}/${j.slug || f.replace(/\.json$/, '')}`;
      out.set(key, { key, collection: c, slug: j.slug, name: j.name, place: j.place ?? j.regionLabel ?? null, status: j.status ?? null, hero: j.heroImage ?? null, galleryCount: Array.isArray(j.gallery) ? j.gallery.length : 0 });
    }
  }
  return out;
}

// Established by earlier image audits (docs/image-library-audit-2026-08-04.md):
// heroes that look like the venue's own image but are not.
const KNOWN_WRONG = {
  'venues/rare-hare': 'shows the Jackalope hotel, not Rare Hare',
  'venues/montalto': 'byte-identical to place-red-hill-01',
};

function heroState(e) {
  if (KNOWN_WRONG[e.key]) return { state: 'wrong-subject', why: KNOWN_WRONG[e.key] };
  const h = e.hero;
  if (!h?.src) return { state: 'missing', why: 'no hero image' };
  const src = h.src;
  const lic = h.license || 'unknown';
  const borrowed = /\/(place|category|explore|golf)-/.test(src) && ['venues', 'tour-operators', 'experiences'].includes(e.collection);
  if (/placeholder/.test(src)) return { state: 'placeholder', why: src };
  if (borrowed) return { state: 'stand-in', why: `${path.basename(src)} is a generic ${src.match(/\/(place|category|explore|golf)-/)[1]} image` };
  if (/^tmp-|^unknown$/.test(lic)) return { state: 'uncleared', why: `licence ${lic}` };
  return { state: 'own-image', why: `${path.basename(src)} (${lic})` };
}

// Hero ranking: landscape, tagged "hero" by Visit Victoria, large, recent.
function rank(w) {
  let s = 0;
  if (w.orientation === 'landscape') s += 100;
  if (w.keywords.some((k) => /^hero$/i.test(k))) s += 40;
  s += Math.min(Math.max(w.width, w.height), 8000) / 200;
  const y = parseInt((w.dateCreated || '').slice(0, 4), 10);
  if (y) s += Math.max(0, y - 2016) * 2;
  return s;
}

const catalogue = JSON.parse(fs.readFileSync(CATALOGUE, 'utf8'));
const entities = loadEntities();
const works = catalogue.works.filter((w) => w.status === 'available' && !w.identicalTo);

const bySubject = new Map();
for (const w of works) { if (!bySubject.has(w.subject)) bySubject.set(w.subject, []); bySubject.get(w.subject).push(w); }

const matches = new Map(); // entityKey -> works[]
const unplaced = [];
const aliasMisses = [];
for (const [subject, ws] of bySubject) {
  const alias = ALIASES.find(([re]) => re.test(subject));
  let keys = alias ? alias[1] : null;
  let how = 'alias';
  if (!keys) {
    const st = tokens(subject);
    let best = null;
    for (const e of entities.values()) {
      const et = tokens(e.name);
      if (!et.length) continue;
      const inter = et.filter((t) => st.includes(t)).length;
      const score = inter / new Set([...et, ...st]).size;
      if (inter >= 2 && score >= 0.5 && (!best || score > best.score)) best = { key: e.key, score };
    }
    keys = best ? [best.key] : [];
    how = best ? `token-overlap ${best.score.toFixed(2)}` : 'none';
  }
  const live = keys.filter((k) => entities.has(k));
  for (const k of keys) if (!entities.has(k)) aliasMisses.push({ subject, entity: k });
  if (!live.length) { unplaced.push({ subject, works: ws.length }); continue; }
  for (const k of live) {
    if (!matches.has(k)) matches.set(k, []);
    matches.get(k).push(...ws.map((w) => ({ ...w, how })));
  }
}

const proposals = [...matches.entries()].map(([key, ws]) => {
  const e = entities.get(key);
  const hs = heroState(e);
  const ranked = [...ws].sort((a, b) => rank(b) - rank(a));
  const closed = e.status && /closed/i.test(e.status);
  const action = closed ? 'skip: entity closed'
    : ['missing', 'placeholder', 'stand-in', 'uncleared', 'wrong-subject'].includes(hs.state) ? 'replace hero'
    : 'review: already has own image; offer as gallery or upgrade';
  return {
    entity: key, name: e.name, place: e.place, currentHeroSrc: e.hero?.src ?? null, currentHero: hs, action,
    candidates: ws.length,
    heroPick: ranked.slice(0, 3).map((w) => ({ assetKey: w.assetKey, file: w.file, size: `${w.width}x${w.height}`, credit: w.credit, people: w.peopleSignal, date: w.dateCreated?.slice(0, 10) ?? null, how: w.how })),
    galleryPool: ranked.slice(3, 9).map((w) => w.assetKey),
    note: 'Live pages may show a CMS image override (pi.cms_image_slots) instead of this JSON hero. Check before applying.',
  };
}).sort((a, b) => (a.action === 'replace hero' ? 0 : 1) - (b.action === 'replace hero' ? 0 : 1) || a.entity.localeCompare(b.entity));

fs.mkdirSync(OUT, { recursive: true });
const report = { generatedAt: new Date().toISOString(), batch: BATCH, catalogue: path.relative(REPO, CATALOGUE), proposals, unplaced: unplaced.sort((a, b) => b.works - a.works), aliasMisses };
fs.writeFileSync(path.join(OUT, 'proposed-matches.json'), JSON.stringify(report, null, 1) + '\n');

const md = [
  `# Visit Victoria: proposed entity matches (batch ${BATCH})`, '',
  `Generated ${report.generatedAt} by \`ops/scripts/visit-victoria/propose-matches.mjs\`. A proposal, not an approval.`,
  'Approve by copying accepted rows into `ops/records/visit-victoria/entity-map.json`.', '',
  `Entities with candidates: **${proposals.length}**, needing a new hero: **${proposals.filter((p) => p.action === 'replace hero').length}**. Subjects with no entity: **${unplaced.length}**.`, '',
  '| Entity | Current hero | Action | Works | Top pick | Credit |',
  '|---|---|---|---:|---|---|',
  ...proposals.map((p) => `| \`${p.entity}\` | ${p.currentHero.state}: ${p.currentHero.why} | ${p.action} | ${p.candidates} | ${p.heroPick[0]?.file ?? ''} (${p.heroPick[0]?.size ?? ''}) | ${p.heroPick[0]?.credit ?? ''} |`),
  '', '## Subjects with no entity (new-listing candidates or scenic stock)', '',
  ...unplaced.map((u) => `- ${u.subject} (${u.works})`),
  '', '## Aliases pointing at entities that do not exist', '',
  ...(aliasMisses.length ? aliasMisses.map((m) => `- ${m.subject} -> \`${m.entity}\``) : ['- none']),
  '',
];
fs.writeFileSync(path.join(OUT, 'proposed-matches.md'), md.join('\n'));
console.log(md.slice(0, 6).join('\n'));
console.log(`proposals ${proposals.length}, replace ${proposals.filter((p) => p.action === 'replace hero').length}, unplaced subjects ${unplaced.length}, alias misses ${aliasMisses.length}`);
if (aliasMisses.length) console.log(aliasMisses);
