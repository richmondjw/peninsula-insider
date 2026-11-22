import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const record = JSON.parse(readFileSync(new URL('../src/content/events/national-works-on-paper-2026-nwop.json', import.meta.url), 'utf8'));
const source = readFileSync(new URL('../src/lib/event-schedule.ts', import.meta.url), 'utf8');
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source)).toString('base64');
const { ruleFor, occursOnDay, occursInWindow } = await import(moduleUrl);
const day = (iso) => new Date(iso + 'T12:00:00Z');
// Match the optional schema field: absence must stay absent, not Invalid Date.
const scheduleData = (snapshot) => ({
  ...snapshot,
  startDate: day(snapshot.startDate),
  endDate: day(snapshot.endDate),
  ...(snapshot.nextOccurrence ? { nextOccurrence: day(snapshot.nextOccurrence) } : {}),
});

test('National Works on Paper appears only on actual gallery opening days inside its exhibition run', () => {
  assert.equal(record.eventId, 'MP-EVT-0065');
  assert.equal(record.startDate, '2026-09-05');
  assert.equal(record.endDate, '2026-11-22');
  assert.equal(record.startTime, '11:00');
  assert.equal(record.endTime, '16:00');
  // Historical fixture, not a production status or occurrence update.
  const data = scheduleData({ ...record, status: 'published', nextOccurrence: '2026-10-09' });
  const rule = ruleFor({ data }, day('2026-10-08'));
  assert.equal(rule?.kind, 'weekly');
  assert.deepEqual(rule?.days, [2, 3, 4, 5, 6, 0]);
  for (const iso of ['2026-09-05', '2026-10-09', '2026-10-11', '2026-10-13', '2026-11-22']) {
    assert.equal(occursOnDay(rule, day(iso)), true, iso + ' should be open');
  }
  for (const iso of ['2026-09-04', '2026-10-12', '2026-10-19', '2026-11-23']) {
    assert.equal(occursOnDay(rule, day(iso)), false, iso + ' should not be advertised');
  }
});

test('final exhibition day is included before expiry and no future day survives the closing bound', () => {
  const before = scheduleData({ ...record, status: 'published', nextOccurrence: '2026-11-22' });
  const rule = ruleFor({ data: before }, day('2026-11-21'));
  assert.equal(occursOnDay(rule, day('2026-11-22')), true);
  assert.equal(occursOnDay(rule, day('2026-11-24')), false, 'the next Tuesday must not reopen the exhibition');
});

test('post-expiry record without nextOccurrence retains history but has no future calendar occurrences', () => {
  // The 23 November freshness pass removed the final 22 November occurrence.
  assert.equal(Object.hasOwn(record, 'nextOccurrence'), false);
  for (const status of [record.status, 'archived', 'expired']) {
    const after = scheduleData({ ...record, status });
    assert.equal(Object.hasOwn(after, 'nextOccurrence'), false);
    const rule = ruleFor({ data: after }, day('2026-11-23'));
    assert.equal(occursOnDay(rule, day('2026-11-22')), true, 'historical opening day remains in the bounded rule');
    assert.equal(occursInWindow(rule, { start: day('2026-11-23'), end: day('2026-12-20') }), false);
    assert.equal(after.status, status, 'schedule evaluation must not republish a closed record');
  }
});

test('restored listing has substantial visitor guidance and credited illustrative media', () => {
  assert.match(record.editorNote, /closed on Mondays/i);
  assert.match(record.editorNote, /admission terms/i);
  assert.ok(record.editorNote.split(/\s+/).length >= 140);
  assert.equal(record.heroImage.depictionStatus, 'illustrative');
  assert.equal(record.heroImage.rightsStatus, 'recorded');
  assert.match(record.heroImage.permission, /Attribution 2\.0/);
  assert.equal(record.heroImage.license, 'wikimedia-cc-by');
  assert.match(record.heroImage.adaptationNote, /Converted from JPEG to WebP/);
  // Caption rule (lib/image-caption.mjs): name the place the photograph shows.
  assert.equal(record.heroImage.caption, 'Mornington Peninsula Regional Gallery, Mornington');
});
