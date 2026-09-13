/**
 * Tests for the PI-022 material-change derivation.
 *
 * TWO HALVES, AND THE SPLIT IS DELIBERATE.
 *
 * The first half asserts the RULE against fixtures built here. The rule is the
 * deliverable: a claim re-verified with the same value is a reassurance and
 * must not reach a changes bucket, a claim whose value moved is a change and
 * must. Fixtures are the only way to assert that, because today's corpus
 * happens to contain no superseded claim and no retirement, and a rule that is
 * only tested where the data already exercises it is a rule that silently
 * stops being tested the day the data moves.
 *
 * The second half runs over the REAL corpus and asserts invariants, never a
 * snapshot. Every expectation there is computed from the same data at runtime:
 * the set of claims that should be reported as first-verified is derived by
 * asking claim-state.mjs, not by listing claim ids. Tests that encoded a corpus
 * snapshot have broken this build twice, and a "what has changed" derivation is
 * the worst possible place to put a third, because the corpus changes by
 * design: that is the thing it measures.
 *
 * NOTHING HERE IS TIME-DRIVEN. Every case pins `now`. A test whose result moves
 * with the calendar fails on a day nobody chose.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { deriveClaimState, indexEvidenceByClaim, toDate } from './claim-state.mjs';
import {
  CHANGE_KINDS,
  REASSURANCE_KINDS,
  claimStateAt,
  classifyClaimSince,
  classifyRecordSince,
  evidenceKnownAt,
  materialChangesSince,
  observedValueMoved,
  recordsFromCollections,
} from './material-change.mjs';
import { loadCorpus } from '../../scripts/verification-loop/corpus.mjs';

const NEXT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const PRECEDENCE = {
  defaultExpiryDays: 90,
  classes: {
    'opening-hours': { expiryDays: 90, precedence: ['venue-site', 'social', 'unknown'] },
    'trading-status': { expiryDays: 90, precedence: ['venue-site', 'phone', 'social', 'unknown'] },
  },
};

const claim = (over = {}) => ({
  claimId: 'venues/the-dunes/opening-hours',
  claimClass: 'opening-hours',
  subject: { type: 'venues', slug: 'the-dunes' },
  statement: 'Open Wednesday to Sunday.',
  assertedBy: [{ type: 'venues', slug: 'the-dunes' }],
  createdAt: '2026-01-10',
  ...over,
});

/**
 * An evidence row. `value` is the shorthand for the observed field value,
 * which is what a re-read either repeats or moves.
 */
const row = (over = {}) => {
  const { value, field = 'hours', ...rest } = over;
  const built = {
    evidenceId: 'venues/the-dunes/opening-hours-a',
    claim: 'venues/the-dunes/opening-hours',
    stance: 'supports',
    publisher: { kind: 'venue-site', name: 'The Dunes' },
    retrievedAt: '2026-01-10',
    expiresAt: '2026-04-10',
    ...rest,
  };
  if (value != null) {
    built.legacy = { file: 'next/src/content/venues/the-dunes.json', field, value };
  }
  return built;
};

const classify = (c, rows, since, now) =>
  classifyClaimSince(c, rows, { since, now, precedence: PRECEDENCE });

/* == the rule ========================================================= */

test('a re-read that comes back the same is a reassurance, and never a change', () => {
  const c = claim();
  const rows = [
    row({ evidenceId: 'a', retrievedAt: '2026-03-01', expiresAt: '2026-05-30', value: 'Wed-Sun' }),
    row({ evidenceId: 'b', retrievedAt: '2026-06-01', expiresAt: '2026-08-30', value: 'Wed-Sun' }),
  ];

  const found = classify(c, rows, '2026-04-01', '2026-06-15');
  assert.equal(found.kind, 'claim-reverified');
  assert.equal(found.nature, 'reassurance');
  assert.equal(found.at, '2026-06-01');

  const result = materialChangesSince({
    since: '2026-04-01',
    now: '2026-06-15',
    claims: [c],
    evidence: rows,
    precedence: PRECEDENCE,
  });
  assert.deepEqual(result.changes, []);
  assert.equal(result.reassurances.length, 1);
  assert.equal(result.counts.changes, 0);
  assert.equal(result.counts.reassurances, 1);
});

test('a re-read that comes back different is a change, not a reassurance', () => {
  const c = claim();
  const rows = [
    row({ evidenceId: 'a', retrievedAt: '2026-03-01', expiresAt: '2026-05-30', value: 'Wed-Sun' }),
    row({ evidenceId: 'b', retrievedAt: '2026-06-01', expiresAt: '2026-08-30', value: 'Thu-Sun' }),
  ];

  const found = classify(c, rows, '2026-04-01', '2026-06-15');
  assert.equal(found.kind, 'claim-value-changed');
  assert.equal(found.nature, 'value');

  const result = materialChangesSince({
    since: '2026-04-01',
    now: '2026-06-15',
    claims: [c],
    evidence: rows,
    precedence: PRECEDENCE,
  });
  assert.equal(result.changes.length, 1);
  assert.deepEqual(result.reassurances, []);
});

test('the two differ only in the value, so the rule is the value and not the activity', () => {
  // Same claim, same dates, same publisher, same row count. The ONLY difference
  // between a change and a reassurance is whether the observed value moved.
  const c = claim();
  const base = [
    row({ evidenceId: 'a', retrievedAt: '2026-03-01', expiresAt: '2026-05-30', value: 'Wed-Sun' }),
  ];
  const same = [...base, row({ evidenceId: 'b', retrievedAt: '2026-06-01', expiresAt: '2026-08-30', value: 'Wed-Sun' })];
  const moved = [...base, row({ evidenceId: 'b', retrievedAt: '2026-06-01', expiresAt: '2026-08-30', value: 'Thu-Sun' })];

  assert.equal(observedValueMoved(base, same.slice(1)), false);
  assert.equal(observedValueMoved(base, moved.slice(1)), true);
  assert.equal(classify(c, same, '2026-04-01', '2026-06-15').nature, 'reassurance');
  assert.equal(classify(c, moved, '2026-04-01', '2026-06-15').nature, 'value');
});

test('a value we never had before is not a value that moved', () => {
  const c = claim();
  const rows = [
    row({ evidenceId: 'a', retrievedAt: '2026-03-01', expiresAt: '2026-05-30', field: 'hours', value: 'Wed-Sun' }),
    row({ evidenceId: 'b', retrievedAt: '2026-06-01', expiresAt: '2026-08-30', field: 'kitchenHours', value: 'til late' }),
  ];
  assert.equal(observedValueMoved(rows.slice(0, 1), rows.slice(1)), false);
  assert.equal(classify(c, rows, '2026-04-01', '2026-06-15').kind, 'claim-reverified');
});

test('a claim that lapsed and was re-checked is re-verified, never first-verified', () => {
  // The trap this case exists for: at `since` the claim is unsupported because
  // its only row has expired. Reading "unsupported to supported" as a first
  // verification would republish an old fact as news every time the loop ran.
  const c = claim();
  const rows = [
    row({ evidenceId: 'a', retrievedAt: '2026-01-10', expiresAt: '2026-04-10', value: 'Wed-Sun' }),
    row({ evidenceId: 'b', retrievedAt: '2026-06-01', expiresAt: '2026-08-30', value: 'Wed-Sun' }),
  ];
  assert.equal(claimStateAt(c, rows, { at: '2026-05-01', precedence: PRECEDENCE }), 'unsupported');
  assert.equal(deriveClaimState(c, rows, { now: '2026-06-15', precedence: PRECEDENCE }), 'supported');

  const found = classify(c, rows, '2026-05-01', '2026-06-15');
  assert.equal(found.kind, 'claim-reverified');
});

test('a claim verified for the first time is a change', () => {
  const c = claim({ createdAt: '2026-05-05' });
  const rows = [row({ evidenceId: 'a', retrievedAt: '2026-05-05', expiresAt: '2026-08-03', value: 'Wed-Sun' })];

  assert.equal(claimStateAt(c, rows, { at: '2026-04-01', precedence: PRECEDENCE }), 'absent');
  const found = classify(c, rows, '2026-04-01', '2026-06-15');
  assert.equal(found.kind, 'claim-verified');
  assert.equal(found.nature, 'arrival');
  assert.equal(found.at, '2026-05-05');
});

test('a claim that did not exist at the since date is a first verification, however old its evidence', () => {
  // The migration seeded rows carrying dates the corpus already held, some of
  // them years old, onto claims created on the day of the seed. Reading those
  // as re-verifications would reassure a reader about something we had never
  // published.
  const c = claim({ createdAt: '2026-05-05' });
  const rows = [row({ evidenceId: 'a', retrievedAt: '2022-05-04', expiresAt: '2026-12-31', value: 'Wed-Sun' })];
  assert.equal(claimStateAt(c, rows, { at: '2026-04-01', precedence: PRECEDENCE }), 'absent');
  const found = classify(c, rows, '2026-04-01', '2026-06-15');
  assert.equal(found.kind, 'claim-verified');
  assert.equal(found.nature, 'arrival');
});

test('a superseding claim reports the statement it moved from and the one it moved to', () => {
  const old = claim({ statement: 'Open Wednesday to Sunday.' });
  const next = claim({
    claimId: 'venues/the-dunes/opening-hours-2',
    statement: 'Open Thursday to Sunday.',
    createdAt: '2026-06-01',
    supersedes: old.claimId,
  });
  const rows = [
    row({ evidenceId: 'a', retrievedAt: '2026-03-01', expiresAt: '2026-05-30' }),
    row({ evidenceId: 'b', claim: next.claimId, retrievedAt: '2026-06-01', expiresAt: '2026-08-30' }),
  ];

  const result = materialChangesSince({
    since: '2026-04-01',
    now: '2026-06-15',
    claims: [old, next],
    evidence: rows,
    precedence: PRECEDENCE,
  });
  const moved = result.changes.find((entry) => entry.kind === 'claim-value-changed');
  assert.ok(moved, 'the superseded claim must report a moved value');
  assert.equal(moved.previousStatement, 'Open Wednesday to Sunday.');
  assert.equal(moved.statement, 'Open Thursday to Sunday.');
  assert.equal(moved.supersededBy, next.claimId);
  assert.deepEqual(result.reassurances, []);
});

test('a retirement is a change and outranks everything else in the window', () => {
  const c = claim({ retiredAt: '2026-06-02', retiredReason: 'venue closed' });
  const rows = [
    row({ evidenceId: 'a', retrievedAt: '2026-03-01', expiresAt: '2026-05-30' }),
    row({ evidenceId: 'b', retrievedAt: '2026-06-01', expiresAt: '2026-08-30' }),
  ];
  const found = classify(c, rows, '2026-04-01', '2026-06-15');
  assert.equal(found.kind, 'claim-withdrawn');
  assert.equal(found.at, '2026-06-02');
});

test('sources that start disagreeing are a change', () => {
  const c = claim();
  const rows = [
    row({ evidenceId: 'a', retrievedAt: '2026-05-01', expiresAt: '2026-07-30' }),
    row({
      evidenceId: 'b',
      retrievedAt: '2026-06-01',
      expiresAt: '2026-08-30',
      stance: 'disputes',
      publisher: { kind: 'venue-site', name: 'The Dunes' },
    }),
  ];
  assert.equal(deriveClaimState(c, rows, { now: '2026-06-15', precedence: PRECEDENCE }), 'disputed');
  const found = classify(c, rows, '2026-05-15', '2026-06-15');
  assert.equal(found.kind, 'claim-disputed');
  assert.equal(found.nature, 'value');
});

test('a claim whose evidence merely aged out is reported apart from a moved fact', () => {
  const c = claim();
  const rows = [row({ evidenceId: 'a', retrievedAt: '2026-03-01', expiresAt: '2026-05-30' })];
  const found = classify(c, rows, '2026-04-01', '2026-06-15');
  assert.equal(found.kind, 'claim-lapsed');
  assert.equal(found.nature, 'confidence');
  assert.equal(found.at, '2026-05-30');
});

test('a quiet window reports nothing at all', () => {
  const c = claim();
  const rows = [row({ evidenceId: 'a', retrievedAt: '2026-03-01', expiresAt: '2026-12-31' })];
  assert.equal(classify(c, rows, '2026-04-01', '2026-06-15'), null);
});

test('one claim yields at most one entry, however many things happened to it', () => {
  const old = claim({ retiredAt: '2026-06-03' });
  const next = claim({
    claimId: 'venues/the-dunes/opening-hours-2',
    createdAt: '2026-06-02',
    supersedes: old.claimId,
    statement: 'Open Thursday to Sunday.',
  });
  const rows = [
    row({ evidenceId: 'a', retrievedAt: '2026-03-01', expiresAt: '2026-05-30', value: 'Wed-Sun' }),
    row({ evidenceId: 'b', retrievedAt: '2026-06-01', expiresAt: '2026-08-30', value: 'Thu-Sun' }),
  ];
  const result = materialChangesSince({
    since: '2026-04-01',
    now: '2026-06-15',
    claims: [old, next],
    evidence: rows,
    precedence: PRECEDENCE,
  });
  const forOld = result.changes.filter((entry) => entry.claimId === old.claimId);
  assert.equal(forOld.length, 1);
  assert.equal(forOld[0].kind, 'claim-withdrawn');
});

/* == the window ======================================================= */

test('a row retrieved on the since date was already known, and is not new', () => {
  const c = claim();
  const rows = [
    row({ evidenceId: 'a', retrievedAt: '2026-01-10', expiresAt: '2026-12-31', value: 'Wed-Sun' }),
    row({ evidenceId: 'b', retrievedAt: '2026-06-01', expiresAt: '2026-12-31', value: 'Wed-Sun' }),
  ];
  assert.equal(classify(c, rows, '2026-06-01', '2026-06-15'), null);
  assert.equal(classify(c, rows, '2026-05-31', '2026-06-15').kind, 'claim-reverified');
});

test('the past is reconstructed, so a later row cannot make an earlier day look verified', () => {
  const c = claim();
  const rows = [row({ evidenceId: 'a', retrievedAt: '2026-06-01', expiresAt: '2026-08-30' })];
  assert.equal(evidenceKnownAt(rows, '2026-05-01').length, 0);
  assert.equal(claimStateAt(c, rows, { at: '2026-05-01', precedence: PRECEDENCE }), 'unsupported');
  assert.equal(claimStateAt(c, rows, { at: '2026-06-15', precedence: PRECEDENCE }), 'supported');
});

test('a supersession that had not happened yet is not honoured when reading the past', () => {
  const rows = [
    row({ evidenceId: 'a', retrievedAt: '2026-03-01', expiresAt: '2026-12-31', supersededBy: 'b' }),
    row({ evidenceId: 'b', retrievedAt: '2026-06-01', expiresAt: '2026-12-31' }),
  ];
  const asAtApril = evidenceKnownAt(rows, '2026-04-01');
  assert.equal(asAtApril.length, 1);
  assert.equal(asAtApril[0].supersededBy, undefined);
  const asAtJuly = evidenceKnownAt(rows, '2026-07-01');
  assert.equal(asAtJuly.find((r) => r.evidenceId === 'a').supersededBy, 'b');
});

/* == the records ====================================================== */

const eventRecord = (data) => ({ type: 'events', slug: data.slug, data });
const venueRecord = (data) => ({ type: 'venues', slug: data.slug, data });

test('an event that appeared, was cancelled or was postponed each report once', () => {
  const window = { since: '2026-04-01', now: '2026-06-15' };
  const added = eventRecord({ slug: 'sorrento-swim', name: 'Sorrento Swim', status: 'published', publishedAt: '2026-05-02' });
  assert.equal(classifyRecordSince(added, window).kind, 'event-added');

  const cancelled = eventRecord({
    slug: 'rye-regatta',
    name: 'Rye Regatta',
    status: 'published',
    publishedAt: '2026-02-01',
    cancelled: true,
    cancelledOn: '2026-05-20',
  });
  assert.equal(classifyRecordSince(cancelled, window).kind, 'event-cancelled');

  const postponed = eventRecord({
    slug: 'flinders-fair',
    name: 'Flinders Fair',
    status: 'published',
    publishedAt: '2026-02-01',
    postponed: true,
    postponedOn: '2026-05-21',
  });
  assert.equal(classifyRecordSince(postponed, window).kind, 'event-postponed');
});

test('an event that appeared and was then delisted is not an arrival', () => {
  const window = { since: '2026-04-01', now: '2026-06-15' };
  const archived = eventRecord({ slug: 'gone', name: 'Gone', status: 'archived', publishedAt: '2026-05-02' });
  assert.equal(classifyRecordSince(archived, window), null);
  const lapsed = eventRecord({
    slug: 'lapsed',
    name: 'Lapsed',
    status: 'published',
    publishedAt: '2026-05-02',
    expiresAt: '2026-05-30',
  });
  assert.equal(classifyRecordSince(lapsed, window), null);
});

test('a venue reports opening and closing from the dates an editor wrote', () => {
  const window = { since: '2026-04-01', now: '2026-06-15' };
  const opened = venueRecord({ slug: 'new-bakery', name: 'New Bakery', status: 'active', publishedAt: '2026-04-20' });
  assert.equal(classifyRecordSince(opened, window).kind, 'venue-opened');

  const closed = venueRecord({
    slug: 'la-baracca',
    name: 'La Baracca',
    status: 'active',
    publishedAt: '2025-01-01',
    operatingStatus: 'permanently-closed',
    closedDate: '2026-05-11',
  });
  assert.equal(classifyRecordSince(closed, window).kind, 'venue-closed');

  const untouched = venueRecord({ slug: 'old', name: 'Old', status: 'active', publishedAt: '2025-01-01' });
  assert.equal(classifyRecordSince(untouched, window), null);
});

test('Astro collection entries map into the record shape without a second mapping', () => {
  const mapped = recordsFromCollections({
    events: [{ id: 'sorrento-swim', data: { slug: 'sorrento-swim', status: 'published', publishedAt: '2026-05-02' } }],
    venues: [{ id: 'new-bakery', data: { slug: 'new-bakery', status: 'active', publishedAt: '2026-04-20' } }],
  });
  const result = materialChangesSince({
    since: '2026-04-01',
    now: '2026-06-15',
    records: mapped,
    precedence: PRECEDENCE,
  });
  assert.deepEqual(
    result.changes.map((entry) => entry.kind).sort(),
    ['event-added', 'venue-opened']
  );
});

/* == the real corpus, asserted as invariants =========================== */

const NOW = '2026-09-13';
const BEFORE_EVERYTHING = '2000-01-01';

const corpus = await loadCorpus({ nextDir: NEXT_DIR });
const evidenceByClaim = indexEvidenceByClaim(corpus.evidence);

test('the corpus this suite reads is not empty, or every invariant below is vacuous', () => {
  assert.ok(corpus.claims.length > 0);
  assert.ok(corpus.evidence.length > 0);
});

test('an empty window reports nothing', () => {
  const result = materialChangesSince({
    since: NOW,
    now: NOW,
    claims: corpus.claims,
    evidence: corpus.evidence,
    records: corpus.records,
    precedence: corpus.precedence,
  });
  assert.deepEqual(result.changes, []);
  assert.deepEqual(result.reassurances, []);
});

test('with the window open from before the corpus existed, every first verification is reported and nothing is a reassurance', () => {
  const result = materialChangesSince({
    since: BEFORE_EVERYTHING,
    now: NOW,
    claims: corpus.claims,
    evidence: corpus.evidence,
    precedence: corpus.precedence,
  });

  // Nothing can be a RE-verification when nothing was on file at `since`.
  assert.deepEqual(result.reassurances, []);

  // Expectations are derived from the same data, at the same as-at date.
  const expected = {
    'claim-verified': new Set(
      corpus.claims
        .filter((c) => claimStateAt(c, evidenceByClaim.get(c.claimId) ?? [], { at: NOW, precedence: corpus.precedence }) === 'supported')
        .map((c) => c.claimId)
    ),
    'claim-disputed': new Set(
      corpus.claims
        .filter((c) => claimStateAt(c, evidenceByClaim.get(c.claimId) ?? [], { at: NOW, precedence: corpus.precedence }) === 'disputed')
        .map((c) => c.claimId)
    ),
    'claim-withdrawn': new Set(
      corpus.claims
        .filter((c) => claimStateAt(c, evidenceByClaim.get(c.claimId) ?? [], { at: NOW, precedence: corpus.precedence }) === 'retired')
        .map((c) => c.claimId)
    ),
  };
  for (const [kind, want] of Object.entries(expected)) {
    const got = new Set(result.changes.filter((e) => e.kind === kind).map((e) => e.claimId));
    assert.deepEqual([...got].sort(), [...want].sort(), `${kind} must match the state derived at runtime`);
  }
  // A claim cannot lapse across a window in which it never stood.
  assert.equal(result.changes.filter((e) => e.kind === 'claim-lapsed').length, 0);
});

test('every entry over the real corpus is dated inside the window and carries a known kind', () => {
  const since = '2026-01-01';
  const result = materialChangesSince({
    since,
    now: NOW,
    claims: corpus.claims,
    evidence: corpus.evidence,
    records: corpus.records,
    precedence: corpus.precedence,
  });
  assert.ok(result.changes.length + result.reassurances.length > 0, 'the window must not be vacuous');

  for (const entry of result.changes) {
    assert.ok(CHANGE_KINDS.includes(entry.kind), `unexpected change kind ${entry.kind}`);
    assert.ok(entry.at && entry.at > since && entry.at <= NOW, `${entry.kind} dated ${entry.at} is outside the window`);
  }
  for (const entry of result.reassurances) {
    assert.ok(REASSURANCE_KINDS.includes(entry.kind), `unexpected reassurance kind ${entry.kind}`);
    assert.ok(entry.at && entry.at > since && entry.at <= NOW);
  }
  // Counts are the arrays, never a separate tally that can drift from them.
  assert.equal(result.counts.changes, result.changes.length);
  assert.equal(result.counts.reassurances, result.reassurances.length);
});

test('no claim is ever both a change and a reassurance, at any window the corpus offers', () => {
  const days = [...new Set(corpus.evidence.map((r) => String(r.retrievedAt).slice(0, 10)))].sort();
  const ladder = [days[0], days[Math.floor(days.length / 4)], days[Math.floor(days.length / 2)], days[days.length - 1]];
  for (const since of ladder) {
    const result = materialChangesSince({
      since,
      now: NOW,
      claims: corpus.claims,
      evidence: corpus.evidence,
      records: corpus.records,
      precedence: corpus.precedence,
    });
    const changed = new Set(result.changes.map((e) => e.claimId).filter(Boolean));
    for (const entry of result.reassurances) {
      assert.ok(!changed.has(entry.claimId), `${entry.claimId} is in both buckets for since=${since}`);
    }
    const seen = new Set();
    for (const entry of [...result.changes, ...result.reassurances]) {
      if (!entry.claimId) continue;
      assert.ok(!seen.has(entry.claimId), `${entry.claimId} reported twice for since=${since}`);
      seen.add(entry.claimId);
    }
  }
});

test('every reassurance over the real corpus describes a claim that stood before and still stands', () => {
  const days = [...new Set(corpus.evidence.map((r) => String(r.retrievedAt).slice(0, 10)))].sort();
  let checked = 0;
  for (const since of days) {
    const result = materialChangesSince({
      since,
      now: NOW,
      claims: corpus.claims,
      evidence: corpus.evidence,
      precedence: corpus.precedence,
    });
    for (const entry of result.reassurances) {
      const c = corpus.claims.find((x) => x.claimId === entry.claimId);
      const rows = evidenceByClaim.get(entry.claimId) ?? [];
      assert.equal(claimStateAt(c, rows, { at: since, precedence: corpus.precedence }), 'supported');
      assert.equal(claimStateAt(c, rows, { at: NOW, precedence: corpus.precedence }), 'supported');
      assert.equal(entry.statement, c.statement, 'a reassurance must assert exactly what it asserted before');
      assert.equal(
        observedValueMoved(
          rows.filter((r) => toDate(r.retrievedAt) <= toDate(since)),
          rows.filter((r) => toDate(r.retrievedAt) > toDate(since) && toDate(r.retrievedAt) <= toDate(NOW))
        ),
        false,
        'a reassurance must not be sitting on an observed value that moved'
      );
      checked += 1;
    }
  }
  assert.ok(checked > 0, 'the corpus offers no reassurance to check, so this invariant is untested');
});

test('every reported value change over the real corpus has something that actually moved', () => {
  const days = [...new Set(corpus.evidence.map((r) => String(r.retrievedAt).slice(0, 10)))].sort();
  for (const since of days) {
    const result = materialChangesSince({
      since,
      now: NOW,
      claims: corpus.claims,
      evidence: corpus.evidence,
      precedence: corpus.precedence,
    });
    for (const entry of result.changes.filter((e) => e.kind === 'claim-value-changed')) {
      const rows = evidenceByClaim.get(entry.claimId) ?? [];
      const moved =
        entry.previousStatement !== null ||
        observedValueMoved(
          rows.filter((r) => toDate(r.retrievedAt) <= toDate(since)),
          rows.filter((r) => toDate(r.retrievedAt) > toDate(since) && toDate(r.retrievedAt) <= toDate(NOW))
        );
      assert.ok(moved, `${entry.claimId} reported a moved value with nothing that moved`);
    }
  }
});

test('claimStateAt on today agrees with the state claim-state.mjs derives for today', () => {
  const settled = corpus.claims.filter((c) =>
    (evidenceByClaim.get(c.claimId) ?? []).every((r) => toDate(r.retrievedAt) <= toDate(NOW))
  );
  assert.ok(settled.length > 0);
  for (const c of settled) {
    const rows = evidenceByClaim.get(c.claimId) ?? [];
    const derived = deriveClaimState(c, rows, { now: NOW, precedence: corpus.precedence });
    assert.equal(claimStateAt(c, rows, { at: NOW, precedence: corpus.precedence }), derived, c.claimId);
  }
});

test('the derivation writes nothing: the corpus it was handed is unchanged', () => {
  const before = JSON.stringify(corpus.claims) + JSON.stringify(corpus.evidence);
  materialChangesSince({
    since: BEFORE_EVERYTHING,
    now: NOW,
    claims: corpus.claims,
    evidence: corpus.evidence,
    records: corpus.records,
    precedence: corpus.precedence,
  });
  assert.equal(JSON.stringify(corpus.claims) + JSON.stringify(corpus.evidence), before);
});
