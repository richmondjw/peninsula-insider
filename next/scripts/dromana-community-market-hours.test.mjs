import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('Dromana Community Market retains only sourced practical facts', async () => {
  const [eventText, article, scheduleClaim, organiserEvidence, occurrenceEvidence] = await Promise.all([
    read('src/content/events/dromana-community-market.json'),
    read('src/content/articles/insider-picks-2026-09-24.md'),
    read('src/content/claims/events/dromana-community-market/event-schedule.json'),
    read('src/content/evidence/events/dromana-community-market/event-schedule-organiser-2026-09-24.json'),
    read('src/content/evidence/events/dromana-community-market/event-occurrence-letsgovictoria-2026-09-24.json'),
  ]);
  const event = JSON.parse(eventText);
  const claim = JSON.parse(scheduleClaim);
  const evidence = JSON.parse(organiserEvidence);
  const occurrence = JSON.parse(occurrenceEvidence);
  const dromanaStart = article.indexOf('## DISCOVERY · Dromana Community Market');
  const dromanaMarket = article.slice(dromanaStart, article.indexOf('\n---\n', dromanaStart));

  assert.equal(event.startDate, '2026-09-26');
  assert.equal(event.endDate, '2026-09-26');
  assert.equal(event.startTime, '08:00');
  assert.equal(event.endTime, '13:30');
  assert.equal(event.venueName, 'Dromana Community Park');
  assert.equal(event.streetAddress, '359B Point Nepean Road');
  assert.match(event.editorNote, /Check the organiser before setting off/);
  assert.match(article, /organiser's policies list market hours as 8:00am to 1:30pm/);
  assert.match(article, /dated Lets Go Victoria listing gives the navigation address as 359B Point Nepean Road/);
  assert.match(dromanaMarket, /Saturday 26 September/);
  assert.match(dromanaMarket, /8:00am–1:30pm/);
  assert.match(dromanaMarket, /Dromana Community Park/);
  assert.match(dromanaMarket, /359B Point Nepean Road/);
  assert.match(dromanaMarket, /Check the organiser before setting off/);
  assert.doesNotMatch(article, /8:30am(?:–| to )1:00pm/);
  assert.doesNotMatch(dromanaMarket, /\bfree\b|no booking(?: required)?|coffee van|stall-?holders?|produce|fruit and vegetable|brassicas|broad beans|strawberries|flower stalls|ranunculus|sweet peas|cheaper|fresher|seven-minute|7-minute|45[–-]60 minutes|45 minutes/i);
  assert.doesNotMatch(eventText, /"bookingRequired"|"freePaid"|"priceRange"|"priceTier"|"lens"|produce|craft|plants|local makers|beach visit|Arthurs Seat|family-saturday|walk-in|locals-know/i);
  assert.match(claim.statement, /organiser's policies list market hours as 8:00am to 1:30pm/);
  assert.match(claim.statement, /Lets Go Victoria listing gives the navigation address as 359B Point Nepean Road/);
  assert.equal(evidence.url, 'https://dromanamarket.org.au/policies-and-procedures');
  assert.match(evidence.note, /8:00am to 1:30pm/);
  assert.doesNotMatch(evidence.note, /359B Point Nepean Road/);
  assert.equal(occurrence.url, 'https://letsgovictoria.com/listing/dromana-community-market/');
  assert.equal(occurrence.retrievedAt, '2026-09-24');
  assert.match(occurrence.note, /26 September 2026/);
  assert.match(occurrence.note, /Dromana Community Park, 359B Point Nepean Road/);
});
