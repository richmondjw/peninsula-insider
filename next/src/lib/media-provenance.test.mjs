/**
 * Tests for the media-provenance read model.
 *
 * The assertions that matter are the refusals, and the sharpest one is
 * `altFor`. Two hero surfaces and the hero resolver itself each carried a line
 * of the shape:
 *
 *     const heroAlt = hero.alt || venueName;
 *
 * which is invisible until an image is marked decorative. Then the
 * deliberately empty alt falls straight through `||` and is refilled with the
 * entity's own name - so the record says "skip this, it shows nothing" and the
 * page says "this is a photograph of Rye Hotel". The empty alt was the whole
 * point, and the fallback silently undid it. Half this file exists to stop
 * that reappearing.
 *
 * Nothing here reads a clock. `rightsEstablishedOn` is a date this module
 * never interprets, so no case needs to pin "now".
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  altFor,
  assertsActualDepiction,
  depictionStatusOf,
  hasRecordedProvenance,
  illustrativeDisclosure,
  isDecorative,
  isIllustrative,
  rightsStateOf,
} from './media-provenance.ts';

// ── altFor: the refill bug ───────────────────────────────────────────────

test('a decorative image gets an empty alt and is marked presentational', () => {
  assert.deepEqual(altFor({ alt: 'A beach.', decorative: true }, 'Rye Hotel'), {
    alt: '',
    presentation: true,
  });
});

test('the fallback is dropped on a decorative image, never applied to it', () => {
  // The regression this file is named for. A fallback here re-labels a
  // photograph of somewhere else with the entity's own name.
  const { alt } = altFor({ alt: '', decorative: true }, 'Rye Hotel');
  assert.equal(alt, '');
  assert.notEqual(alt, 'Rye Hotel');
});

test('the fallback still applies to a non-decorative image with no alt', () => {
  assert.deepEqual(altFor({ alt: '   ' }, 'Rye Hotel'), { alt: 'Rye Hotel', presentation: false });
  assert.deepEqual(altFor(null, 'Rye Hotel'), { alt: 'Rye Hotel', presentation: false });
});

test('an image with its own alt keeps it and is not presentational', () => {
  assert.deepEqual(altFor({ alt: 'A plate of steak and chips.' }, 'Rye Hotel'), {
    alt: 'A plate of steak and chips.',
    presentation: false,
  });
});

test('with no alt and no fallback the result is empty but NOT presentational', () => {
  // Absent alt text is a gap in the record. Marking it presentational would
  // convert an oversight into a deliberate "skip me", hiding an image nobody
  // has assessed from every screen-reader user.
  assert.deepEqual(altFor({}, null), { alt: '', presentation: false });
});

// ── isDecorative: only a literal true ────────────────────────────────────

test('decorative requires a literal true, not anything truthy', () => {
  assert.equal(isDecorative({ decorative: true }), true);
  for (const value of ['true', 1, 'yes', {}, [], 'false', 0, null, undefined]) {
    assert.equal(isDecorative({ decorative: value }), false, String(value));
  }
  assert.equal(isDecorative(null), false);
});

// ── rightsStateOf: whitelist, weakest on doubt ───────────────────────────

test('the three rights states round-trip', () => {
  assert.equal(rightsStateOf({ rightsStatus: 'unrecorded' }), 'unrecorded');
  assert.equal(rightsStateOf({ rightsStatus: 'unknown' }), 'unknown');
  assert.equal(rightsStateOf({ rightsStatus: ' recorded ' }), 'recorded');
});

test('an unrecognised rights status degrades to unrecorded, never to recorded', () => {
  for (const value of ['Recorded', 'RECORDED', 'yes', '', undefined, null, 7]) {
    assert.equal(rightsStateOf({ rightsStatus: value }), 'unrecorded', String(value));
  }
  assert.equal(rightsStateOf(undefined), 'unrecorded');
});

test('"unknown" is distinct from "unrecorded" - somebody looked', () => {
  assert.notEqual(rightsStateOf({ rightsStatus: 'unknown' }), rightsStateOf({}));
});

// ── depiction status: unchanged rules the new fields must not disturb ────

test('an unrecognised depiction status is never read as actual', () => {
  for (const value of ['Actual', 'real', '', undefined]) {
    assert.equal(depictionStatusOf({ depictionStatus: value }), 'unverified', String(value));
    assert.equal(assertsActualDepiction({ depictionStatus: value }), false, String(value));
  }
});

test('only an explicit illustrative mark renders a disclosure', () => {
  assert.equal(illustrativeDisclosure({ depictionStatus: 'unverified' }, 'Rye Hotel'), null);
  assert.equal(illustrativeDisclosure({ depictionStatus: 'actual' }, 'Rye Hotel'), null);
  assert.equal(isIllustrative({ depictionStatus: 'illustrative' }), true);
});

test('the disclosure names what the photograph shows when the record says', () => {
  const note = illustrativeDisclosure(
    { depictionStatus: 'illustrative', depicts: 'a plate of grilled steak and hand-cut chips' },
    'Rye Hotel',
  );
  assert.equal(note.label, 'Illustrative image');
  assert.match(note.detail, /grilled steak and hand-cut chips/);
  assert.match(note.detail, /not a photograph of Rye Hotel/);
});

test('with no depicts the disclosure withholds the subject rather than inventing one', () => {
  const note = illustrativeDisclosure({ depictionStatus: 'illustrative' }, 'Rye Hotel');
  assert.equal(note.detail, 'This photograph is not of Rye Hotel.');
});

test('a decorative image is still illustrative and still discloses', () => {
  // Decorative is about the frame; illustrative is about the claim. An
  // atmosphere photograph standing in for a named business is both, and
  // collapsing the two would silence the disclosure on 20 records.
  const image = { depictionStatus: 'illustrative', depicts: 'an empty sandy beach', decorative: true, alt: '' };
  assert.equal(isDecorative(image), true);
  assert.equal(isIllustrative(image), true);
  assert.ok(illustrativeDisclosure(image, 'Rye Hotel'));
});

// ── hasRecordedProvenance: a credit is not provenance ────────────────────

test('a credit and a licence bucket are not recorded provenance', () => {
  assert.equal(hasRecordedProvenance({ credit: 'Peninsula Insider', license: 'venue-media-kit' }), false);
  assert.equal(hasRecordedProvenance({ creator: 'A. Photographer' }), true);
  assert.equal(hasRecordedProvenance({ sourceUrl: 'https://example.org/file' }), true);
  assert.equal(hasRecordedProvenance({ permission: 'CC-BY-4.0 as stated on the file page' }), true);
});
