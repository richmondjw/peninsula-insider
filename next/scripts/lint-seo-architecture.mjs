import { readdir, readFile, stat } from 'node:fs/promises';
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

function jsonLdNodes(html, file, failures) {
  const nodes = [];
  for (const match of html.matchAll(/<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const value = JSON.parse(match[1]);
      nodes.push(...(Array.isArray(value) ? value : value['@graph'] ?? [value]));
    } catch (error) {
      failures.push(`${file}: invalid JSON-LD (${error.message})`);
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

const failures = [];
const sitemap = await sitemapEntries();
const sitemapLastmods = new Set([...sitemap.values()].filter(Boolean));
if (sitemapLastmods.size < 10) {
  failures.push(`sitemap.xml: implausible lastmod diversity (${sitemapLastmods.size} distinct dates; need at least 10)`);
}
if ([...sitemap.entries()].some(([, lastmod]) => !lastmod)) {
  failures.push('sitemap.xml: every URL must have a lastmod');
}

const imageObjectUrls = new Set();
const entityTypes = new Set(['Winery', 'Restaurant', 'TouristAttraction', 'TouristDestination', 'GolfCourse']);
for (const file of await htmlFiles(dist.pathname)) {
  const html = await readFile(file, 'utf8');
  const route = routeFromFile(file);
  const noindex = isNoindex(html);
  const canonical = canonicalUrl(html);
  const sitemapUrl = canonical ?? `https://peninsulainsider.com.au${route}`;
  if (!noindex && !canonical) failures.push(`${file}: indexable page has no canonical`);
  if (!noindex && !sitemap.has(sitemapUrl)) failures.push(`${file}: indexable page absent from sitemap (${sitemapUrl})`);
  if (noindex && sitemap.has(sitemapUrl)) failures.push(`${file}: noindex page present in sitemap (${sitemapUrl})`);

  const nodes = jsonLdNodes(html, file, failures);
  const breadcrumbs = nodes.filter((node) => node?.['@type'] === 'BreadcrumbList');
  if (breadcrumbs.length !== 1) failures.push(`${file}: expected exactly one BreadcrumbList, found ${breadcrumbs.length}`);
  for (const node of nodes) {
    if (node?.['@type'] === 'ImageObject' && typeof node.url === 'string') imageObjectUrls.add(node.url);
    const types = Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']];
    if (types.some((type) => entityTypes.has(type)) && !node?.['@id']) failures.push(`${file}: ${types.join(',')} schema lacks @id`);
    if (types.includes('EventScheduled') && node?.endDate && new Date(node.endDate) < new Date()) {
      failures.push(`${file}: stale EventScheduled endDate ${node.endDate}`);
    }
  }
  for (const tag of html.matchAll(/<img\b[^>]*>/gi)) {
    const value = tag[0];
    if (/\bclass=["'][^"']*hero[^"']*["']/i.test(value) && /\bloading=["']lazy["']/i.test(value)) {
      failures.push(`${file}: hero image must not be lazy-loaded`);
    }
  }
  const hrefs = [...html.matchAll(/href="(\/[^"]*)"/g)].map((match) => match[1]);
  for (const raw of hrefs) {
    const pathname = raw.split(/[?#]/, 1)[0];
    if (/^\/(?:_astro|assets|images|fonts)\//.test(pathname) || /\.[a-z0-9]+$/i.test(pathname)) continue;
    if (pathname !== '/' && !pathname.endsWith('/')) failures.push(`${file}: non-trailing-slash ${raw}`);
    if ([...loserPaths].some((loser) => pathname === loser || (loser === '/places/' && pathname.startsWith(loser)))) {
      failures.push(`${file}: consolidation loser ${raw}`);
    }
    if (!(await routeExists(pathname))) failures.push(`${file}: broken internal link ${raw}`);
  }
}

if (imageObjectUrls.size < 100) failures.push(`ImageObject diversity is ${imageObjectUrls.size}; need at least 100 distinct URLs`);

const eventFiles = await filesNamed(contentEvents.pathname, (name) => /\.(?:json|md|mdx)$/i.test(name));
const archive = new Set(eventFiles.filter((file) => file.includes('/archive/')).map((file) => file.split('/').pop().replace(/\.[^.]+$/, '')));
for (const file of eventFiles.filter((file) => !file.includes('/archive/'))) {
  const slug = file.split('/').pop().replace(/\.[^.]+$/, '');
  if (archive.has(slug)) failures.push(`duplicate event content slug in events/ and events/archive/: ${slug}`);
}

for (const file of await filesNamed(publicDir.pathname, (name) => name.endsWith('.html'))) {
  const html = await readFile(file, 'utf8');
  if (!isNoindex(html)) failures.push(`${file}: raw public HTML must declare robots noindex`);
}

if (failures.length) {
  console.error(`SEO architecture lint failed (${failures.length} finding(s)):\n${failures.join('\n')}`);
  process.exit(1);
}

console.log('SEO architecture lint passed: links, sitemap, schema, hero loading, event slugs, and raw public HTML are valid.');
