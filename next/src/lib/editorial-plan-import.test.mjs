import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareEditorialPlan } from './editorial-plan-import.ts';
const empty = () => ({ version: 1, days: [], entries: [] });
const plan = { slug: 'weekend', title: 'Weekend', entityType: 'itinerary', stops: [
  { day: 1, kind: 'venue', slug: 'a', title: 'A', href: '/eat/a/' },
  { day: 2, kind: 'venue', slug: 'a', title: 'A again', href: '/eat/a/' },
  { day: 2, title: 'A walk', note: 'Leave room for the weather.' },
] };
test('preserves day grouping, repeated visits and standalone notes', () => {
  const result = prepareEditorialPlan(plan, empty(), 'append', 100);
  assert.equal(result.days.length, 2);
  assert.equal(result.entries.length, 3);
  assert.equal(result.entries[1].dayId, result.entries[2].dayId);
  assert.notEqual(result.entries[0].dayId, result.entries[1].dayId);
  assert.equal(result.entries[2].note, 'Leave room for the weather.');
});
test('repeat import adds neither stops nor empty days', () => {
  const first = prepareEditorialPlan(plan, empty(), 'append', 100);
  assert.deepEqual(prepareEditorialPlan(plan, first, 'append', 200), first);
});
test('append keeps existing data and adds distinct days; replace is explicit', () => {
  const existing = { version: 1, days: [{ id: 'mine', label: 'My Saturday' }], entries: [{ id: 'mine', dayId: 'mine', note: 'Keep this', addedAt: 1 }] };
  const added = prepareEditorialPlan(plan, existing, 'append', 100);
  assert.deepEqual(added.entries[0], existing.entries[0]);
  assert.equal(added.days[1].label, 'Day 2');
  assert.equal(existing.entries.length, 1);
  const replaced = prepareEditorialPlan(plan, existing, 'replace', 100);
  assert.equal(replaced.entries.length, 3);
  assert.equal(replaced.days[0].label, 'Day 1');
});
test('guides and invalid or empty plans cannot become trips', () => {
  assert.equal(prepareEditorialPlan({ ...plan, entityType: 'article' }, empty(), 'replace'), null);
  assert.equal(prepareEditorialPlan({ ...plan, stops: [] }, empty(), 'replace'), null);
  assert.equal(prepareEditorialPlan({ ...plan, stops: [{ day: 0, title: 'bad' }] }, empty(), 'replace'), null);
});
test('removing one imported stop allows only that occurrence to be restored', () => {
  const first = prepareEditorialPlan(plan, empty(), 'append', 100);
  first.entries.splice(1, 1);
  const restored = prepareEditorialPlan(plan, first, 'append', 200);
  assert.equal(restored.days.length, 2);
  assert.equal(restored.entries.length, 3);
});
