#!/usr/bin/env node
/**
 * find-images.mjs
 *
 * The first stop for any picture work on Peninsula Insider. Searches the licensed
 * Visit Victoria library (ops/records/visit-victoria/) for photographs of a page,
 * a place or a topic, and answers two questions:
 *
 *   ready      Works already on the site as web derivatives: usable now, with the
 *              exact src, alt, credit and caption to copy. A Work placed on the
 *              entity you asked for is a photograph OF it (depictionStatus actual).
 *   suggest    Works in the download that match but are not placed yet. Not usable
 *              until a person approves them and apply-entity-map.mjs makes the web
 *              derivative. Report these as suggestions; never reference them.
 *
 *   node ops/scripts/visit-victoria/find-images.mjs trofeo-estate
 *   node ops/scripts/visit-victoria/find-images.mjs "sorrento pier" --channel social
 *   node ops/scripts/visit-victoria/find-images.mjs golf --json --limit 5
 *
 * --channel site|email|social|paid (default site). The licence covers site, email
 * and organic social; paid or sponsored use returns nothing, by design.
 * House rules: no em-dashes, no exclamation marks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const REC = path.join(REPO, 'ops/records/visit-victoria');
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const JSON_OUT = args.includes('--json');
const CHANNEL = flag('--channel', 'site');
const LIMIT = Number(flag('--limit', '8'));
const query = args.filter((a, i) => !a.startsWith('--') && !['--channel', '--limit'].includes(args[i - 1])).join(' ').trim();
if (!query) { console.error('usage: find-images.mjs <entity slug | place | topic> [--channel site|email|social|paid] [--limit n] [--json]'); process.exit(2); }

const RULES = 'Credit beside the image exactly as given. Keep the caption (it names the region). No crops beyond reframing, no text baked in, no generative edits, never passed to third parties. Record off-site use in ops/records/visit-victoria/placements.json.';
if (CHANNEL === 'paid') {
  const out = { query, channel: CHANNEL, ready: [], suggest: [], rule: 'Visit Victoria Works are not licensed for paid or sponsored placements. Use first-party or specifically licensed imagery.' };
  console.log(JSON_OUT ? JSON.stringify(out, null, 1) : out.rule);
  process.exit(0);
}

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const map = read(path.join(REC, 'entity-map.json'));
const catalogue = read(path.join(REC, `download-${map.batch}`, 'catalogue.json')).works;
const annotations = new Map(read(path.join(REC, `download-${map.batch}`, 'annotations.json')).works.map((a) => [a.assetKey, a]));
const ledger = read(path.join(REC, 'placements.json'));

const placedBy = new Map();
for (const p of ledger.placements) if (p.surface === 'site') {
  if (!placedBy.has(p.assetKey)) placedBy.set(p.assetKey, []);
  placedBy.get(p.assetKey).push(p);
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const STOP = new Set(['the', 'and', 'at', 'of', 'a', 'in', 'on', 'mornington', 'peninsula']);
const terms = norm(query).split(' ').filter((t) => t && !STOP.has(t));
const slugQuery = query.toLowerCase().replace(/[^a-z0-9]+/g, '-');

function score(w) {
  const places = placedBy.get(w.assetKey) ?? [];
  const entitySlugs = places.map((p) => p.entity.split('/')[1]);
  if (entitySlugs.includes(slugQuery)) return 1000;
  const a = annotations.get(w.assetKey);
  const hay = norm([w.subject, w.keywords.join(' '), a?.alt, entitySlugs.join(' '), places.map((p) => p.entity).join(' ')].join(' '));
  const words = new Set(hay.split(' '));
  const hits = terms.filter((t) => words.has(t) || (t.length > 4 && hay.includes(t))).length;
  if (!hits) return 0;
  return hits * 10 + (hits === terms.length ? 50 : 0) + (norm(w.subject).includes(norm(query)) ? 30 : 0);
}

const content = (entity) => { try { return read(path.join(REPO, 'next/src/content', `${entity}.json`)); } catch { return null; } };
function refFor(p) {
  const j = content(p.entity);
  if (!j) return null;
  return j.heroImage?.src === p.src ? j.heroImage : (j.gallery ?? []).find((g) => g.src === p.src) ?? null;
}

const ranked = catalogue
  .filter((w) => w.status === 'available' && !w.identicalTo)
  .map((w) => ({ w, s: score(w) }))
  .filter((x) => x.s > 0)
  .sort((a, b) => b.s - a.s || (b.w.width ?? 0) - (a.w.width ?? 0));

const ready = []; const suggest = [];
for (const { w, s } of ranked) {
  const places = placedBy.get(w.assetKey);
  if (places?.length) {
    if (ready.length >= LIMIT) continue;
    const ref = refFor(places[0]);
    if (!ref) continue;
    ready.push({
      assetKey: w.assetKey, src: ref.src, alt: ref.alt, credit: ref.credit, caption: ref.caption,
      orientation: w.orientation, people: annotations.get(w.assetKey)?.peopleVisible ?? null,
      showsEntity: places.map((p) => p.entity), exactMatch: s >= 1000,
    });
  } else if (suggest.length < LIMIT) {
    suggest.push({ assetKey: w.assetKey, vvAssetId: w.vvAssetId, subject: w.subject, file: w.file, orientation: w.orientation, credit: w.credit });
  }
}

const out = { query, channel: CHANNEL, ready, suggest, rule: RULES };
if (JSON_OUT) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
console.log(`Visit Victoria library: "${query}" (${CHANNEL})`);
console.log(`\nREADY (${ready.length}) usable now:`);
for (const r of ready) console.log(`  ${r.src}\n    alt: ${r.alt}\n    credit: Photo · ${r.credit}\n    caption: ${r.caption}${r.exactMatch ? '\n    shows this entity' : ''}`);
console.log(`\nSUGGEST (${suggest.length}) in the download, not yet approved or placed:`);
for (const s of suggest) console.log(`  ${s.assetKey}  ${s.subject}  (${s.orientation})`);
console.log(`\n${RULES}`);
