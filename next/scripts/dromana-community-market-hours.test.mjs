import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('Dromana Community Market uses the organiser hours and navigation address', async () => {
  const [eventText, article, scheduleClaim, organiserEvidence] = await Promise.all([
    read('src/content/events/dromana-community-market.json'),
    read('src/content/articles/insider-picks-2026-09-24.md'),
    read('src/content/claims/events/dromana-community-market/event-schedule.json'),
    read('src/content/evidence/events/dromana-community-market/event-schedule-organiser-2026-09-24.json'),
  ]);
  const event = JSON.parse(eventText);
  const claim = JSON.parse(scheduleClaim);
  const evidence = JSON.parse(organiserEvidence);

  assert.equal(event.startTime, '08:00');
  assert.equal(event.endTime, '13:30');
  assert.equal(event.streetAddress, '359B Point Nepean Road');
  assert.match(event.editorNote, /8:00am–1:30pm/);
  assert.match(article, /8:00am–1:30pm at 359B Point Nepean Road/);
  assert.doesNotMatch(article, /8:30am(?:–| to )1:00pm/);
  assert.match(claim.statement, /8:00am to 1:30pm/);
  assert.equal(evidence.url, 'https://dromanamarket.org.au/policies-and-procedures');
  assert.match(evidence.note, /8:00am to 1:30pm/);
});
