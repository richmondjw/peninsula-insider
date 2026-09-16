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
  assert.equal(listing.streetAddress, '330 Racecourse Road');
  assert.equal(listing.ticketingUrl, 'https://www.trybooking.com/DPNDE');
  assert.equal(listing.primarySourceUrl, 'https://www.viralfoodfestival.com.au/');
  assert.equal(listing.secondarySourceUrl, 'https://melbourne-insider.au/event/viral-food-festival-mornington/');
  assert.equal(listing.lastCheckedDate, '2026-09-16');
  assert.equal(listing.status, 'published');
  assert.match(listing.internalNotes, /TryBooking/);
  assert.match(listing.internalNotes, /Melbourne Insider/);
});
