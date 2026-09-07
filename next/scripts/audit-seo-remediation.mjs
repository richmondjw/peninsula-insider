import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'parse5';
import { IMAGE_ROUTES, IMAGE_BYTE_LIMIT, imageNodes, imageSource } from '../src/lib/optimize-images.mjs';

const arg = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const origin = arg('--url', '');
const dist = path.resolve(arg('--dist', 'dist'));
const output = arg('--out', '.cache/seo-audit.json');
const titleRoutes = new Set(['/stay/', '/weddings/', '/awards/', '/whats-on/', '/corporate-events/', '/guides/', '/ask/', '/editorial-approach/', '/map/', '/about/']);
const descriptionRoutes = new Set(['/', '/stay/', '/explore/', '/fishing/', '/weddings/', '/boating/', '/tour/', '/corporate-events/']);
const pages = [];
const images = new Map();
const failures = [];
async function readUrl(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}
for (const route of IMAGE_ROUTES) {
  const html = origin ? (await readUrl(new URL(route, origin))).toString() : await readFile(path.join(dist, route.slice(1), 'index.html'), 'utf8');
  const fields = {};
  const visit = (node) => {
    const attrs = Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value]));
    if (node.tagName === 'title') fields.title = node.childNodes.map((child) => child.value || '').join('');
    if (node.tagName === 'meta' && (attrs.name || attrs.property)) fields[attrs.name || attrs.property] = attrs.content;
    if (node.tagName === 'meta' && attrs['http-equiv']?.toLowerCase() === 'refresh') fields.refresh = attrs.content;
    if (node.tagName === 'link' && attrs.rel === 'canonical') fields.canonical = attrs.href;
    for (const child of node.childNodes || []) visit(child);
  };
  visit(parse(html));
  const refs = imageNodes(html).filter((ref) => imageSource(ref.src) || ref.src.startsWith('/_images/'));
  const missingAlt = refs.filter((ref) => ref.kind === 'img' && !ref.attrs.alt?.trim()
    && ref.attrs['aria-hidden'] !== 'true' && ref.attrs.role !== 'presentation').map((ref) => ref.src);
  // Also report intentional decoration, so blank alt is never hidden by a score.
  const decorative = refs.filter((ref) => ref.kind === 'img' && !ref.attrs.alt?.trim() && !missingAlt.includes(ref.src)).length;
  const urls = new Set();
  for (const ref of refs) {
    urls.add(ref.src);
    for (const candidate of (ref.attrs.srcset || '').split(',')) {
      const url = candidate.trim().split(/\s+/)[0];
      if (url) urls.add(url);
    }
  }
  for (const url of urls) if (!images.has(url)) images.set(url, { url });
  const titleLength = [...(fields.title || '')].length;
  const descriptionLength = [...(fields.description || '')].length;
  if (titleRoutes.has(route) && (titleLength < 45 || titleLength > 60)) failures.push(`${route} title length ${titleLength}`);
  if (descriptionRoutes.has(route) && (descriptionLength < 150 || descriptionLength > 160)) failures.push(`${route} description length ${descriptionLength}`);
  if (missingAlt.length) failures.push(`${route} ${missingAlt.length} images without meaningful alt`);
  for (const field of fields.refresh || fields.robots?.includes('noindex') ? [] : ['title', 'description']) {
    if (fields[`og:${field}`] !== fields[field] || fields[`twitter:${field}`] !== fields[field]) failures.push(`${route} inconsistent social ${field}`);
  }
  pages.push({ route, ...fields, titleLength, descriptionLength, missingAlt, decorative, imageUrls: [...urls], fallbackUrls: [...new Set(refs.map((ref) => ref.src))] });
}
const queue = [...images.values()];
await Promise.all(Array.from({ length: 6 }, async () => {
  for (;;) {
    const image = queue.shift();
    if (!image) return;
    try {
      const url = new URL(image.url, origin || 'https://peninsulainsider.com.au');
      const bytes = origin || url.origin !== 'https://peninsulainsider.com.au'
        ? await readUrl(url)
        : await readFile(path.join(dist, decodeURIComponent(url.pathname).slice(1)));
      image.bytes = bytes.length;
      if (image.bytes >= IMAGE_BYTE_LIMIT) failures.push(`Oversized image (${image.bytes}): ${image.url}`);
    } catch (error) { image.error = error.message; failures.push(error.message); }
  }
}));
for (const page of pages) {
  page.fallbackBytes = page.fallbackUrls.reduce((sum, url) => sum + (images.get(url)?.bytes || 0), 0);
  page.oversized = page.imageUrls.filter((url) => images.get(url)?.bytes >= IMAGE_BYTE_LIMIT).length;
}
const report = { checkedAt: new Date().toISOString(), source: origin || dist, pages, images: [...images.values()], failures };
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ source: report.source, pages: pages.length, images: images.size, failures: failures.length, output,
  summary: pages.map(({ route, titleLength, descriptionLength, missingAlt, decorative, oversized, fallbackBytes }) => ({ route, titleLength, descriptionLength, missingAlt: missingAlt.length, decorative, oversized, fallbackBytes })) }, null, 2));
if (process.argv.includes('--assert') && failures.length) process.exitCode = 1;
