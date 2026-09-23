import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url);
const sitemap = readFileSync(new URL('sitemap.xml', dist), 'utf8');

for (const [route, destination] of [
  ['how-we-check', 'about'],
  ['pass', 'dispatch'],
]) {
  test(`retired /${route}/ is excluded from search and forwards to /${destination}/`, () => {
    const html = readFileSync(new URL(`${route}/index.html`, dist), 'utf8');
    assert.match(html, /<meta name="robots" content="noindex"\s*\/?\s*>/i);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://peninsulainsider\\.com\\.au/${destination}/"`));
    assert.match(html, new RegExp(`<meta http-equiv="refresh" content="0;url=/${destination}/"`));
    assert.doesNotMatch(sitemap, new RegExp(`<loc>https://peninsulainsider\\.com\\.au/${route}/</loc>`));
    assert.match(readFileSync(new URL(`${destination}/index.html`, dist), 'utf8'), /<main\b/i);
  });
}
