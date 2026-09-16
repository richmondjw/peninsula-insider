import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const listingPath = fileURLToPath(
  new URL('../src/content/events/viral-food-festival-mornington-2026.json', import.meta.url),
);

test('VIRAL Food Festival listing keeps verified dates, venue, tickets and sources', async () => {
  const listing = JSON.parse(await readFile(listingPath, 'utf8'));

  assert.equal(listing.title, 'VIRAL Food Festival, Mornington 2026');
  assert.equal(listing.startDate, '2026-09-18');
  assert.equal(listing.endDate, '2026-09-20');
  assert.equal(listing.venueName, 'Mornington Racecourse');
  assert.equal(listing.venueRegion, 'Mornington');
  assert.equal(listing.streetAddress, undefined);
  assert.equal(listing.ticketingUrl, 'https://www.trybooking.com/DPNDE');
  assert.equal(listing.primarySourceUrl, 'https://www.viralfoodfestival.com.au/');
  assert.equal(listing.secondarySourceUrl, 'https://www.visitmorningtonpeninsula.org/Whats-On/View/18370/viral-food-festival-at-mornington-racecourse');
  assert.equal(listing.lastCheckedDate, '2026-09-16');
  assert.equal(listing.status, 'published');
  assert.doesNotMatch(listing.editorVerdict, /shortest queues/i);
  assert.match(listing.internalNotes, /TryBooking/);
});

test('VIRAL Food Festival has explicit homepage, What’s On and Eat promotion', async () => {
  const [weekendPicks, eatHub] = await Promise.all([
    readFile(new URL('../src/content/weekend-picks/2026-09-19.json', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/eat/index.astro', import.meta.url), 'utf8'),
  ]);

  assert.match(weekendPicks, /"eventSlug": "viral-food-festival-mornington-2026"/);
  assert.match(eatHub, /loadLiveEvents/);
  assert.match(eatHub, /viralFoodFestival\.href/);
});
