#!/usr/bin/env node
/**
 * Surface hardening audit for Peninsula Insider.
 *
 * Guards the bug classes that have produced visible drift:
 * - editorial horizontal rails that expose native scrollbars
 * - mixed card systems in one grid without an explicit normalisation skin
 * - entity detail/search images bypassing the CMS-aware hero resolver
 * - hero/card image surfaces missing inline-CMS edit attributes
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'src');
const issues = [];

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts, out);
    else if (exts.includes(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function lineOf(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function add(file, index, message) {
  issues.push(`${rel(file)}:${lineOf(fs.readFileSync(file, 'utf8'), index)} ${message}`);
}

const sourceFiles = walk(src, ['.astro', '.css', '.ts', '.js']);
const astroFiles = sourceFiles.filter((f) => f.endsWith('.astro'));

function auditHorizontalRails() {
  const ignored = [
    '/src/pages/v2-staging/',
    '/src/pages/preview-home-redesign.astro',
    '/src/styles/concierge.css',
    '/src/components/ConciergeDrawer.astro',
  ];
  const exemptPatterns = [
    /\.prose table/,
    /style=["'][^"']*overflow-x\s*:\s*auto/i,
  ];

  for (const file of sourceFiles.filter((f) => f.endsWith('.astro') || f.endsWith('.css'))) {
    const name = `/${rel(file)}`;
    if (ignored.some((part) => name.includes(part))) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (!/overflow-x\s*:\s*(auto|scroll)/.test(text)) continue;
    if (exemptPatterns.some((pattern) => pattern.test(text))) continue;

    const hiddenScrollbar =
      /scrollbar-width\s*:\s*none/.test(text) &&
      /::[-\w]+scrollbar[\s\S]{0,160}display\s*:\s*none/.test(text);
    if (!hiddenScrollbar) {
      const idx = text.search(/overflow-x\s*:\s*(auto|scroll)/);
      add(file, idx, 'horizontal rail uses overflow-x without hidden native scrollbar treatment');
    }
  }
}

function auditMixedCardGrids() {
  for (const file of astroFiles) {
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes('venues__grid')) continue;
    const gridRe = /<div[^>]*class=\{?`?["'][^"'}]*venues__grid[^>]*>/g;
    const matches = Array.from(text.matchAll(gridRe));
    for (let i = 0; i < matches.length; i += 1) {
      const match = matches[i];
      const nextGrid = matches[i + 1]?.index ?? text.length;
      const nextSection = text.indexOf('</section>', match.index);
      const end = nextSection >= 0 ? Math.min(nextSection, nextGrid) : nextGrid;
      const block = text.slice(match.index, end);
      const components = ['VenueCard', 'ExperienceCard', 'PlaceCard', 'ArticleCard', 'EventCard']
        .filter((name) => new RegExp(`<${name}\\b`).test(block));
      if (components.length <= 1) continue;

      const explicitlyNormalised =
        block.includes('venues__grid--links') ||
        /region-venues[\s\S]*\.experience-card/.test(text) ||
        /data-card-skin/.test(block);
      if (!explicitlyNormalised) {
        issues.push(`${rel(file)}:${lineOf(text, match.index)} venues__grid mixes ${components.join(', ')} without an explicit shared card skin`);
      }
    }
  }
}

function auditEntityHeroResolvers() {
  const entityPages = [
    'src/pages/eat/[slug].astro',
    'src/pages/stay/[slug].astro',
    'src/pages/wine/[slug].astro',
    'src/pages/explore/[slug].astro',
    'src/pages/explore/places/[slug].astro',
    'src/pages/whats-on/[slug].astro',
    'src/pages/journal/[slug].astro',
    'src/components/RegionDetailTemplate.astro',
  ].map((p) => path.join(root, p));

  for (const file of entityPages) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes('resolveHero(') && rel(file) !== 'src/pages/journal/[slug].astro') {
      issues.push(`${rel(file)}:1 entity surface must resolve hero/search images through resolveHero(...)`);
    }
    if (!/searchImage=\{/.test(text) && !/searchImage="/.test(text)) {
      issues.push(`${rel(file)}:1 entity surface passes ogImage but not explicit searchImage`);
    }
  }

  for (const file of astroFiles) {
    const r = rel(file);
    if (r.includes('/v2-staging/') || r.includes('/v4/')) continue;
    const text = fs.readFileSync(file, 'utf8');
    const directOg = /const\s+ogImage\s*=\s*[^;\n]*\.data\.heroImage\?\.src/.exec(text);
    if (directOg && !text.includes('resolveHero(')) {
      issues.push(`${r}:${lineOf(text, directOg.index)} ogImage reads frontmatter heroImage without resolveHero(...)`);
    }
  }
}

function auditEditableImageCoverage() {
  const required = [
    'src/components/VenueCard.astro',
    'src/components/ExperienceCard.astro',
    'src/components/EventCard.astro',
    'src/components/PlaceCard.astro',
    'src/components/RegionDetailTemplate.astro',
    'src/components/VenueDetailTemplate.astro',
    'src/components/PlaceDetailTemplate.astro',
    'src/pages/journal/[slug].astro',
    'src/pages/explore/[slug].astro',
    'src/pages/explore/plans/[slug].astro',
  ].map((p) => path.join(root, p));

  for (const file of required) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes('editableImage(')) {
      issues.push(`${rel(file)}:1 visible image surface is missing editableImage(...) attributes for CMS uploads`);
    }
  }
}

function auditStaticJournalSearchImages() {
  const journalDir = path.join(src, 'pages', 'journal');
  for (const file of walk(journalDir, ['.astro'])) {
    const r = rel(file);
    if (r.includes('/local-secrets/') || r.endsWith('journal/[slug].astro')) continue;
    const text = fs.readFileSync(file, 'utf8');
    const hasCssHero = /background-image:\s*url\(["']?\/images\/sourced\//.test(text);
    if (!hasCssHero || !text.includes('<BaseLayout')) continue;
    if (!/ogImage=/.test(text) || !/searchImage=/.test(text)) {
      issues.push(`${r}:1 hard-coded journal hero must pass the same image to ogImage and searchImage`);
    }
  }
}

auditHorizontalRails();
auditMixedCardGrids();
auditEntityHeroResolvers();
auditEditableImageCoverage();
auditStaticJournalSearchImages();

if (issues.length) {
  console.error('Surface hardening audit failed:');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('Surface hardening audit passed.');
