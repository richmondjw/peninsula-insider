/**
 * v5-nav tests. Run from next/:
 *
 *   node --test src/lib/v5-nav.test.mjs
 *
 * WHAT THIS GUARDS. Navigation renders on every page, so anything in it
 * that rots rots site-wide and silently. Two mechanisms exist to stop that:
 * the rail eyebrow is computed from the real season rather than typed as a
 * literal, and a seasonal rail pin carries an expiry that swaps it for a
 * neutral fallback once it passes.
 *
 * THE RULE, NOT TODAY'S DATA. Every assertion below injects the comparison
 * day, so none of them can change answer because time passed. A test that
 * fails on a Tuesday in November with no code change is forbidden in this
 * repo -- it trains everyone to ignore a red build. That is also why the
 * fixtures are asserted against a pinned date rather than against the
 * config's own literals: the config is allowed to change, the rule is not.
 *
 * Loading goes through scripts/nav-config-eval.mjs, the same evaluator
 * scripts/lint-nav-budget.mjs uses, so the two readers of v5-nav.ts cannot
 * drift apart.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateNavConfig } from '../../scripts/nav-config-eval.mjs';

/** A rail with an expiry and a fallback, the shape the rule acts on. */
const seasonal = {
  eyebrow: "Editor's pick",
  title: 'A pinned seasonal thing',
  verdict: 'Worth the drive while it is on.',
  href: '/whats-on/a-pinned-seasonal-thing/',
  expiresAt: '2026-08-19',
  fallback: {
    eyebrow: "Editor's note",
    title: 'The evergreen thing',
    verdict: 'Always worth a look.',
    href: '/whats-on/',
  },
};

/** A rail with no expiry at all. Most pillars carry one of these. */
const evergreen = {
  eyebrow: "Editor's pick",
  title: 'Laura at Pt Leo Estate',
  verdict: 'Sit at the bar.',
  href: '/eat/laura-pt-leo/',
};

test('a pin is still shown on its expiry date', () => {
  // `expiresAt` is the last day the pin is good for, not the first day it
  // is stale. Off-by-one here retires editorial a day early, every time.
  const { resolveRail } = evaluateNavConfig();
  assert.equal(resolveRail(seasonal, '2026-08-19').title, seasonal.title);
});

test('a pin is replaced by its fallback the day after it expires', () => {
  const { resolveRail } = evaluateNavConfig();
  const resolved = resolveRail(seasonal, '2026-08-20');
  assert.equal(resolved.title, seasonal.fallback.title);
  assert.equal(resolved.href, seasonal.fallback.href);
});

test('a pin long past its expiry stays replaced', () => {
  const { resolveRail } = evaluateNavConfig();
  assert.equal(resolveRail(seasonal, '2031-01-01').title, seasonal.fallback.title);
});

test('a pin well before its expiry is untouched', () => {
  const { resolveRail } = evaluateNavConfig();
  assert.equal(resolveRail(seasonal, '2026-01-01').title, seasonal.title);
});

test('a rail with no expiry is never replaced, at any date', () => {
  // Evergreen pins have no fallback to fall back to. Replacing one would
  // blank the rail, so the rule must leave them alone forever.
  const { resolveRail } = evaluateNavConfig();
  for (const day of ['1970-01-01', '2026-08-20', '2099-12-31']) {
    assert.equal(resolveRail(evergreen, day).title, evergreen.title);
  }
});

test('an expiry with no fallback is left alone rather than blanked', () => {
  const { resolveRail } = evaluateNavConfig();
  const orphan = { ...seasonal, fallback: undefined };
  assert.equal(resolveRail(orphan, '2031-01-01').title, orphan.title);
});

test('the comparison is lexicographic, so it must stay zero-padded', () => {
  // This is why melbourneISODate pads. An unpadded '2026-9-1' compares
  // BELOW '2026-08-31' as a string and would resurrect an expired pin.
  const { resolveRail } = evaluateNavConfig();
  const augustPin = { ...seasonal, expiresAt: '2026-08-31' };
  assert.equal(resolveRail(augustPin, '2026-09-01').title, seasonal.fallback.title);
});

test('every configured pillar resolves to exactly one rail with a destination', () => {
  // Whatever the date, the reader must never meet an empty rail slot. Run
  // the whole config through two pinned days either side of every expiry
  // the file currently carries.
  for (const todayISO of ['1970-01-01', '2099-12-31']) {
    const { v5Pillars } = evaluateNavConfig({ todayISO });
    assert.equal(v5Pillars.length, 7, `seven pillars at ${todayISO}`);
    for (const pillar of v5Pillars) {
      assert.ok(pillar.rail, `${pillar.key} has a rail at ${todayISO}`);
      assert.ok(pillar.rail.href, `${pillar.key} rail has an href at ${todayISO}`);
      assert.ok(pillar.rail.title, `${pillar.key} rail has a title at ${todayISO}`);
      assert.ok(pillar.rail.eyebrow, `${pillar.key} rail has an eyebrow at ${todayISO}`);
    }
  }
});

test('a rail carrying an expiry also carries a fallback to land on', () => {
  // The config contract the rule depends on. An expiry without a fallback
  // is a pin that silently never retires, which is the defect not the fix.
  const { v5Pillars } = evaluateNavConfig();
  for (const pillar of v5Pillars) {
    if (pillar.rail.expiresAt) {
      assert.ok(pillar.rail.fallback, `${pillar.key} has an expiry but no fallback`);
      assert.ok(pillar.rail.fallback.href, `${pillar.key} fallback has no href`);
    }
  }
});

test('no rail eyebrow hard-codes a season or a year', () => {
  // The PI-003 defect, as a rule rather than as a string match on this
  // September. Eyebrows are ALLOWED to name the season -- that is what the
  // edition tag is for -- but only by interpolating the computed tag. So:
  // render with a known sentinel tag, remove exactly that tag, and assert
  // nothing seasonal is left behind. A literal survives the subtraction; a
  // computed one does not.
  const SENTINEL = 'TAG_FROM_THE_SEASON_MODULE';
  const { v5Pillars } = evaluateNavConfig({ seasonEditionTag: SENTINEL });
  const seasons = /\b(summer|autumn|winter|spring)\b/i;
  const year = /'\d{2}\b|\b20\d{2}\b/;
  for (const pillar of v5Pillars) {
    const residue = pillar.rail.eyebrow.split(SENTINEL).join('');
    assert.doesNotMatch(residue, seasons, `${pillar.key} eyebrow hard-codes a season`);
    assert.doesNotMatch(residue, year, `${pillar.key} eyebrow hard-codes a year`);
  }
});

test('a rail eyebrow that names the season is recomputed, never stored', () => {
  // The other half of the same rule: if an eyebrow mentions the season at
  // all, changing the season must change the eyebrow. This is what would
  // have caught seven literal "Editor's pick · Winter '26" strings.
  const a = evaluateNavConfig({ seasonEditionTag: "Winter '26" });
  const b = evaluateNavConfig({ seasonEditionTag: "Spring '26" });
  for (const [i, pillar] of a.v5Pillars.entries()) {
    const other = b.v5Pillars[i].rail.eyebrow;
    if (pillar.rail.eyebrow.includes("Winter '26")) {
      assert.notEqual(other, pillar.rail.eyebrow, `${pillar.key} eyebrow is frozen to one season`);
    }
  }
});

test('the expiry rule reads the injected day, not the wall clock', () => {
  // The regression test for this ticket. If someone reinstates
  // `new Date()` inside the resolution, these two calls stop differing.
  const before = evaluateNavConfig({ todayISO: '1970-01-01' });
  const after = evaluateNavConfig({ todayISO: '2099-12-31' });
  const expiring = before.v5Pillars.filter((p) => p.rail.expiresAt);
  assert.ok(expiring.length > 0, 'the config still carries at least one seasonal pin');
  for (const pillar of expiring) {
    const later = after.v5Pillars.find((p) => p.key === pillar.key);
    assert.notEqual(later.rail.title, pillar.rail.title, `${pillar.key} did not retire`);
  }
});
