import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanCaption, captionParts, isArtwork } from './image-caption.mjs';

test('a real place keeps a short place line and its region', () => {
  assert.equal(cleanCaption('Montalto Vineyard & Olive Grove, Red Hill, Mornington Peninsula.'), 'Montalto Vineyard & Olive Grove, Red Hill, Mornington Peninsula');
  assert.equal(cleanCaption('Flinders Golf Club, Mornington Peninsula.'), 'Flinders Golf Club, Mornington Peninsula');
  assert.equal(cleanCaption('Pt. Leo Estate, Merricks, Mornington Peninsula.'), 'Pt. Leo Estate, Merricks, Mornington Peninsula');
});

test('disclaimers are dropped, the place survives', () => {
  assert.equal(
    cleanCaption('Montalto Vineyard & Olive Grove, Red Hill, Mornington Peninsula. Regional vineyard context; this photograph shows Montalto, not Quealy Winemakers.'),
    'Montalto Vineyard & Olive Grove, Red Hill, Mornington Peninsula',
  );
  assert.equal(cleanCaption('Sorrento, Mornington Peninsula. Coastal context photograph, not a photograph of the listed events.'), 'Sorrento, Mornington Peninsula');
  assert.equal(cleanCaption('Montalto Vineyard & Olive Grove, Mornington Peninsula, one of the suggested Red Hill stops.'), 'Montalto Vineyard & Olive Grove, Red Hill, Mornington Peninsula');
});

test('a caption that is only disclosure reduces to nothing', () => {
  assert.equal(cleanCaption('Editorial illustration. Gin and botanicals; not an exact depiction of the distillery or its drinks.'), '');
  assert.equal(cleanCaption('Illustrative Mornington Peninsula vineyard; resized and converted to WebP from the source photograph. CC BY-SA 2.0.'), '');
  assert.equal(cleanCaption(undefined), '');
});

test('cleaning is idempotent', () => {
  for (const c of ['Montalto Vineyard & Olive Grove, Red Hill, Mornington Peninsula', 'Sorrento', 'Pt. Leo Estate, Merricks, Mornington Peninsula', '']) {
    assert.equal(cleanCaption(cleanCaption(c)), cleanCaption(c));
  }
});

test('artwork prints nothing at all', () => {
  assert.equal(captionParts({ src: '/images/generated/coastal-punch-plate.svg', caption: 'Anything', credit: 'Illustration: Peninsula Insider' }), null);
  assert.equal(captionParts({ src: '/art.jpg', credit: 'Illustration · Peninsula Insider' }), null);
  assert.equal(isArtwork({ src: '/images/editorial/journal-backstop.svg?v=1' }), true);
  // A format alone does not make a context photograph artwork.
  assert.equal(isArtwork({ src: '/context.svg', credit: 'Creator, courtesy of Visit Victoria' }), false);
});

test('a photograph prints its place and its source; a nameless stand-in keeps only the source', () => {
  assert.deepEqual(
    captionParts({ src: '/images/visit-victoria/x.webp', caption: 'Montalto Vineyard & Olive Grove, Red Hill', credit: 'Two Palms Australia, courtesy of Visit Victoria' }),
    { place: 'Montalto Vineyard & Olive Grove, Red Hill', credit: 'Two Palms Australia, courtesy of Visit Victoria' },
  );
  assert.deepEqual(
    captionParts({ src: '/images/sourced/vineyard.webp', caption: '', credit: 'Photographer / CC BY-SA 2.0' }),
    { place: '', credit: 'Photographer / CC BY-SA 2.0' },
  );
});
