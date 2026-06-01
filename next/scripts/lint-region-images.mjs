import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const contentDir = path.join(root, 'src', 'content');
const componentsDir = path.join(root, 'src', 'components');
const publicDir = path.join(root, 'public');

const failures = [];

function readJsonFolder(folder) {
  const dir = path.join(contentDir, folder);
  const rows = new Map();
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.json'))) {
    const fullPath = path.join(dir, file);
    const row = JSON.parse(readFileSync(fullPath, 'utf8'));
    rows.set(row.slug ?? file.replace(/\.json$/, ''), row);
  }
  return rows;
}

function assertLocalImageExists(label, src) {
  if (!src) {
    failures.push(`${label}: missing image src`);
    return;
  }
  if (/^https?:\/\//.test(src)) return;
  if (!src.startsWith('/images/')) {
    failures.push(`${label}: image src must be an /images/ path or absolute URL (${src})`);
    return;
  }
  if (!existsSync(path.join(publicDir, src.slice(1)))) {
    failures.push(`${label}: missing public asset ${src}`);
  }
}

function assertComponentContains(file, snippets) {
  const text = readFileSync(path.join(componentsDir, file), 'utf8');
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      failures.push(`${file}: missing image mapping snippet ${snippet}`);
    }
  }
}

const regions = readJsonFolder('regions');

for (const region of regions.values()) {
  const regionLabel = `region/${region.slug}`;
  assertLocalImageExists(`${regionLabel}#heroImage`, region.heroImage?.src);
}

assertComponentContains('RegionDetailTemplate.astro', [
  "resolveHero('region'",
  "entityType: 'region'",
  "fieldPath: 'heroImage'",
]);
assertComponentContains('PlaceCard.astro', [
  "loadOverrides('place'",
  "entityType: 'place'",
  "fieldPath: 'heroImage'",
]);
assertComponentContains('VenueCard.astro', [
  "loadOverrides('venue'",
  "entityType: 'venue'",
  "fieldPath: 'heroImage'",
]);
assertComponentContains('ExperienceCard.astro', [
  "resolveHero('experience'",
  "entityType: 'experience'",
  "fieldPath: 'heroImage'",
]);

if (failures.length > 0) {
  console.error('Region image wiring lint failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Region image wiring lint passed for ${regions.size} region page(s).`);
