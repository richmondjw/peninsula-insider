import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import sharp from 'sharp';
import { imageSource, imageNodes, optimizeImages, IMAGE_BYTE_LIMIT } from '../src/lib/optimize-images.mjs';

test('only owned public raster sources are eligible', () => {
  assert.equal(imageSource('/images/shore.webp?v=old').key, '/images/shore.webp');
  assert.equal(imageSource('/V2/images/shore.webp?v=old', '/V2/').key, '/images/shore.webp');
  assert.equal(imageSource('https://peninsulainsider.com.au/images/shore.webp').remote, false);
  for (const src of ['https://example.com/images/a.jpg', '/images/logo.svg', '/images/../../secret.jpg', 'file:///images/a.jpg', 'data:image/png;base64,abc']) {
    assert.equal(imageSource(src), null, src);
  }
  assert.equal(imageSource('https://tjjhpvslpysfklwpqmgz.supabase.co/storage/v1/object/public/cms-assets/page/home/a.jpg').remote, true);
});

test('parser leaves script strings and multiple-background compositions alone', () => {
  const nodes = imageNodes(`<img src="/images/a.jpg" alt="A &amp; B"><script>const x='<img src="/images/b.jpg">';</script><div style="background-image: url('/images/c.jpg'), url('/images/d.jpg')"></div>`);
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].attrs.alt, 'A & B');
});

test('build emits bounded responsive files, preserves source and editorial markup, and is repeatable', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pi-seo-test-'));
  const distRoot = path.join(root, 'dist');
  const cacheRoot = path.join(root, 'cache');
  await mkdir(path.join(distRoot, 'images'), { recursive: true });
  const input = await sharp({ create: { width: 1800, height: 1200, channels: 3, background: '#287c96' } }).png().toBuffer();
  await writeFile(path.join(distRoot, 'images', 'shore.png'), input);
  const markup = `<html><head><meta property="og:image" content="/images/shore.png"><script type="application/ld+json">{"image":"/images/shore.png"}</script></head><body><img class="home-cover__media" data-pi-purpose="hero" data-pi-edit="image" src="/images/shore.png?v=old" alt="Rock &amp; surf"><div role="img" aria-label="Coast" style="background-image: url('/images/shore.png')"></div></body></html>`;
  await writeFile(path.join(distRoot, 'index.html'), markup);
  const options = { distRoot, cacheRoot, routes: ['/'], logger: { info() {} } };
  const report = await optimizeImages(options);
  assert.equal(report.assets.length, 1);
  assert.equal(report.references, 2);
  const html = await readFile(path.join(distRoot, 'index.html'), 'utf8');
  const img = imageNodes(html).find((ref) => ref.kind === 'img');
  assert.equal(img.attrs.alt, 'Rock & surf');
  assert.equal(img.attrs['data-pi-source-src'], '/images/shore.png?v=old');
  assert.equal(img.attrs.sizes, '100vw');
  assert.equal(img.attrs.height, undefined, 'CSS-sized photos must not gain a fixed height');
  assert.equal(img.attrs.width, undefined, 'preserve the authored layout sizing');
  assert.match(img.attrs.srcset, /480w.*800w.*1200w.*1600w/);
  assert.match(html, /content="\/images\/shore.png"/);
  assert.match(html, /\{"image":"\/images\/shore.png"\}/);
  assert.deepEqual(await readFile(path.join(distRoot, 'images', 'shore.png')), input);
  for (const variant of report.assets[0].variants) {
    const bytes = await readFile(path.join(distRoot, variant.url));
    const metadata = await sharp(bytes).metadata();
    assert.ok(bytes.length < IMAGE_BYTE_LIMIT);
    assert.equal(metadata.width, variant.width);
    assert.equal(metadata.height, variant.height);
    assert.equal(metadata.format, 'webp');
  }
  // Real builds start from original source markup. Cache reuse must not alter URLs.
  await writeFile(path.join(distRoot, 'index.html'), markup);
  await optimizeImages(options);
  assert.equal(await readFile(path.join(distRoot, 'index.html'), 'utf8'), html);
  // Running the postprocessor twice must also preserve existing output.
  await optimizeImages(options);
  assert.equal(await readFile(path.join(distRoot, 'index.html'), 'utf8'), html);
});

test('missing source fails the build instead of shipping a broken rendition', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pi-seo-missing-'));
  await writeFile(path.join(root, 'index.html'), '<img src="/images/missing.jpg" alt="Missing">');
  await assert.rejects(optimizeImages({ distRoot: root, cacheRoot: path.join(root, 'cache'), routes: ['/'], logger: { info() {} } }), /ENOENT/);
});

test('published CMS refresh preserves renditions and applies real replacements to every occurrence', async () => {
  const layout = await readFile(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
  const code = [...layout.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((text) => text.includes('function applySlots()'));
  assert.ok(code);
  class FakeImage {
    constructor() {
      this.dataset = { piEntityType: 'page', piEntitySlug: 'home', piFieldPath: 'cover.image', piSourceSrc: 'https://cms.test/old.jpg' };
      this.attrs = { srcset: '/_images/small.webp 480w', sizes: '100vw', width: '1200', height: '800', src: '/_images/large.webp' };
      this.src = this.attrs.src;
    }
    removeAttribute(key) { delete this.attrs[key]; }
    getAttribute(key) { return this.attrs[key]; }
  }
  const images = [new FakeImage(), new FakeImage()];
  let slots = [{ entity_type: 'page', entity_slug: 'home', field_path: 'cover.image', public_url: 'https://cms.test/old.jpg', alt_text: 'The published coast photograph' }];
  let onPageLoad;
  const context = { __SB_URL: 'https://cms.test', __SB_ANON: 'public', URL, HTMLImageElement: FakeImage,
    document: { readyState: 'complete', querySelectorAll: () => images, addEventListener: (_, callback) => { onPageLoad = callback; } },
    fetch: async () => ({ ok: true, json: async () => slots }) };
  vm.runInNewContext(code, context);
  await new Promise((resolve) => setImmediate(resolve));
  for (const image of images) {
    assert.equal(image.src, '/_images/large.webp');
    assert.ok(image.attrs.srcset);
    assert.equal(image.alt, 'The published coast photograph');
  }
  slots = [{ ...slots[0], public_url: 'https://cms.test/new.jpg', alt_text: 'The new photograph' }];
  onPageLoad();
  await new Promise((resolve) => setImmediate(resolve));
  for (const image of images) {
    assert.equal(image.src, 'https://cms.test/new.jpg');
    assert.equal(image.attrs.srcset, undefined);
    assert.equal(image.dataset.piSourceSrc, undefined);
    assert.equal(image.alt, 'The new photograph');
  }
});
