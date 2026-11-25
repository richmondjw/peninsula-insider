import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const auditScript = fileURLToPath(new URL('./audit-agent-readiness.mjs', import.meta.url));
const instant = '2026-08-14T14:10:00Z'; // 15 August in Australia/Sydney.

function writeFixture(
  root,
  generated = '2026-08-15',
  endDate = '2026-08-15',
  { generatedAt, weekendEnd = '2026-08-16T13:59:00.000Z' } = {},
) {
  const weekendDir = join(root, 'whats-on', 'this-weekend');
  const feedDir = join(root, 'whats-on');
  mkdirSync(weekendDir, { recursive: true });
  writeFileSync(
    join(feedDir, 'upcoming.json'),
    JSON.stringify({
      generated,
      ...(generatedAt ? { generatedAt } : {}),
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
    `<html><body><article data-weekend-end="${weekendEnd}" data-source-mode="registry-fallback"></article></body></html>`,
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

function runAudit(root, ...extraArgs) {
  return spawnSync(
    process.execPath,
    [auditScript, '--site', root, '--instant', instant, ...extraArgs],
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

// A build that started at 23:55 on Friday 14 August in Sydney and reached the
// audit at 00:10 on the 15th. Everything in it is dated for the 14th: the
// feed, an occurrence that ends that day, and a weekend window closing that
// night.
const beforeMidnight = '2026-08-14T13:55:00.000Z';
const builtBeforeMidnight = {
  generatedAt: beforeMidnight,
  weekendEnd: '2026-08-14T13:59:00.000Z',
};

function withFixture(args, run) {
  const root = mkdtempSync(join(tmpdir(), 'pi-agent-audit-'));
  try {
    writeFixture(root, ...args);
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('--build-clock passes a build that crossed Sydney midnight before the audit ran', () => {
  withFixture(['2026-08-14', '2026-08-14', builtBeforeMidnight], (root) => {
    const result = runAudit(root, '--build-clock');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /passed for 2026-08-14/);
    assert.match(result.stdout, /generated at 2026-08-14T13:55:00\.000Z/);
  });
});

test('without --build-clock the same output still fails on the new day', () => {
  withFixture(['2026-08-14', '2026-08-14', builtBeforeMidnight], (root) => {
    const result = runAudit(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /generated=2026-08-14; expected 2026-08-15/);
    assert.match(result.stderr, /Expired occurrence/);
    assert.match(result.stderr, /this-weekend\/ is stale/);
  });
});

test('--build-clock still rejects a feed generated on an earlier day and audited much later', () => {
  // 03:10 on the 14th in Sydney, audited 21 hours later at 00:10 on the 15th.
  const stale = { generatedAt: '2026-08-13T17:10:00.000Z' };
  withFixture(['2026-08-14', '2026-08-15', stale], (root) => {
    const result = runAudit(root, '--build-clock');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /generated=2026-08-14; expected 2026-08-15/);
    assert.match(result.stderr, /build clock not used: generatedAt 2026-08-13T17:10:00\.000Z is 21\.0 h old/);
  });
});

test('--build-clock holds the feed date to the day its own generatedAt falls on', () => {
  // A recent generatedAt does not let the feed claim some other day.
  withFixture(['2026-08-13', '2026-08-15', { generatedAt: beforeMidnight }], (root) => {
    const result = runAudit(root, '--build-clock');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /generated=2026-08-13; expected 2026-08-14/);
  });
});

test('--build-clock ignores a generatedAt that is missing, malformed or ahead of the audit', () => {
  for (const generatedAt of [undefined, '2026-08-14', '2026-08-14T14:10:01.000Z']) {
    withFixture(['2026-08-14', '2026-08-14', { ...builtBeforeMidnight, generatedAt }], (root) => {
      const result = runAudit(root, '--build-clock');
      assert.equal(result.status, 1, `generatedAt=${generatedAt}`);
      assert.match(result.stderr, /expected 2026-08-15 \(build clock not used: /);
    });
  }
});

test('an explicit --now is never replaced by the build clock', () => {
  withFixture(['2026-08-14', '2026-08-14', builtBeforeMidnight], (root) => {
    const result = runAudit(root, '--build-clock', '--now', '2026-08-15');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /generated=2026-08-14; expected 2026-08-15/);
  });
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
