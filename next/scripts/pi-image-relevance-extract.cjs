/**
 * pi-image-relevance-extract.cjs
 * Extract image metadata for daily image relevance scan.
 */
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const ROOT = '/home/node/.openclaw/workspace/peninsula-insider';
const CONTENT = path.join(ROOT, 'next/src/content');
const DATA = path.join(ROOT, 'next/src/data');

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
}

function readFrontmatter(p) {
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (!m) return {};
    return YAML.parse(m[1]) || {};
  } catch { return null; }
}

function listFiles(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(ext))
    .map((d) => path.join(dir, d.name));
}

function listFilesRecursive(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(p, ext));
    else if (entry.isFile() && entry.name.endsWith(ext)) out.push(p);
  }
  return out;
}

// Homepage carousel
const homeSlides = readJson(path.join(DATA, 'home-hero-slides.json'));
const homepageImages = (homeSlides?.slides || []).map((s) => ({
  surface: 'homepage-cover',
  id: s.id,
  title: s.headline?.replace(/<[^>]+>/g, ''),
  src: s.image,
  alt: s.imageAlt,
  link: s.primaryHref,
}));

// Hardcoded hub heroes
const hubHeroes = [
  { surface: "whats-on-hub", id: "whats-on-hero", title: "What's On", src: "/images/sourced/whats-on-winter-wine.webp", alt: "Bittern Estate wines lined up at a Mornington Peninsula winter cellar door" },
  { surface: "journal-hub", id: "journal-hero", title: "Journal", src: "/images/sourced/journal-hub-hero-01.webp", alt: "Journal hub hero" },
];

// Events
const eventFiles = listFilesRecursive(path.join(CONTENT, 'events'), '.json')
  .filter((p) => !p.includes('/archive/'));
const events = eventFiles.map((p) => {
  const data = readJson(p);
  if (!data) return null;
  const slug = path.basename(p, '.json');
  const hero = data.heroImage;
  return {
    surface: 'event',
    collection: 'events',
    id: slug,
    title: data.title,
    category: data.category,
    suburb: data.suburb,
    recurrence: data.recurrence,
    status: data.status,
    src: hero?.src || null,
    alt: hero?.alt || null,
    startDate: data.startDate,
    endDate: data.endDate,
    nextOccurrence: data.nextOccurrence,
    visitorAppealScore: data.visitorAppealScore,
  };
}).filter(Boolean);

// Signature events
const sigFiles = listFiles(path.join(CONTENT, 'signature-events'), '.json');
const signatureEvents = sigFiles.map((p) => {
  const data = readJson(p);
  if (!data) return null;
  const slug = path.basename(p, '.json');
  return {
    surface: 'signature-event',
    collection: 'signature-events',
    id: slug,
    title: data.name,
    category: data.category || null,
    src: data.heroImage || null,
    alt: data.heroImageAlt || null,
    monthAnchor: data.monthAnchor,
  };
}).filter(Boolean);

// Articles
const articleFiles = listFilesRecursive(path.join(CONTENT, 'articles'), '.md')
  .concat(listFilesRecursive(path.join(CONTENT, 'articles'), '.mdx'));
const articles = articleFiles.map((p) => {
  const data = readFrontmatter(p);
  if (!data) return null;
  const slug = path.basename(p, path.extname(p));
  return {
    surface: 'article',
    collection: 'articles',
    id: slug,
    title: data.title,
    format: data.format,
    section: data.section,
    featured: data.featured,
    status: data.status,
    src: data.heroImage?.src || data.hero?.src || null,
    alt: data.heroImage?.alt || data.hero?.alt || null,
    publishedAt: data.publishedAt,
  };
}).filter(Boolean);

// Places
const placeFiles = listFiles(path.join(CONTENT, 'places'), '.json');
const places = placeFiles.map((p) => {
  const data = readJson(p);
  if (!data) return null;
  const slug = path.basename(p, '.json');
  return {
    surface: 'place',
    collection: 'places',
    id: slug,
    title: data.name,
    src: data.heroImage?.src || null,
    alt: data.heroImage?.alt || null,
  };
}).filter(Boolean);

// Itineraries / experiences / venues
function loadCollection(name) {
  const dir = path.join(CONTENT, name);
  const files = listFilesRecursive(dir, '.json');
  return files.map((p) => {
    const data = readJson(p);
    if (!data) return null;
    const slug = path.basename(p, '.json');
    return {
      surface: name.replace(/s$/, ''),
      collection: name,
      id: slug,
      title: data.name || data.title,
      src: data.heroImage?.src || null,
      alt: data.heroImage?.alt || null,
    };
  }).filter(Boolean);
}
const itineraries = loadCollection('itineraries');
const experiences = loadCollection('experiences');
const venues = loadCollection('venues');

// Weekend picks current
const wpDir = path.join(CONTENT, 'weekend-picks');
const weekendPicksFiles = listFiles(wpDir, '.json').sort();
const latestWeekendPick = weekendPicksFiles.length ? readJson(weekendPicksFiles[weekendPicksFiles.length - 1]) : null;
const weekendPickSlugs = latestWeekendPick?.picks?.map((p) => p.eventSlug) || [];

const output = {
  generatedAt: new Date().toISOString(),
  homepageImages,
  hubHeroes,
  events,
  signatureEvents,
  articles,
  places,
  itineraries,
  experiences,
  venues,
  weekendPicks: {
    weekendStart: latestWeekendPick?.weekendStart,
    weekendLabel: latestWeekendPick?.weekendLabel,
    slugs: weekendPickSlugs,
  },
};

const outPath = path.join(ROOT, '.pi-autofix', 'image-relevance-extract.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`Wrote ${outPath}`);
