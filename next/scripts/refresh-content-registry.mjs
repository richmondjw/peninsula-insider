#!/usr/bin/env node
/**
 * refresh-content-registry.mjs
 *
 * Walks every Astro content collection that maps to a CMS-editable entity
 * type and upserts the current (entity_type, entity_slug, title, href) rows
 * into pi.content_registry in Supabase. The CMS integrity trigger blocks
 * image/text overrides for any entity not present here, so this must run
 * before any editor can update content on a newly-added item.
 *
 * Called by the deploy workflow after `astro build`. Can also be run manually:
 *
 *   SUPABASE_SERVICE_KEY=... node next/scripts/refresh-content-registry.mjs
 *
 * Env vars (at least one of these must be set):
 *   SUPABASE_SERVICE_KEY   — service role key (bypasses RLS; preferred)
 *   PUBLIC_SUPABASE_ANON_KEY — anon key (works only if RLS allows service writes)
 *
 * The Supabase project URL is hard-coded to the PI project; override with
 * PUBLIC_SUPABASE_URL if needed.
 */

import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CONTENT_ROOT = resolve(__dirname, '../src/content');

const SUPABASE_URL =
  process.env.PUBLIC_SUPABASE_URL || 'https://tjjhpvslpysfklwpqmgz.supabase.co';

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error('[refresh-registry] No Supabase key found. Set SUPABASE_SERVICE_KEY.');
  process.exit(1);
}

/** Collections to walk: collection folder → { entityType, hrefPrefix } */
const COLLECTIONS = [
  { folder: 'venues',         entityType: 'venue',         hrefPrefix: '/stay/' },
  { folder: 'places',         entityType: 'place',         hrefPrefix: '/places/' },
  { folder: 'articles',       entityType: 'article',       hrefPrefix: '/journal/' },
  { folder: 'events',         entityType: 'event',         hrefPrefix: '/whats-on/' },
  { folder: 'experiences',    entityType: 'experience',    hrefPrefix: '/explore/' },
  { folder: 'itineraries',    entityType: 'itinerary',     hrefPrefix: '/plans/' },
  { folder: 'tours',          entityType: 'tour',          hrefPrefix: '/tours/' },
  { folder: 'tour-operators', entityType: 'tour-operator', hrefPrefix: '/tour-operators/' },
  { folder: 'tour-packages',  entityType: 'tour-package',  hrefPrefix: '/plans/' },
];

/**
 * "Page-tagged" collections: content collections whose detail pages aren't
 * tagged with a first-class entityType in the templates, so the inline
 * editor's auto-detect falls back to (entity_type='page', entity_slug=<URL
 * path slugified>). We mirror that derivation here so the integrity trigger
 * accepts overrides on those pages.
 *
 * Derived slug rule: same as client.ts currentPageSlug() — drop slashes,
 * lowercase, replace `/` with `-`. e.g. `/events/portsea-polo/` becomes
 * `events-portsea-polo`.
 */
const PAGE_COLLECTIONS = [
  { folder: 'signature-events', pathPrefix: '/events/' },
];

function pageSlugFromPath(path) {
  const trimmed = String(path).replace(/^\/+|\/+$/g, '');
  if (trimmed.length === 0) return 'home';
  return trimmed.toLowerCase().replace(/[^a-z0-9/_-]/g, '-').replace(/\//g, '-');
}

async function loadJsonFiles(folder) {
  const dir = join(CONTENT_ROOT, folder);
  let files;
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  const rows = [];
  for (const file of files) {
    if (!file.endsWith('.json') || file.startsWith('_')) continue;
    try {
      const raw = await readFile(join(dir, file), 'utf8');
      rows.push(JSON.parse(raw));
    } catch (err) {
      console.warn(`[refresh-registry] Skipping ${folder}/${file}: ${err.message}`);
    }
  }
  return rows;
}

async function upsertBatch(rows) {
  if (rows.length === 0) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/content_registry`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer':        'resolution=merge-duplicates',
      // target the pi schema
      'Accept-Profile': 'pi',
      'Content-Profile': 'pi',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase upsert failed (${res.status}): ${text}`);
  }
}

async function main() {
  let total = 0;
  for (const { folder, entityType, hrefPrefix } of COLLECTIONS) {
    const items = await loadJsonFiles(folder);
    const rows = items
      .filter((d) => d.slug)
      .map((d) => ({
        entity_type: entityType,
        entity_slug: d.slug,
        title:       d.name || d.title || d.slug,
        href:        hrefPrefix + d.slug + '/',
        refreshed_at: new Date().toISOString(),
      }));

    if (rows.length === 0) continue;
    await upsertBatch(rows);
    console.log(`[refresh-registry] ${entityType}: ${rows.length} rows upserted`);
    total += rows.length;
  }

  // Page-tagged collections (signature-events etc.) → emit (page, derived-slug)
  // rows that match the inline editor's client-side auto-detect convention.
  // Fixes "no matching row in pi.content_registry" rejections on pages that
  // don't have first-class CMS entityType wiring in their templates.
  for (const { folder, pathPrefix } of PAGE_COLLECTIONS) {
    const items = await loadJsonFiles(folder);
    const rows = items
      .filter((d) => d.slug)
      .map((d) => {
        const href = pathPrefix + d.slug + '/';
        return {
          entity_type: 'page',
          entity_slug: pageSlugFromPath(href),
          title:       d.name || d.title || d.slug,
          href,
          refreshed_at: new Date().toISOString(),
        };
      });
    if (rows.length === 0) continue;
    await upsertBatch(rows);
    console.log(`[refresh-registry] page (${folder}): ${rows.length} rows upserted`);
    total += rows.length;
  }

  console.log(`[refresh-registry] Done — ${total} entities refreshed in pi.content_registry`);
}

main().catch((err) => {
  console.error('[refresh-registry]', err);
  process.exit(1);
});
