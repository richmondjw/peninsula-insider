/**
 * season tests. Run from repo root or next/:
 *
 *   node --test next/src/lib/season.test.mjs
 *
 * Uses Node's native TypeScript type-stripping (Node >= 22.18) to import
 * season.ts directly. No framework, no build step.
 *
 * WHAT THIS GUARDS. CI builds this site on a UTC runner, ten to eleven
 * hours behind Australia/Melbourne. Every assertion below is written as an
 * absolute UTC instant straddling a Melbourne season boundary, and each
 * pair is checked against the naive derivation a UTC host would produce
 * from date.getMonth() (which on a UTC host is exactly getUTCMonth()).
 * The "after" case of every pair is one the naive version gets WRONG, and
 * the test asserts that divergence explicitly: if someone reintroduces a
 * getMonth()-based season, these are the cases that catch it.
 *
 * Melbourne is UTC+11 (AEDT) across the March and December boundaries and
 * UTC+10 (AEST) across the June and September ones.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

const {
  getAustralianSeason,
  getAustralianSeasonLower,
  getSeasonEditionTag,
  melbourneCalendarParts,
} = await import('./season.ts');

/** The season a UTC build host would have computed from date.getMonth(). */
function naiveUtcHostSeason(date) {
  const m = date.getUTCMonth() + 1; // getMonth() on a UTC host
  if (m >= 3 && m <= 5) return 'Autumn';
  if (m >= 6 && m <= 8) return 'Winter';
  if (m >= 9 && m <= 11) return 'Spring';
  return 'Summer';
}

/**
 * Each case: the last instant of the old season and the first instant of
 * the new one, both expressed in UTC, plus the season either side.
 */
const boundaries = [
  {
    name: '1 March (Melbourne UTC+11)',
    beforeUtc: '2026-02-28T12:59:59Z', // 28 Feb 23:59:59 Melbourne
    afterUtc: '2026-02-28T13:00:00Z', //  1 Mar 00:00:00 Melbourne
    before: 'Summer',
    after: 'Autumn',
  },
  {
    name: '1 June (Melbourne UTC+10)',
    beforeUtc: '2026-05-31T13:59:59Z', // 31 May 23:59:59 Melbourne
    afterUtc: '2026-05-31T14:00:00Z', //   1 Jun 00:00:00 Melbourne
    before: 'Autumn',
    after: 'Winter',
  },
  {
    name: '1 September (Melbourne UTC+10)',
    beforeUtc: '2026-08-31T13:59:59Z', // 31 Aug 23:59:59 Melbourne
    afterUtc: '2026-08-31T14:00:00Z', //   1 Sep 00:00:00 Melbourne
    before: 'Winter',
    after: 'Spring',
  },
  {
    name: '1 December (Melbourne UTC+11)',
    beforeUtc: '2026-11-30T12:59:59Z', // 30 Nov 23:59:59 Melbourne
    afterUtc: '2026-11-30T13:00:00Z', //   1 Dec 00:00:00 Melbourne
    before: 'Spring',
    after: 'Summer',
  },
];

for (const b of boundaries) {
  test(`${b.name}: the day before is ${b.before}`, () => {
    assert.equal(getAustralianSeason(new Date(b.beforeUtc)), b.before);
  });

  test(`${b.name}: the first minute of the new season is ${b.after}`, () => {
    assert.equal(getAustralianSeason(new Date(b.afterUtc)), b.after);
  });

  test(`${b.name}: a UTC host's getMonth() would still say ${b.before}`, () => {
    // The regression itself. If this ever stops diverging the fixture is
    // wrong, not the code, because these instants are chosen to straddle
    // the Melbourne boundary while the UTC date has not turned over yet.
    assert.equal(naiveUtcHostSeason(new Date(b.afterUtc)), b.before);
    assert.notEqual(getAustralianSeason(new Date(b.afterUtc)), naiveUtcHostSeason(new Date(b.afterUtc)));
  });
}

test('the lower-case form is a casing adapter, not a second derivation', () => {
  for (const b of boundaries) {
    for (const iso of [b.beforeUtc, b.afterUtc]) {
      const d = new Date(iso);
      assert.equal(getAustralianSeasonLower(d), getAustralianSeason(d).toLowerCase());
    }
  }
});

test('every month of the year maps to the right season', () => {
  // Melbourne noon on the 15th of each month, so no offset can shift it.
  const expected = [
    'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter',
    'Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer',
  ];
  for (let m = 0; m < 12; m++) {
    const d = new Date(Date.UTC(2026, m, 15, 1, 0, 0)); // noon-ish Melbourne
    assert.equal(getAustralianSeason(d), expected[m], `month ${m + 1}`);
  }
});

test('melbourneCalendarParts reads the Melbourne day, not the UTC one', () => {
  const d = new Date('2026-08-31T14:00:00Z'); // 1 Sep 00:00 Melbourne
  const parts = melbourneCalendarParts(d);
  assert.equal(parts.year, 2026);
  assert.equal(parts.month, 9);
  assert.equal(parts.monthName, 'September');
});

test("the edition tag follows the season across the new year", () => {
  assert.equal(getSeasonEditionTag(new Date('2026-08-31T14:00:00Z')), "Spring '26");
  assert.equal(getSeasonEditionTag(new Date('2026-11-30T13:00:00Z')), "Summer '26");
  // 1 Jan 2027 00:00 Melbourne: still Summer, but the year has rolled.
  assert.equal(getSeasonEditionTag(new Date('2026-12-31T13:00:00Z')), "Summer '27");
  // The last minute of 2026 in Melbourne is still '26.
  assert.equal(getSeasonEditionTag(new Date('2026-12-31T12:59:59Z')), "Summer '26");
});
