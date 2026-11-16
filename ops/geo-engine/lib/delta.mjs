// Served-versus-source comparison.
//
// The repository root is build output from the last publish. next/dist, when a
// build has been run, is what the current source produces. Comparing the two
// separates three very different things:
//
//   fixed_pending_deploy — present live, already fixed in source
//   live_and_unfixed     — present in both; genuinely outstanding work
//   incoming_regression  — absent live, introduced by unreleased source
//
// Without this the engine would send someone to fix problems that are already
// fixed, and would miss regressions that have not shipped yet.

import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './util.mjs';
import { buildInventory } from './inventory.mjs';
import { auditAll, summariseFindings } from './technical.mjs';

export function sourceBuildAvailable(root = REPO_ROOT) {
  const dist = path.join(root, 'next', 'dist');
  return fs.existsSync(path.join(dist, 'index.html')) ? dist : null;
}

/**
 * @param servedFindings findings already computed for the served tree
 * @returns null when no source build exists to compare against
 */
export function compareWithSource(servedFindings, { root = REPO_ROOT, vocab, logger } = {}) {
  const dist = sourceBuildAvailable(root);
  if (!dist) return null;

  let sourceFindings;
  let sourceStats;
  try {
    const built = buildInventory({ root: dist, previous: {}, vocab, logger });
    sourceStats = built.stats;
    sourceFindings = auditAll(built.pages, { sitemapAvailable: built.stats.sitemapAvailable, sitemap: built.sitemap });
  } catch (err) {
    logger?.warn('source comparison failed', { error: err.message });
    return null;
  }

  const servedByRule = countByRule(servedFindings);
  const sourceByRule = countByRule(sourceFindings);
  const rules = new Set([...Object.keys(servedByRule), ...Object.keys(sourceByRule)]);

  const fixedPendingDeploy = [];
  const liveAndUnfixed = [];
  const incomingRegression = [];

  for (const rule of rules) {
    const live = servedByRule[rule] ?? 0;
    const src = sourceByRule[rule] ?? 0;
    if (src < live) fixedPendingDeploy.push({ rule, live, source: src, resolved: live - src });
    if (src > 0) liveAndUnfixed.push({ rule, live, source: src });
    if (live === 0 && src > 0) incomingRegression.push({ rule, live, source: src });
  }

  // A source build whose post-build image pipeline did not run emits raw <img>
  // tags, which inflates image findings. Detect it rather than reporting the
  // difference as real work.
  const caveats = [];
  const unprocessed = countUnprocessedImages(dist);
  if (unprocessed > 0) {
    caveats.push({
      affects: ['missing_alt'],
      note: `The source build's responsive-image pipeline did not complete here: ${unprocessed} images still carry the data-pi-responsive marker it consumes (it fails in this environment because the CMS asset host is blocked by the egress policy). Image findings from source are unreliable and are excluded from the outstanding list.`,
    });
  }

  const caveatedRules = new Set(caveats.flatMap((c) => c.affects));
  const sortByGap = (a, b) => (b.resolved ?? b.source) - (a.resolved ?? a.source);
  return {
    caveats,
    available: true,
    sourceBuild: path.relative(root, dist),
    servedPages: new Set(servedFindings.map((f) => f.urlPath)).size,
    sourcePages: sourceStats.total,
    servedTotal: servedFindings.length,
    sourceTotal: sourceFindings.length,
    fixedPendingDeploy: fixedPendingDeploy.sort(sortByGap),
    liveAndUnfixed: liveAndUnfixed
      .filter((r) => !incomingRegression.some((x) => x.rule === r.rule))
      .filter((r) => !caveatedRules.has(r.rule))
      .sort(sortByGap),
    incomingRegression: incomingRegression.sort(sortByGap),
    sourceSummary: summariseFindings(sourceFindings),
  };
}

/**
 * Images awaiting the responsive-image integration. The integration rewrites
 * every element carrying `data-pi-responsive`, so any left behind mean the
 * post-build hook did not finish.
 */
function countUnprocessedImages(root) {
  let total = 0;
  for (const rel of ['index.html', 'eat/index.html', 'wine/index.html', 'stay/index.html', 'explore/index.html', 'whats-on/index.html']) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) continue;
    total += (fs.readFileSync(file, 'utf8').match(/data-pi-responsive/g) ?? []).length;
  }
  return total;
}

function countByRule(findings) {
  const out = {};
  for (const f of findings) out[f.rule] = (out[f.rule] ?? 0) + 1;
  return out;
}
