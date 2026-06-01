#!/usr/bin/env node
/**
 * refresh-entity-index.mjs
 *
 * Phase B projector. Walks Astro content collections, applies the canonical
 * facet taxonomy mappings from next/src/taxonomy/facet-taxonomy.yaml, and
 * upserts:
 *
 *   pi.entity_attributes   — one row per (entity, facet, value)
 *   pi.entity_index        — one row per entity, with denormalised facets +
 *                            body text for tsvector + geography
 *
 * Sister script to refresh-content-registry.mjs. Same Supabase project
 * (PI auth, tjjhpvslpysfklwpqmgz). Same upsert pattern. Same deploy hook.
 *
 * Modes
 * -----
 *   --dry-run     (default)   Print counts + sample rows. No DB writes.
 *   --apply                   Upsert rows to Supabase.
 *   --report                  Print coverage markdown to stdout.
 *   --limit=N                 Restrict to first N entities per collection
 *                             (useful for smoke tests).
 *
 * Env
 * ---
 *   SUPABASE_SERVICE_KEY      Required when --apply. Bypasses RLS.
 *   PUBLIC_SUPABASE_URL       Override default project URL.
 *
 * Exit codes
 * ----------
 *   0  OK (dry-run or apply both succeed)
 *   1  Fatal: missing taxonomy, missing key in --apply mode, upsert failure
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve, relative, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NEXT_ROOT = resolve(__dirname, '..');
const CONTENT_ROOT = resolve(NEXT_ROOT, 'src/content');
const TAXONOMY_PATH = resolve(NEXT_ROOT, 'src/taxonomy/facet-taxonomy.yaml');

const args = process.argv.slice(2);
const opts = { apply: false, report: false, sql: false, limit: null };
for (const a of args) {
  if (a === '--apply') opts.apply = true;
  else if (a === '--report') opts.report = true;
  else if (a === '--sql') opts.sql = true;
  else if (a === '--dry-run') opts.apply = false;
  else if (a.startsWith('--limit=')) opts.limit = parseInt(a.slice('--limit='.length), 10);
}

// ─── load taxonomy ────────────────────────────────────────────────────────
let taxonomy;
try {
  taxonomy = parseYaml(await readFile(TAXONOMY_PATH, 'utf8'));
} catch (err) {
  console.error(`[FATAL] Cannot load taxonomy: ${err.message}`);
  process.exit(1);
}

// Resolve values_from references.
for (const fields of Object.values(taxonomy.mappings)) {
  for (const spec of Object.values(fields)) {
    if (spec?.values_from && !spec.values) {
      const [srcCol, ...srcField] = spec.values_from.split('.');
      const src = taxonomy.mappings?.[srcCol]?.[srcField.join('.')];
      if (src?.values) spec.values = src.values;
    }
  }
}

// ─── collections to project ──────────────────────────────────────────────
// entityType, folder, hrefPrefix mirror refresh-content-registry.mjs.
// titleField names the JSON field that holds the display title (varies
// between `name` and `title`).
// Per-venue routing — venues live at /stay/, /eat/, or /wine/ depending on
// type. Mirrors next/src/lib/editorial.ts venueHrefPrefix(). Hardcoding
// '/stay/' for all venues produces 404 links from search, planner, and
// concierge tiles for restaurants/cafes/wineries.
const STAY_TYPES = ['hotel', 'villa', 'cottage', 'glamping', 'farm-stay', 'spa'];
const WINE_TYPES = ['winery', 'producer', 'brewery', 'distillery'];

function venueHrefPrefix(type) {
  if (STAY_TYPES.includes(type)) return '/stay/';
  if (WINE_TYPES.includes(type)) return '/wine/';
  return '/eat/';
}

const COLLECTIONS = [
  // hrefPrefix=null on venues → derived per-row via venueHrefPrefix(entry.type)
  { folder: 'venues',         entityType: 'venue',         hrefPrefix: null,         titleField: 'name'  },
  { folder: 'experiences',    entityType: 'experience',    hrefPrefix: '/explore/',  titleField: 'name'  },
  { folder: 'places',         entityType: 'place',         hrefPrefix: '/places/',   titleField: 'name'  },
  { folder: 'regions',        entityType: 'region',        hrefPrefix: '/explore/regions/', titleField: 'name' },
  { folder: 'articles',       entityType: 'article',       hrefPrefix: '/journal/',  titleField: 'title' },
  { folder: 'events',         entityType: 'event',         hrefPrefix: '/whats-on/', titleField: 'title' },
  { folder: 'itineraries',    entityType: 'itinerary',     hrefPrefix: '/plans/',    titleField: 'title' },
  { folder: 'tours',          entityType: 'tour',          hrefPrefix: '/tours/',    titleField: 'name'  },
  { folder: 'tour-packages',  entityType: 'tour-package',  hrefPrefix: '/plans/',    titleField: 'name'  },
  { folder: 'quick-notes',    entityType: 'quick-note',    hrefPrefix: '/quick-note/', titleField: 'headline' },
  { folder: 'local-secrets',  entityType: 'local-secret',  hrefPrefix: '/journal/local-secrets/', titleField: 'title' },
];

// Body fields per collection — the text concatenated into entity_index.body
// for the tsvector. Always include the editorial fields; skip pure structured
// data (slugs, dates).
const BODY_FIELDS = {
  venues:        ['signature', 'editorNote', 'dogFriendlyNotes', 'hoursNote'],
  experiences:   ['editorNote'],
  places:        ['intro', 'factualLede', 'signature', 'insiderNote', 'bestDay'],
  articles:      ['dek'],
  events:        ['summary', 'description', 'editorVerdict', 'whyWeCare', 'pairingProse'],
  itineraries:   ['dek', 'editorNote', 'editorialFrame', 'skipThese'],
  tours:         ['intro', 'whatHappens', 'whoSuits', 'whoDoesnt', 'bookingIntelligence'],
  'tour-packages': ['intro', 'whyThisCombination', 'bookingSequence'],
  'quick-notes': ['dek', 'verdict'],
  'local-secrets': ['editorNote'],
};

// ─── helpers ─────────────────────────────────────────────────────────────
function getField(entry, path) {
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), entry);
}

function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) return null;
  const end = raw.indexOf('\n---', 3);
  if (end < 0) return null;
  try {
    return parseYaml(raw.slice(3, end), { logLevel: 'silent', strict: false });
  } catch { return null; }
}

async function readEntry(filePath) {
  const raw = await readFile(filePath, 'utf8');
  const ext = extname(filePath);
  if (ext === '.json') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return parseFrontmatter(raw);
}

async function* walkFolder(folder) {
  const dir = join(CONTENT_ROOT, folder);
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch { return; }
  for (const ent of entries) {
    if (ent.name.startsWith('_')) continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      for await (const f of walkFolder(join(folder, ent.name))) yield f;
    } else if (['.json', '.md', '.mdx'].includes(extname(ent.name))) {
      yield p;
    }
  }
}

// Project facets for one entity using taxonomy mappings.
// Returns { facets: { facet_key: Set<value> }, attributes: [{facet_key, facet_value, source}] }
function projectFacets(entry, collection) {
  const fieldsSpec = taxonomy.mappings[collection];
  const facets = {};
  const attributes = [];
  if (!fieldsSpec) return { facets, attributes };
  for (const [fieldPath, spec] of Object.entries(fieldsSpec)) {
    if (spec?.free_text) continue;
    const raw = getField(entry, fieldPath);
    if (raw == null) continue;
    const values = Array.isArray(raw) ? raw : [raw];
    for (const v of values) {
      const key = String(v);
      const mapped = spec?.values?.[key];
      if (!mapped || mapped === 'drop') continue;
      const list = Array.isArray(mapped) ? mapped : [mapped];
      for (const m of list) {
        if (!facets[spec.facet]) facets[spec.facet] = new Set();
        if (facets[spec.facet].has(m)) continue;
        facets[spec.facet].add(m);
        attributes.push({
          facet_key:   spec.facet,
          facet_value: m,
          source:      'projector',
        });
      }
    }
  }
  return { facets, attributes };
}

// Build entity_index row from entry.
function buildIndexRow({ entry, entityType, folder, hrefPrefix, titleField, facets }) {
  const slug = entry.slug || entry.eventId || null;
  if (!slug) return null;
  const title = entry[titleField] || entry.title || entry.name || slug;
  const dek = entry.dek || entry.summary || entry.editorNote || null;
  const bodyParts = (BODY_FIELDS[folder] || [])
    .map((f) => entry[f])
    .filter((v) => typeof v === 'string' && v.length > 0);
  const body = bodyParts.join('\n\n') || null;
  const zone = entry.zone || null;
  const placeSlug = typeof entry.place === 'string' ? entry.place : entry.place?.id || null;
  const coords = entry.coordinates && typeof entry.coordinates === 'object'
    ? `SRID=4326;POINT(${entry.coordinates.lng} ${entry.coordinates.lat})`
    : null;
  const startsAt = entry.startDate || entry.publishedAt || null;
  const endsAt = entry.endDate || entry.expiresAt || null;
  // Collapse facets Sets → JSON-safe arrays.
  const facetsObj = {};
  for (const [k, set] of Object.entries(facets)) facetsObj[k] = [...set].sort();
  return {
    entity_type:  entityType,
    entity_slug:  slug,
    title,
    dek,
    body,
    facets:       facetsObj,
    zone,
    place_slug:   placeSlug,
    coordinates: coords,
    starts_at:    startsAt ? new Date(startsAt).toISOString() : null,
    ends_at:      endsAt ? new Date(endsAt).toISOString() : null,
    href:         (hrefPrefix ?? venueHrefPrefix(entry.type)) + slug + '/',
    hero_image:   entry.heroImage || null,
    taxonomy_version: String(taxonomy.version || '0'),
    refreshed_at: new Date().toISOString(),
  };
}

// ─── projection pass ─────────────────────────────────────────────────────
const indexRows = [];
const attributeRows = [];
const collectionStats = {};

for (const col of COLLECTIONS) {
  let count = 0;
  for await (const filePath of walkFolder(col.folder)) {
    if (opts.limit && count >= opts.limit) break;
    const entry = await readEntry(filePath);
    if (!entry) continue;
    // Astro derives slug from filename when not present in frontmatter.
    // Mirror that here so MD/MDX collections (articles, quick-notes,
    // species, fishing-*, local-secrets) project correctly.
    const slug = entry.slug || filePath.split(/[\\/]/).pop().replace(/\.(json|md|mdx)$/i, '');
    if (!slug) continue;
    entry.slug = slug;
    const { facets, attributes } = projectFacets(entry, col.folder);
    // Auto-emit `zone` facet from entry.zone (universal field on most
    // entities, not captured by per-collection enum mappings).
    if (entry.zone && taxonomy.facets.zone?.values?.[entry.zone]) {
      facets.zone = new Set([entry.zone]);
      attributes.push({ facet_key: 'zone', facet_value: entry.zone, source: 'editor' });
    }
    const indexRow = buildIndexRow({ entry, entityType: col.entityType, folder: col.folder, hrefPrefix: col.hrefPrefix, titleField: col.titleField, facets });
    if (!indexRow) continue;
    indexRows.push(indexRow);
    for (const a of attributes) {
      attributeRows.push({
        entity_type:  col.entityType,
        entity_slug:  slug,
        facet_key:    a.facet_key,
        facet_value:  a.facet_value,
        source:       a.source,
        refreshed_at: new Date().toISOString(),
      });
    }
    count++;
  }
  collectionStats[col.entityType] = count;
}

// ─── coverage report ─────────────────────────────────────────────────────
function buildCoverageReport() {
  // Coverage per (entity_type, facet_key) → count + total
  const totals = {};
  for (const r of indexRows) {
    totals[r.entity_type] = (totals[r.entity_type] || 0) + 1;
  }
  const cov = {};
  for (const a of attributeRows) {
    const k = `${a.entity_type}|${a.facet_key}`;
    if (!cov[k]) cov[k] = new Set();
    cov[k].add(a.entity_slug);
  }
  const facetOrder = Object.keys(taxonomy.facets);
  const rows = [];
  for (const [entityType, total] of Object.entries(totals)) {
    for (const facet of facetOrder) {
      const count = cov[`${entityType}|${facet}`]?.size || 0;
      const pct = total ? Math.round((count / total) * 100) : 0;
      if (count > 0 || (taxonomy.facets[facet]?.applies_to || []).includes(entityType)) {
        rows.push({ entityType, facet, count, total, pct });
      }
    }
  }
  return rows;
}

// ─── output ──────────────────────────────────────────────────────────────
// ─── SQL emit mode ───────────────────────────────────────────────────────
// Emits the entire projection as batched INSERT ... ON CONFLICT DO UPDATE
// statements suitable for piping through Supabase MCP execute_sql when a
// service key isn't available. Batches of 50 rows so each statement fits
// well under MCP's payload ceiling.
function sqlQuote(v) {
  if (v == null) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v instanceof Date) return `'${v.toISOString()}'::timestamptz`;
  if (typeof v === 'object') return `'${JSON.stringify(v).replaceAll("'", "''")}'::jsonb`;
  return `'${String(v).replaceAll("'", "''")}'`;
}

if (opts.sql) {
  process.stdout.write('-- pi.entity_index rows\n');
  const cols = ['entity_type','entity_slug','title','dek','body','facets','zone','place_slug','coordinates','starts_at','ends_at','href','hero_image','taxonomy_version','refreshed_at'];
  const BATCH = 50;
  for (let i = 0; i < indexRows.length; i += BATCH) {
    const batch = indexRows.slice(i, i + BATCH);
    const values = batch.map((r) => {
      const c = r.coordinates ? `'${r.coordinates}'::geography` : 'null';
      return `(${[
        sqlQuote(r.entity_type), sqlQuote(r.entity_slug), sqlQuote(r.title),
        sqlQuote(r.dek), sqlQuote(r.body), sqlQuote(r.facets), sqlQuote(r.zone),
        sqlQuote(r.place_slug), c,
        r.starts_at ? `'${r.starts_at}'::timestamptz` : 'null',
        r.ends_at ? `'${r.ends_at}'::timestamptz` : 'null',
        sqlQuote(r.href), sqlQuote(r.hero_image),
        sqlQuote(r.taxonomy_version), sqlQuote(r.refreshed_at),
      ].join(', ')})`;
    }).join(',\n');
    const updates = cols.filter((c) => c !== 'entity_type' && c !== 'entity_slug')
      .map((c) => `${c} = excluded.${c}`).join(', ');
    process.stdout.write(
      `insert into pi.entity_index (${cols.join(', ')}) values\n${values}\n` +
      `on conflict (entity_type, entity_slug) do update set ${updates};\n\n`
    );
  }
  process.stdout.write('-- pi.entity_attributes rows\n');
  const acols = ['entity_type','entity_slug','facet_key','facet_value','source','refreshed_at'];
  for (let i = 0; i < attributeRows.length; i += BATCH) {
    const batch = attributeRows.slice(i, i + BATCH);
    const values = batch.map((r) => `(${[
      sqlQuote(r.entity_type), sqlQuote(r.entity_slug),
      sqlQuote(r.facet_key), sqlQuote(r.facet_value),
      sqlQuote(r.source), sqlQuote(r.refreshed_at),
    ].join(', ')})`).join(',\n');
    process.stdout.write(
      `insert into pi.entity_attributes (${acols.join(', ')}) values\n${values}\n` +
      `on conflict (entity_type, entity_slug, facet_key, facet_value) do update set source = excluded.source, refreshed_at = excluded.refreshed_at;\n\n`
    );
  }
  process.exit(0);
}

if (opts.report) {
  const rows = buildCoverageReport();
  process.stdout.write(`# Entity-attribute coverage\n\n`);
  process.stdout.write(`Generated ${new Date().toISOString()} from taxonomy v${taxonomy.version}.\n\n`);
  process.stdout.write(`| Entity type | Facet | Coverage | % |\n|---|---|---|---|\n`);
  for (const r of rows) {
    const bar = r.pct >= 80 ? '🟢' : r.pct >= 40 ? '🟡' : r.pct === 0 ? '⚪' : '🔴';
    process.stdout.write(`| ${r.entityType} | ${r.facet} | ${r.count} / ${r.total} | ${bar} ${r.pct}% |\n`);
  }
  process.stdout.write(`\n_Generated by next/scripts/refresh-entity-index.mjs --report_\n`);
  process.exit(0);
}

console.log(`[entity-index] taxonomy v${taxonomy.version}`);
console.log(`[entity-index] entities projected: ${indexRows.length}`);
console.log(`[entity-index] attribute rows:     ${attributeRows.length}`);
console.log(`[entity-index] per-collection counts:`);
for (const [t, n] of Object.entries(collectionStats)) console.log(`               ${t}: ${n}`);

if (!opts.apply) {
  console.log(`\n[entity-index] DRY RUN. No DB writes. Run with --apply to upsert to Supabase.`);
  // Sample one row to make the projection visible.
  if (indexRows.length > 0) {
    console.log(`\n[entity-index] Sample index row:`);
    console.log(JSON.stringify(indexRows[0], null, 2));
  }
  process.exit(0);
}

// ─── apply pass ──────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || 'https://tjjhpvslpysfklwpqmgz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_KEY) {
  console.error('[FATAL] --apply requires SUPABASE_SERVICE_KEY');
  process.exit(1);
}

async function upsert(table, rows, conflictKeys) {
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflictKeys}`, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'apikey':          SUPABASE_KEY,
        'Authorization':   `Bearer ${SUPABASE_KEY}`,
        'Prefer':          'resolution=merge-duplicates',
        'Accept-Profile':  'pi',
        'Content-Profile': 'pi',
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upsert ${table} (${res.status}): ${text}`);
    }
    console.log(`[entity-index] upserted ${batch.length} rows into pi.${table} (batch ${i / batchSize + 1})`);
  }
}

try {
  await upsert('entity_index', indexRows, 'entity_type,entity_slug');
  await upsert('entity_attributes', attributeRows, 'entity_type,entity_slug,facet_key,facet_value');
  console.log(`[entity-index] apply complete.`);
} catch (err) {
  console.error(`[FATAL] ${err.message}`);
  process.exit(1);
}
