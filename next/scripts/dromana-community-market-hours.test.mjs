import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('Dromana Community Market attributes organiser hours and Lets Go Victoria navigation address separately', async () => {
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

  assert.equal(event.startTime, '08:00');
  assert.equal(event.endTime, '13:30');
  assert.equal(event.streetAddress, '359B Point Nepean Road');
  assert.match(event.editorNote, /organiser's policies list market hours as 8:00am–1:30pm/);
  assert.match(event.editorNote, /dated Lets Go Victoria listing gives the navigation address as 359B Point Nepean Road/);
  assert.match(article, /organiser's policies list market hours as 8:00am to 1:30pm/);
  assert.match(article, /dated Lets Go Victoria listing gives the navigation address as 359B Point Nepean Road/);
  const dromanaStart = article.indexOf('## DISCOVERY · Dromana Community Market');
  const dromanaMarket = article.slice(dromanaStart, article.indexOf('\n---\n', dromanaStart));
  assert.doesNotMatch(article, /8:30am(?:–| to )1:00pm/);
  assert.doesNotMatch(article, /Dromana Community Market[^\n]*(?:\bfree\b|no booking)/i);
  assert.doesNotMatch(dromanaMarket, /\bfree\b/i);
  assert.doesNotMatch(dromanaMarket, /no booking(?: required)?/i);
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
