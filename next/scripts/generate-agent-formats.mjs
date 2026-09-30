import { parse } from 'parse5';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const SITE = 'https://peninsulainsider.com.au';
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
  if (find(tree, (n) => n.tagName === 'meta' && ((attr(n,'name') === 'robots' && /noindex/i.test(attr(n,'content') || '')) || attr(n,'http-equiv')?.toLowerCase() === 'refresh'))) throw new Error(`${canonical}: non-public or redirect page`);
  const heading = find(main, (n) => n.tagName === 'h1');
  if (!heading) throw new Error(`${canonical}: missing heading`);
  const title = text(heading).replace(/\s+/g, ' ').trim();
  const body = render(main, canonical).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const markdown = `Canonical: ${canonical}\nPublisher: Peninsula Insider\nFormat: public main text, generated from the canonical page; imagery, controls and price indicators omitted.\nDates and caveats below retain their page meaning; this format is not a new fact check.\n\n${body}\n`;
  return { title, markdown, contentSha256: createHash('sha256').update(markdown).digest('hex') };
}
export function generateFormats(dist) {
  const xml = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const paths = urls.filter((url) => { try { return new URL(url).origin === SITE; } catch { return false; } }).map((url) => new URL(url).pathname);
  const selected = ['/agents/', '/wine/pt-leo-estate/', '/eat/laura-pt-leo/', '/explore/plans/the-one-night-escape/'];
  for (const prefix of ['/wine/', '/eat/', '/stay/', '/explore/plans/', '/explore/walks/', '/journal/', '/whats-on/']) {
    for (const path of paths.filter((path) => path.startsWith(prefix) && path !== prefix).sort().slice(0, 3)) {
      if (selected.length < 20 && !selected.includes(path)) selected.push(path);
    }
  }
  // Keep a bounded cohort. Never fall back to walking the output directory: it
  // includes admin and private route shells that must not enter public exports.
  if (selected.length !== 20) throw new Error(`Expected 20 pilot pages, got ${selected.length}`);
  const records = [];
  for (const pathname of selected) {
    if (!paths.includes(pathname) || !/^\/[a-z0-9/-]+\/$/.test(pathname) || pathname.includes('..')) throw new Error(`Invalid pilot route: ${pathname}`);
    const file = join(dist, pathname, 'index.html');
    const html = readFileSync(file, 'utf8');
    const canonical = `${SITE}${pathname}`;
    const record = extractPage(html, canonical);
    const markdownUrl = `${canonical}index.md`;
    writeFileSync(join(dist, pathname, 'index.md'), record.markdown);
    const alternate = `<link rel="alternate" type="text/markdown" href="${markdownUrl}" title="Plain text version">`;
    // Idempotent when this post-build step is repeated against the same build.
    const cleaned = html.replace(/<link rel="alternate" type="text\/markdown"[^>]*>/g, '');
    writeFileSync(file, cleaned.replace('</head>', `${alternate}</head>`));
    records.push({ id: canonical, title: record.title, canonicalUrl: canonical, markdownUrl, contentSha256: record.contentSha256, htmlBytes: Buffer.byteLength(cleaned), markdownBytes: Buffer.byteLength(record.markdown) });
  }
  const catalogue = { schemaVersion: '1.0', generatedAt: new Date().toISOString(), scope: '20-page public-content pilot; not a complete site or change history', documentation: `${SITE}/agents/`, dateSemantics: 'generatedAt is conversion time, not source verification. contentSha256 covers the Markdown representation.', count: records.length, records };
  mkdirSync(join(dist, 'agents'), { recursive: true });
  writeFileSync(join(dist, 'agents/catalog.json'), JSON.stringify(catalogue, null, 2) + '\n');
  return catalogue;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dist = resolve(process.argv.includes('--dist') ? process.argv[process.argv.indexOf('--dist') + 1] : 'dist');
  if (!existsSync(join(dist, 'sitemap.xml'))) throw new Error('Run against a completed public build with --dist PATH');
  console.log(`Generated compact formats for ${generateFormats(dist).count} public pages.`);
}
