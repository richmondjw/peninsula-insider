import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL('../src/' + p, import.meta.url), 'utf8');

test('Blue Moon records all-cottage amenities while retaining booking checks', () => {
  const venue = JSON.parse(read('content/venues/blue-moon-cottages.json'));
  assert.match(venue.signature, /All cottages have log fires and fully fenced courtyards for pets/);
  assert.match(venue.editorNote, /All cottages have log fires and fully fenced courtyards for pets/);
  assert.match(venue.editorNote, /confirm.*current pet terms/);
  assert.match(venue.ifOnlyOneThing, /confirm.*current pet terms/);
  assert.match(venue.dogFriendlyNotes, /Confirm.*current pet terms/);
  assert.match(venue.editorNote, /Sandpiper includes a kitchen/);
  assert.doesNotMatch(JSON.stringify(venue), /Sandpiper has a log fire|log fire in Sandpiper|Sandpiper log fire/);
  const directory = read('pages/stay/index.astro').match(/'blue-moon-cottages':[^\n]+/)[0];
  assert.match(directory, /All cottages have log fires and fully fenced courtyards for pets/);
  const guide = read('pages/stay/cottages.astro').match(/slug: 'blue-moon-cottages',[\s\S]*?\}/)[0];
  assert.match(guide, /All Blue Moon cottages accept pets and have log fires and fully fenced courtyards/);
  assert.match(guide, /read the pet conditions/);
});

test('Flinders Sourdough has no phone, including any replacement', () => {
  const venue = JSON.parse(read('content/venues/flinders-sourdough.json'));
  assert.equal(Object.hasOwn(venue, 'phone'), false);
  assert.doesNotMatch(JSON.stringify(venue), /5989\s*0088/);
  assert.equal(venue.website, 'https://flinderssourdough.com.au');
});

test('Iluka uses approved artwork and keeps practical booking limits', () => {
  const v = JSON.parse(read('content/venues/iluka-retreat.json'));
  assert.match(v.signature, /two group lodges.*36-acre/);
  assert.match(v.editorNote, /raised timber decks/);
  for (const constraint of [/tents are unpowered/, /shared camp kitchen and bathrooms/, /Pets are not permitted/, /steep and uneven/, /arrange any extra single beds/i, /does not mean exclusive use/]) assert.match(v.editorNote, constraint);
  assert.equal(v.address, '20 Shoreham Rd, Shoreham VIC 3916');
  assert.equal(v.heroImage.src, '/images/editorial/journal-backstop.svg');
  assert.equal(v.heroImage.depictionStatus, 'illustrative');
  assert.equal(v.heroImage.rightsHolder, 'Peninsula Insider');
  assert.doesNotMatch(JSON.stringify(v), /balnarring-rural-sunrise|cms-assets/);
});

test('Red Gum Red Hill contact, map pin and opening days match operator evidence', () => {
  const v=JSON.parse(read('content/venues/red-gum-bbq.json'));
  assert.equal(v.address,'87 Arthurs Seat Road, Red Hill VIC 3937');
  assert.equal(v.phone,'+61 3 5989 3156');
  assert.deepEqual(v.coordinates,{lat:-38.3734864,lng:145.0221385});
  assert.match(v.hoursNote,/Wednesday[-–]Thursday 11 am[-–]8 pm, Friday[-–]Saturday 11 am[-–]9 pm and Sunday 11 am[-–]4 pm/);
  for(const slug of ['best-casual-lunch-mornington-peninsula','summer-school-holidays-2026']) {
    const text=read('content/articles/'+slug+'.md');
    assert.match(text,/Wednesday[-–]Thursday 11 am[-–]8 pm, Friday[-–]Saturday 11 am[-–]9 pm and Sunday 11 am[-–]4 pm/);
    assert.doesNotMatch(text,/lunch Tuesday to Saturday|dinner Thursday to Saturday|Red Gum BBQ, Red Hill South/);
  }
});
