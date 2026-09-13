#!/usr/bin/env node
/**
 * seed-claim-registry.test.mjs  -  PI-005 Stage 1.
 *
 * Two properties matter more than the rest, because getting either wrong
 * would make the registry a second layer of stale dates on top of the first:
 *
 *   1. expiresAt is computed from the date the source record already carried,
 *      never from the day the migration ran. A seed that stamped today would
 *      make 429 rows look freshly verified when not one of them had been.
 *   2. re-running changes nothing. A migration that is not idempotent cannot
 *      be re-run after a corpus edit, so it gets run once and then rots.
 *
 * Both are tested on a fixture with pinned dates, and (2) is tested again
 * against the committed registry, which is the only way to know the files in
 * git still match the corpus they were derived from.
 *
 * Usage:  node --test scripts/seed-claim-registry.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  harvest,
  buildRegistry,
  planWrites,
  applyPlan,
  classifyUrl,
  looksLikeOwnSite,
  splitSourceValue,
  houseStyle,
} from './seed-claim-registry.mjs';
import { computeExpiresAt, deriveClaimState, toIsoDay } from '../src/lib/claim-state.mjs';

const NEXT = fileURLToPath(new URL('..', import.meta.url));
const PRECEDENCE = JSON.parse(await readFile(path.join(NEXT, 'src', 'data', 'source-precedence.json'), 'utf8'));

/* ------------------------------------------------------------------ */
/* Fixture: one record of each shape, with dates far in the past so the */
/* expiry assertions do not depend on the day the test runs.            */
/* ------------------------------------------------------------------ */

async function buildFixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'pi005-'));
  const content = path.join(root, 'content');
  const data = path.join(root, 'data');

  const write = async (rel, body) => {
    const file = path.join(root, rel);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  };

  // A closure note with two sources, one of them dated later than the note.
  await write('content/quick-notes/track-closed.md', [
    '---',
    'headline: "Bushrangers Bay track is closed"',
    'section: explore',
    'tag: closure',
    'publishedAt: 2026-01-10T09:00:00+11:00',
    'expiresAt: 2026-01-17T00:00:00+11:00',
    'verifiedAt: 2026-01-10T08:00:00+11:00',
    'sources:',
    '  - kind: gov',
    '    url: https://www.parks.vic.gov.au/closures',
    '    checkedAt: 2026-02-01T08:00:00+11:00',
    '  - kind: phone',
    '    note: "Ranger confirmed by phone"',
    'relatedVenue: cape-schanck',
    'status: archived',
    '---',
    '',
    'Body copy.',
    '',
  ].join('\n'));

  // The related record the note points at, so the cross-collection assertion
  // has something to resolve against.
  await write('content/places/cape-schanck.json', JSON.stringify({ slug: 'cape-schanck' }, null, 2));

  // An event with all three provenance shapes on one record.
  await write('content/events/winter-tasting.json', JSON.stringify({
    slug: 'winter-tasting',
    title: 'Winter tasting at Montalto',
    venueName: 'Montalto',
    organiser: { name: 'Montalto' },
    primarySourceUrl: 'https://montalto.com.au/whats-on',
    secondarySourceUrl: 'https://www.mornpen.vic.gov.au/events/winter-tasting',
    provenance: 'auto-published by promote-candidates.mjs from JSON-LD event feed',
    source: 'humanitix-mornington--3931',
    sourceUrl: 'https://events.humanitix.com/winter-tasting',
    discoveredAt: '2026-03-02',
    lastCheckedDate: '2026-03-20',
    publishedAt: '2026-03-21',
    status: 'published',
  }, null, 2));

  await write('content/species/snapper.md', [
    '---',
    'slug: snapper',
    'commonName: Snapper',
    'scientificName: Chrysophrys auratus',
    'vfaCitationUrl: https://vfa.vic.gov.au/recreational-fishing/limits',
    'lastVerified: 2026-02-14',
    'publishedAt: 2026-02-14',
    '---',
    '',
    'Body copy.',
    '',
  ].join('\n'));

  await write('content/signature-events/sorrento-solstice.json', JSON.stringify({
    slug: 'sorrento-solstice',
    name: 'Sorrento Solstice',
    recurrence: 'annual, June',
    officialUrl: 'https://sorrentosolstice.com.au/',
    lastReviewed: '2026-01-05',
  }, null, 2));

  // The orphaned fact layer, including the two shapes that are not clean
  // URLs and a figure that the house-style rule must strip.
  await write('data/facts/food.json', JSON.stringify({
    lastUpdated: '2026-04-22',
    activeAlerts: [{
      entity: 'Stillwater at Crittenden',
      alert: 'Closed for renovation, tasting was $95 per head',
      source: 'lakesidevillas.com.au announcement Jun 2025',
      dateSince: '2026-03',
    }],
  }, null, 2));

  await write('data/facts/wine.json', JSON.stringify({
    lastUpdated: '2026-04-22',
    region: { name: 'Mornington Peninsula', source: 'https://morningtonpeninsulawine.com.au/region-and-history' },
    wineries: [
      { name: 'Montalto', source: 'https://montalto.com.au' },
      { name: 'Ten Minutes by Tractor', source: 'https://www.tripadvisor.com.au (primary site blocked by robots.txt)' },
    ],
  }, null, 2));

  return { root, content, data };
}

/* ------------------------------------------------------------------ */

test('expiry is computed from the source date, never from the run date', async (t) => {
  const { root, content, data } = await buildFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  const { rows } = await harvest({ contentDir: content, dataDir: data });

  // Run the same harvest through two very different "today" values. Nothing
  // about the emitted rows may move.
  const early = buildRegistry(rows, { precedence: PRECEDENCE, today: '2026-03-01' });
  const late = buildRegistry(rows, { precedence: PRECEDENCE, today: '2031-01-01' });
  assert.deepEqual([...late.evidence.values()], [...early.evidence.values()]);
  assert.deepEqual([...late.claims.values()], [...early.claims.values()]);

  // The gov source on the closure note was checked on 2026-02-01. A closure
  // note is a trading-status claim, and trading-status evidence lasts 90
  // days, so this row expires 2026-05-02: anchored to the date the record
  // already carried, and nowhere near the day this test runs.
  const govRow = [...early.evidence.values()].find((e) => e.url === 'https://www.parks.vic.gov.au/closures');
  assert.equal(govRow.retrievedAt, '2026-02-01');
  assert.equal(govRow.expiresAt, '2026-05-02');
  assert.equal(govRow.origin, 'migrated');

  // The second source on the same note has no checkedAt, so it falls back to
  // the note's own verifiedAt. Still not the run date.
  const phoneRow = [...early.evidence.values()].find((e) => e.publisher.kind === 'phone');
  assert.equal(phoneRow.retrievedAt, '2026-01-10');
  assert.equal(phoneRow.legacy.dateField, 'verifiedAt');

  // And the count of already-expired rows moves with `today` while the rows
  // themselves do not. That is the whole shape of the design: state is
  // computed, expiry is stored.
  assert.ok(late.expired.length >= early.expired.length);
  assert.equal(late.expired.length, late.evidence.size);
});

test('a re-run over a fixture changes nothing', async (t) => {
  const { root, content, data } = await buildFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  const claimsDir = path.join(root, 'out', 'claims');
  const evidenceDir = path.join(root, 'out', 'evidence');

  const { rows } = await harvest({ contentDir: content, dataDir: data });
  const first = buildRegistry(rows, { precedence: PRECEDENCE, today: '2026-09-13' });
  assert.equal(first.problems.length, 0);

  const claimPlan = await planWrites(first.claims, claimsDir, 'claimId');
  const evidencePlan = await planWrites(first.evidence, evidenceDir, 'evidenceId');
  assert.equal(claimPlan.create.length, first.claims.size);
  assert.equal(evidencePlan.create.length, first.evidence.size);
  await applyPlan(claimPlan);
  await applyPlan(evidencePlan);

  // Second pass: a different "today", a fresh harvest, same files on disk.
  const { rows: rows2 } = await harvest({ contentDir: content, dataDir: data });
  const second = buildRegistry(rows2, { precedence: PRECEDENCE, today: '2027-05-05' });
  const claimPlan2 = await planWrites(second.claims, claimsDir, 'claimId');
  const evidencePlan2 = await planWrites(second.evidence, evidenceDir, 'evidenceId');

  assert.deepEqual(claimPlan2.create, []);
  assert.deepEqual(claimPlan2.update, []);
  assert.deepEqual(claimPlan2.orphaned, []);
  assert.equal(claimPlan2.unchanged.length, second.claims.size);
  assert.deepEqual(evidencePlan2.create, []);
  assert.deepEqual(evidencePlan2.update, []);
  assert.deepEqual(evidencePlan2.orphaned, []);
  assert.equal(evidencePlan2.unchanged.length, second.evidence.size);
});

test('every evidence row joins a claim, and every claim subject resolves', async (t) => {
  const { root, content, data } = await buildFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  const { rows } = await harvest({ contentDir: content, dataDir: data });
  const { claims, evidence, problems } = buildRegistry(rows, { precedence: PRECEDENCE, today: '2026-09-13' });
  assert.equal(problems.length, 0);

  for (const record of evidence.values()) {
    assert.ok(claims.has(record.claim), `orphaned evidence row: ${record.evidenceId}`);
    assert.ok(record.legacy.file, 'every migrated row names the file it came from');
    assert.ok(record.legacy.field, 'every migrated row names the field it came from');
    assert.ok(record.legacy.value, 'every migrated row keeps the original value');
  }

  // The closure note claim is asserted by two records in two collections.
  // This is the case a provenance field on each record cannot represent, and
  // the reason claims are a sidecar collection.
  const closure = claims.get('quick-notes/track-closed/trading-status');
  assert.ok(closure, 'the closure note produced a trading-status claim');
  assert.deepEqual(closure.assertedBy.map((a) => a.type), ['quick-notes', 'places']);

  // One event, three provenance shapes, one claim.
  const eventClaim = claims.get('events/winter-tasting/event-status');
  assert.ok(eventClaim);
  const eventRows = [...evidence.values()].filter((e) => e.claim === eventClaim.claimId);
  assert.equal(eventRows.length, 3);
  assert.deepEqual(
    eventRows.map((e) => e.legacy.field).sort(),
    ['primarySourceUrl', 'provenance+source+sourceUrl', 'secondarySourceUrl'],
  );

  // createdAt is the earliest date the corpus already carried, not today.
  assert.equal(eventClaim.createdAt, '2026-03-02');
  assert.equal(eventClaim.origin, 'migrated');
});

test('publisher kind is inferred only from structural signals', () => {
  assert.equal(classifyUrl('https://www.mornpen.vic.gov.au/events'), 'gov');
  assert.equal(classifyUrl('https://events.humanitix.com/x'), 'ticketing');
  assert.equal(classifyUrl('https://www.visitmorningtonpeninsula.org/x'), 'regional-body');
  assert.equal(classifyUrl('https://www.facebook.com/x'), 'social');
  // Our own domain is not evidence for our own claim.
  assert.equal(classifyUrl('https://peninsulainsider.com.au/whats-on'), 'unknown');
  // A publication is not classified as press by guesswork.
  assert.equal(classifyUrl('https://www.australiantraveller.com/vic/x'), 'unknown');
  // Own-site matching is structural, and conservative.
  assert.equal(classifyUrl('https://montalto.com.au/x', [['Montalto', 'venue-site']]), 'venue-site');
  assert.equal(classifyUrl('https://montalto.com.au/x', [['Quealy', 'venue-site']]), 'unknown');
  assert.equal(looksLikeOwnSite('Pt. Leo Estate', 'ptleoestate.com.au'), true);
  assert.equal(looksLikeOwnSite('The', 'theninch.com.au'), false);
});

test('a source value that is not a clean URL is split, not discarded', () => {
  assert.deepEqual(splitSourceValue('lakesidevillas.com.au announcement Jun 2025'), {
    url: null,
    method: 'lakesidevillas.com.au announcement Jun 2025',
  });
  const split = splitSourceValue('https://www.tripadvisor.com.au (primary site blocked by robots.txt)');
  assert.equal(split.url, 'https://www.tripadvisor.com.au');
  assert.equal(split.method, 'primary site blocked by robots.txt');
});

test('house style is applied to every emitted string', async (t) => {
  const { root, content, data } = await buildFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  assert.equal(houseStyle('a—b'), 'a - b');
  assert.equal(houseStyle('tasting was $95 per head'), 'tasting was [figure withheld] per head');
  // Repeated calls must behave the same: a stateful /g regex would make the
  // second call miss.
  assert.equal(houseStyle('a—b'), 'a - b');

  const { rows } = await harvest({ contentDir: content, dataDir: data });
  const { claims, evidence } = buildRegistry(rows, { precedence: PRECEDENCE, today: '2026-09-13' });
  const emitted = [...claims.values(), ...evidence.values()].map((r) => JSON.stringify(r)).join('\n');
  assert.ok(!emitted.includes('—'), 'no em-dash may reach the registry');
  assert.equal(/\$\s?\d/.test(emitted.replace(/"value":"[^"]*"/g, '')), false, 'no figure outside the legacy value');
});

test('state is derived, and expiry moves a claim to unsupported without deleting it', () => {
  const claim = { claimId: 'venues/x/trading-status', claimClass: 'trading-status' };
  const fresh = {
    claim: claim.claimId, stance: 'supports', publisher: { kind: 'venue-site' },
    retrievedAt: '2026-09-01', expiresAt: toIsoDay(computeExpiresAt('2026-09-01', 'trading-status', PRECEDENCE)),
  };
  assert.equal(fresh.expiresAt, '2026-11-30');
  assert.equal(deriveClaimState(claim, [fresh], { now: '2026-09-13', precedence: PRECEDENCE }), 'supported');
  // The row is untouched; only the calendar moved.
  assert.equal(deriveClaimState(claim, [fresh], { now: '2027-01-01', precedence: PRECEDENCE }), 'unsupported');

  // Disagreement from a less authoritative publisher does not unseat the
  // operator; a tie does, because a tie needs an editor.
  const disputeWeak = { ...fresh, stance: 'disputes', publisher: { kind: 'social' } };
  const disputeEqual = { ...fresh, stance: 'disputes', publisher: { kind: 'venue-site' } };
  assert.equal(deriveClaimState(claim, [fresh, disputeWeak], { now: '2026-09-13', precedence: PRECEDENCE }), 'supported');
  assert.equal(deriveClaimState(claim, [fresh, disputeEqual], { now: '2026-09-13', precedence: PRECEDENCE }), 'disputed');

  // Retirement wins over everything, and is a transition, not a deletion.
  assert.equal(
    deriveClaimState({ ...claim, retiredAt: '2026-09-10' }, [fresh], { now: '2026-09-13', precedence: PRECEDENCE }),
    'retired',
  );
});

test('the committed registry still matches the corpus it was seeded from', async () => {
  const contentDir = path.join(NEXT, 'src', 'content');
  const dataDir = path.join(NEXT, 'src', 'data');
  const { rows } = await harvest({ contentDir, dataDir });
  const built = buildRegistry(rows, { precedence: PRECEDENCE, today: '2026-09-13' });
  assert.equal(built.problems.length, 0, built.problems.join('\n'));

  const claimPlan = await planWrites(built.claims, path.join(contentDir, 'claims'), 'claimId');
  const evidencePlan = await planWrites(built.evidence, path.join(contentDir, 'evidence'), 'evidenceId');

  const summarise = (plan) => ({ create: plan.create.length, update: plan.update.length, orphaned: plan.orphaned.length });
  assert.deepEqual(summarise(claimPlan), { create: 0, update: 0, orphaned: 0 },
    'run `npm run seed:claim-registry -- --apply` and commit the result');
  assert.deepEqual(summarise(evidencePlan), { create: 0, update: 0, orphaned: 0 },
    'run `npm run seed:claim-registry -- --apply` and commit the result');
});
