/**
 * Tests for the provenance read model (PI-004).
 *
 * The assertions that matter are the refusals. A legacy bulk stamp must never
 * become a fact-check date, an aggregate must never report a page as checked
 * on the strength of one checked entry, and a visit must never render without
 * a visit record. Everything else here is wording.
 *
 * Every case pins `now`, so none of this drifts with the calendar.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  aggregateProvenance,
  buildProvenanceIndex,
  disclosureLine,
  factCheckStamp,
  formatMonth,
  legacyReviewDate,
  recordProvenance,
} from './provenance.mjs';

const NOW = '2026-09-13';

const PRECEDENCE = {
  defaultExpiryDays: 90,
  classes: {
    'fishing-rule': { expiryDays: 365, precedence: ['gov', 'press', 'unknown'] },
    'opening-hours': { expiryDays: 90, precedence: ['venue-site', 'social', 'unknown'] },
  },
};

const claim = (over = {}) => ({
  claimId: 'species/snapper/fishing-rule',
  claimClass: 'fishing-rule',
  subject: { type: 'species', slug: 'snapper' },
  statement: 'Bag and size limits for snapper are as published.',
  assertedBy: [{ type: 'species', slug: 'snapper' }],
  createdAt: '2026-04-30',
  ...over,
});

const row = (over = {}) => ({
  evidenceId: 'species/snapper/fishing-rule-aaaa',
  claim: 'species/snapper/fishing-rule',
  stance: 'supports',
  publisher: { kind: 'gov', name: 'Victorian Fisheries Authority' },
  retrievedAt: '2026-04-30',
  expiresAt: '2027-04-30',
  ...over,
});

const indexOf = (claims, rows) => buildProvenanceIndex(claims, rows);

/* -- the refusals ---------------------------------------------------- */

test('a legacy bulk stamp is a review date and never becomes a check date', () => {
  const d = recordProvenance({ lastVerified: '2026-04-23' }, { now: NOW });
  assert.equal(d.reviewedOn, '2026-04-23');
  assert.equal(d.checkedOn, null);
  assert.equal(factCheckStamp(d), null);
  assert.equal(d.basis, 'none');
});

test('live supporting evidence in the registry is a check date', () => {
  const index = indexOf([claim()], [row()]);
  const d = recordProvenance({ lastVerified: '2026-04-30' }, {
    type: 'species', slug: 'snapper', index, now: NOW, precedence: PRECEDENCE,
  });
  assert.equal(d.checkedOn, '2026-04-30');
  assert.equal(d.basis, 'registry');
});

test('expired evidence is not a check date, and the expiry is reported', () => {
  const index = indexOf(
    [claim({ claimClass: 'opening-hours' })],
    [row({ claim: 'species/snapper/fishing-rule', expiresAt: '2026-07-29' })]
  );
  const d = recordProvenance({ lastVerified: '2026-04-30' }, {
    type: 'species', slug: 'snapper', index, now: NOW, precedence: PRECEDENCE,
  });
  assert.equal(d.checkedOn, null);
  assert.equal(d.evidenceOnFile, 1);
  assert.equal(d.evidenceLive, 0);
  assert.match(disclosureLine(d), /sources on file have expired/);
});

test('an authored check date wins over the registry', () => {
  const index = indexOf([claim()], [row()]);
  const d = recordProvenance(
    { lastVerified: '2026-04-30', editorialProvenance: { checkedOn: '2026-09-01' } },
    { type: 'species', slug: 'snapper', index, now: NOW, precedence: PRECEDENCE }
  );
  assert.equal(d.checkedOn, '2026-09-01');
  assert.equal(d.basis, 'authored');
});

test('a visit claim with no visit record reads as research', () => {
  const d = recordProvenance({ editorialProvenance: { method: 'visited' } }, { now: NOW });
  assert.equal(d.method, 'researched');
  assert.equal(d.visitOn, null);
  assert.doesNotMatch(disclosureLine(d), /Visited/);
});

test('a documented visit renders as a visit', () => {
  const d = recordProvenance(
    { editorialProvenance: { method: 'visited', visit: { occurredOn: '2026-03-02' } } },
    { now: NOW }
  );
  assert.equal(d.method, 'visited');
  assert.match(disclosureLine(d), /^Visited March 2026 and researched/);
});

/* -- aggregates ------------------------------------------------------ */

test('an aggregate takes the floor, not the newest', () => {
  const d = aggregateProvenance(
    [{ data: { slug: 'a', lastVerified: '2026-05-08' } }, { data: { slug: 'b', lastVerified: '2026-04-23' } }],
    { type: 'venues', now: NOW }
  );
  assert.equal(d.reviewedOn, '2026-04-23');
  assert.equal(d.records, 2);
});

test('one checked entry does not make the page checked', () => {
  const index = indexOf([claim()], [row()]);
  const d = aggregateProvenance(
    [{ data: { slug: 'snapper', lastVerified: '2026-04-30' } }, { data: { slug: 'garfish', lastVerified: '2026-04-30' } }],
    { type: 'species', index, now: NOW, precedence: PRECEDENCE }
  );
  assert.equal(d.checkedOn, null);
  assert.match(disclosureLine(d, { noun: 'species', scope: 'set' }), /No source check is on file/);
});

test('every entry checked gives the page the floor check date', () => {
  const claims = [
    claim(),
    claim({
      claimId: 'species/garfish/fishing-rule',
      subject: { type: 'species', slug: 'garfish' },
      assertedBy: [{ type: 'species', slug: 'garfish' }],
    }),
  ];
  const rows = [
    row(),
    row({ evidenceId: 'species/garfish/fishing-rule-bbbb', claim: 'species/garfish/fishing-rule', retrievedAt: '2026-06-01', expiresAt: '2027-06-01' }),
  ];
  const index = indexOf(claims, rows);
  const d = aggregateProvenance(
    [{ data: { slug: 'snapper' } }, { data: { slug: 'garfish' } }],
    { type: 'species', index, now: NOW, precedence: PRECEDENCE }
  );
  assert.equal(d.checkedOn, '2026-04-30');
  assert.match(
    disclosureLine(d, { noun: 'species', scope: 'set' }),
    /Every species listed was fact-checked April 2026 or later\./
  );
});

test('an empty set reports nothing rather than inventing a date', () => {
  const d = aggregateProvenance([], { type: 'venues', now: NOW });
  assert.equal(d.checkedOn, null);
  assert.equal(d.reviewedOn, null);
  assert.match(disclosureLine(d), /No review or source check is on file/);
});

/* -- house style ----------------------------------------------------- */

test('the disclosure line carries no em-dash and no exclamation mark', () => {
  const cases = [
    recordProvenance({ lastVerified: '2026-04-23' }, { now: NOW }),
    recordProvenance({ editorialProvenance: { method: 'visited', visit: { occurredOn: '2026-03-02' } } }, { now: NOW }),
    aggregateProvenance([], { now: NOW }),
  ];
  for (const d of cases) {
    const line = disclosureLine(d, { noun: 'venue', scope: 'set' });
    assert.doesNotMatch(line, /—/);
    assert.doesNotMatch(line, /!/);
  }
});

test('the public line states what is supported and omits what is absent', () => {
  const d = aggregateProvenance(
    [{ data: { slug: 'a', lastVerified: '2026-04-23' } }],
    { type: 'venues', now: NOW }
  );
  const line = disclosureLine(d, { noun: 'venue', scope: 'set', admitMissingCheck: false });
  assert.equal(line, 'Researched from published sources. Every venue listed was reviewed April 2026 or later.');
  assert.doesNotMatch(line, /fact-verified/);
  // The internal line is the one that names the gap.
  assert.match(disclosureLine(d, { noun: 'venue', scope: 'set' }), /No source check is on file/);
});

test('an expired source is disclosed publicly, because that claim was made and lapsed', () => {
  const index = indexOf([claim()], [row({ expiresAt: '2026-07-29' })]);
  const d = recordProvenance({ lastVerified: '2026-04-30' }, {
    type: 'species', slug: 'snapper', index, now: NOW, precedence: PRECEDENCE,
  });
  assert.match(
    disclosureLine(d, { admitMissingCheck: false }),
    /sources on file have expired and a recheck is due/
  );
});

test('helpers', () => {
  assert.equal(formatMonth('2026-04-30'), 'April 2026');
  assert.equal(formatMonth(null), null);
  assert.equal(legacyReviewDate({ lastCheckedDate: '2026-08-20' }), '2026-08-20');
  assert.equal(legacyReviewDate({}), null);
});
