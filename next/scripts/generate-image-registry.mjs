#!/usr/bin/env node
/**
 * Generate the canonical image registry used by search, cards, metadata, and
 * entity_index projection.
 *
 * This is a migration bridge, not a blank reset: it derives the registry from
 * the already-populated content heroImage fields plus baked CMS image
 * overrides, then classifies duplicates and fallback quality so editorial work
 * already done is preserved.
 */

import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NEXT_ROOT = resolve(__dirname, '..');
const CONTENT_ROOT = resolve(NEXT_ROOT, 'src/content');
const OUT_PATH = resolve(NEXT_ROOT, 'src/data/image-registry.json');
const BAKED_OVERRIDES_PATH = resolve(NEXT_ROOT, 'src/data/cms-image-overrides.json');
const SITE_IMAGE_ROOT = '/images/sourced/';

const COLLECTIONS = [
  { folder: 'venues', entityType: 'venue', titleField: 'name', heroField: 'heroImage' },
  { folder: 'experiences', entityType: 'experience', titleField: 'name', heroField: 'heroImage' },
  { folder: 'places', entityType: 'place', titleField: 'name', heroField: 'heroImage' },
  { folder: 'regions', entityType: 'region', titleField: 'name', heroField: 'heroImage' },
  { folder: 'articles', entityType: 'article', titleField: 'title', heroField: 'hero' },
  { folder: 'events', entityType: 'event', titleField: 'title', heroField: 'heroImage' },
  { folder: 'itineraries', entityType: 'itinerary', titleField: 'title', heroField: 'heroImage' },
  { folder: 'tours', entityType: 'tour', titleField: 'name', heroField: 'heroImage' },
  { folder: 'tour-packages', entityType: 'tour-package', titleField: 'name', heroField: 'heroImage' },
  { folder: 'tour-operators', entityType: 'tour-operator', titleField: 'name', heroField: 'heroImage' },
  { folder: 'quick-notes', entityType: 'quick-note', titleField: 'headline', heroField: 'heroImage' },
  { folder: 'local-secrets', entityType: 'local-secret', titleField: 'title', heroField: 'heroImage' },
];

const placesWithHero = new Set([
  'balnarring', 'cape-schanck', 'dromana', 'flinders', 'main-ridge',
  'merricks', 'moorooduc', 'mornington', 'mount-martha', 'point-nepean',
  'portsea', 'red-hill', 'rosebud', 'rye', 'safety-beach', 'sorrento',
]);

const categoryVariantsByType = {
  pub: [
    'explore-mornington-foreshore-01.webp', 'explore-portsea-front-beach-01.webp',
    'explore-sorrento-ocean-baths-01.webp', 'explore-rye-ocean-beach-01.webp',
    'explore-dromana-beach-01.webp', 'explore-balnarring-beach-01.webp',
    'explore-mount-martha-beach-01.webp', 'explore-gunnamatta-01.webp',
    'explore-cape-schanck-lighthouse-01.webp',
    'category-pub-01.webp', 'category-pub-02.webp', 'category-pub-03.webp',
  ],
  cafe: [
    'journal-late-afternoon-walks-01.webp', 'article-dog-friendly-01.webp',
    'article-kids-peninsula-01.webp', 'article-peninsula-pantry-01.webp',
    'explore-mornington-foreshore-01.webp', 'explore-farnsworth-track-01.webp',
    'explore-balnarring-beach-01.webp', 'explore-two-bays-walk-01.webp',
    'category-cafe-01.webp', 'category-cafe-02.webp',
    'category-cafe-03.webp', 'category-cafe-04.webp',
  ],
  bakery: [
    'article-red-hill-saturday-01.webp', 'article-peninsula-pantry-01.webp',
    'article-picnic-01.webp', 'journal-late-afternoon-walks-01.webp',
    'category-bakery-01.webp', 'category-bakery-02.webp',
  ],
  brewery: [
    'article-beach-swimming-01.webp', 'article-long-lunch-01.webp',
    'explore-arthurs-seat-lookout-01.webp', 'explore-cape-schanck-boardwalk-01.webp',
    'explore-two-bays-walk-01.webp', 'explore-gunnamatta-01.webp',
    'category-brewery-01.webp', 'category-brewery-02.webp',
  ],
  distillery: [
    'article-cellar-door-01.webp', 'article-chardonnay-case-01.webp',
    'explore-mornington-foreshore-01.webp',
    'category-brewery-01.webp', 'category-brewery-02.webp',
  ],
  market: [
    'article-picnic-01.webp', 'article-red-hill-saturday-01.webp',
    'article-peninsula-pantry-01.webp', 'explore-mprg-01.webp',
    'category-market-01.webp', 'category-market-02.webp',
  ],
  producer: [
    'article-seafood-01.webp', 'article-peninsula-pantry-01.webp',
    'article-picnic-01.webp', 'article-producer-trail-01.webp',
    'explore-two-bays-walk-01.webp', 'explore-farnsworth-track-01.webp',
    'category-producer-01.webp', 'category-producer-02.webp',
    'category-producer-03.webp', 'category-producer-04.webp',
  ],
  restaurant: [
    'place-mornington-01.webp', 'place-red-hill-01.webp', 'place-merricks-01.webp',
    'place-sorrento-01.webp', 'place-flinders-01.webp', 'place-dromana-01.webp',
    'place-cape-schanck-01.webp', 'place-rosebud-01.webp', 'place-safety-beach-01.webp',
    'place-rye-01.webp', 'place-mount-martha-01.webp', 'place-moorooduc-01.webp',
    'place-balnarring-01.webp', 'place-main-ridge-01.webp', 'place-portsea-01.webp',
    'article-long-lunch-01.webp', 'article-hatted-restaurants-01.webp',
    'article-italian-dinners-01.webp', 'article-sunset-01.webp',
    'article-couples-weekend-01.webp', 'article-vineyard-villa-01.webp',
    'venue-italian-dining-01.webp',
    'category-restaurant-01.webp', 'category-restaurant-02.webp',
    'category-restaurant-03.webp', 'category-restaurant-04.webp',
    'category-restaurant-06.webp',
  ],
  winery: [
    'place-red-hill-01.webp', 'place-merricks-01.webp', 'place-main-ridge-01.webp',
    'place-mornington-01.webp', 'place-dromana-01.webp', 'place-balnarring-01.webp',
    'place-moorooduc-01.webp', 'place-flinders-01.webp',
    'article-cellar-door-01.webp', 'article-vineyard-villa-01.webp',
    'article-chardonnay-case-01.webp', 'article-sunset-01.webp',
    'category-winery-01.webp', 'category-winery-02.webp', 'category-winery-03.webp',
    'category-winery-04.webp', 'category-winery-06.webp', 'category-winery-08.webp',
  ],
  hotel: [
    'article-sorrento-weekend-01.webp', 'article-couples-weekend-01.webp',
    'place-sorrento-01.webp', 'place-portsea-01.webp', 'place-flinders-01.webp',
  ],
  cottage: [
    'article-vineyard-villa-01.webp', 'article-couples-weekend-01.webp',
    'article-sunset-01.webp', 'journal-late-afternoon-walks-01.webp',
    'explore-greens-bush-01.webp', 'explore-farnsworth-track-01.webp',
  ],
  villa: [
    'article-vineyard-villa-01.webp', 'article-couples-weekend-01.webp',
    'article-sunset-01.webp', 'journal-late-afternoon-walks-01.webp',
    'explore-greens-bush-01.webp', 'explore-sorrento-ocean-baths-01.webp',
  ],
  glamping: [
    'explore-greens-bush-01.webp', 'explore-farnsworth-track-01.webp',
    'explore-two-bays-walk-01.webp',
  ],
  'farm-stay': [
    'article-vineyard-villa-01.webp', 'article-picnic-01.webp', 'explore-greens-bush-01.webp',
  ],
  spa: [
    'spa-treatment-room-rose-01.webp', 'spa-wellness-stones-01.webp',
    'spa-peninsula-hot-springs-hilltop-01.webp',
  ],
};

const BLOCKED_IMAGES = new Set([
  'category-cottage-01.webp',
  'category-hotel-02.webp',
  'category-glamping-01.webp',
  'spa-coastal-pool-01.webp',
]);

const CATEGORY_FALLBACK_RE = /\/category-[a-z-]+-\d+\.[a-z]+$/;
const GENERIC_LOCATION_RE = /\/(?:place|explore)-[a-z-]+-\d+\.[a-z]+$/;
const PLACE_FALLBACK_RE = /\/place-[a-z-]+-\d+\.[a-z]+$/;
const EXPLORE_FALLBACK_RE = /\/explore-[a-z-]+-\d+\.[a-z]+$/;

function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) return null;
  const end = raw.indexOf('\n---', 3);
  if (end < 0) return null;
  try {
    return parseYaml(raw.slice(3, end), { logLevel: 'silent', strict: false });
  } catch {
    return null;
  }
}

async function readEntry(filePath) {
  const raw = await readFile(filePath, 'utf8');
  if (extname(filePath) === '.json') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return parseFrontmatter(raw);
}

async function* walkFolder(folder) {
  const dir = join(CONTENT_ROOT, folder);
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
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

async function loadBakedOverrides() {
  try {
    const raw = await readFile(BAKED_OVERRIDES_PATH, 'utf8');
    return JSON.parse(raw).images ?? {};
  } catch {
    return {};
  }
}

function hashSlug(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function normalizeSrc(src) {
  if (!src) return '';
  return String(src).trim();
}

function filename(src) {
  return normalizeSrc(src).split('/').pop() ?? '';
}

function imageKind(src) {
  const value = normalizeSrc(src);
  const name = filename(value);
  if (!value) return 'missing';
  if (value.includes('placeholder')) return 'placeholder';
  if (value.includes('home-cover')) return 'site-fallback';
  if (BLOCKED_IMAGES.has(name)) return 'blocked';
  if (CATEGORY_FALLBACK_RE.test(value)) return 'category-fallback';
  if (PLACE_FALLBACK_RE.test(value)) return 'place-fallback';
  if (EXPLORE_FALLBACK_RE.test(value)) return 'explore-fallback';
  return 'own-photo';
}

function isUsableFrontmatterHero(src) {
  const kind = imageKind(src);
  return !['missing', 'placeholder', 'category-fallback', 'blocked'].includes(kind);
}

function hasOwnPhoto(src) {
  return imageKind(src) === 'own-photo';
}

function fallbackSrc(entry) {
  const type = String(entry?.type ?? '');
  const place = String(entry?.place?.id ?? entry?.place ?? '');
  const slug = String(entry?.slug ?? entry?.id ?? entry?.name ?? entry?.title ?? '');
  const candidates = [];
  if (place && placesWithHero.has(place)) candidates.push(`place-${place}-01.webp`);
  candidates.push(...(categoryVariantsByType[type] ?? []));
  if (candidates.length === 0) return `${SITE_IMAGE_ROOT}home-cover.webp`;
  return `${SITE_IMAGE_ROOT}${candidates[hashSlug(slug || place || type) % candidates.length]}`;
}

function pickOverride(slots, preferredField) {
  const candidates = [preferredField, 'hero', 'heroImage'];
  for (const fieldPath of candidates) {
    const row = slots?.[fieldPath];
    const src = normalizeSrc(row?.src ?? row?.storagePath);
    if (!src) continue;
    return {
      fieldPath,
      image: {
        src,
        alt: row?.alt ?? null,
        caption: row?.caption ?? null,
        credit: row?.credit ?? null,
        storagePath: row?.storagePath ?? null,
      },
    };
  }
  return null;
}

async function buildEntryRecord({ entry, entityType, slug, title, preferredField, bakedSlots }) {
  const override = pickOverride(bakedSlots, preferredField);
  const frontmatter = entry.heroImage ?? null;
  const frontmatterSrc = normalizeSrc(frontmatter?.src);
  const frontmatterExists = await localImageExists(frontmatterSrc);
  const overrideExists = await localImageExists(override?.image.src);
  const pickedSrc = override?.image.src
    && overrideExists
    ? override.image.src
    : (isUsableFrontmatterHero(frontmatterSrc) && frontmatterExists ? frontmatterSrc : fallbackSrc(entry));
  const source = override && overrideExists
    ? 'cms-override'
    : isUsableFrontmatterHero(frontmatterSrc) && frontmatterExists
      ? 'frontmatter'
      : 'derived-fallback';
  const kind = imageKind(pickedSrc);
  return {
    entityType,
    slug,
    title,
    canonicalHero: {
      src: pickedSrc,
      alt: override?.image.alt ?? frontmatter?.alt ?? title ?? '',
      credit: override?.image.credit ?? frontmatter?.credit ?? null,
      license: frontmatter?.license ?? null,
      fieldPath: override?.fieldPath ?? preferredField,
      source,
      kind,
      hasOwnPhoto: override ? true : hasOwnPhoto(pickedSrc),
    },
    originalHero: frontmatter ? {
      src: frontmatterSrc || null,
      alt: frontmatter.alt ?? null,
      credit: frontmatter.credit ?? null,
      license: frontmatter.license ?? null,
      kind: imageKind(frontmatterSrc),
    } : null,
    override: override ? { ...override.image, missingLocalFile: !overrideExists } : null,
  };
}

async function localImageExists(src) {
  const value = normalizeSrc(src);
  if (!value.startsWith('/')) return true;
  const publicPath = resolve(NEXT_ROOT, 'public', value.replace(/^\//, ''));
  try {
    const s = await stat(publicPath);
    return s.isFile();
  } catch {
    return false;
  }
}

const bakedOverrides = await loadBakedOverrides();
const entities = {};
const byImage = new Map();
let missingOriginal = 0;
let placeholderOriginal = 0;
let derivedFallback = 0;
let missingLocalFile = 0;

for (const col of COLLECTIONS) {
  for await (const filePath of walkFolder(col.folder)) {
    const entry = await readEntry(filePath);
    if (!entry) continue;
    const slug = entry.slug || entry.eventId || filePath.split(/[\\/]/).pop().replace(/\.(json|md|mdx)$/i, '');
    if (!slug) continue;
    entry.slug = slug;
    const key = `${col.entityType}/${slug}`;
    const title = entry[col.titleField] || entry.title || entry.name || entry.headline || slug;
    const record = await buildEntryRecord({
      entry,
      entityType: col.entityType,
      slug,
      title,
      preferredField: col.heroField,
      bakedSlots: bakedOverrides[key],
    });
    if (!record.originalHero?.src) missingOriginal++;
    if (record.originalHero?.kind === 'placeholder') placeholderOriginal++;
    if (record.canonicalHero.source === 'derived-fallback') derivedFallback++;
    if (!(await localImageExists(record.canonicalHero.src))) {
      record.canonicalHero.missingLocalFile = true;
      missingLocalFile++;
    }
    entities[key] = record;
    const src = record.canonicalHero.src;
    if (!byImage.has(src)) byImage.set(src, []);
    byImage.get(src).push(key);
  }
}

const duplicateGroups = [...byImage.entries()]
  .filter(([, keys]) => keys.length > 1)
  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
  .map(([src, keys]) => ({ src, count: keys.length, entities: keys }));

for (const group of duplicateGroups) {
  for (const key of group.entities) {
    entities[key].canonicalHero.duplicateGroup = group.src;
    entities[key].canonicalHero.duplicateCount = group.count;
  }
}

const registry = {
  generatedAt: new Date().toISOString(),
  version: 1,
  source: 'derived-from-content-and-baked-cms-overrides',
  stats: {
    entities: Object.keys(entities).length,
    uniqueCanonicalImages: byImage.size,
    duplicateImageValues: duplicateGroups.length,
    missingOriginal,
    placeholderOriginal,
    derivedFallback,
    missingLocalFile,
  },
  duplicateGroups,
  entities,
};

await writeFile(OUT_PATH, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`[image-registry] wrote ${Object.keys(entities).length} entities to ${OUT_PATH}`);
console.log(`[image-registry] duplicate image values: ${duplicateGroups.length}`);
console.log(`[image-registry] derived fallbacks: ${derivedFallback}`);
if (missingLocalFile > 0) console.log(`[image-registry] missing local files: ${missingLocalFile}`);
