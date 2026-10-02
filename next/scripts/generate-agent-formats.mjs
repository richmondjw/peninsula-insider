import { parse } from 'parse5';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const SITE = 'https://peninsulainsider.com.au';
export const FORMAT_VERSION = '2.0';
export function publicPath(value) {
  if (typeof value !== 'string' || !/^\/(?:[a-z0-9-]+\/)*$/.test(value)) return false;
  return !/^\/(?:admin|access|account|api|ops|next|docs|reports|engine|preview|dev|me|saved|trips|auth|studio|pagefind)(?:\/|$)/.test(value) && !/^\/partners\/(?:portal|dashboard|claim)(?:\/|$)/.test(value);
}
const digest = (value) => createHash('sha256').update(value).digest('hex');
export function citationDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return null;
  const day = new Date(value.slice(0,10) + 'T00:00:00Z');
  return Number.isFinite(day.valueOf()) && day.toISOString().slice(0,10) === value.slice(0,10) && Number.isFinite(Date.parse(value)) ? value : null;
}
const attr = (node, key) => node.attrs?.find((a) => a.name === key)?.value;
const children = (node) => node.childNodes || [];
function find(node, predicate) {
  if (predicate(node)) return node;
  for (const child of children(node)) { const result = find(child, predicate); if (result) return result; }
}
const text = (node) => node.nodeName === '#text' ? node.value : node.tagName === 'br' ? ' ' : children(node).map(text).join(' ');
const escape = (value) => value.replace(/([\\`*_{}\[\]<>])/g, '\\$1');
const safeUrl = (value, base) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  try { const u = new URL(value, base); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; } catch { return null; }
};
const omitted = new Set(['script', 'style', 'template', 'noscript', 'nav', 'form', 'button', 'input', 'select', 'textarea', 'svg', 'img']);
function render(node, base) {
  if (node.nodeName === '#text') return escape(node.value.replace(/\s+/g, ' '));
  if (attr(node, 'hidden') !== undefined || attr(node, 'aria-hidden') === 'true') return ' ';
  if (omitted.has(node.tagName) || (attr(node, 'class') || '').split(/\s+/).includes('venue-detail__price-band')) return '';
  const body = children(node).map((child) => render(child, base)).join('');
  if (node.tagName === 'a') { const href = safeUrl(attr(node, 'href'), base); return href && body.trim() ? `[${body.trim()}](<${href}>)` : body; }
  if (/^h[1-6]$/.test(node.tagName || '')) return `\n\n${'#'.repeat(Number(node.tagName[1]))} ${body.trim()}\n\n`;
  if (node.tagName === 'li' && !body.trim()) return '';
  if (node.tagName === 'li') return `\n- ${body.trim()}\n`;
  if (node.tagName === 'dt') return `\n\n**${body.trim()}**\n`;
  if (node.tagName === 'br') return '\n';
  if (node.tagName === 'span') return body.trim() ? ' ' + body.trim() + ' ' : '';
  if (['th','td'].includes(node.tagName)) return `${body.trim()} | `;
  if (['strong','b'].includes(node.tagName)) return `**${body}**`;
  if (['p','div','section','article','header','aside','dd','ul','ol','dl','tr','figure','figcaption','details','summary'].includes(node.tagName)) return `\n\n${body.trim()}\n\n`;
  return body;
}
export function extractPage(html, canonical) {
  const tree = parse(html);
  const main = find(tree, (n) => n.tagName === 'main');
  if (!main) throw new Error(`${canonical}: no public main content`);
  const declared = find(tree, (n) => n.tagName === 'link' && attr(n, 'rel') === 'canonical');
  if (attr(declared || {}, 'href') !== canonical) throw new Error(`${canonical}: canonical mismatch`);
  if (find(tree, (n) => n.tagName === 'meta' && ((attr(n,'name')?.toLowerCase() === 'robots' && /noindex/i.test(attr(n,'content') || '')) || attr(n,'http-equiv')?.toLowerCase() === 'refresh'))) throw new Error(`${canonical}: non-public or redirect page`);
  const heading = find(main, (n) => n.tagName === 'h1');
  if (!heading) throw new Error(`${canonical}: missing heading`);
  const title = text(heading).replace(/\s+/g, ' ').trim();
  const body = render(main, canonical).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const meta = (name) => attr(find(tree, n => n.tagName === 'meta' && (attr(n, 'property') === name || attr(n, 'name') === name)) || {}, 'content') || null;
  const citation = { title, publisher: 'Peninsula Insider', url: canonical, publishedAt: citationDate(meta('article:published_time')), modifiedAt: citationDate(meta('article:modified_time')) };
  const markdown = `Canonical: ${canonical}\nPublisher: Peninsula Insider\nPublished: ${citation.publishedAt || 'unknown'}\nModified: ${citation.modifiedAt || 'unknown'}\nFormat: public main text, generated from the canonical page; imagery and interactive controls omitted.\nDates and caveats below retain their page meaning; this format is not a new fact check.\n\n${body}\n`;
  return { title, markdown, citation, contentSha256: digest(markdown) };
}

export function validateCatalog(catalog) {
  if (!catalog || !['1.0', FORMAT_VERSION].includes(catalog.schemaVersion) || !Array.isArray(catalog.records) || catalog.count !== catalog.records.length || catalog.count > 10000 || !Number.isFinite(Date.parse(catalog.generatedAt))) throw new Error('Invalid previous public catalogue');
  const seen = new Set();
  for (const record of catalog.records) {
    const url = new URL(record.canonicalUrl);
    if (url.origin !== SITE || url.search || url.hash || !publicPath(url.pathname) || record.id !== url.href || record.markdownUrl !== `${url.href}index.md` || !/^[a-f0-9]{64}$/.test(record.contentSha256) || seen.has(record.id)) throw new Error('Unsafe or duplicate previous catalogue record');
    seen.add(record.id);
  }
  if (catalog.schemaVersion === FORMAT_VERSION && catalog.snapshotId !== digest(JSON.stringify(catalog.records.map(r=>[r.id,r.contentSha256])))) throw new Error('Previous catalogue snapshot hash mismatch');
  return catalog;
}
export function compareCatalogs(previous, current) {
  if (previous) validateCatalog(previous);
  const before = new Map((previous?.records || []).map(r => [r.id, r]));
  const after = new Map(current.records.map(r => [r.id, r]));
  const changes = [];
  if (previous) {
    for (const record of current.records) {
      const old = before.get(record.id);
      if (!old || old.contentSha256 !== record.contentSha256) changes.push({id:record.id, kind: old ? 'representation-changed' : 'representation-added', canonicalUrl:record.canonicalUrl, markdownUrl:record.markdownUrl, contentSha256:record.contentSha256, previousContentSha256:old?.contentSha256 || null});
    }
    for (const record of previous.records) if (!after.has(record.id)) changes.push({id:record.id,kind:'representation-removed',canonicalUrl:record.canonicalUrl,markdownUrl:null,contentSha256:null,previousContentSha256:record.contentSha256});
  }
  return {schemaVersion:'1.0', generatedAt:current.generatedAt, baselineAvailable:Boolean(previous), fromSnapshot:previous?.snapshotId || (previous ? digest(JSON.stringify(previous.records.map(r=>[r.id,r.contentSha256]))) : null), toSnapshot:current.snapshotId, previousGeneratedAt:previous?.generatedAt || null, semantics:'Changes in public representations since the named prior snapshot. Added is not newly opened; removed is not confirmed closed. Inspect the canonical page or source for the reason. Clients with another snapshot must compare the full catalogue.', count:changes.length, changes};
}
export function generateFormats(dist, { previous = null } = {}) {
  const xml = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
  const paths = [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => {
    const u = new URL(m[1]);
    if (u.origin !== SITE || u.search || u.hash || !publicPath(u.pathname)) throw new Error(`Unsafe sitemap export: ${m[1]}`);
    return u.pathname;
  }))].sort();
  if (!paths.includes('/agents/') || paths.length < 20) throw new Error('Incomplete public sitemap');
  const records = [];
  for (const pathname of paths) {
    const file = join(dist, pathname, 'index.html');
    const html = readFileSync(file, 'utf8');
    const canonical = `${SITE}${pathname}`;
    const record = extractPage(html, canonical);
    const markdownUrl = `${canonical}index.md`;
    writeFileSync(join(dist, pathname, 'index.md'), record.markdown);
    const alternate = `<link rel="alternate" type="text/markdown" href="${markdownUrl}" title="Plain text version">`;
    const cleaned = html.replace(/<link rel="alternate" type="text\/markdown"[^>]*>/g, '');
    writeFileSync(file, cleaned.replace('</head>', `${alternate}</head>`));
    records.push({id:canonical,title:record.title,section:pathname.split('/')[1] || 'home',canonicalUrl:canonical,markdownUrl,contentSha256:record.contentSha256,citation:record.citation,htmlBytes:Buffer.byteLength(cleaned),markdownBytes:Buffer.byteLength(record.markdown)});
  }
  const generatedAt = new Date().toISOString();
  const snapshotId = digest(JSON.stringify(records.map(r=>[r.id,r.contentSha256])));
  const catalogue = {schemaVersion:FORMAT_VERSION,generatedAt,snapshotId,scope:'All canonical indexable pages in the published sitemap. Private, account, redirect and non-indexable pages are excluded.',documentation:`${SITE}/agents/`,dateSemantics:'generatedAt is conversion time, not source verification. Citation dates retain the page metadata meaning and may be null. contentSha256 covers the Markdown representation.',count:records.length,records};
  mkdirSync(join(dist,'agents/sections'),{recursive:true});
  const sections = [...new Set(records.map(r=>r.section))].map(section=>({section,count:records.filter(r=>r.section===section).length,url:`${SITE}/agents/sections/${section}.json`}));
  for (const section of sections) writeFileSync(join(dist,`agents/sections/${section.section}.json`),JSON.stringify({schemaVersion:FORMAT_VERSION,generatedAt,snapshotId,section:section.section,count:section.count,records:records.filter(r=>r.section===section.section)},null,2)+'\n');
  writeFileSync(join(dist,'agents/catalog.json'),JSON.stringify(catalogue,null,2)+'\n');
  writeFileSync(join(dist,'agents/changes.json'),JSON.stringify(compareCatalogs(previous,catalogue),null,2)+'\n');
  writeFileSync(join(dist,'agents/manifest.json'),JSON.stringify({schemaVersion:FORMAT_VERSION,generatedAt,snapshotId,count:records.length,catalogUrl:`${SITE}/agents/catalog.json`,changesUrl:`${SITE}/agents/changes.json`,guideUrl:`${SITE}/agents/`,termsUrl:`${SITE}/terms/`,sections,retrieval:{method:'GET',negotiation:'Use explicit index.md URLs; Accept: text/markdown does not negotiate HTML URLs.',cache:'Respect Cache-Control. Send If-None-Match with the last ETag; a 304 means reuse your cached body.',retries:'On 429 or 503, honour Retry-After when provided; otherwise use bounded exponential backoff. Do not repeatedly retry 404.',concurrency:'Prefer sequential requests and fetch only the pages needed. This is client guidance, not a guaranteed service limit.'},unknowns:'Missing or null factual fields and check dates are unknown. Generated timestamps never verify facts.'},null,2)+'\n');
  return catalogue;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dist = resolve(process.argv.includes('--dist') ? process.argv[process.argv.indexOf('--dist') + 1] : 'dist');
  const previousFile = process.argv.includes('--previous') ? process.argv[process.argv.indexOf('--previous')+1] : process.env.AGENT_PREVIOUS_CATALOG;
  const previous = previousFile ? JSON.parse(readFileSync(resolve(previousFile),'utf8')) : null;
  if (!existsSync(join(dist,'sitemap.xml'))) throw new Error('Run against a completed public build with --dist PATH');
  console.log(`Generated compact formats for ${generateFormats(dist,{previous}).count} public pages.`);
}
