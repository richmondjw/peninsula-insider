import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const article = read('../src/content/articles/insider-picks-2026-11-01.md');
const gazette = 'https://www.gazette.vic.gov.au/gazette/Gazettes2024/GG2024G050.pdf';
const december = 'https://www.emuplainsmarket.com.au/markets/december';

test('the Balnarring dog restriction is conditional and is not applied to Merricks', () => {
  const data = JSON.parse(read('../src/data/facts/beaches.json'));
  const beach = Object.values(data).flat().find((row) => row?.name === 'Balnarring Beach');
  assert.ok(beach);
  assert.equal(Object.hasOwn(beach, 'dogsPermitted'), false);
  assert.equal(beach.source, gazette);
  for (const text of [article, beach.notes]) {
    assert.match(text, /Cliff Road.*Somers foreshore boundary/);
    assert.match(text, /10 am to 6 pm.*1 December.*end of February/);
    assert.match(text, /Merricks Beach/);
  }
  assert.doesNotMatch(article, /Dogs on leads are welcome on the foreshore sections/);
});

test('Emu Plains December listing, FAQ and practical table agree', () => {
  const event = JSON.parse(read('../src/content/events/emu-plains-market.json'));
  assert.equal(event.nextOccurrence, '2026-12-19');
  assert.equal(event.startTime, '09:00');
  assert.equal(event.endTime, '14:00');
  assert.equal(event.officialEventUrl, december);
  assert.equal(event.primarySourceUrl, december);
  assert.ok(article.includes(december));
  assert.match(article, /Sat 19 Dec, 9 am to 2 pm/);
  assert.match(article, /Saturday 19 December 2026, 9 am to 2 pm/);
  assert.doesNotMatch(article, /every Saturday through to 19 December/);
});

test('Pt Leo access copy describes the stated features without claiming all surfaces are level', () => {
  const event = JSON.parse(read('../src/content/events/pt-leo-estate-sculpture-park.json'));
  assert.equal(event.primarySourceUrl, 'https://www.ptleoestate.com.au/experience/sculpture-park/');
  assert.match(event.accessibilityNotes, /wheelchairs, walkers and prams/);
  assert.match(event.accessibilityNotes, /ambulant bathroom/);
  assert.doesNotMatch(event.accessibilityNotes, /all paths|paved|gravel|on one level/i);
});
