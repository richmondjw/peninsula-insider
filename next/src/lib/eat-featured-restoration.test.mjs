import test from 'node:test';
import assert from 'node:assert/strict';
import { eatFeaturedRestoration } from './eat-featured-restoration.mjs';

const slugs = ['commonfolk-coffee', 'tedesca-osteria', 'barragunda-dining', 'portsea-hotel'];
test('unresolved historical uploads fail closed on every public surface', () => {
  for (const slug of slugs) {
    for (const surface of ['/eat/#the-six', '/eat/', '/eat/#directory', '/wine/#the-six', undefined]) {
      assert.equal(eatFeaturedRestoration(slug, surface), undefined);
    }
  }
  for (const slug of ['merricks-general-wine-store', 'doot-doot-doot', 'other', '__proto__']) {
    assert.equal(eatFeaturedRestoration(slug, '/eat/#the-six'), undefined);
  }
});
test('a caller cannot bypass the rights gate with an empty or unrelated hold list', () => {
  for (const slug of slugs) {
    assert.equal(eatFeaturedRestoration(slug, '/eat/#the-six', []), undefined);
    assert.equal(eatFeaturedRestoration(slug, '/eat/#the-six', [{ storagePath: 'unrelated.jpg' }]), undefined);
  }
});
