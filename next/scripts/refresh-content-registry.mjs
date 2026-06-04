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
const PAGES_ROOT = resolve(__dirname, '../src/pages');

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

// Per-venue routing — venues live at /stay/, /eat/, or /wine/ depending on
// type. Mirrors next/src/lib/editorial.ts venueHrefPrefix(). Hardcoding
// '/stay/' for all venues produces 404 links for restaurants/cafes/wineries
// (the largest source of "this result isn't on the website" reports).
const STAY_TYPES = ['hotel', 'villa', 'cottage', 'glamping', 'farm-stay', 'spa'];
const WINE_TYPES = ['winery', 'producer', 'brewery', 'distillery'];
// All other venue types (restaurant, cafe, bakery, pub, market) → /eat/.

function venueHrefPrefix(type) {
  if (STAY_TYPES.includes(type)) return '/stay/';
  if (WINE_TYPES.includes(type)) return '/wine/';
  return '/eat/';
}

/** Collections to walk: collection folder → { entityType, hrefPrefix } */
const COLLECTIONS = [
  // venues get hrefPrefix=null — derived per-row via venueHrefPrefix(d.type)
  { folder: 'venues',         entityType: 'venue',         hrefPrefix: null },
  { folder: 'places',         entityType: 'place',         hrefPrefix: '/places/' },
  { folder: 'regions',        entityType: 'region',        hrefPrefix: '/explore/regions/' },
  { folder: 'articles',       entityType: 'article',       hrefPrefix: '/journal/' },
  { folder: 'events',         entityType: 'event',         hrefPrefix: '/whats-on/' },
  { folder: 'experiences',    entityType: 'experience',    hrefPrefix: '/explore/' },
  { folder: 'itineraries',    entityType: 'itinerary',     hrefPrefix: '/plans/' },
  { folder: 'tours',          entityType: 'tour',          hrefPrefix: '/tours/' },
  { folder: 'tour-operators', entityType: 'tour-operator', hrefPrefix: '/tour-operators/' },
  { folder: 'tour-packages',  entityType: 'tour-package',  hrefPrefix: '/plans/' },
  { folder: 'quick-notes',    entityType: 'quick-note',    hrefPrefix: '/quick-note/' },
  { folder: 'local-secrets',  entityType: 'local-secret',  hrefPrefix: '/journal/local-secrets/' },
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

function routeFromPageFile(file) {
  let rel = file
    .replace(PAGES_ROOT, '')
    .replace(/^[\\/]+/, '')
    .replace(/\\/g, '/')
    .replace(/\.astro$/i, '');
  if (rel === 'index') return '/';
  if (rel.endsWith('/index')) rel = rel.slice(0, -'/index'.length);
  return `/${rel}/`;
}

async function walkAstroFiles(dir = PAGES_ROOT) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkAstroFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.astro')) {
      files.push(full);
    }
  }
  return files;
}

function attrValue(tag, attrName) {
  const match = new RegExp(`${attrName}\\s*=\\s*"([^"]+)"`).exec(tag);
  return match?.[1] ?? null;
}

function titleFromHeroTag(tag, fallback) {
  const title = attrValue(tag, 'title');
  if (title) return title.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return fallback;
}

/**
 * Static Astro pages often render editable heroes via SectionHero, GuideHero,
 * or SubpageHero with entityType='page' and a literal entitySlug. These pages
 * are not content collections, so collection-only registry refreshes leave the
 * CMS integrity trigger rejecting uploads like:
 *   "CMS override for (page, eat/cafes) refused: no matching row"
 *
 * Discover those literal page identities from source so every editable static
 * page is accepted by pi.content_registry before editors try to upload.
 */
async function discoverEditableStaticPages() {
  const files = await walkAstroFiles();
  const byKey = new Map();
  const heroTag = /<(SectionHero|GuideHero|SubpageHero)\b[\s\S]*?>/g;

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (!source.includes('entitySlug=')) continue;

    for (const match of source.matchAll(heroTag)) {
      const tag = match[0];
      const entitySlug = attrValue(tag, 'entitySlug');
      if (!entitySlug) continue;
      const entityType = attrValue(tag, 'entityType') ?? 'page';
      if (entityType !== 'page') continue;

      const href = routeFromPageFile(file);
      const key = `page/${entitySlug}`;
      byKey.set(key, {
        entity_type: 'page',
        entity_slug: entitySlug,
        title: titleFromHeroTag(tag, entitySlug),
        href,
        refreshed_at: new Date().toISOString(),
      });
    }
  }

  return Array.from(byKey.values());
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
    if (file.startsWith('_')) continue;
    const isJson = file.endsWith('.json');
    const isMd = file.endsWith('.md') || file.endsWith('.mdx');
    if (!isJson && !isMd) continue;
    try {
      const raw = await readFile(join(dir, file), 'utf8');
      if (isJson) {
        rows.push(JSON.parse(raw));
      } else {
        // Astro derives slug from filename when not in frontmatter. Mirror
        // that so MD/MDX collections (articles, species, fishing-*, etc.)
        // are upserted with the same slug the renderer uses.
        const baseSlug = file.replace(/\.(md|mdx)$/i, '');
        // Extract title from frontmatter if present, else fall back to slug.
        const fmMatch = /^---\n([\s\S]*?)\n---/.exec(raw);
        let title = baseSlug;
        if (fmMatch) {
          const titleLine = /^title:\s*"?([^"\n]+)"?/m.exec(fmMatch[1]);
          if (titleLine) title = titleLine[1].trim().replace(/^"|"$/g, '');
        }
        rows.push({ slug: baseSlug, title });
      }
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
        href:        (hrefPrefix ?? venueHrefPrefix(d.type)) + d.slug + '/',
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

  const staticPageRows = await discoverEditableStaticPages();
  if (staticPageRows.length > 0) {
    await upsertBatch(staticPageRows);
    console.log(`[refresh-registry] page (static astro): ${staticPageRows.length} rows upserted`);
    total += staticPageRows.length;
  }

  console.log(`[refresh-registry] Done — ${total} entities refreshed in pi.content_registry`);
}

main().catch((err) => {
  console.error('[refresh-registry]', err);
  process.exit(1);
});
