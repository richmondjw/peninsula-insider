import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const html = (route) => readFileSync(path.join(root, route, 'index.html'), 'utf8');
const jsonLd = (body) => [...body.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
  .map((match) => JSON.parse(match[1]));

const eventRoute = 'whats-on/hill-ridge-community-market-september-2026-restart';

test('market guide ItemList lists only the three current market guides', () => {
  const page = html('explore/markets');
  const list = jsonLd(page).find((node) => node['@type'] === 'ItemList' && node.name === 'Mornington Peninsula Markets');
  assert.ok(list, 'market guide ItemList missing');
  const rows = list.itemListElement.map(({ item }) => [item.name, item.address?.addressLocality]);
  assert.deepEqual(rows, [
    ['Mornington Main Street Market', 'Mornington'],
    ['Rye Foreshore Market', 'Rye'],
    ['Mount Eliza Farmers Market', 'Mount Eliza'],
  ]);
  assert.ok(!page.includes('[object Object]'), 'object leaked into rendered market guide');
});

test('cancelled Hill & Ridge edition stays public without a visit recommendation', () => {
  const page = html(eventRoute);
  const event = jsonLd(page).find((node) => node['@type'] === 'Event');
  assert.ok(event, 'Hill & Ridge Event schema missing');
  assert.match(event.name, /3 October 2026/);
  assert.match(event.description, /3 October 2026/);
  assert.match(event.startDate, /^2026-10-03T09:00/);
  assert.match(event.endDate, /^2026-10-03T14:00/);
  assert.match(page, /Hill &amp; Ridge Community Market, 3 October 2026/);
  assert.match(page, /Do not travel for this date/);
  assert.equal(event.eventStatus, 'https://schema.org/EventCancelled');
  assert.equal('eventSchedule' in event, false);
  const edition = page.match(/<article\b[\s\S]*?<\/article>/)?.[0];
  assert.ok(edition, 'Cancelled edition article missing');
  assert.match(edition, /Cancelled edition\. Check the organiser for future dates\./);
  assert.doesNotMatch(edition, /Recurs monthly|Monthly \(first Saturday Sep-May\)|Weekend Pick|Family Saturday|Walk-In/);
  assert.doesNotMatch(edition, />Free</);
  assert.doesNotMatch(page, /Get directions/);
  assert.doesNotMatch(page, /Worth the drive|First time on the Peninsula/i);
  assert.doesNotMatch(html('explore/places/red-hill'), /Hill &amp; Ridge Community Market, 3 October 2026/);
  assert.match(html('explore/markets'), /3 Oct 2026 · Cancelled by organiser/);
  assert.doesNotMatch(html('explore/markets'), /Next confirmed: 3 Oct 2026/);
  assert.doesNotMatch(event.name, /September 2026|Restart/);
});
