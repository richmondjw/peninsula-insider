import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
async function bundle(relative) {
  const result = await build({ entryPoints: [fileURLToPath(new URL(relative, import.meta.url))], bundle: true, write: false, format: 'esm', platform: 'node', define: { 'import.meta.env.PUBLIC_EVENT_OCCURRENCE_MODEL': '"off"' } });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
const schedule = await bundle('../src/lib/event-schedule.ts');
const home = await bundle('../src/components/v5/home/home-data.ts');
const now = new Date('2026-09-16T04:00:00Z');
const event = (overrides = {}) => ({ id: 'fixture', data: { title: 'Fixture', status: 'published', startDate: new Date('2026-01-01'), recurrence: 'weekly', recurrenceNote: 'Every Thursday', ...overrides } });
test('Thursday excluded from editorial and fallback homepage picks', () => {
  const thursday = event();
  const saturday = event({ slug: 'saturday', recurrenceNote: 'Every Saturday' });
  assert.equal(home.occursOnWeekend(thursday, home.weekendWindow(now), now), false);
  const sheet = { data: { weekendStart: new Date('2026-09-19'), picks: [{ eventSlug: 'fixture', position: 1 }] } };
  assert.deepEqual(home.selectWeekendPicks([sheet], [thursday, saturday], now).picks.map(p => p.event.data.slug), ['saturday']);
});
test('homepage Sat–Sun excludes Friday while calendar explicitly includes Friday', () => {
  const friday = event({ recurrenceNote: 'Every Friday' });
  assert.equal(home.occursOnWeekend(friday, home.weekendWindow(now), now), false);
  const window = schedule.weekendWindow(now);
  assert.equal(schedule.isoDate(window.start), '2026-09-18');
  assert.equal(schedule.occursInWindow(schedule.ruleFor(friday, now), window), true);
  assert.match(window.label, /Fri 18.*Sun 20 September/);
});
test('weekly weekday range expands through weekend', () => {
  const rule = schedule.ruleFor(event({ recurrenceNote: 'Thursday to Sunday' }), now);
  assert.deepEqual(rule.days, [4, 5, 6, 0]);
  for (const day of ['2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20']) assert.equal(schedule.occursOnDay(rule, new Date(day)), true);
  assert.equal(schedule.occursOnDay(rule, new Date('2026-09-21')), false);
});
test('monthly, future-start, expired and seasonal series respect weekend bounds', () => {
  for (const fields of [
    { recurrence: 'monthly', recurrenceNote: 'First Saturday' },
    { recurrenceNote: 'Every Saturday', startDate: new Date('2026-10-01') },
    { recurrenceNote: 'Every Saturday', endDate: new Date('2026-08-31') },
    { recurrenceNote: 'Every Saturday during winter' },
  ]) assert.equal(home.occursOnWeekend(event(fields), home.weekendWindow(now), now), false);
});
test('cancelled, postponed and sold-out occurrences are not promoted', () => {
  for (const status of ['cancelled', 'postponed', 'sold-out']) assert.equal(home.occursOnWeekend(event({ recurrenceNote: 'Every Saturday', occurrenceExceptions: [{ date: '2026-09-19', status }] }), home.weekendWindow(now), now), false, status);
});
test('monthly date chip uses weekend occurrence not stale record date', () => {
  assert.equal(home.pickDateISO(event({ recurrence: 'monthly', recurrenceNote: 'Third Saturday', nextOccurrence: new Date('2026-08-15') }), now), '2026-09-19');
});
test('Melbourne date boundary, DST and holiday dates remain stable', () => {
  const sunday = schedule.weekendWindow(new Date('2026-10-03T14:30:00Z'));
  assert.equal(schedule.isoDate(sunday.start), '2026-10-02');
  assert.equal(schedule.isoDate(sunday.end), '2026-10-04');
  assert.equal(schedule.isoDate(schedule.weekendWindow(new Date('2026-10-04T13:30:00Z')).start), '2026-10-09');
  const holiday = schedule.schoolHolidayWindow(now);
  assert.equal(schedule.isoDate(holiday.start), '2026-09-19');
  assert.equal(schedule.isoDate(holiday.end), '2026-10-04');
});


test('Sunday promotion excludes finished Saturday occurrences and aligns date chips', () => {
  const sunday = new Date('2026-09-20T00:00:00Z');
  const saturday = event({ recurrenceNote: 'Every Saturday' });
  const both = event({ slug: 'both', recurrenceNote: 'Saturday and Sunday' });
  assert.equal(home.occursOnWeekend(saturday, home.weekendWindow(sunday), sunday), false);
  assert.equal(home.pickDateISO(saturday, sunday), undefined);
  assert.equal(home.pickDateISO(both, sunday), '2026-09-20');
  assert.deepEqual(home.selectWeekendPicks([], [saturday, both], sunday).picks.map(p => p.event.data.slug), ['both']);
});
