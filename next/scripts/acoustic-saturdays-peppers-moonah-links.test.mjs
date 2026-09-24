import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const listingPath = fileURLToPath(
  new URL('../src/content/events/acoustic-saturdays-peppers-moonah-links-2026.json', import.meta.url),
);

test('Acoustic Saturdays directs readers to Peppers Moonah Links at Peter Thomson Drive', async () => {
  const listing = JSON.parse(await readFile(listingPath, 'utf8'));

  assert.equal(listing.streetAddress, '55 Peter Thomson Drive');
  assert.notEqual(listing.streetAddress, '550 Arthurs Seat Road');
});
