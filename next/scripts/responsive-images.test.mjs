import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import sharp from 'sharp';
import { derivatives, optimiseHtml, sourceBytes } from '../src/lib/responsive-images-integration.mjs';

test('published image derivatives preserve aspect ratio, never upscale, and match actual bytes', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pi-images-'));
  try {
    await mkdir(path.join(root, 'images'));
    const original = await sharp({ create: { width: 1000, height: 600, channels: 3, background: '#336655' } }).jpeg().toBuffer();
    await writeFile(path.join(root, 'images/source.jpg'), original);
    const results = await derivatives(await sourceBytes('/images/source.jpg?v=abc', root), root);
    assert.deepEqual(results.map(r => r.width), [480, 800, 1000]);
    for (const r of results) {
      const bytes = await readFile(path.join(root, r.src));
      const meta = await sharp(bytes).metadata();
      assert.equal(meta.width, r.width);
      assert.equal(meta.height / meta.width, 0.6);
      assert.equal(bytes.length, r.bytes);
    }
    await assert.rejects(sourceBytes('/images/../../outside.jpg', root));
    assert.equal(await sourceBytes('https://untrusted.example/image.jpg', root), null);
    const html = '<p>Untouched &amp; text</p><img src="/images/source.jpg" alt="A &amp; B" data-pi-responsive="50vw" data-pi-field-path="hero"><script>{"image":"/images/source.jpg"}</script>';
    const output = await optimiseHtml(html, async () => results);
    assert.match(output, /data-pi-image-original-src="\/images\/source.jpg"/);
    assert.match(output, /data-pi-field-path="hero"/);
    assert.match(output, /alt="A &amp; B"/);
    assert.match(output, /sizes="50vw"/);
    assert.ok(output.startsWith('<p>Untouched &amp; text</p>'));
    assert.ok(output.endsWith('<script>{"image":"/images/source.jpg"}</script>'));
    assert.equal(await optimiseHtml(output, async () => { throw Error('double transform'); }), output);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('production GA loader requires both production hostname and consent', async () => {
  const source = await readFile(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
  const loader = [...source.matchAll(/<script is:inline>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes("var GA_ID ="));
  for (const hostname of ['localhost', '127.0.0.1', 'preview.example', 'peninsulainsider.com.au', 'www.peninsulainsider.com.au']) {
    for (const consent of [false, true]) {
      const loaded = [];
      const context = { location: { hostname }, localStorage: { getItem: () => JSON.stringify({ analytics: consent }) }, document: { createElement: () => ({}), head: { appendChild: s => loaded.push(s.src) } }, addEventListener() {} };
      context.window = context;
      vm.runInNewContext(loader, context);
      assert.equal(loaded.length, consent && ['peninsulainsider.com.au', 'www.peninsulainsider.com.au'].includes(hostname) ? 1 : 0);
    }
  }
});

test('CMS replacement discards derivatives of the old photograph immediately', async () => {
  const source = await readFile(new URL('../src/lib/inline-edit/client.ts', import.meta.url), 'utf8');
  const fn = source.slice(source.indexOf('function setImageSrc('), source.indexOf('function readImageDescriptor('))
    .replace('el: HTMLElement, src: string', 'el, src');
  class HTMLImageElement {
    dataset = { piImageOriginalSrc: '/old.jpg' };
    attrs = new Map([['srcset', '/old-small.webp 480w'], ['sizes', '100vw']]);
    removeAttribute(name) { this.attrs.delete(name); }
  }
  const el = new HTMLImageElement();
  vm.runInNewContext(fn + '\nsetImageSrc(el, "/replacement.jpg");', { HTMLImageElement, el });
  assert.equal(el.src, '/replacement.jpg');
  assert.equal(el.attrs.size, 0);
  assert.equal(el.dataset.piImageOriginalSrc, undefined);
});
