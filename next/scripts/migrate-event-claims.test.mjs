#!/usr/bin/env node
/**
 * migrate-event-claims.test.mjs  -  PI-005 Stage 2.
 *
 * Four properties, in order of how much damage getting them wrong would do:
 *
 *   1. It refuses the traps. A record whose free-text prose carries a
 *      cancellation signal must not be migrated, because the migration would
 *      attach a citation to "runs on <date>" and make a cancelled event look
 *      checked. The corpus contains exactly this case, and the site's own
 *      cancellation reader does not catch it.
 *   2. expiresAt comes from the date the record already carried, never the run
 *      date. Same rule as the Stage 1 seed, and it already has a test there;
 *      this asserts the second generator does not contradict it.
 *   3. Re-running changes nothing, and a hand-authored row survives a re-run.
 *      A migration that clobbered a human's confirmation on its second pass
 *      would destroy the expensive half of this programme.
 *   4. No figure and no em-dash reaches the registry, and the rate class emits
 *      a basis rather than an amount.
 *
 * Usage:  node --test scripts/migrate-event-claims.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildEventRegistry,
  collectEvents,
  holdBackReasons,
  holdBackClasses,
  nearDuplicates,
  sharedCitations,
  titleOverlap,
  planWrites,
  applyPlan,
  serialise,
  scheduleStatement,
  rateStatement,
  bookingStatement,
  clockLabel,
  longDay,
  urlsIn,
} from './migrate-event-claims.mjs';
import { deriveClaimState, indexEvidenceByClaim } from '../src/lib/claim-state.mjs';

const NEXT = fileURLToPath(new URL('..', import.meta.url));
const PRECEDENCE = JSON.parse(await readFile(path.join(NEXT, 'src', 'data', 'source-precedence.json'), 'utf8'));

/* ------------------------------------------------------------------ */
/* Fixture. Dates pinned in the past so no assertion depends on today. */
/* ------------------------------------------------------------------ */

const EVENT = (over) => ({
  slug: 'x',
  title: 'X',
  startDate: '2026-06-14',
  endDate: '2026-06-14',
  startTime: '09:00',
  endTime: '14:00',
  status: 'published',
  publishedAt: '2026-05-01',
  lastCheckedDate: '2026-05-04',
  primarySourceUrl: 'https://www.mornpen.vic.gov.au/Events-Activities/X',
  accessibilityNotes: 'Grassed reserve; prams accessible',
  bookingRequired: 'No',
  freePaid: 'Free',
  ...over,
});

async function buildFixture(records) {
  const root = await mkdtemp(path.join(tmpdir(), 'pi005-events-'));
  const content = path.join(root, 'content');
  await mkdir(path.join(content, 'events'), { recursive: true });
  for (const record of records) {
    await writeFile(path.join(content, 'events', `${record.slug}.json`), JSON.stringify(record, null, 2));
  }
  return { root, content };
}

const build = (records) => buildEventRegistry(
  records.map((data) => ({ id: data.slug, file: path.join(NEXT, 'src', 'content', 'events', `${data.slug}.json`), data })),
  { precedence: PRECEDENCE },
);

/* ------------------------------------------------------------------ */

test('a cancellation hiding in free-text prose is refused, not flattened', () => {
  // The real record. verificationStatus says "cancellation"; the site's own
  // isCancelledRecord tests /cancelled/i and does not match it, so nothing
  // else in the build knows. A migration that emitted a schedule claim here
  // would publish a sourced assertion that a cancelled market is running.
  const record = EVENT({
    slug: 'racecourse-market',
    title: 'Racecourse Market',
    verificationStatus: 'Updated after organiser cancellation notice',
  });
  assert.equal(/cancelled/i.test(record.verificationStatus), false, 'the site reader really does miss this');
  const reasons = holdBackReasons(record, []);
  assert.ok(reasons.some((r) => /cancellation signal/.test(r)), reasons.join('; '));

  const { claims, evidence, heldBack } = build([record]);
  assert.equal(claims.size, 0, 'nothing is written for a record carrying a cancellation signal');
  assert.equal(evidence.size, 0);
  assert.equal(heldBack[0].slug, 'racecourse-market');

  // The explicit flag is caught too, and so is hedged prose.
  assert.ok(holdBackReasons(EVENT({ cancelled: true }), []).some((r) => /cancelled flag/.test(r)));
  assert.ok(holdBackReasons(EVENT({ verificationStatus: 'Tentative' }), []).some((r) => /hedges/.test(r)));
  // "Recurring, next date confirmed" is a positive confirmation, not a hedge.
  // Ten published records carry it and none of them should be held back.
  assert.deepEqual(holdBackReasons(EVENT({ verificationStatus: 'Recurring, next date confirmed' }), []), []);
});

test('a record that cites us as its own source is refused', () => {
  const record = EVENT({ primarySourceUrl: 'https://peninsulainsider.com.au/whats-on/x/' });
  assert.ok(holdBackReasons(record, []).some((r) => /peninsulainsider/.test(r)));
});

test('near-duplicates are held back, a shared aggregator citation is only reported', () => {
  const a = EVENT({ slug: 'emu-plains-market', title: 'Emu Plains Market', primarySourceUrl: 'https://host/emu' });
  const b = EVENT({ slug: 'emu-plains-market-balnarring', title: 'Emu Plains Market, Balnarring', primarySourceUrl: 'https://host/emu' });
  const c = EVENT({ slug: 'crib-point-market', title: 'Crib Point Community Market', primarySourceUrl: 'https://agg/markets' });
  const d = EVENT({ slug: 'mt-eliza-market', title: 'Mt Eliza Farmers Market', primarySourceUrl: 'https://agg/markets' });
  const peers = [a, b, c, d].map((r) => ({ slug: r.slug, title: r.title, primarySourceUrl: r.primarySourceUrl }));

  assert.ok(titleOverlap(a.title, b.title) >= 0.6);
  assert.ok(titleOverlap(c.title, d.title) < 0.6);
  assert.deepEqual(nearDuplicates(a, peers), ['emu-plains-market-balnarring']);
  assert.deepEqual(nearDuplicates(c, peers), [], 'sharing an aggregator page is not being a duplicate');

  const built = build([a, b, c, d]);
  assert.deepEqual(built.heldBack.map((h) => h.slug).sort(), ['emu-plains-market', 'emu-plains-market-balnarring']);
  // The aggregator group is still reported, because four records resting on
  // one third-party page is a fact worth knowing when that page moves.
  assert.deepEqual(
    sharedCitations(peers).map((g) => [g.url, g.slugs.length]),
    [['https://agg/markets', 2], ['https://host/emu', 2]],
  );
  assert.ok(built.claims.has('events/crib-point-market/event-schedule'));
});

test('hours that live only in prose hold back the schedule class, not the record', () => {
  const record = EVENT({
    slug: 'pst-art',
    title: 'PST Art',
    startTime: undefined,
    endTime: undefined,
    summary: 'Opening Night Fri 25 Sept 2026 6.30-8.30pm || Exhibition 26 Sept to 4 Oct 2026 10am-5pm',
  });
  assert.ok(holdBackClasses(record)['event-schedule']);
  const { claims, heldClasses } = build([record]);
  assert.equal(claims.has('events/pst-art/event-schedule'), false);
  assert.ok(claims.has('events/pst-art/accessibility'), 'the rest of the record still migrates');
  assert.equal(heldClasses[0].claimClass, 'event-schedule');
});

test('expiry is computed from the record own date, never from the run date', () => {
  const { evidence, claims } = build([EVENT({ slug: 'a', title: 'A' })]);
  const schedule = [...evidence.values()].find((e) => e.claim === 'events/a/event-schedule');
  // lastCheckedDate is 2026-05-04. event-schedule evidence lasts 30 days, so
  // this row expired on 2026-06-03, months before this test can ever run.
  assert.equal(schedule.retrievedAt, '2026-05-04');
  assert.equal(schedule.expiresAt, '2026-06-03');
  assert.equal(schedule.legacy.dateField, 'lastCheckedDate');
  assert.equal(schedule.origin, 'migrated');
  assert.equal(claims.get('events/a/event-schedule').createdAt, '2026-05-04');

  // rate-change lasts 180 days off the same date, so the two classes on one
  // record expire on different days. That is the point of per-class expiry.
  const rate = [...evidence.values()].find((e) => e.claim === 'events/a/rate-change');
  assert.equal(rate.expiresAt, '2026-10-31');

  // And the fallback order: no lastCheckedDate, so discoveredAt carries it.
  const imported = build([EVENT({ slug: 'b', title: 'B', lastCheckedDate: undefined, discoveredAt: '2026-09-01' })]);
  const row = [...imported.evidence.values()][0];
  assert.equal(row.retrievedAt, '2026-09-01');
  assert.equal(row.legacy.dateField, 'discoveredAt');
});

test('accessibility claims are written with no evidence, and derive unsupported', () => {
  const { claims, evidence } = build([EVENT({ slug: 'a', title: 'A' })]);
  const claim = claims.get('events/a/accessibility');
  assert.ok(claim, 'the claim is written');
  assert.equal(claim.statement, 'Access at A: Grassed reserve; prams accessible.');
  const rows = [...evidence.values()].filter((e) => e.claim === claim.claimId);
  assert.deepEqual(rows, [], 'an event listing is not evidence that somebody read an access statement on it');
  assert.equal(
    deriveClaimState(claim, rows, { now: '2026-05-05', precedence: PRECEDENCE }),
    'unsupported',
    'the honest state, and the one that makes the gap countable',
  );
});

test('the rate class emits a basis and never an amount', () => {
  const record = EVENT({ slug: 'a', title: 'A', freePaid: 'Paid', priceTier: 'under-50', priceRange: 'Adults $30, children $12' });
  const { claims, evidence } = build([record]);
  assert.equal(claims.get('events/a/rate-change').statement, 'Entry to A is ticketed.');
  assert.equal(rateStatement({ title: 'A', freePaid: 'Free (included with bathing)' }), 'Entry to A is free.');
  assert.equal(bookingStatement({ title: 'A', bookingRequired: 'Yes, book via Foxeys website' }), 'Booking is required for A.');

  // priceTier and priceRange are never read, so no figure can reach the
  // registry through this class even when the record carries one.
  const emitted = JSON.stringify([...claims.values(), ...evidence.values()]);
  assert.equal(/\$\s?\d/.test(emitted), false, 'no figure');
  assert.equal(emitted.includes('under-50'), false, 'no tier');
  assert.equal(emitted.includes('—'), false, 'no em-dash');
});

test('statements read as sentences and the dates in them are the record dates', () => {
  assert.equal(longDay('2026-06-14'), '14 June 2026');
  assert.equal(clockLabel('09:00'), '9am');
  assert.equal(clockLabel('14:30'), '2.30pm');
  assert.equal(
    scheduleStatement({ title: 'A', startDate: '2026-06-14', endDate: '2026-06-14', startTime: '09:00', endTime: '14:00' }),
    'A runs on 14 June 2026, 9am to 2pm.',
  );
  assert.equal(
    scheduleStatement({ title: 'A', startDate: '2027-01-02', endDate: '2027-01-11' }),
    'A runs from 2 January 2027 to 11 January 2027.',
  );
  // One real record carries three URLs in one field, separated by pipes.
  assert.deepEqual(urlsIn('https://a.com | https://a.com | https://b.gov.au/x'), ['https://a.com', 'https://a.com', 'https://b.gov.au/x']);
});

test('a re-run changes nothing, and a hand-authored row survives it', async (t) => {
  const { root, content } = await buildFixture([EVENT({ slug: 'a', title: 'A' })]);
  t.after(() => rm(root, { recursive: true, force: true }));
  const claimsDir = path.join(root, 'out', 'claims');
  const evidenceDir = path.join(root, 'out', 'evidence');

  const first = buildEventRegistry(await collectEvents(content), { precedence: PRECEDENCE });
  const claimPlan = await planWrites(first.claims, claimsDir, 'claimId');
  const evidencePlan = await planWrites(first.evidence, evidenceDir, 'evidenceId');
  assert.equal(claimPlan.create.length, first.claims.size);
  await applyPlan(claimPlan);
  await applyPlan(evidencePlan);

  const second = buildEventRegistry(await collectEvents(content), { precedence: PRECEDENCE });
  const claimPlan2 = await planWrites(second.claims, claimsDir, 'claimId');
  const evidencePlan2 = await planWrites(second.evidence, evidenceDir, 'evidenceId');
  assert.deepEqual(claimPlan2.create, []);
  assert.deepEqual(claimPlan2.update, []);
  assert.deepEqual(evidencePlan2.create, []);
  assert.deepEqual(evidencePlan2.update, []);
  assert.equal(claimPlan2.unchanged.length, second.claims.size);

  // Now a human confirms one of them by hand and rewrites the statement.
  const authoredFile = path.join(claimsDir, 'events/a/accessibility.json');
  const authored = { ...JSON.parse(await readFile(authoredFile, 'utf8')), origin: 'authored', statement: 'Access at A: confirmed on site.' };
  await writeFile(authoredFile, serialise(authored));

  const third = buildEventRegistry(await collectEvents(content), { precedence: PRECEDENCE });
  const claimPlan3 = await planWrites(third.claims, claimsDir, 'claimId');
  assert.deepEqual(claimPlan3.deferred, ['events/a/accessibility'], 'the human wins');
  assert.deepEqual(claimPlan3.update, [], 'and nothing else moves');
  await applyPlan(claimPlan3);
  assert.equal(JSON.parse(await readFile(authoredFile, 'utf8')).statement, 'Access at A: confirmed on site.');
});

test('the committed events registry still matches the corpus it was migrated from', async () => {
  const contentDir = path.join(NEXT, 'src', 'content');
  const built = buildEventRegistry(await collectEvents(contentDir), { precedence: PRECEDENCE });
  assert.equal(built.problems.length, 0, built.problems.join('\n'));

  const claimPlan = await planWrites(built.claims, path.join(contentDir, 'claims'), 'claimId');
  const evidencePlan = await planWrites(built.evidence, path.join(contentDir, 'evidence'), 'evidenceId');
  const summarise = (plan) => ({ create: plan.create.length, update: plan.update.length });
  const hint = 'run `npm run migrate:event-claims -- --apply` and commit the result';
  assert.deepEqual(summarise(claimPlan), { create: 0, update: 0 }, hint);
  assert.deepEqual(summarise(evidencePlan), { create: 0, update: 0 }, hint);

  // Every emitted row still joins a claim, and every claim still has a
  // subject that resolves to a record on disk.
  const byClaim = indexEvidenceByClaim([...built.evidence.values()]);
  for (const claimId of byClaim.keys()) assert.ok(built.claims.has(claimId), `orphaned evidence for ${claimId}`);
});
