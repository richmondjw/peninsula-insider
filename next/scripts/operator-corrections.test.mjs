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
