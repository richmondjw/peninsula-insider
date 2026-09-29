#!/usr/bin/env node
/**
 * register-media-assets.mjs
 *
 * Registers every placed Visit Victoria Work in public.pi_media_assets, the rights
 * gate the content factory reads before it will use an image. asset_key follows
 * ops/scripts/backfill-media-rights.mjs (slugified src), so both paths merge on the
 * same row rather than duplicating it.
 *
 * Rights posture (ops/records/visit-victoria/README.md): site, email and organic
 * social channels; attribution required; no derivatives; no paid use. Approved,
 * except where an identifiable person is a main subject, which stays pending until
 * a release is held (constraint pi_media_people_chk).
 *
 *   node ops/scripts/visit-victoria/register-media-assets.mjs                     # dry run
 *   node ops/scripts/visit-victoria/register-media-assets.mjs --apply --env <file>  # needs SUPABASE_URL + SUPABASE_SERVICE_KEY
 *
 * House rules: no em-dashes, no exclamation marks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const ENV_FILE = args.includes('--env') ? args[args.indexOf('--env') + 1] : null;
const EXPECTED_PROJECT = 'mvdtkgsfuhmkioygxgge';

const map = JSON.parse(fs.readFileSync(path.join(REPO, 'ops/records/visit-victoria/entity-map.json'), 'utf8'));
const cat = new Map(JSON.parse(fs.readFileSync(path.join(REPO, `ops/records/visit-victoria/download-${map.batch}/catalogue.json`), 'utf8')).works.map((w) => [w.assetKey, w]));
const ledger = JSON.parse(fs.readFileSync(path.join(REPO, 'ops/records/visit-victoria/placements.json'), 'utf8'));
const contentPath = (entity) => path.join(REPO, 'next/src/content', `${entity}.json`);
const content = (entity) => JSON.parse(fs.readFileSync(contentPath(entity), 'utf8'));
// Annotations for Works approved after the entity map (pass 3).
const annotations = new Map(JSON.parse(fs.readFileSync(path.join(REPO, `ops/records/visit-victoria/download-${map.batch}/annotations.json`), 'utf8')).works.map((a) => [a.assetKey, a]));
const slugifyPath = (p) => p.replace(/^\/+/, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/-+/g, '-').toLowerCase();
const TOD = new Set(['dawn', 'morning', 'midday', 'afternoon', 'golden', 'dusk', 'night']);
const CHANNELS = ['site_plan', 'site_article', 'site_whats_on', 'site_home', 'email', 'ig_carousel', 'ig_story', 'facebook', 'linkedin'];
const NOTE = 'Visit Victoria Work. No derivatives, no generative use, never passed to third parties; boosting an organic post that promotes Peninsula tourism is allowed, other paid use is not. See ops/records/visit-victoria.';

const first = new Map();
// The owning record for each Work: the first placement on a JSON entity (articles
// are markdown and events borrow a venue's photograph, so they never own one).
for (const p of ledger.placements) {
  if (p.surface !== 'site' || first.has(p.assetKey) || !fs.existsSync(contentPath(p.entity))) continue;
  if (p.entity.startsWith('events/')) continue;
  first.set(p.assetKey, p);
}

const now = new Date().toISOString();
const rows = [...first.values()].map((p) => {
  const w = cat.get(p.assetKey); const a = map.assets[p.assetKey] ?? annotations.get(p.assetKey);
  const [collection, slug] = p.entity.split('/');
  const j = content(p.entity);
  const ref = j.heroImage?.src === p.src ? j.heroImage : (j.gallery ?? []).find((g) => g.src === p.src);
  const people = a.peopleVisible === 'prominent';
  return {
    asset_key: slugifyPath(p.src).slice(0, 180),
    storage_path: p.src,
    public_url: `https://peninsulainsider.com.au${p.src}`,
    subject: w.subject,
    entity_slug: collection === 'places' ? null : slug,
    place_slug: collection === 'places' ? slug : (j.place ?? null),
    orientation: w.orientation,
    aspect_ratio: w.width && w.height ? `${w.width}:${w.height}` : null,
    shot_type: a.shotType,
    time_of_day: TOD.has(a.timeOfDay) ? a.timeOfDay : null,
    people_present: people,
    people_released: false,
    rights_owner: 'Visit Victoria',
    licence: 'visit-victoria',
    licence_ref: `Victoria Content Hub asset ${w.vvAssetId}`,
    licence_starts: map.batch,
    attribution_text: `Photo: ${ref.credit}`,
    attribution_required: true,
    derivative_works_ok: false,
    permitted_channels: CHANNELS,
    paid_use_ok: false,
    approval_status: people ? 'pending' : 'approved',
    approved_by: people ? null : 'james (bulk approval 2026-09-29)',
    approved_at: people ? null : now,
    quality_notes: people ? `${NOTE} Pending: identifiable people are a main subject; approve once a release is held.` : NOTE,
  };
});
console.log(`rows ${rows.length}, approved ${rows.filter((r) => r.approval_status === 'approved').length}, pending ${rows.filter((r) => r.approval_status === 'pending').length}`);
if (!APPLY) process.exit(0);

const env = Object.fromEntries(fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/).map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '').trim()]));
const url = env.SUPABASE_URL; const key = env.SUPABASE_SERVICE_KEY;
if (!url || !key || !url.includes(EXPECTED_PROJECT)) { console.error(`refusing: env must point at ${EXPECTED_PROJECT} with a service key`); process.exit(1); }

let written = 0;
for (let i = 0; i < rows.length; i += 100) {
  const chunk = rows.slice(i, i + 100);
  const res = await fetch(`${url}/rest/v1/pi_media_assets?on_conflict=asset_key`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(chunk),
  });
  if (!res.ok) { console.error(`upsert failed at ${i}: ${res.status} ${(await res.text()).slice(0, 300)}`); process.exit(1); }
  written += chunk.length;
}
console.log(`upserted ${written}/${rows.length} into pi_media_assets`);
