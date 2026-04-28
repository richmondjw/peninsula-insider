#!/usr/bin/env node
/**
 * Full hero image audit — finds duplicates across all content types.
 * Shows both explicit heroImage.src AND the category fallback the resolver picks.
 */
const fs = require('fs');
const path = require('path');

const BASE_VENUE = 'src/content/venues';
const BASE_EXP = 'src/content/experiences';

// Simplified resolver logic (mirrors editorial.ts)
const CATEGORY_FALLBACK_RE = /\/category-[a-z-]+-\d+\.[a-z]+$/;
const BLOCKED = new Set([
  'category-cottage-01.webp',
  'category-hotel-02.webp',
  'category-glamping-01.webp',
  'spa-coastal-pool-01.webp',
]);

function isBlocked(src) {
  if (!src) return true;
  const fname = src.split('/').pop();
  return BLOCKED.has(fname) || CATEGORY_FALLBACK_RE.test(src);
}

function readJsonDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      return { slug: f.replace('.json',''), ...data };
    });
}

const venues = readJsonDir(BASE_VENUE);
const experiences = readJsonDir(BASE_EXP);

// Map: filename → list of slugs using it
const imageMap = new Map();

function register(slug, src, section) {
  if (!src) return;
  const fname = src.split('/').pop();
  if (!imageMap.has(fname)) imageMap.set(fname, []);
  imageMap.get(fname).push(`${section}/${slug}`);
}

for (const v of venues) {
  const src = v.heroImage?.src;
  register(v.slug, src, v.type || 'venue');
}
for (const e of experiences) {
  const src = e.heroImage?.src;
  register(e.slug, src, 'experience');
}

// Show duplicates
console.log('\n=== DUPLICATES (same explicit heroImage.src) ===\n');
let dupCount = 0;
for (const [fname, slugs] of [...imageMap.entries()].sort()) {
  if (slugs.length > 1) {
    console.log(`  ${fname}`);
    for (const s of slugs) console.log(`    → ${s}`);
    dupCount++;
  }
}
console.log(`\n${dupCount} duplicate images found.\n`);

// Show venues with category/blocked fallbacks
console.log('=== VENUES STILL ON CATEGORY/BLOCKED FALLBACKS ===\n');
for (const v of venues.sort((a,b) => (a.type||'').localeCompare(b.type||''))) {
  const src = v.heroImage?.src;
  if (!src || isBlocked(src)) {
    console.log(`  [${(v.type||'?').padEnd(12)}] ${v.slug}`);
  }
}
for (const e of experiences) {
  const src = e.heroImage?.src;
  if (!src || isBlocked(src)) {
    console.log(`  [experience  ] ${e.slug}`);
  }
}
