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

// ---------------------------------------------------------------------
// PI-010. Rules about the shape of the navigation itself, not about
// which links it happens to hold today. Every assertion below stays true
// as the curation changes; each one failed against a real defect.
// ---------------------------------------------------------------------

test('no panel spends two of its slots on one destination', () => {
  // A panel has five curated slots, one or two browse slots and one rail.
  // Wine used to spend two of five on /wine/best-cellar-doors/ under two
  // different labels, and Plans pointed both its first curated link and
  // its rail at Ridge to Sea. A repeat inside one panel is not emphasis,
  // it is a slot that shows the reader nothing new.
  const { v5Pillars } = evaluateNavConfig();
  for (const pillar of v5Pillars) {
    const byHref = new Map();
    for (const link of [...pillar.curated, ...pillar.browse]) {
      byHref.set(link.href, [...(byHref.get(link.href) ?? []), link.label]);
    }
    byHref.set(pillar.rail.href, [...(byHref.get(pillar.rail.href) ?? []), `rail: ${pillar.rail.title}`]);
    for (const [href, labels] of byHref) {
      assert.equal(labels.length, 1, `${pillar.key} points at ${href} ${labels.length} times (${labels.join(' + ')})`);
    }
  }
});

test('no permanent navigation link points at a dated page', () => {
  // The same defect as the hard-coded eyebrow, wearing a URL. What's On
  // offered "The weekend edit" and sent the reader to
  // /journal/autumn-weekend-edit/, an April editor's letter, from every
  // page of the site. The label hid it, so nothing ever looked wrong.
  //
  // Curated links, browse links, hubs, drawer rows and footer rows have no
  // expiry mechanism at all: whatever they point at is shown forever. So
  // for those, a dated destination is simply a defect. Rails are the one
  // exception, and they are the subject of the next test.
  const { v5Pillars, v5FooterSections, v5FooterAbout, v5DrawerItems } = evaluateNavConfig();
  const dated = /\b(summer|autumn|winter|spring)\b|\b20\d{2}\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-\d/i;
  const permanent = [
    ...v5Pillars.flatMap((p) => [
      { where: `${p.key} hub`, href: p.hub },
      ...p.curated.map((l) => ({ where: `${p.key} curated "${l.label}"`, href: l.href })),
      ...p.browse.map((l) => ({ where: `${p.key} browse "${l.label}"`, href: l.href })),
    ]),
    ...[...v5FooterSections, ...v5FooterAbout, ...v5DrawerItems].map((l) => ({ where: `"${l.label}"`, href: l.href })),
  ];
  for (const { where, href } of permanent) {
    assert.doesNotMatch(href, dated, `${where} links to a dated page: ${href}`);
  }
});

test('a rail may pin a dated page only if it fails closed to one that is not', () => {
  // Rails are the one place dated editorial belongs -- an Insider Picks
  // from a named week is the whole point of a pick. What makes that safe
  // is the expiry: once it passes, the rail resolves to an evergreen
  // fallback. So the rule is not "never link a dated page", it is "a
  // dated pin must carry the mechanism that retires it, and must not
  // retire onto another dated page".
  const { v5Pillars } = evaluateNavConfig();
  const dated = /\b(summer|autumn|winter|spring)\b|\b20\d{2}\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-\d/i;
  for (const pillar of v5Pillars) {
    const { rail } = pillar;
    if (dated.test(rail.href)) {
      assert.ok(rail.expiresAt, `${pillar.key} rail pins the dated ${rail.href} with no expiry`);
      assert.ok(rail.fallback, `${pillar.key} rail pins the dated ${rail.href} with no fallback`);
      assert.doesNotMatch(rail.fallback.href, dated, `${pillar.key} rail falls back onto another dated page`);
    }
  }
  // And once every expiry has passed, nothing dated is left anywhere.
  const retired = evaluateNavConfig({ todayISO: '2099-12-31' });
  for (const pillar of retired.v5Pillars) {
    assert.doesNotMatch(pillar.rail.href, dated, `${pillar.key} rail is still dated long after its expiry`);
  }
});
test('every pillar hub keeps a route in from the footer', () => {
  // The don't-orphan rule, as a rule. Navigation is allowed to stop
  // pointing at something -- that is what simplifying it means -- but a
  // hub that leaves the masthead must still be reachable from every page.
  // The footer is where that guarantee lives, so it has to actually hold.
  const { v5Pillars, v5FooterSections } = evaluateNavConfig();
  const footer = new Set(v5FooterSections.map((l) => l.href));
  for (const pillar of v5Pillars) {
    assert.ok(footer.has(pillar.hub), `${pillar.key} hub ${pillar.hub} has no footer link`);
  }
});

test('every footer hub is a real destination, not a fragment or an offsite link', () => {
  // Footer links are the site-wide safety net. One that is relative, or
  // an anchor, or points off the domain, is not a route in.
  const { v5FooterSections } = evaluateNavConfig();
  for (const link of v5FooterSections) {
    assert.match(link.href, /^\/[a-z0-9-]+(\/[a-z0-9-]+)*\/$/, `footer "${link.label}" is not a clean absolute path: ${link.href}`);
  }
});

test('curated labels read as noun phrases, not as instructions or jargon', () => {
  // BRAND-PI.md voice, asserted rather than remembered: no em-dashes, no
  // exclamation marks, no ALL-CAPS shouting, and no label that opens with
  // a verb ("Explore our...", "Discover..."), which is how sitemap copy
  // creeps into a masthead a reader is supposed to read.
  const { v5Pillars } = evaluateNavConfig();
  const imperative = /^(explore|discover|browse|find|check|view|see|click|learn|get)\b/i;
  for (const pillar of v5Pillars) {
    for (const link of pillar.curated) {
      assert.doesNotMatch(link.label, /[—!]/, `${pillar.key} "${link.label}" uses an em-dash or exclamation mark`);
      assert.doesNotMatch(link.label, imperative, `${pillar.key} "${link.label}" opens with an instruction`);
      assert.notEqual(link.label, link.label.toUpperCase(), `${pillar.key} "${link.label}" is shouting`);
    }
  }
});
