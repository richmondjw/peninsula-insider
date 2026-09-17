// Build derivatives from the published image, never replace the CMS source.
// Opt-in markup supplies its real display sizes; no client-side image service.
import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir, mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
import sharp from 'sharp';

const CMS = 'https://tjjhpvslpysfklwpqmgz.supabase.co/storage/v1/object/public/cms-assets/';
const MAX_BYTES = 25 * 1024 * 1024;
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;');

export function imageNodes(html) {
  const out = [];
  function walk(node) {
    if (node.tagName === 'img' && node.attrs.some(a => a.name === 'data-pi-responsive')) out.push(node);
    for (const child of node.childNodes ?? []) walk(child);
  }
  walk(parse(html, { sourceCodeLocationInfo: true }));
  return out;
}

export async function sourceBytes(src, root) {
  if (src.startsWith('/images/') && !src.includes('\\')) {
    const base = await realpath(path.join(root, 'images'));
    const file = await realpath(path.join(root, decodeURIComponent(src.split('?')[0])));
    if (!file.startsWith(base + path.sep)) throw new Error('Image escapes public images');
    const bytes = await readFile(file);
    if (bytes.length > MAX_BYTES) throw new Error('Image exceeds 25 MB');
    return bytes;
  }
  if (!src.startsWith(CMS)) return null;
  const response = await fetch(src, { signal: AbortSignal.timeout(20000), redirect: 'error' });
  if (!response.ok) throw new Error(`CMS image HTTP ${response.status}: ${src}`);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > MAX_BYTES) throw new Error('CMS image exceeds 25 MB');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function derivatives(bytes, root) {
  const metadata = await sharp(bytes, { limitInputPixels: 50000000 }).metadata();
  // Preserve animated assets and vectors intact.
  if (!['jpeg', 'png', 'webp', 'avif'].includes(metadata.format) || metadata.pages > 1) return null;
  const width = metadata.autoOrient?.width ?? metadata.width;
  const hash = createHash('sha256').update(bytes).update('pi-webp-80-v1').digest('hex').slice(0, 20);
  const widths = [...new Set([480, 800, 1280, 1920].map(w => Math.min(w, width)))];
  await mkdir(path.join(root, '_media'), { recursive: true });
  const results = [];
  // Sequential transforms bound CPU/RAM on CI workers.
  for (const w of widths) {
    const output = await sharp(bytes, { limitInputPixels: 50000000 }).rotate()
      .resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
    const src = `/_media/${hash}-${output.info.width}.webp`;
    await writeFile(path.join(root, src), output.data);
    results.push({ src, width: output.info.width, height: output.info.height, bytes: output.data.length });
  }
  return results;
}

export async function optimiseHtml(html, resolve) {
  const replacements = [];
  for (const node of imageNodes(html)) {
    const attrs = Object.fromEntries(node.attrs.map(a => [a.name, a.value]));
    if (attrs.srcset || attrs['data-pi-image-original-src']) continue;
    const variants = await resolve(attrs.src);
    if (!variants?.length) continue;
    const fallback = variants.find(v => v.width >= 1280) ?? variants.at(-1);
    attrs['data-pi-image-original-src'] = attrs.src;
    attrs.src = fallback.src;
    attrs.srcset = variants.map(v => `${v.src} ${v.width}w`).join(', ');
    attrs.sizes = attrs['data-pi-responsive'];
    // Do not change an existing layout's aspect ratio.
    if (!attrs.width && !attrs.height) {
      attrs.width = String(fallback.width);
      attrs.height = String(fallback.height);
    }
    const tag = '<img ' + Object.entries(attrs).map(([k, v]) => `${k}="${escape(v)}"`).join(' ') + '>';
    replacements.push({ ...node.sourceCodeLocation.startTag, tag });
  }
  for (const change of replacements.reverse()) html = html.slice(0, change.startOffset) + change.tag + html.slice(change.endOffset);
  return html;
}

export default function responsiveImages() {
  return {
    name: 'pi-responsive-images',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const cache = new Map();
        const manifest = [];
        async function resolve(src) {
          if (!cache.has(src)) cache.set(src, (async () => {
            const bytes = await sourceBytes(src, root);
            if (!bytes) return null;
            const variants = await derivatives(bytes, root);
            if (variants) manifest.push({ source: src, originalBytes: bytes.length, variants });
            return variants;
          })());
          return cache.get(src);
        }
        let pages = 0;
        async function walk(folder) {
          for (const item of await readdir(folder, { withFileTypes: true })) {
            const file = path.join(folder, item.name);
            if (item.isDirectory() && !['_media', 'dev', 'admin'].includes(item.name)) await walk(file);
            else if (item.isFile() && item.name.endsWith('.html')) {
              const html = await readFile(file, 'utf8');
              if (!html.includes('data-pi-responsive')) continue;
              const output = await optimiseHtml(html, resolve);
              if (output !== html) { await writeFile(file, output); pages++; }
            }
          }
        }
        await walk(root);
        await writeFile(path.join(root, 'image-delivery.json'), JSON.stringify({ version: 1, pages, images: manifest }, null, 2));
        logger.info(`Responsive images: ${manifest.length} sources across ${pages} pages; CMS originals preserved.`);
      },
    },
  };
}
