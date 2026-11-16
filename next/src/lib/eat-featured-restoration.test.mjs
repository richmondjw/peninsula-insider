import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { eatFeaturedRestoration } from './eat-featured-restoration.mjs';

const historical = JSON.parse(readFileSync(new URL('../../../ops/page-quality/assessments/eat-image-inventory-2026-10-03.json', import.meta.url)));
const slugs = ['commonfolk-coffee', 'tedesca-osteria', 'barragunda-dining', 'portsea-hotel'];
test('only the four exact historical originals are restored to the featured surface', () => {
  for (const slug of slugs) {
    const image = eatFeaturedRestoration(slug, '/eat/#the-six');
    assert.equal(image.src, historical.rows.find(row => row.slug === slug).renderedImageSrc);
    assert.ok(image.alt.length > 30);
    for (const surface of ['/eat/', '/eat/#directory', '/wine/#the-six', undefined]) {
      assert.equal(eatFeaturedRestoration(slug, surface), undefined);
    }
    for (const key of ['rightsStatus', 'permission', 'rightsHolder', 'creator', 'credit', 'license', 'depictionStatus']) {
      assert.equal(image[key], undefined, `${key} must not be fabricated`);
    }
  }
  for (const slug of ['merricks-general-wine-store', 'doot-doot-doot', 'other', '__proto__']) {
    assert.equal(eatFeaturedRestoration(slug, '/eat/#the-six'), undefined);
  }
});
test('a future quarantine of any pinned original suppresses that restoration', () => {
  for (const slug of slugs) {
    const image = eatFeaturedRestoration(slug, '/eat/#the-six');
    const storagePath = image.src.split('/cms-assets/')[1];
    assert.equal(eatFeaturedRestoration(slug, '/eat/#the-six', [{ storagePath }]), undefined);
    assert.deepEqual(eatFeaturedRestoration(slug, '/eat/#the-six', [{ storagePath: 'unrelated.jpg' }]), image);
  }
});
test('Commonfolk is described as production imagery without a location or identity claim', () => {
  const image = eatFeaturedRestoration('commonfolk-coffee', '/eat/#the-six');
  assert.equal(image.caption, 'Coffee production');
  assert.doesNotMatch(image.alt, /Mornington|cafe|Commonfolk/i);
});
