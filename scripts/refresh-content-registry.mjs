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
const PAGES_ROOT   = path.resolve(__dirname, '../next/src/pages');
// In CI, the deploy workflow rsyncs `next/dist/*` to the repo root before
// committing. So the built site lives at the repo root (each URL is an
// `index.html` at that path). We walk it AFTER the build to capture every
// URL the site actually emits, including dynamic-route templates like
// `places/[slug]/`. Fall back to next/dist for local runs (script invoked
// directly without the dist-to-root sync step).
const REPO_ROOT    = path.resolve(__dirname, '..');
const DIST_FALLBACK = path.resolve(__dirname, '../next/dist');

/**
 * Slugify an Astro page path the same way the inline-edit client's
 * currentPageSlug() does, so registry rows match the slug the client will
 * use when right-clicking an untagged image. Must stay in sync with
 * `currentPageSlug()` in `next/src/lib/inline-edit/client.ts`.
 *
 *   '/'                                 → 'home'
 *   '/journal/mornington-peninsula-…/'  → 'journal-mornington-peninsula-…'
 *   '/eat/best-restaurants/'            → 'eat-best-restaurants'
 */
function pageSlugFromRelPath(rel) {
  const noExt = rel.replace(/\.astro$/, '').replace(/\\/g, '/');
  if (noExt === 'index') return 'home';
  // Strip trailing /index — `pages/eat/index.astro` → 'eat'
  const stripped = noExt.replace(/\/index$/, '');
  return stripped.toLowerCase().replace(/[^a-z0-9/_-]/g, '-').replace(/\//g, '-');
}

// Subdirectories under pages/ that we deliberately do NOT register —
// admin chrome, account-only surfaces, error pages. Anything else under
// pages/ that emits a real URL gets registered as ('page', slug).
const PAGE_SKIP_DIRS = new Set(['admin', 'account']);
const PAGE_SKIP_FILES = new Set(['404.astro']);

// Top-level directories at the repo root that should NEVER be treated as
// site URLs when walking the built dist. Add to this list whenever a new
// top-level non-site folder is introduced (mirrors the deploy.yml
// preserve-allowlist plus the standard repo chrome).
const DIST_SKIP_TOP_LEVEL = new Set([
  '.git', '.github', '.claude', '.approvals', 'next', 'node_modules',
  'docs', 'ops', 'scripts', 'reports', '_astro', 'pagefind',
  'v2-staging', // staging pages get registered separately if needed
  'images', 'assets', 'fonts', 'icons', 'downloads',
]);

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

/**
 * Walk `next/src/pages/` and yield every standalone .astro page (not the
 * `[slug].astro` dynamic-route templates, not index pages). Each becomes
 * one `(page, slugified-url)` row so that right-clicking any image on
 * those pages succeeds — the trigger needs a matching registry row even
 * when the editor uses the URL-path fallback.
 */
async function collectStandalonePages() {
  const rows = [];
  async function walk(dir, rel = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (PAGE_SKIP_DIRS.has(e.name)) continue;
        await walk(full, r);
      } else if (e.isFile() && e.name.endsWith('.astro')) {
        // Skip dynamic-route templates and 404. Index files are handled
        // via the STATIC_PAGES list (section landings) so we don't
        // double-register them.
        if (e.name.startsWith('[') || e.name === 'index.astro') continue;
        if (PAGE_SKIP_FILES.has(e.name)) continue;
        const slug = pageSlugFromRelPath(r);
        rows.push({ entity_type: 'page', entity_slug: slug, title: null, href: null });
      }
    }
  }
  try {
    await walk(PAGES_ROOT);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn('[content-registry] skipped pages/ (missing)');
      return [];
    }
    throw err;
  }
  return rows;
}

/**
 * Walk the built site (repo root after dist sync, or next/dist locally)
 * and emit one row per real URL. This is the definitive set — captures
 * every dynamic-route template (places/[slug], eat/[slug], etc.) that the
 * source-only enumeration misses. URLs that already have an entity row
 * elsewhere will dedupe via `on conflict do nothing`.
 */
async function collectBuiltUrlPages() {
  // Try repo-root first (CI), fall back to next/dist (local).
  let walkRoot = REPO_ROOT;
  try {
    await fs.access(path.join(REPO_ROOT, 'index.html'));
  } catch {
    try {
      await fs.access(path.join(DIST_FALLBACK, 'index.html'));
      walkRoot = DIST_FALLBACK;
    } catch {
      console.warn('[content-registry] skipped built-site walk (no index.html at repo root or next/dist)');
      return [];
    }
  }

  const rows = [];
  async function walk(dir, rel = '') {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (rel === '' && DIST_SKIP_TOP_LEVEL.has(e.name)) continue;
        if (e.name.startsWith('.')) continue;
        await walk(full, r);
      } else if (e.isFile() && e.name === 'index.html') {
        // Convert `rel` (which excludes the trailing 'index.html') into a
        // page slug matching currentPageSlug(). 'index.html' alone → home.
        const urlPath = rel; // '' means root
        if (urlPath === '') {
          rows.push({ entity_type: 'page', entity_slug: 'home', title: null, href: '/' });
        } else {
          const slug = urlPath.toLowerCase().replace(/[^a-z0-9/_-]/g, '-').replace(/\//g, '-');
          rows.push({ entity_type: 'page', entity_slug: slug, title: null, href: `/${urlPath}/` });
        }
      }
    }
  }
  await walk(walkRoot);
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
  const standalonePages = await collectStandalonePages();
  rows.push(...standalonePages);
  console.log(`[content-registry] page (standalone .astro): ${standalonePages.length} entries`);

  // Walk the built site to also register dynamic-route URLs
  // (places/[slug], eat/[slug], etc.) that source-only enumeration misses.
  const builtUrlPages = await collectBuiltUrlPages();
  // Dedupe against rows we've already added — built-site walk may overlap
  // with the standalone-page and STATIC_PAGES sets.
  const seen = new Set(rows.map((r) => `${r.entity_type}/${r.entity_slug}`));
  let builtAdded = 0;
  for (const r of builtUrlPages) {
    const key = `${r.entity_type}/${r.entity_slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(r);
    builtAdded++;
  }
  console.log(`[content-registry] page (built-site URLs): ${builtUrlPages.length} found, ${builtAdded} new`);

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
