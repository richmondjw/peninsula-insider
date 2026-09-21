import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { planCuration, compareEditorialPlans } from './plan-curation.ts';
import { informationCheckedOn } from '../../../lib/verification-date.mjs';

const content = new URL('../../../content/', import.meta.url);
const itineraries = readdirSync(new URL('itineraries/', content))
  .filter((name) => name.endsWith('.json'))
  .map((name) => JSON.parse(readFileSync(new URL(`itineraries/${name}`, content), 'utf8')));

test('every offered itinerary resolves every stop and has contiguous, correctly ordered days', () => {
  for (const plan of itineraries) {
    assert.ok(plan.stops.length > 1, `${plan.slug}: a usable stop list`);
    const days = [...new Set(plan.stops.map((stop) => stop.day))];
    assert.deepEqual(days, Array.from({ length: plan.lengthNights + 1 }, (_, index) => index + 1), plan.slug);
    for (const day of days) {
      const stops = plan.stops.filter((stop) => stop.day === day);
      assert.deepEqual(stops.map((stop) => stop.order), stops.map((_, index) => index + 1), `${plan.slug} day ${day}`);
    }
    for (const stop of plan.stops) {
      assert.ok(Boolean(stop.venue) !== Boolean(stop.experience), `${plan.slug}: exactly one reference per stop`);
      const relative = stop.venue ? `venues/${stop.venue}.json` : `experiences/${stop.experience}.json`;
      assert.ok(existsSync(new URL(relative, content)), `${plan.slug}: ${relative} exists`);
      const target = JSON.parse(readFileSync(new URL(relative, content), 'utf8'));
      assert.ok(target.name, `${plan.slug}: stop has a title`);
      assert.notEqual(target.status, 'closed', `${plan.slug}: closed stop cannot be imported`);
    }
  }
});

test('the general weekend leads regardless of publishing dates or input order', () => {
  const records = itineraries.map((plan, index) => ({
    kind: 'itinerary', title: plan.title, slug: plan.slug,
    ...planCuration(plan.slug, plan.title, 'itinerary'),
    publishedAt: index === 0 ? Date.now() : 0,
  }));
  records.push({ kind: 'guide', title: 'A newly published guide', slug: 'new-guide', editorialPriority: 999, publishedAt: Date.now() });
  for (const input of [records, [...records].reverse()]) {
    const sorted = [...input].sort(compareEditorialPlans);
    assert.equal(sorted[0].slug, 'ridge-to-sea-two-night-escape');
    assert.equal(sorted.at(-1).kind, 'guide');
    assert.ok(sorted.findIndex((p) => p.slug === 'the-peninsula-golf-weekend') > 0);
  }
});

test('published dates are never used as factual verification', () => {
  for (const plan of itineraries.filter((plan) => !plan.editorialProvenance?.source)) {
    assert.equal(informationCheckedOn(plan), undefined, plan.slug);
  }
  assert.equal(informationCheckedOn({ publishedAt: '2026-04-14', lastVerified: '2026-04-14' }), undefined);
});

test('six current itineraries provide short labels, useful booking advice and valid place facets', () => {
  for (const plan of itineraries) {
    const curation = planCuration(plan.slug, plan.title, 'itinerary');
    assert.ok(curation.displayTitle.length <= 32, plan.slug);
    assert.ok(curation.editorialReason.length > 30, plan.slug);
    assert.ok(curation.bookingNote.length > 30, plan.slug);
    assert.ok(plan.bookingChecklist.length > 0, plan.slug);
    assert.ok(plan.theme.length > 0 && plan.theme.length <= 2, plan.slug);
    assert.ok(existsSync(new URL(`places/${plan.anchorTown}.json`, content)), plan.slug);
    for (const place of plan.baseTowns) assert.ok(existsSync(new URL(`places/${place}.json`, content)), `${plan.slug}: ${place}`);
  }
});

test('golf summary describes its stops and wellness begins with a lunch service', () => {
  const golf = itineraries.find((plan) => plan.slug === 'the-peninsula-golf-weekend');
  assert.doesNotMatch(golf.dek, /hot springs|ten minutes|ranking/i);
  assert.doesNotMatch(golf.heroImage.alt, /golf course/i, 'the photograph shows coast, not a golf course');
  const wellness = itineraries.find((plan) => plan.slug === 'wellness-weekend');
  const merricks = wellness.stops.find((stop) => stop.venue === 'merricks-general-wine-store');
  assert.equal(merricks.timeOfDay, 'midday');
  assert.equal(merricks.order, 1);
  assert.equal(wellness.stops[1].venue, 'lindenderry');
});
