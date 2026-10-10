import test from 'node:test';
import assert from 'node:assert/strict';
import { journalImageTheme, selectJournalImage, journalIllustration, journalCredit } from './journal-image-policy.mjs';
import { imageAvailable } from './journal-image-availability.mjs';

const fallback = { src: '/context.webp', alt: 'A real coastal scene', credit: 'Creator, courtesy of Visit Victoria', caption: 'Regional context photograph.', depictionStatus: 'illustrative' };
const data = { heroImage: { src: '/own.webp', alt: 'Own image', credit: 'jem', caption: 'Own caption' } };
const hero = { src: '/own.webp', alt: 'Own image', hasPhoto: true, decorative: false };
const available = src => ['/own.webp', '/context.webp', journalIllustration.src].includes(src);

test('an available credited photo still falls back when its rights are not established', () => {
  const image = selectJournalImage(hero, data, fallback, available, () => false);
  assert.equal(image.src, '/context.webp');
  assert.equal(image.fallback, true);
  assert.equal(image.provenance, fallback);
  assert.equal(selectJournalImage(hero, data, fallback, available).src, '/context.webp');
});

test('keeps an available credited article image and its provenance', () => {
  const image = selectJournalImage(hero, data, fallback, available, () => true);
  assert.equal(image.src, '/own.webp');
  assert.equal(image.provenance, data.heroImage);
  assert.equal(journalCredit(image), 'Photograph by jem');
});
test('a credited generic image hidden by the old photo guard remains visible', () => {
  const image = selectJournalImage({ ...hero, hasPhoto: false }, data, fallback, available, () => true);
  assert.equal(image.src, '/own.webp');
  assert.equal(image.provenance, data.heroImage);
  assert.equal(image.caption, data.heroImage.caption);
});
test('a missing file or absent credit cannot leave the image space blank', () => {
  for (const [h, d] of [[{ ...hero, src: '/missing.webp' }, data], [hero, { heroImage: { credit: '' } }]]) {
    assert.equal(selectJournalImage(h, d, fallback, available, () => true).src, '/context.webp');
  }
});
test('CMS replacements use their own credit and caption, never those of the previous file', () => {
  const override = { src: '/own.webp', alt: 'Uploaded image', credit: 'Uploader', caption: 'Uploaded caption' };
  const image = selectJournalImage({ ...hero, override }, data, fallback, available, () => true);
  assert.equal(image.credit, 'Uploader');
  assert.equal(image.caption, 'Uploaded caption');
  assert.equal(image.provenance, null);
});
test('an unavailable thematic image falls back to original art, with honest attribution', () => {
  const image = selectJournalImage({ ...hero, src: '/missing.webp', hasPhoto: false }, data, fallback, src => src === journalIllustration.src, () => true);
  assert.equal(image.src, journalIllustration.src);
  assert.match(journalCredit(image), /^Illustration/);
  assert.match(journalCredit({ ...image, src: image.src + '?v=hash' }), /^Illustration/);
  assert.match(image.caption, /not a photograph/);
  assert.throws(() => selectJournalImage(hero, data, fallback, () => false), /no available image/);
});
test('local availability ignores cache parameters and rejects traversal and unsafe schemes', () => {
  assert.equal(imageAvailable(journalIllustration.src + '?v=123#image'), true);
  assert.equal(imageAvailable('/images/missing-file.webp'), false);
  assert.equal(imageAvailable('/../package.json'), false);
  assert.equal(imageAvailable('//example.com/image.jpg'), false);
  assert.equal(imageAvailable('javascript:alert(1)'), false);
});
test('reviewed raster artwork keeps one illustration credit', () => {
  for (const src of ['/images/generated/coastal-punch-breakfast.webp', '/art.jpg?v=1']) {
    assert.equal(journalCredit({ src, credit: 'Illustration: Peninsula Insider' }), 'Illustration: Peninsula Insider');
    assert.equal(journalCredit({ src, credit: 'Illustration · Peninsula Insider' }), 'Illustration · Peninsula Insider');
  }
});
test('fallback attribution survives cache-stamping of the inlined illustration constant', () => {
  const original = journalIllustration.src;
  try {
    journalIllustration.src = original + '?v=asset-hash';
    assert.equal(journalCredit({ src: original + '?v=asset-hash', credit: 'Peninsula Insider' }), 'Illustration · Peninsula Insider');
    assert.equal(journalCredit({ src: original, credit: 'Peninsula Insider' }), 'Illustration · Peninsula Insider');
    assert.equal(journalCredit(fallback), 'Photo · Creator, courtesy of Visit Victoria');
  } finally {
    journalIllustration.src = original;
  }
});
test('context-photo attribution is preserved regardless of depiction status or file format', () => {
  assert.equal(journalCredit(fallback), 'Photo · Creator, courtesy of Visit Victoria');
  assert.equal(journalCredit({ ...fallback, src: '/context.svg' }), 'Photo · Creator, courtesy of Visit Victoria');
  assert.equal(journalCredit({ ...fallback, credit: 'Photographer / CC BY-SA 4.0' }), 'Photo · Photographer / CC BY-SA 4.0');
  assert.equal(journalCredit({ ...fallback, credit: 'jem' }), 'Photograph by jem');
});
test('the article subject selects an appropriate theme', () => {
  for (const [title, theme] of [['National Works on Paper', 'art'], ['Quealy cellar door', 'wine'], ['The Peninsula pantry', 'food'], ['Boat moorings', 'boating'], ['A two-night hotel stay', 'stay'], ['Walk the coast', 'coast']]) {
    assert.equal(journalImageTheme({ title }), theme);
  }
});
