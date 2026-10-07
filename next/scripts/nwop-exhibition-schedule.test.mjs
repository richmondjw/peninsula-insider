import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const record = JSON.parse(readFileSync(new URL('../src/content/events/national-works-on-paper-2026-nwop.json', import.meta.url), 'utf8'));
const source = readFileSync(new URL('../src/lib/event-schedule.ts', import.meta.url), 'utf8');
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source)).toString('base64');
const { ruleFor, occursOnDay } = await import(moduleUrl);
const day = (iso) => new Date(iso + 'T12:00:00Z');

test('National Works on Paper appears only on actual gallery opening days inside its exhibition run', () => {
  assert.equal(record.status, 'published');
  const data = { ...record, startDate: day(record.startDate), endDate: day(record.endDate), nextOccurrence: record.nextOccurrence ? new Date(record.nextOccurrence) : undefined };
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

test('restored listing has substantial visitor guidance and credited illustrative media', () => {
  assert.match(record.editorNote, /closed on Mondays/i);
  assert.match(record.editorNote, /admission terms/i);
  assert.ok(record.editorNote.split(/\s+/).length >= 140);
  assert.equal(record.heroImage.depictionStatus, 'illustrative');
  assert.equal(record.heroImage.rightsStatus, 'recorded');
  assert.match(record.heroImage.permission, /Attribution 2\.0/);
  assert.match(record.heroImage.caption, /does not depict the National Works on Paper 2026 exhibition/i);
});
