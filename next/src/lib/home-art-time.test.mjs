import test from 'node:test';
import assert from 'node:assert/strict';
import { homeArtPeriod } from './home-art-time.mjs';
import { isOriginalIllustration, visibleImageCaption } from './illustration-presentation.mjs';
test('Melbourne boundaries in summer and winter, including overnight', () => {
  for (const [date, offset] of [['2026-11-02', '+11:00'], ['2026-06-02', '+10:00']]) {
    for (const [time, expected] of [['00:00','evening'],['05:59','evening'],['06:00','morning'],['11:59','morning'],['12:00','afternoon'],['17:59','afternoon'],['18:00','evening'],['23:59','evening']]) {
      assert.equal(homeArtPeriod(new Date(`${date}T${time}:00${offset}`)), expected);
    }
  }
});
test('DST transition days use Melbourne wall time', () => {
  assert.equal(homeArtPeriod(new Date('2026-10-03T18:59:00Z')), 'evening');
  assert.equal(homeArtPeriod(new Date('2026-10-03T19:00:00Z')), 'morning');
  assert.equal(homeArtPeriod(new Date('2026-04-04T19:59:00Z')), 'evening');
  assert.equal(homeArtPeriod(new Date('2026-04-04T20:00:00Z')), 'morning');
});
test('presentation removes original art captions without losing context photo credits or records', () => {
  const art = {src:'/images/generated/event.svg',credit:'Illustration: Peninsula Insider',caption:'Conceptual scene',alt:'Illustrated guitar',rightsStatus:'recorded'};
  assert.equal(isOriginalIllustration(art), true);
  assert.equal(visibleImageCaption(art), '');
  assert.equal(art.caption, 'Conceptual scene');
  assert.equal(art.rightsStatus, 'recorded');
  const photo = {src:'/images/visit-victoria/gallery.webp', depictionStatus:'illustrative',credit:'Robert Blackburn, courtesy of Visit Victoria',caption:'Context photo: gallery, not this exhibition.'};
  assert.equal(isOriginalIllustration(photo), false);
  assert.equal(visibleImageCaption(photo), photo.caption);
});
