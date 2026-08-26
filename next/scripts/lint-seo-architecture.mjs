import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url);
const contentEvents = new URL('../src/content/events/', import.meta.url);
const publicDir = new URL('../public/', import.meta.url);
const loserPaths = new Set([
  '/eat/dog-friendly/',
  '/stay/dog-friendly/',
  '/wine/dog-friendly/',
  '/explore/dog-friendly/',
  '/stay/couples/',
  '/explore/free/',
  '/plans/',
  '/places/',
]);

async function htmlFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'dev') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}

async function filesNamed(dir, predicate) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await filesNamed(path, predicate));
    else if (predicate(entry.name)) files.push(path);
  }
  return files;
}

function metaContent(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = new RegExp(`<meta\\b(?=[^>]*\\bname=["']${escaped}["'])[^>]*>`, 'i').exec(html)?.[0]
    ?? new RegExp(`<meta\\b(?=[^>]*\\bproperty=["']${escaped}["'])[^>]*>`, 'i').exec(html)?.[0];
  return tag?.match(/\\bcontent=["']([^"']*)["']/i)?.[1] ?? '';
}

function canonicalUrl(html) {
  const tag = /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i.exec(html)?.[0];
  return tag?.match(/\bhref=["']([^"']+)["']/i)?.[1];
}

// Flatten every node in the graph, including nested ones. The original walked
// only the top level, so ImageObject and entity nodes that hang off a parent
// (image: {...}, containedInPlace: {...}) were never inspected -- which is why
// the ImageObject-diversity assertion reported 0 forever and the @id assertion
// reported 1 where an independent parser finds 30. Assert the artefact means
// reading all of it.
function flatten(value, out) {
  if (Array.isArray(value)) {
    for (const item of value) flatten(item, out);
  } else if (value && typeof value === 'object') {
    if (value['@type']) out.push(value);
    for (const nested of Object.values(value)) flatten(nested, out);
  }
  return out;
}

function jsonLdNodes(html, file, fail) {
  const nodes = [];
  for (const match of html.matchAll(/<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      flatten(JSON.parse(match[1]), nodes);
    } catch (error) {
      fail('invalid-json-ld', `${file}: invalid JSON-LD (${error.message})`);
    }
  }
  return nodes;
}

function routeFromFile(file) {
  const relative = file.slice(dist.pathname.length).replace(/index\.html$/, '');
  return `/${relative}`.replace(/\/+/g, '/');
}

function isNoindex(html) {
  return /<meta\b(?=[^>]*\bname=["']robots["'])[^>]*\bcontent=["'][^"']*\bnoindex\b/i.test(html)
    || /<meta\b(?=[^>]*\bcontent=["'][^"']*\bnoindex\b)[^>]*\bname=["']robots["']/i.test(html);
}

async function sitemapEntries() {
  const sitemap = await readFile(join(dist.pathname, 'sitemap.xml'), 'utf8');
  const entries = new Map();
  for (const match of sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = match[1].match(/<loc>([^<]+)<\/loc>/)?.[1];
    const lastmod = match[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
    if (loc) entries.set(loc, lastmod);
  }
  return entries;
}

async function routeExists(pathname) {
  const clean = pathname.replace(/^\//, '');
  if (!clean) return true;
  const direct = join(dist.pathname, clean);
  try {
    if ((await stat(direct)).isFile()) return true;
  } catch {}
  try {
    return (await stat(join(direct.replace(/\/$/, ''), 'index.html'))).isFile();
  } catch {
    return false;
  }
}

// --- ratchet -----------------------------------------------------------------
// The gate asserts a large surface. Demanding zero findings on day one means it
// can never be switched on, so instead we record today's count per assertion and
// fail only on an INCREASE. Every fix that lowers a count tightens the ratchet
// permanently via --update-baseline. Floors (diversity metrics) ratchet upward:
// they fail when they DROP. Regression is blocked from the first run; the
// existing backlog is visible without being a blocker.
const baselinePath = new URL('../../ops/reports/seo/seo-architecture-baseline.json', import.meta.url).pathname;
const updateBaseline = process.argv.includes('--update-baseline');
// A baseline taken from a dirty working tree describes a build CI will never
// produce. The first attempt at this baseline was 5 breadcrumb findings light
// for exactly that reason and broke the deploy on the next push. Refuse to
// record one unless the tree is clean, or the operator opts in explicitly.
if (updateBaseline && !process.argv.includes('--allow-dirty')) {
  let dirty = '';
  try {
    dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
  } catch {}
  if (dirty) {
    console.error('SEO architecture lint: refusing to baseline from a dirty working tree.');
    console.error('CI builds a clean checkout, so a baseline taken here will not match it.');
    console.error('Build a clean worktree of origin/main and baseline there, or pass --allow-dirty.');
    console.error(`\nUncommitted paths (${dirty.split('\n').length}):`);
    for (const line of dirty.split('\n').slice(0, 15)) console.error(`  ${line}`);
    process.exit(1);
  }
}

let baseline = { counts: {}, floors: {} };
try {
  baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
} catch {
  if (!updateBaseline) {
    console.error(`SEO architecture lint: no baseline at ${baselinePath}. Run with --update-baseline to create one.`);
    process.exit(1);
  }
}

const failures = [];
const counts = {};
const floors = {};
function fail(key, message) {
  counts[key] = (counts[key] ?? 0) + 1;
  failures.push({ key, message });
}
function floor(key, value) {
  floors[key] = value;
}

const sitemap = await sitemapEntries();
const sitemapLastmods = new Set([...sitemap.values()].filter(Boolean));
if (sitemapLastmods.size < 10) {
  fail('sitemap-lastmod-diversity', `sitemap.xml: implausible lastmod diversity (${sitemapLastmods.size} distinct dates; need at least 10)`);
}
if ([...sitemap.entries()].some(([, lastmod]) => !lastmod)) {
  fail('sitemap-lastmod-missing', 'sitemap.xml: every URL must have a lastmod');
}

const imageObjectUrls = new Set();
const entityTypes = new Set(['Winery', 'Restaurant', 'TouristAttraction', 'TouristDestination', 'GolfCourse']);
for (const file of await htmlFiles(dist.pathname)) {
  const html = await readFile(file, 'utf8');
  const route = routeFromFile(file);
  const noindex = isNoindex(html);
  const canonical = canonicalUrl(html);
  const sitemapUrl = canonical ?? `https://peninsulainsider.com.au${route}`;
  if (!noindex && !canonical) fail('canonical-missing', `${file}: indexable page has no canonical`);
  if (!noindex && !sitemap.has(sitemapUrl)) fail('sitemap-absent', `${file}: indexable page absent from sitemap (${sitemapUrl})`);
  if (noindex && sitemap.has(sitemapUrl)) fail('sitemap-noindex-present', `${file}: noindex page present in sitemap (${sitemapUrl})`);

  const nodes = jsonLdNodes(html, file, fail);
  // Only indexable pages need breadcrumbs. Asserting this on noindex utility
  // surfaces (/me/saved/, /partners/dashboard/, /pi-admin/*) produced 644 of the
  // 668 findings and made the gate unshippable.
  const breadcrumbs = nodes.filter((node) => node?.['@type'] === 'BreadcrumbList');
  if (!noindex && breadcrumbs.length !== 1) {
    fail('breadcrumb-count', `${file}: expected exactly one BreadcrumbList, found ${breadcrumbs.length}`);
  }
  for (const node of nodes) {
    if (node?.['@type'] === 'ImageObject' && typeof node.url === 'string') imageObjectUrls.add(node.url);
    const types = Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']];
    if (types.some((type) => entityTypes.has(type)) && !node?.['@id']) fail('entity-missing-id', `${file}: ${types.join(',')} schema lacks @id`);
    if (types.includes('EventScheduled') && node?.endDate && new Date(node.endDate) < new Date()) {
      fail('stale-event-scheduled', `${file}: stale EventScheduled endDate ${node.endDate}`);
    }
  }
  for (const tag of html.matchAll(/<img\b[^>]*>/gi)) {
    const value = tag[0];
    if (/\bclass=["'][^"']*hero[^"']*["']/i.test(value) && /\bloading=["']lazy["']/i.test(value)) {
      fail('hero-lazy', `${file}: hero image must not be lazy-loaded`);
    }
  }
  const hrefs = [...html.matchAll(/href="(\/[^"]*)"/g)].map((match) => match[1]);
  for (const raw of hrefs) {
    const pathname = raw.split(/[?#]/, 1)[0];
    if (/^\/(?:_astro|assets|images|fonts)\//.test(pathname) || /\.[a-z0-9]+$/i.test(pathname)) continue;
    if (pathname !== '/' && !pathname.endsWith('/')) fail('non-trailing-slash', `${file}: non-trailing-slash ${raw}`);
    if ([...loserPaths].some((loser) => pathname === loser || (loser === '/places/' && pathname.startsWith(loser)))) {
      fail('consolidation-loser', `${file}: consolidation loser ${raw}`);
    }
    if (!(await routeExists(pathname))) fail('broken-internal-link', `${file}: broken internal link ${raw}`);
  }
}

floor('imageobject-diversity', imageObjectUrls.size);
floor('sitemap-lastmod-diversity', sitemapLastmods.size);

const eventFiles = await filesNamed(contentEvents.pathname, (name) => /\.(?:json|md|mdx)$/i.test(name));
const archive = new Set(eventFiles.filter((file) => file.includes('/archive/')).map((file) => file.split('/').pop().replace(/\.[^.]+$/, '')));
for (const file of eventFiles.filter((file) => !file.includes('/archive/'))) {
  const slug = file.split('/').pop().replace(/\.[^.]+$/, '');
  if (archive.has(slug)) fail('duplicate-event-slug', `duplicate event content slug in events/ and events/archive/: ${slug}`);
}

for (const file of await filesNamed(publicDir.pathname, (name) => name.endsWith('.html'))) {
  const html = await readFile(file, 'utf8');
  if (!isNoindex(html)) fail('raw-public-html-noindex', `${file}: raw public HTML must declare robots noindex`);
}

// --- verdict -----------------------------------------------------------------
if (updateBaseline) {
  const next = { updatedAt: new Date().toISOString().slice(0, 10), counts, floors };
  await writeFile(baselinePath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`SEO architecture baseline written to ${baselinePath}`);
  for (const [key, value] of Object.entries(counts).sort()) console.log(`  ${key}: ${value}`);
  for (const [key, value] of Object.entries(floors).sort()) console.log(`  ${key} (floor): ${value}`);
  process.exit(0);
}

const regressions = [];
for (const [key, value] of Object.entries(counts)) {
  const allowed = baseline.counts?.[key] ?? 0;
  if (value > allowed) regressions.push(`${key}: ${value} finding(s), baseline allows ${allowed}`);
}
for (const [key, value] of Object.entries(floors)) {
  const required = baseline.floors?.[key] ?? 0;
  if (value < required) regressions.push(`${key}: floor dropped to ${value}, baseline requires at least ${required}`);
}

const total = failures.length;
if (regressions.length) {
  const byKey = new Map();
  for (const { key, message } of failures) {
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(message);
  }
  console.error(`SEO architecture lint REGRESSED (${regressions.length} assertion(s) worse than baseline):`);
  for (const line of regressions) console.error(`  ${line}`);
  console.error('\nFindings for the regressed assertions:');
  for (const line of regressions) {
    const key = line.split(':')[0];
    for (const message of (byKey.get(key) ?? []).slice(0, 40)) console.error(`  ${message}`);
  }
  console.error('\nIf this change is a deliberate, accepted trade-off, re-baseline with:');
  console.error('  npm run lint:seo-architecture -- --update-baseline');
  process.exit(1);
}

console.log(`SEO architecture lint passed: no regression against baseline (${baseline.updatedAt ?? 'unknown'}).`);
if (total) {
  console.log(`Carrying ${total} known finding(s) within baseline:`);
  const summary = Object.entries(counts).sort();
  for (const [key, value] of summary) console.log(`  ${key}: ${value} (baseline ${baseline.counts?.[key] ?? 0})`);
}
for (const [key, value] of Object.entries(floors).sort()) {
  console.log(`  ${key} (floor): ${value} (baseline ${baseline.floors?.[key] ?? 0})`);
}
