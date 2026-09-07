import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
import sharp from 'sharp';

// Scope follows the September SEO scan, including the canonical plans hub.
export const IMAGE_ROUTES = ['/', '/eat/', '/journal/', '/plans/', '/explore/plans/',
  '/stay/', '/wine/', '/explore/', '/dog-friendly/', '/fishing/', '/weddings/',
  '/boating/', '/awards/', '/whats-on/', '/tour/', '/corporate-events/', '/guides/',
  '/ask/', '/editorial-approach/', '/map/', '/about/'];
export const IMAGE_BYTE_LIMIT = 100_000;
const SITE = 'https://peninsulainsider.com.au';
const CMS = 'https://tjjhpvslpysfklwpqmgz.supabase.co';
const VERSION = 'webp-v1';
const hash = (value) => createHash('sha256').update(value).digest('hex').slice(0, 20);
const escapeAttr = (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

export function imageSource(src, base = '/') {
  try {
    const url = new URL(src, SITE);
    if (url.origin === SITE && base !== '/' && url.pathname.startsWith(base)) {
      url.pathname = '/' + url.pathname.slice(base.length);
    }
    if (!/\.(webp|jpe?g|png|avif)$/i.test(url.pathname)) return null;
    if (url.origin === SITE && url.pathname.startsWith('/images/')) {
      return { key: url.pathname, remote: false };
    }
    if (url.origin === CMS && url.pathname.startsWith('/storage/v1/object/public/cms-assets/')) {
      return { key: url.href, remote: true };
    }
  } catch { /* Non-image or unsupported URL. */ }
  return null;
}

export function imageNodes(html) {
  const nodes = [];
  const visit = (node) => {
    const attrs = Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value]));
    if (node.tagName === 'img' && attrs.src) nodes.push({ node, attrs, src: attrs.src, kind: 'img' });
    else if (attrs.style) {
      const matches = [...attrs.style.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)];
      // Multiple backgrounds need art-direction decisions; never flatten them.
      if (matches.length === 1) nodes.push({ node, attrs, src: matches[0][2], kind: 'background' });
    }
    for (const child of node.childNodes || []) visit(child);
  };
  visit(parse(html, { sourceCodeLocationInfo: true }));
  return nodes;
}

export async function encodeVariant(input, requestedWidth) {
  let width = requestedWidth;
  for (;;) {
    for (const quality of [80, 72, 64, 56, 48, 40]) {
      const { data, info } = await sharp(input).rotate().resize({ width, withoutEnlargement: true })
        .webp({ quality, effort: 4 }).toBuffer({ resolveWithObject: true });
      if (data.length < IMAGE_BYTE_LIMIT) return { data, width: info.width, height: info.height, quality };
    }
    if (width <= 320) throw new Error('Cannot meet image byte budget');
    width = Math.max(320, Math.floor(width * 0.8));
  }
}

async function readSource(source, distRoot, cacheRoot) {
  if (!source.remote) {
    const filename = path.resolve(distRoot, '.' + decodeURIComponent(source.key));
    if (!filename.startsWith(path.resolve(distRoot) + path.sep)) throw new Error('Image outside build root');
    return readFile(filename);
  }
  const filename = path.join(cacheRoot, hash(source.key) + '.source');
  try {
    if (Date.now() - (await stat(filename)).mtimeMs < 86_400_000) return await readFile(filename);
  } catch { /* Cold cache. */ }
  const response = await fetch(source.key, { signal: AbortSignal.timeout(20_000), redirect: 'error' });
  if (!response.ok) throw new Error(`Image fetch returned ${response.status}: ${source.key}`);
  if (Number(response.headers.get('content-length')) > 25_000_000) throw new Error('Image exceeds input limit');
  const input = Buffer.from(await response.arrayBuffer());
  if (input.length > 25_000_000) throw new Error('Image exceeds input limit');
  await writeFile(filename, input);
  return input;
}

export async function optimizeImages({ distRoot, cacheRoot, routes = IMAGE_ROUTES, base = '/', logger = console }) {
  base = '/' + base.replace(/^\/+|\/+$/g, '') + '/';
  if (base === '//') base = '/';
  const outputRoot = path.join(distRoot, '_images');
  await mkdir(outputRoot, { recursive: true });
  await mkdir(cacheRoot, { recursive: true });
  const pages = [];
  const assets = new Map();
  for (const route of routes) {
    const file = path.join(distRoot, route.replace(/^\//, ''), 'index.html');
    let html;
    try { html = await readFile(file, 'utf8'); } catch (error) {
      if (error.code === 'ENOENT') throw new Error(`Missing audited route: ${route}`);
      throw error;
    }
    const refs = imageNodes(html).filter((ref) => imageSource(ref.src, base));
    pages.push({ route, file, html, refs });
    for (const ref of refs) {
      const source = imageSource(ref.src, base);
      if (!assets.has(source.key)) assets.set(source.key, { source });
    }
  }
  const queue = [...assets.values()];
  let completed = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (;;) {
      const asset = queue.shift();
      if (!asset) return;
      const input = await readSource(asset.source, distRoot, cacheRoot);
      const metadata = await sharp(input).metadata();
      if ((metadata.pages || 1) > 1) throw new Error(`Animated image requires manual review: ${asset.source.key}`);
      const sourceWidth = metadata.orientation >= 5 ? metadata.height : metadata.width;
      const widths = [...new Set([480, 800, 1200, 1600].map((width) => Math.min(width, sourceWidth)))];
      asset.originalBytes = input.length;
      asset.variants = [];
      for (const width of widths) {
        const stem = `${VERSION}-${hash(input)}-${width}`;
        const cachedFile = path.join(cacheRoot, stem + '.webp');
        let variant;
        try {
          const data = await readFile(cachedFile);
          const info = await sharp(data).metadata();
          if (data.length >= IMAGE_BYTE_LIMIT) throw new Error('Invalid cached image');
          variant = { data, width: info.width, height: info.height };
        } catch {
          variant = await encodeVariant(input, width);
          await writeFile(cachedFile, variant.data);
        }
        // A difficult image may use a narrower rendition to retain quality.
        if (asset.variants.some((v) => v.width === variant.width)) continue;
        const url = `${base}_images/${stem}.webp`;
        await writeFile(path.join(outputRoot, stem + '.webp'), variant.data);
        asset.variants.push({ url, width: variant.width, height: variant.height, bytes: variant.data.length });
      }
      asset.variants.sort((a, b) => a.width - b.width);
      completed++;
      if (completed % 25 === 0) logger.info(`Optimized ${completed}/${assets.size} images`);
    }
  }));

  let references = 0;
  for (const page of pages) {
    const replacements = [];
    for (const ref of page.refs) {
      const asset = assets.get(imageSource(ref.src, base).key);
      const hero = ref.attrs['data-pi-purpose'] === 'hero' || ref.attrs.fetchpriority === 'high';
      const fallback = asset.variants.find((v) => v.width >= (hero ? 1200 : 800)) || asset.variants.at(-1);
      const attrs = { ...ref.attrs, 'data-pi-source-src': ref.src };
      if (ref.kind === 'img') {
        // Existing picture/srcset markup owns its own rendition strategy.
        if (attrs.srcset || ref.node.parentNode?.tagName === 'picture') continue;
        attrs.src = fallback.url;
        attrs.srcset = asset.variants.map((v) => `${v.url} ${v.width}w`).join(', ');
        attrs.sizes ||= hero
          ? (attrs.class?.includes('home-cover') ? '100vw' : '(min-width: 768px) 50vw, 100vw')
          : '(min-width: 1200px) 400px, (min-width: 768px) 50vw, 100vw';
        // Preserve layout-owned dimensions. Adding height attributes to images
        // cropped by CSS aspect-ratio can turn an editorial crop into a tall
        // portrait; existing dimensions already reserve the intended space.
        attrs.decoding ||= 'async';
      } else {
        attrs.style = attrs.style.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/, `url('${fallback.url}')`);
      }
      const location = ref.node.sourceCodeLocation.startTag;
      const tag = `<${ref.node.tagName} ${Object.entries(attrs).map(([name, value]) => `${name}="${escapeAttr(value)}"`).join(' ')}>`;
      replacements.push({ ...location, tag });
      references++;
    }
    let html = page.html;
    for (const replacement of replacements.sort((a, b) => b.startOffset - a.startOffset)) {
      html = html.slice(0, replacement.startOffset) + replacement.tag + html.slice(replacement.endOffset);
    }
    if (html !== page.html) await writeFile(page.file, html);
  }
  const report = { generatedAt: new Date().toISOString(), byteLimit: IMAGE_BYTE_LIMIT,
    routes, references, assets: [...assets.values()] };
  await writeFile(path.join(cacheRoot, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  logger.info(`pi-optimize-images: ${assets.size} sources, ${references} references, all renditions below ${IMAGE_BYTE_LIMIT} bytes`);
  return report;
}

export default function optimizePageImages() {
  let base = '/';
  return { name: 'pi-optimize-images', hooks: {
    'astro:config:done': ({ config }) => { base = config.base; },
    'astro:build:done': async ({ dir, logger }) => optimizeImages({
      distRoot: fileURLToPath(dir),
      cacheRoot: fileURLToPath(new URL('../../.cache/pi-images/', import.meta.url)),
      logger,
      base,
    }),
  } };
}
