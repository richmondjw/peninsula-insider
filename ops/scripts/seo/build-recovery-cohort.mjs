#!/usr/bin/env node
/**
 * Recovery cohort builder — Peninsula Insider indexation recovery, Phase 6.
 *
 * Selects a FIXED longitudinal monitoring cohort from the URL ledger. The point
 * is comparability over time, so selection is deterministic (no randomness, no
 * date input) and the output is committed. Re-running it on a later ledger
 * reproduces the same cohort for URLs that still exist.
 *
 * Do not regenerate casually. Changing membership destroys the time series.
 *
 *   node ops/scripts/seo/build-recovery-cohort.mjs \
 *     --ledger ops/reports/seo/ledger/url-ledger.json \
 *     --out ops/reports/seo/recovery-cohort.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const args = process.argv.slice(2);
const get = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
};
const ledgerPath = get('--ledger', 'ops/reports/seo/ledger/url-ledger.json');
const outPath = get('--out', 'ops/reports/seo/recovery-cohort.json');

const { urls } = JSON.parse(readFileSync(ledgerPath, 'utf8'));
const byRoute = new Map(urls.map((u) => [u.route, u]));

/**
 * Cohort A — pages the April bulk sitemapExclude hid, now restored.
 * These are the direct test of whether the incident's damage reverses. Sourced
 * from the commit that cleared the flag (c19f8d9c96) rather than inferred, so
 * membership cannot drift with template changes.
 */
const COHORT_A_RESTORED = [
  '/wine/onannon/', '/wine/avani-wines/', '/wine/baillieu-vineyard/',
  '/wine/barmah-park-vineyard/', '/wine/eldridge-estate/',
  '/stay/hotel-sorrento/', '/stay/alba-thermal-springs/', '/stay/arthurs-views/',
  '/eat/garagiste/', '/eat/doot-doot-doot/',
];

/**
 * Cohort B — legacy migrations and their canonical winners, tracked as pairs.
 * The question these answer is whether equity transfers or evaporates: we need
 * the loser's coverage state and the winner's rankings side by side.
 */
const COHORT_B_PAIRS = [
  ['/journal/the-one-night-escape/', '/explore/plans/the-one-night-escape/'],
  ['/journal/the-peninsula-orientation-drive/', '/explore/plans/the-peninsula-orientation-drive/'],
  ['/journal/mornington-peninsula-winery-tour/', '/tour/wine-tours/'],
  ['/journal/the-producer-trail/', '/explore/plans/the-producer-trail/'],
  ['/explore/bushrangers-bay/', '/explore/bushrangers-bay-walk/'],
];

/**
 * Cohort E — healthy indexed controls. Without these, a sitewide Google-side
 * shift is indistinguishable from remediation working or failing.
 */
const COHORT_E_CONTROLS = [
  '/', '/eat/best-restaurants/', '/wine/best-cellar-doors/',
  '/explore/walks/', '/stay/best-accommodation/', '/explore/places/sorrento/',
];

const cohort = [];
const add = (route, group, rationale, pairedWith = null) => {
  const record = byRoute.get(route);
  if (!record) {
    cohort.push({ route, group, rationale, pairedWith, present: false });
    return;
  }
  cohort.push({
    route,
    group,
    rationale,
    pairedWith,
    present: true,
    // Baseline production state. Google-side fields stay null until a Search
    // Console pull succeeds; they are deliberately not guessed from the artefact.
    baseline: {
      inSitemap: record.inSitemap,
      noindex: record.noindex,
      selfCanonical: record.selfCanonical,
      canonical: record.canonicalRoute,
      isRedirectStub: record.isRedirectStub,
      redirectTarget: record.redirectTarget,
      words: record.words,
      internalInboundLinks: record.internalInboundLinks,
      internalInboundPages: record.internalInboundPages,
      clickDepth: record.clickDepth,
      recoveryBucket: record.recoveryBucket,
    },
    google: {
      lastCrawl: null,
      coverageState: null,
      googleCanonical: null,
      impressions: null,
      clicks: null,
    },
  });
};

for (const route of COHORT_A_RESTORED) {
  add(route, 'A_restored_from_bulk_noindex', 'Hidden by the April bulk sitemapExclude; cleared 7 Aug. Tests whether hidden pages regain indexation.');
}
for (const [loser, winner] of COHORT_B_PAIRS) {
  add(loser, 'B_migration_loser', 'Permanent migration stub. Tests whether Google accepts the consolidation instead of retaining the legacy URL.', winner);
  add(winner, 'B_migration_winner', 'Destination of a permanent migration. Tests whether legacy equity arrives.', loser);
}

// Cohorts C and D are selected from measured state rather than hardcoded,
// because "high-value but not indexed" is a property of the current corpus.
// Deterministic ordering (by inbound links, then route) keeps them stable.
const indexable = urls.filter((u) => !u.noindex && !u.isRedirectStub && u.selfCanonical && u.inSitemap);

const cohortC = indexable
  .filter((u) => u.words >= 900 && u.internalInboundPages >= 3)
  .filter((u) => !cohort.some((c) => c.route === u.route))
  .sort((a, b) => b.words - a.words || a.route.localeCompare(b.route))
  .slice(0, 8);
for (const u of cohortC) {
  add(u.route, 'C_high_value_awaiting_index', `Substantial page (${u.words}w, ${u.internalInboundPages} linking pages) that should earn indexation on merit.`);
}

const cohortD = indexable
  .filter((u) => u.words < 600 || u.internalInboundPages <= 1)
  .filter((u) => !cohort.some((c) => c.route === u.route))
  .sort((a, b) => a.internalInboundPages - b.internalInboundPages || a.route.localeCompare(b.route))
  .slice(0, 8);
for (const u of cohortD) {
  add(u.route, 'D_weak_signal_candidate', `Thin or weakly linked (${u.words}w, ${u.internalInboundPages} linking pages). Candidate for crawled-not-indexed.`);
}

for (const route of COHORT_E_CONTROLS) {
  add(route, 'E_healthy_control', 'Established indexed page. Separates sitewide Google movement from remediation effect.');
}

const output = {
  establishedAt: '2026-08-18',
  ledgerSource: ledgerPath,
  policy: 'FIXED cohort. Do not add, remove or reselect members without recording the reason here — longitudinal comparability is the whole value.',
  googleFieldsNote: 'google.* stay null until a Search Console pull succeeds. They are never inferred from the artefact: production state is not Google state.',
  size: cohort.length,
  byGroup: cohort.reduce((acc, c) => { acc[c.group] = (acc[c.group] ?? 0) + 1; return acc; }, {}),
  missingFromBuild: cohort.filter((c) => !c.present).map((c) => c.route),
  members: cohort,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);

console.log(`Recovery cohort: ${cohort.length} URLs`);
for (const [group, n] of Object.entries(output.byGroup)) console.log(`  ${group.padEnd(34)} ${n}`);
if (output.missingFromBuild.length) {
  console.log(`\nNot present in this build (${output.missingFromBuild.length}):`);
  for (const r of output.missingFromBuild) console.log(`  ${r}`);
}
