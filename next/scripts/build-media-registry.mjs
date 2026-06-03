#!/usr/bin/env node
/**
 * Build the static half of the PI media registry.
 *
 * This is intentionally filesystem-derived: it inventories public/images/*
 * and records where those image paths are referenced in source/content. Live
 * CMS uploads and slot metadata are joined in the browser from cms_image_slots.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicImages = path.join(root, 'public', 'images');
const outputPath = path.join(root, 'public', 'admin', 'media-registry.json');
const usageRoots = [
  path.join(root, 'src', 'content'),
  path.join(root, 'src', 'pages'),
  path.join(root, 'src', 'components'),
  path.join(root, 'src', 'data'),
];
const imageExts = new Set(['.avif', '.gif', '.jpg', '.jpeg', '.png', '.svg', '.webp']);
const scanExts = new Set(['.astro', '.css', '.json', '.md', '.mdx', '.ts', '.tsx']);

async function walk(dir, predicate, out = []) {
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, predicate, out);
    else if (!predicate || predicate(full)) out.push(full);
  }
  return out;
}

function publicSrc(filePath) {
  return `/${path.relative(path.join(root, 'public'), filePath).replace(/\\/g, '/')}`;
}

function rel(filePath) {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

function guessEntityFromFile(filePath, text) {
  const r = rel(filePath);
  const slugMatch = text.match(/\bslug:\s*['"]?([a-z0-9][a-z0-9-]*)['"]?/i);
  const slug = slugMatch?.[1] || path.basename(filePath).replace(/\.(json|md|mdx|astro)$/i, '');
  if (r.includes('/content/venues/')) return { entityType: 'venue', entitySlug: slug };
  if (r.includes('/content/events/')) return { entityType: 'event', entitySlug: slug };
  if (r.includes('/content/signature-events/')) return { entityType: 'event', entitySlug: slug };
  if (r.includes('/content/experiences/')) return { entityType: 'experience', entitySlug: slug };
  if (r.includes('/content/places/')) return { entityType: 'place', entitySlug: slug };
  if (r.includes('/content/regions/')) return { entityType: 'region', entitySlug: slug };
  if (r.includes('/content/articles/')) return { entityType: 'article', entitySlug: slug };
  if (r.includes('/content/itineraries/')) return { entityType: 'itinerary', entitySlug: slug };
  if (r.includes('/content/tour-operators/') || r.includes('/content/tour-packages/') || r.includes('/content/tours/')) {
    return { entityType: 'tour', entitySlug: slug };
  }
  if (r.includes('/content/boat-hire/') || r.includes('/content/boat-ramps/')) return { entityType: 'boating', entitySlug: slug };
  if (r.includes('/content/fishing-charters/') || r.includes('/content/fishing-locations/')) return { entityType: 'fishing', entitySlug: slug };
  if (r.includes('/pages/journal/')) return { entityType: 'article', entitySlug: slug };
  return { entityType: null, entitySlug: null };
}

function classifyPurpose(text, index) {
  const before = text.slice(Math.max(0, index - 160), index).toLowerCase();
  if (before.includes('ogimage') || before.includes('searchimage')) return 'seo';
  if (before.includes('heroimage') || before.includes('hero') || before.includes('background-image')) return 'hero';
  if (before.includes('card')) return 'card';
  return 'inline';
}

const imageFiles = await walk(publicImages, (file) => imageExts.has(path.extname(file).toLowerCase()));
const assets = new Map();
for (const file of imageFiles) {
  const stat = await fs.stat(file);
  const src = publicSrc(file);
  assets.set(src, {
    src,
    source: 'static',
    filename: path.basename(file),
    extension: path.extname(file).slice(1).toLowerCase(),
    bytes: stat.size,
    updatedAt: stat.mtime.toISOString(),
    usages: [],
  });
}

const imagePathPattern = /\/images\/[A-Za-z0-9._/@%-]+\.(?:avif|gif|jpe?g|png|svg|webp)/gi;
for (const rootDir of usageRoots) {
  const files = await walk(rootDir, (file) => scanExts.has(path.extname(file).toLowerCase()));
  for (const file of files) {
    const text = await fs.readFile(file, 'utf8').catch(() => '');
    if (!text.includes('/images/')) continue;
    const entity = guessEntityFromFile(file, text);
    for (const match of text.matchAll(imagePathPattern)) {
      const src = match[0];
      const asset = assets.get(src);
      if (!asset) continue;
      asset.usages.push({
        file: rel(file),
        purpose: classifyPurpose(text, match.index ?? 0),
        entityType: entity.entityType,
        entitySlug: entity.entitySlug,
      });
    }
  }
}

const payload = {
  generatedAt: new Date().toISOString(),
  source: 'next/scripts/build-media-registry.mjs',
  assetCount: assets.size,
  assets: Array.from(assets.values()).sort((a, b) => a.filename.localeCompare(b.filename)),
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${payload.assetCount} media asset(s) to ${path.relative(root, outputPath)}`);
