import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const auditScript = fileURLToPath(new URL('./audit-agent-readiness.mjs', import.meta.url));
const instant = '2026-08-14T14:10:00Z'; // 15 August in Australia/Sydney.

function writeFixture(root, generated = '2026-08-15', endDate = '2026-08-15') {
  const weekendDir = join(root, 'whats-on', 'this-weekend');
  const feedDir = join(root, 'whats-on');
  mkdirSync(weekendDir, { recursive: true });
  writeFileSync(
    join(feedDir, 'upcoming.json'),
    JSON.stringify({
      generated,
      count: 1,
      numberOfItems: 1,
      thisWeekend: { count: 1 },
      itemListElement: [{
        '@type': 'ListItem',
        position: 1,
        item: {
          '@type': 'Event',
          url: 'https://peninsulainsider.com.au/whats-on/fixture/',
          startDate: endDate,
          endDate,
        },
      }],
      events: [{
        title: 'Fixture event',
        url: 'https://peninsulainsider.com.au/whats-on/fixture/',
        startDate: endDate,
        endDate,
        thisWeekend: true,
      }],
    }),
  );
  writeFileSync(
    join(weekendDir, 'index.html'),
    '<html><body><article data-weekend-end="2026-08-16T13:59:00.000Z" data-source-mode="registry-fallback"></article></body></html>',
  );
  writeFileSync(
    join(root, 'index.html'),
    '<html><head><link rel="canonical" href="https://peninsulainsider.com.au/" /></head><body></body></html>',
  );
  writeFileSync(
    join(root, 'sitemap.xml'),
    '<?xml version="1.0"?><urlset><url><loc>https://peninsulainsider.com.au/</loc></url></urlset>',
  );
}

function runAudit(root) {
  return spawnSync(
    process.execPath,
    [auditScript, '--site', root, '--instant', instant],
    { encoding: 'utf8' },
  );
}

test('derives the audit date in Australia/Sydney at the UTC date boundary', () => {
  const root = mkdtempSync(join(tmpdir(), 'pi-agent-audit-'));
  try {
    writeFixture(root);
    const result = runAudit(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /passed for 2026-08-15/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects a previous-day feed and expired occurrence', () => {
  const root = mkdtempSync(join(tmpdir(), 'pi-agent-audit-'));
  try {
    writeFixture(root, '2026-08-14', '2026-08-14');
    const result = runAudit(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /expected 2026-08-15/);
    assert.match(result.stderr, /Expired occurrence/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function writeTypedFixture(root) {
  writeFixture(root);
  const path = join(root, 'whats-on', 'upcoming.json');
  const feed = JSON.parse(readFileSync(path, 'utf8'));
  feed.schemaVersion = '1.2';
  feed.events = ['event', 'experience', 'offer'].map(kind => ({
    title: `${kind} fixture`, contentKind: kind,
    dateMeaning: { event: 'occurrence', experience: 'availability', offer: 'validity' }[kind],
    url: `https://peninsulainsider.com.au/whats-on/${kind}/`,
    startDate: '2026-08-15', endDate: '2026-08-16', thisWeekend: true,
    ...(kind === 'event' ? { eventStatus: 'https://schema.org/EventScheduled' } : {}),
  }));
  feed.count = feed.numberOfItems = feed.thisWeekend.count = 3;
  feed.itemListElement = feed.events.map((event, index) => ({
    '@type': 'ListItem', position: index + 1,
    item: {
      '@type': { event: 'Event', experience: 'Service', offer: 'Offer' }[event.contentKind],
      name: event.title, url: event.url,
      ...(event.contentKind === 'event' ? { startDate: event.startDate, endDate: event.endDate, eventStatus: event.eventStatus } :
        event.contentKind === 'offer' ? { validFrom: event.startDate, validThrough: event.endDate } : {}),
    },
  }));
  writeFileSync(path, JSON.stringify(feed));
  return { path, feed };
}
test('accepts 1.2 Event/Service/Offer ItemLists and preserves legacy 1.1 fixtures', () => {
  const root = mkdtempSync(join(tmpdir(), 'pi-agent-audit-'));
  try {
    writeTypedFixture(root);
    let result = runAudit(root);
    assert.equal(result.status, 0, result.stderr);
    writeFixture(root);
    const path = join(root, 'whats-on', 'upcoming.json');
    const legacy = JSON.parse(readFileSync(path, 'utf8'));
    legacy.schemaVersion = '1.1';
    writeFileSync(path, JSON.stringify(legacy));
    result = runAudit(root);
    assert.equal(result.status, 0, result.stderr);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
const feedMutations = [
  ['type', feed => { feed.itemListElement[1].item['@type'] = 'Event'; }],
  ['URL', feed => { feed.itemListElement[2].item.url = 'https://example.com/wrong'; }],
  ['event date', feed => { feed.itemListElement[0].item.startDate = '2026-08-16'; }],
  ['offer validity', feed => { feed.itemListElement[2].item.validThrough = '2026-08-20'; }],
  ['experience occurrence date', feed => { feed.itemListElement[1].item.startDate = '2026-08-15'; }],
  ['offer occurrence date', feed => { feed.itemListElement[2].item.endDate = '2026-08-16'; }],
  ['missing kind', feed => { delete feed.events[1].contentKind; }],
  ['incorrect date meaning', feed => { feed.events[2].dateMeaning = 'occurrence'; }],
  ['non-event status', feed => { feed.events[1].eventStatus = 'https://schema.org/EventScheduled'; }],
];
for (const [name, mutate] of feedMutations) test(`rejects tampered 1.2 ${name}`, () => {
  const root = mkdtempSync(join(tmpdir(), 'pi-agent-audit-'));
  try {
    const { path, feed } = writeTypedFixture(root);
    mutate(feed);
    writeFileSync(path, JSON.stringify(feed));
    const result = runAudit(root);
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, /ItemList entry|contentKind\/dateMeaning|Event status/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
