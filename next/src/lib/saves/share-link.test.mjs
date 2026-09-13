/**
 * Peninsula Insider - shared-plan payload safety.
 *
 * A shared plan is decoded from a URL that anyone can craft and send to a
 * reader. decodePlan is the trust boundary, so these tests assert that a
 * hostile payload cannot survive it.
 *
 * Why the boundary and not the render site: a recipient can fork a shared
 * plan into their own saved list. Sanitising only on render would let a bad
 * href be persisted and then re-rendered later from a surface that trusts
 * its own stored data.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { encodePlan, decodePlan } from './share-link.ts';

/** Encode an arbitrary object as a payload, bypassing encodePlan's typing. */
function payload(items) {
  const json = JSON.stringify({ v: 1, ts: Date.now(), items });
  return Buffer.from(json, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const good = {
  kind: 'venue',
  slug: 'pt-leo-estate',
  title: 'Pt. Leo Estate',
  href: '/wine/pt-leo-estate/',
};

test('a well-formed plan round-trips', () => {
  const plan = decodePlan(encodePlan([{ ...good, savedAt: 1 }]));
  assert.equal(plan.items.length, 1);
  assert.equal(plan.items[0].href, '/wine/pt-leo-estate/');
});

test('executable and smuggling schemes are rejected', () => {
  // These are the shapes an HTML escaper does not touch: they contain none of
  // the characters it replaces, so they survive escaping and stay clickable.
  const schemes = [
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    '  javascript:alert(1)',
    'data:text/html,<script></script>',
    'vbscript:msgbox',
    'blob:https://evil.test/x',
    'file:///etc/passwd',
  ];
  for (const href of schemes) {
    const plan = decodePlan(payload([{ ...good, href }]));
    assert.equal(plan.items.length, 0, `should have dropped: ${href}`);
  }
});

test('off-site and protocol-relative links are rejected', () => {
  for (const href of ['//evil.test/x', 'https://evil.test/x', 'http://evil.test/x', 'evil.test']) {
    const plan = decodePlan(payload([{ ...good, href }]));
    assert.equal(plan.items.length, 0, `should have dropped: ${href}`);
  }
});

test('control characters in a href are rejected', () => {
  // Embedded NUL, tab, newline and DEL are used to break a parser's scheme
  // detection, so a href carrying any of them is refused outright. Built from
  // char codes so the bytes cannot be lost passing through an editor.
  const codes = [0x00, 0x09, 0x0a, 0x0d, 0x1f, 0x7f];
  for (const code of codes) {
    const href = '/eat/a' + String.fromCharCode(code) + 'b/';
    const plan = decodePlan(payload([{ ...good, href }]));
    const hex = code.toString(16).padStart(4, '0');
    assert.equal(plan.items.length, 0, `should have dropped href containing U+${hex}`);
  }
});

test('an unknown kind is rejected', () => {
  const plan = decodePlan(payload([{ ...good, kind: 'restaurant' }]));
  assert.equal(plan.items.length, 0);
});

test('one bad item drops out without losing the good ones', () => {
  // The whole page used to throw on a malformed item, leaving the recipient
  // with a blank plan and no empty state.
  const plan = decodePlan(
    payload([good, { ...good, slug: 'x', href: 'javascript:alert(1)' }, { ...good, slug: 'y' }]),
  );
  assert.equal(plan.items.length, 2);
  assert.deepEqual(
    plan.items.map((i) => i.slug),
    ['pt-leo-estate', 'y'],
  );
});

test('missing required fields are rejected', () => {
  const cases = [
    { ...good, kind: undefined },
    { ...good, slug: '' },
    { ...good, title: '' },
    { ...good, href: undefined },
    'not-an-object',
    null,
  ];
  for (const item of cases) {
    const plan = decodePlan(payload([item]));
    assert.equal(plan.items.length, 0);
  }
});

test('image sources allow site-relative and https, reject the rest', () => {
  // Saved covers are sometimes absolute URLs on the storage host, so the
  // stricter href rule would have stripped every shared image.
  const kept = ['/images/a.jpg', 'https://tjjhpvslpysfklwpqmgz.supabase.co/storage/v1/x.jpg'];
  for (const image_url of kept) {
    const plan = decodePlan(payload([{ ...good, image_url }]));
    assert.equal(plan.items[0].image_url, image_url, `should have kept: ${image_url}`);
  }

  const dropped = ['javascript:alert(1)', 'data:image/svg+xml,<svg onload=alert(1)>', '//evil.test/x.jpg', 'http://evil.test/x.jpg'];
  for (const image_url of dropped) {
    const plan = decodePlan(payload([{ ...good, image_url }]));
    assert.equal(plan.items.length, 1, 'the item itself is still valid');
    assert.equal(plan.items[0].image_url, undefined, `should have dropped: ${image_url}`);
  }
});

test('a malformed envelope returns null rather than throwing', () => {
  assert.equal(decodePlan(null), null);
  assert.equal(decodePlan(''), null);
  assert.equal(decodePlan('not-base64!!'), null);
  assert.equal(decodePlan(payload('not-an-array')), null);
});
