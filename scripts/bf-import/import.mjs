#!/usr/bin/env node
/**
 * bf-import — convert pack MD drafts to PI content collection MD files.
 *
 * Source: peninsula_insider_boating_fishing_v1.zip → content-bf/*.md
 * Target: next/src/content/{collection}/{slug}.md
 *
 * The pack ships 52 MD drafts with sparse frontmatter (slug, title,
 * schema_types, last_fact_verified). Our content collections require richer
 * frontmatter. This script does the mechanical conversion — body, slug,
 * date stamps — and stamps the entry as `status: draft` so it does not
 * appear in the sitemap until an editor enriches the structured fields and
 * promotes it to `published`.
 *
 * Usage:
 *   node scripts/bf-import/import.mjs --src <pack-dir> [--type <species|location|charter|ramp|hire>] [--slug <slug>]
 *
 * Examples:
 *   node scripts/bf-import/import.mjs --src "$PACK"
 *   node scripts/bf-import/import.mjs --src "$PACK" --type species --slug snapper
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { argv } from 'node:process';

function parseArgs() {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      args[arg.slice(2)] = argv[i + 1];
      i++;
    }
  }
  return args;
}

const args = parseArgs();
if (!args.src) {
  console.error('Usage: import.mjs --src <pack-dir> [--type ...] [--slug ...]');
  process.exit(1);
}

const PACK_CONTENT = join(args.src, 'content-bf');
const REPO_ROOT = join(import.meta.dirname, '..', '..');
const COLLECTIONS_BASE = join(REPO_ROOT, 'next', 'src', 'content');
const TODAY = '2026-04-30';

// Map pack file prefix → target collection dir + entity type.
const TYPE_MAP = {
  species: { dir: 'species', shape: shapeSpecies },
  location: { dir: 'fishing-locations', shape: shapeLocation },
  charter: { dir: 'fishing-charters', shape: shapeCharter },
  ramp: { dir: 'boat-ramps', shape: shapeRamp },
  hire: { dir: 'boat-hire', shape: shapeHire },
};

/**
 * Tiny YAML-frontmatter parser: only handles the shapes the pack uses
 * (key: "value", key: value, lists with "- " items, nested objects one
 * level deep). We do not attempt full YAML compliance.
 */
function parseFrontmatter(raw) {
  if (!raw.startsWith('---\n')) return { fm: {}, body: raw };
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) return { fm: {}, body: raw };
  const fmText = raw.slice(4, end);
  const body = raw.slice(end + 5);
  const fm = {};
  const lines = fmText.split('\n');
  let currentList = null;
  let currentListKey = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    const listMatch = line.match(/^\s*-\s+(.*)$/);
    if (listMatch && currentList) {
      currentList.push(stripQuotes(listMatch[1]));
      continue;
    }
    const objMatch = line.match(/^\s+(\w+):\s*(.*)$/);
    // Top-level key
    const kvMatch = line.match(/^([a-zA-Z_][\w]*):\s*(.*)$/);
    if (kvMatch) {
      const [, key, val] = kvMatch;
      if (val === '' || val == null) {
        // Either a list or a nested object follows.
        currentList = [];
        currentListKey = key;
        fm[key] = currentList;
      } else {
        fm[key] = stripQuotes(val);
        currentList = null;
        currentListKey = null;
      }
      continue;
    }
    if (objMatch && currentListKey) {
      // Pack uses lists of objects for `breadcrumb`. Keep the list as a string
      // — we don't need it in the target frontmatter.
    }
  }
  return { fm, body };
}

function stripQuotes(s) {
  s = s.trim();
  if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
  return s;
}

function detectType(filename) {
  const stem = basename(filename, '.md');
  if (stem.startsWith('species_')) return { type: 'species', slug: stem.slice('species_'.length) };
  if (stem.startsWith('location_')) return { type: 'location', slug: stem.slice('location_'.length) };
  if (stem.startsWith('charter_')) return { type: 'charter', slug: stem.slice('charter_'.length) };
  if (stem.startsWith('ramp_')) return { type: 'ramp', slug: stem.slice('ramp_'.length) };
  if (stem.startsWith('hire_')) return { type: 'hire', slug: stem.slice('hire_'.length) };
  return null;
}

/** Pull the first paragraph after the H1/intro as the `intro` field. */
function extractIntro(body) {
  const lines = body.split('\n');
  let i = 0;
  while (i < lines.length && (!lines[i].trim() || lines[i].startsWith('#') || lines[i].startsWith('**Last') || lines[i].startsWith('---'))) {
    i++;
  }
  const buf = [];
  while (i < lines.length && lines[i].trim() && !lines[i].startsWith('#') && !lines[i].startsWith('---')) {
    buf.push(lines[i]);
    i++;
  }
  const text = buf.join(' ').trim();
  return text.length > 600 ? text.slice(0, 597) + '…' : text;
}

/** Strip the H1 title and the "Last fact-verified" stamp from the body (we
 *  render those from frontmatter). */
function stripBodyTitleStamp(body) {
  const lines = body.split('\n');
  const out = [];
  let skippedH1 = false;
  for (const line of lines) {
    if (!skippedH1 && line.startsWith('# ')) {
      skippedH1 = true;
      continue;
    }
    if (line.startsWith('**Last fact-verified')) continue;
    if (/^Last fact-verified:?/i.test(line.trim())) continue;
    out.push(line);
  }
  // Trim leading whitespace
  while (out.length && !out[0].trim()) out.shift();
  return out.join('\n');
}

function escYaml(s) {
  if (s == null) return '""';
  const str = String(s);
  if (/[:\n#"]/.test(str)) {
    return JSON.stringify(str);
  }
  return JSON.stringify(str);
}

function commonFrontmatter(meta) {
  return [
    `slug: ${escYaml(meta.slug)}`,
    `name: ${escYaml(meta.name)}`,
    `intro: ${escYaml(meta.intro)}`,
    `metaDescription: ${escYaml(meta.metaDescription)}`,
    `status: draft`,
    `verified: false`,
    `lastVerified: ${TODAY}`,
    `publishedAt: ${TODAY}`,
  ];
}

function shapeSpecies({ slug, fm, body }) {
  const intro = extractIntro(body);
  const meta = {
    slug,
    name: fm.title || slug,
    intro,
    metaDescription: fm.meta_description || intro.slice(0, 160),
  };
  return [
    `# Species frontmatter — auto-generated draft.`,
    `# Editor: enrich primaryRegion, bagLimit, sizeLimit, peakSeason, vfaCitationUrl,`,
    `# faq, locationSlugs, charterSlugs, eatLinks before flipping status to "published".`,
    ``,
    `slug: ${escYaml(slug)}`,
    `commonName: ${escYaml(fm.title?.split(' on the')[0] || slug)}`,
    `scientificName: "[VERIFY]"`,
    `aliases: []`,
    `primaryRegion: port-phillip-bay`,
    `secondaryRegions: []`,
    `bagLimit: "[VERIFY] — cite VFA verbatim"`,
    `sizeLimit: "[VERIFY] — cite VFA verbatim"`,
    `licenceRequired: true`,
    `peakSeason: "[VERIFY]"`,
    `seasonality: []`,
    `locationSlugs: []`,
    `charterSlugs: []`,
    `eatLinks: []`,
    `intro: ${escYaml(intro)}`,
    `metaDescription: ${escYaml(meta.metaDescription)}`,
    `faq: []`,
    `vfaCitationUrl: "https://vfa.vic.gov.au"`,
    `status: draft`,
    `verified: false`,
    `lastVerified: ${TODAY}`,
    `publishedAt: ${TODAY}`,
  ].join('\n');
}

function shapeLocation({ slug, fm, body }) {
  const intro = extractIntro(body);
  const metaDescription = fm.meta_description || intro.slice(0, 160);
  return [
    `# Fishing-location frontmatter — auto-generated draft.`,
    `# Editor: set locationType, region, coordinates, parking, primarySpecies,`,
    `# nearestRampSlug, tideStation, faq before promoting to published.`,
    ``,
    ...commonFrontmatter({ slug, name: fm.title || slug, intro, metaDescription }),
    `locationType: pier`,
    `region: port-phillip-bay`,
    `primarySpecies: []`,
    `faq: []`,
  ].join('\n');
}

function shapeCharter({ slug, fm, body }) {
  const intro = extractIntro(body);
  const metaDescription = fm.meta_description || intro.slice(0, 160);
  return [
    `# Fishing-charter frontmatter — auto-generated draft.`,
    `# Editor: set operatorWebsite, affiliateUrl, departurePoints, vesselType,`,
    `# capacity, priceLow/High, targetSpecies, licenceCovered, whoSuits/Doesnt`,
    `# before promoting to published. [VERIFY]-flagged charters stay draft until`,
    `# operator outreach completes.`,
    ``,
    `slug: ${escYaml(slug)}`,
    `name: ${escYaml(fm.title || slug)}`,
    `intro: ${escYaml(intro)}`,
    `metaDescription: ${escYaml(metaDescription)}`,
    `bookingProvider: none`,
    `licenceCovered: unconfirmed`,
    `priceUnit: per-person`,
    `departurePoints: []`,
    `targetSpecies: []`,
    `whoSuits: "[VERIFY]"`,
    `whoDoesnt: "[VERIFY]"`,
    `faq: []`,
    `status: draft`,
    `verified: false`,
    `lastVerified: ${TODAY}`,
    `publishedAt: ${TODAY}`,
  ].join('\n');
}

function shapeRamp({ slug, fm, body }) {
  const intro = extractIntro(body);
  const metaDescription = fm.meta_description || intro.slice(0, 160);
  return [
    `# Boat-ramp frontmatter — auto-generated draft.`,
    `# Editor: set region, coordinates, address, laneCount, surface, fee,`,
    `# parking, tideDependence, accessibleSpecies/Locations, faq before`,
    `# promoting to published. tide-dependent ramps must include safetyNotes.`,
    ``,
    ...commonFrontmatter({ slug, name: fm.title || slug, intro, metaDescription }),
    `region: port-phillip-bay`,
    `tideDependence: all-tide`,
    `nearbyRampAlternatives: []`,
    `accessibleSpecies: []`,
    `accessibleLocations: []`,
    `faq: []`,
  ].join('\n');
}

function shapeHire({ slug, fm, body }) {
  const intro = extractIntro(body);
  const metaDescription = fm.meta_description || intro.slice(0, 160);
  return [
    `# Boat-hire frontmatter — auto-generated draft.`,
    `# Editor: set departurePoint, operatorWebsite, vesselTypes, priceLow/High,`,
    `# nearestRampSlug, whoSuits/Doesnt, faq before promoting to published.`,
    ``,
    `slug: ${escYaml(slug)}`,
    `name: ${escYaml(fm.title || slug)}`,
    `intro: ${escYaml(intro)}`,
    `metaDescription: ${escYaml(metaDescription)}`,
    `bookingProvider: direct`,
    `priceUnit: per-hour`,
    `licenceRequired: false`,
    `departurePoint: "[VERIFY]"`,
    `vesselTypes: []`,
    `whoSuits: "[VERIFY]"`,
    `whoDoesnt: "[VERIFY]"`,
    `faq: []`,
    `status: draft`,
    `verified: false`,
    `lastVerified: ${TODAY}`,
    `publishedAt: ${TODAY}`,
  ].join('\n');
}

function importOne(filename) {
  const detected = detectType(filename);
  if (!detected) return null;
  const { type, slug } = detected;
  if (args.type && args.type !== type) return null;
  if (args.slug && args.slug !== slug) return null;
  if (!TYPE_MAP[type]) return null;

  const raw = readFileSync(join(PACK_CONTENT, filename), 'utf-8');
  const { fm, body } = parseFrontmatter(raw);
  const cleanedBody = stripBodyTitleStamp(body);
  const fmYaml = TYPE_MAP[type].shape({ slug, fm, body });

  const targetDir = join(COLLECTIONS_BASE, TYPE_MAP[type].dir);
  if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
  const targetFile = join(targetDir, `${slug}.md`);
  const out = `---\n${fmYaml}\n---\n\n${cleanedBody.trim()}\n`;
  writeFileSync(targetFile, out);
  return { type, slug, file: targetFile };
}

function main() {
  if (!existsSync(PACK_CONTENT)) {
    console.error(`Pack content directory not found: ${PACK_CONTENT}`);
    process.exit(1);
  }
  const files = readdirSync(PACK_CONTENT).filter((f) => f.endsWith('.md') && !f.startsWith('hub_') && !f.startsWith('pillar_'));
  const results = [];
  for (const f of files) {
    const r = importOne(f);
    if (r) results.push(r);
  }
  console.log(`Imported ${results.length} draft entries:`);
  for (const r of results) console.log(`  ${r.type}/${r.slug} → ${r.file}`);
}

main();
