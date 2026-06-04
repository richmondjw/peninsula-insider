#!/usr/bin/env node
/**
 * Registry-backed image audit.
 *
 * Reports duplicate canonical images and entities that still rely on missing,
 * placeholder, category, place, explore, blocked, or derived fallback imagery.
 * Run `npm run image-registry` first, or use `npm run lint:images`.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const REGISTRY_PATH = path.join(ROOT, 'src/data/image-registry.json');

if (!fs.existsSync(REGISTRY_PATH)) {
  console.error(`[image-audit] Missing ${REGISTRY_PATH}. Run npm run image-registry first.`);
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
const entities = Object.entries(registry.entities ?? {});

const softKinds = new Set([
  'missing',
  'placeholder',
  'category-fallback',
  'place-fallback',
  'explore-fallback',
  'blocked',
  'site-fallback',
]);

const duplicateGroups = registry.duplicateGroups ?? [];
const problematic = entities
  .map(([key, row]) => ({ key, hero: row.canonicalHero, original: row.originalHero }))
  .filter((row) =>
    row.hero?.source === 'derived-fallback'
    || softKinds.has(row.hero?.kind)
    || row.hero?.missingLocalFile
  )
  .sort((a, b) => String(a.hero?.kind).localeCompare(String(b.hero?.kind)) || a.key.localeCompare(b.key));

console.log('\n=== IMAGE REGISTRY SUMMARY ===\n');
console.log(`  entities:                ${registry.stats?.entities ?? entities.length}`);
console.log(`  unique canonical images: ${registry.stats?.uniqueCanonicalImages ?? 'n/a'}`);
console.log(`  duplicate image values:  ${registry.stats?.duplicateImageValues ?? duplicateGroups.length}`);
console.log(`  derived fallbacks:       ${registry.stats?.derivedFallback ?? 'n/a'}`);
console.log(`  missing original heroes: ${registry.stats?.missingOriginal ?? 'n/a'}`);
console.log(`  placeholder originals:   ${registry.stats?.placeholderOriginal ?? 'n/a'}`);
console.log(`  missing local files:     ${registry.stats?.missingLocalFile ?? 0}`);

console.log('\n=== DUPLICATE CANONICAL IMAGES ===\n');
if (duplicateGroups.length === 0) {
  console.log('  none');
} else {
  for (const group of duplicateGroups) {
    console.log(`  ${group.src} (${group.count})`);
    for (const key of group.entities) console.log(`    -> ${key}`);
  }
}

console.log('\n=== ENTITIES STILL NEEDING DEDICATED IMAGE ATTENTION ===\n');
if (problematic.length === 0) {
  console.log('  none');
} else {
  for (const row of problematic) {
    const original = row.original?.src ? ` original=${row.original.src}` : '';
    const flags = [
      row.hero?.source,
      row.hero?.kind,
      row.hero?.missingLocalFile ? 'missing-local-file' : null,
    ].filter(Boolean).join('/');
    console.log(`  [${flags}] ${row.key} -> ${row.hero?.src}${original}`);
  }
}

console.log('\n[image-audit] Use duplicateGroups in src/data/image-registry.json to decide which shared images are legitimate estate/group reuse and which need replacement.\n');
