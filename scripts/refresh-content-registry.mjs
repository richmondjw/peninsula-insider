#!/usr/bin/env node
/**
 * scripts/refresh-content-registry.mjs
 *
 * Walks the Astro content collections under next/src/content/ and writes
 * one row to pi.content_registry per content entity. Run in CI on every
 * deploy, before the Astro build step, so the database always knows the
 * exact set of valid (entity_type, entity_slug) pairs the site will
 * render.
 *
 * Without this, the CMS referential-integrity trigger on cms_image_slots
 * / cms_text_fields will refuse writes for any entity it can't see — so
 * if this script doesn't run, editors can't save new overrides.
 *
 * Requires:
 *   SUPABASE_URL              — project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service-role key (writes bypass RLS)
 *
 * Both are configured in the GitHub Actions workflow as repo secrets.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_ROOT = path.resolve(__dirname, '../next/src/content');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[content-registry] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env. Skipping refresh.');
  process.exit(0); // soft-exit so a missing key doesn't break local dev builds
}

/**
 * Mapping from on-disk collection directory to the entity_type the CMS
 * schema uses, plus the href prefix for the registry row. Add new
 * collections here when you add them to next/src/content.config.ts.
 */
const COLLECTIONS = [
  { dir: 'venues',       entityType: 'venue',         hrefPrefix: null    /* venue href varies by section; we don't store it */ },
  { dir: 'places',       entityType: 'place',         hrefPrefix: '/places/' },
  { dir: 'events',       entityType: 'event',         hrefPrefix: '/whats-on/' },
  { dir: 'experiences',  entityType: 'experience',    hrefPrefix: '/explore/' },
  { dir: 'itineraries',  entityType: 'itinerary',     hrefPrefix: '/plans/' },
  { dir: 'articles',     entityType: 'article',       hrefPrefix: null    /* article href derives from section */ },
  { dir: 'tours',        entityType: 'tour',          hrefPrefix: '/tour/' },
  { dir: 'tourOperators', entityType: 'tour-operator', hrefPrefix: '/tour/operators/' },
  { dir: 'tourPackages', entityType: 'tour-package',  hrefPrefix: '/tour-packages/' },
];

/**
 * Static page entries — landing pages and editorial chrome that live
 * outside the content collections. Keep this list in sync with the
 * pages an editor can actually open in the inline editor.
 */
const STATIC_PAGES = [
  { entitySlug: 'home',                title: 'Homepage',              href: '/' },
  { entitySlug: '_global',             title: 'Site-wide editorial',   href: null },
  { entitySlug: 'wine',                title: 'Wine landing',          href: '/wine/' },
  { entitySlug: 'eat',                 title: 'Eat landing',           href: '/eat/' },
  { entitySlug: 'stay',                title: 'Stay landing',          href: '/stay/' },
  { entitySlug: 'explore',             title: 'Explore landing',       href: '/explore/' },
  { entitySlug: 'plans',               title: 'Plans landing',         href: '/plans/' },
  { entitySlug: 'whats-on',            title: "What's On landing",     href: '/whats-on/' },
  { entitySlug: 'journal',             title: 'Journal landing',       href: '/journal/' },
  { entitySlug: 'wine-cellar-doors',   title: 'Wine cellar doors',     href: '/wine/cellar-doors/' },
];

async function collectFromDir(collection) {
  const dir = path.join(CONTENT_ROOT, collection.dir);
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn(`[content-registry] skipped ${collection.dir} (missing dir)`);
      return [];
    }
    throw err;
  }

  const rows = [];
  for (const file of entries) {
    if (!file.endsWith('.json') && !file.endsWith('.md') && !file.endsWith('.mdx')) continue;
    const slug = file.replace(/\.(json|md|mdx)$/, '');
    const full = path.join(dir, file);
    let title = null;
    try {
      const raw = await fs.readFile(full, 'utf-8');
      if (file.endsWith('.json')) {
        const parsed = JSON.parse(raw);
        title = parsed.name ?? parsed.title ?? null;
      } else {
        const m = raw.match(/^---[\s\S]*?\btitle:\s*['"]?([^'"\n]+)/);
        if (m) title = m[1].trim();
      }
    } catch { /* leave title null */ }
    rows.push({
      entity_type: collection.entityType,
      entity_slug: slug,
      title,
      href: collection.hrefPrefix ? `${collection.hrefPrefix}${slug}/` : null,
    });
  }
  return rows;
}

async function main() {
  const rows = [];
  for (const collection of COLLECTIONS) {
    const collected = await collectFromDir(collection);
    rows.push(...collected);
    console.log(`[content-registry] ${collection.entityType}: ${collected.length} entries`);
  }
  for (const page of STATIC_PAGES) {
    rows.push({ entity_type: 'page', ...page });
  }

  console.log(`[content-registry] total rows to upsert: ${rows.length}`);

  // Upsert in chunks of 500 so we stay well under PostgREST's request-size cap.
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/content_registry?on_conflict=entity_type,entity_slug`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
        'Content-Profile': 'pi',
      },
      body: JSON.stringify(slice.map((r) => ({ ...r, refreshed_at: new Date().toISOString() }))),
    });
    if (!resp.ok) {
      const body = await resp.text();
      console.error(`[content-registry] upsert chunk ${i / CHUNK} failed (${resp.status}):`, body);
      process.exit(1);
    }
  }

  // Prune rows whose entity_type/entity_slug pair was not in this run —
  // i.e., content entities deleted from the collections. We do this by
  // pulling the current refreshed_at watermark and deleting anything
  // older than 10 seconds. Safer than a full delete-then-insert.
  const watermark = new Date(Date.now() - 10_000).toISOString();
  const delResp = await fetch(`${SUPABASE_URL}/rest/v1/content_registry?refreshed_at=lt.${watermark}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Profile': 'pi',
      'Prefer': 'return=representation',
    },
  });
  if (!delResp.ok) {
    const body = await delResp.text();
    console.error(`[content-registry] prune failed (${delResp.status}):`, body);
    process.exit(1);
  }
  const deleted = await delResp.json();
  console.log(`[content-registry] pruned ${deleted.length} stale rows`);
  console.log('[content-registry] refresh complete.');
}

main().catch((err) => {
  console.error('[content-registry] fatal:', err);
  process.exit(1);
});
