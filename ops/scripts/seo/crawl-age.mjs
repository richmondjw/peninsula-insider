// Classify Google's last crawl of each URL against the password-gate windows.
//
// From 24 May to 11 June and from 24 June to 3 August 2026, every page carried
// a script that redirected any visitor without a saved key to /access/, a
// "Coming Soon" page marked noindex,nofollow. A page Google last fetched inside
// one of those windows was most likely recorded in that state, and stays that
// way until Google fetches it again. This module answers one question from URL
// Inspection results: how much of the site is Google still judging on a fetch
// made while the gate was up?
//
// Pure functions only, so the classification can be tested without credentials.

/** Deployed gate windows, UTC, from the commits that added and removed it. */
export const GATE_WINDOWS = [
  { from: '2026-05-24T00:47:00Z', to: '2026-06-11T11:12:00Z', label: 'gate 1 (24 May - 11 Jun)' },
  { from: '2026-06-24T15:43:00Z', to: '2026-08-03T01:22:00Z', label: 'gate 2 (24 Jun - 3 Aug)' },
];
export const GATE_REMOVED = '2026-08-03T01:22:00Z';

export function classifyCrawl(lastCrawlTime) {
  if (!lastCrawlTime) return 'never_crawled';
  const t = Date.parse(lastCrawlTime);
  if (!Number.isFinite(t)) return 'never_crawled';
  if (GATE_WINDOWS.some((w) => t >= Date.parse(w.from) && t <= Date.parse(w.to))) return 'during_gate';
  if (t > Date.parse(GATE_REMOVED)) return 'after_gate_removed';
  // Before the first window or between the two: fetched while the site was
  // open, but Google has not been back since the gate came down.
  return 'stale_pre_removal';
}

/**
 * @param results [{ url, lastCrawlTime, coverageState, verdict, googleCanonical, userCanonical }]
 */
export function summarise(results) {
  const byCrawl = { after_gate_removed: 0, during_gate: 0, stale_pre_removal: 0, never_crawled: 0 };
  const byCoverage = {};
  const canonicalMismatch = [];
  const stuck = [];
  for (const r of results) {
    const bucket = classifyCrawl(r.lastCrawlTime);
    byCrawl[bucket] += 1;
    const coverage = r.coverageState ?? 'unknown';
    byCoverage[coverage] = (byCoverage[coverage] ?? 0) + 1;
    if (r.googleCanonical && r.userCanonical && stripSlash(r.googleCanonical) !== stripSlash(r.userCanonical)) {
      canonicalMismatch.push({ url: r.url, googleCanonical: r.googleCanonical });
    }
    if (bucket !== 'after_gate_removed') stuck.push({ url: r.url, bucket, lastCrawlTime: r.lastCrawlTime ?? null, coverage });
  }
  const total = results.length;
  const pct = (n) => (total ? Math.round((n / total) * 1000) / 10 : 0);
  return {
    total,
    byCrawl,
    recrawledSinceGateRemovedPct: pct(byCrawl.after_gate_removed),
    stillOnGateEraFetchPct: pct(byCrawl.during_gate),
    indexed: results.filter((r) => r.verdict === 'PASS').length,
    indexedPct: pct(results.filter((r) => r.verdict === 'PASS').length),
    byCoverage,
    canonicalMismatch,
    stuck,
  };
}

const stripSlash = (u) => String(u).replace(/\/$/, '');

export function sitemapUrls(xml) {
  return [...String(xml).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}
