// The daily executive report.
//
// One page, material movements only. Where something could not be measured the
// report says so; it never presents a rule-derived score as an observed result,
// and never claims GEO visibility that was not actually observed.

import { round } from './util.mjs';

const MAX_OPPORTUNITIES = 5;

export function renderReport(run) {
  const L = [];
  const p = (s = '') => L.push(s);

  p('PENINSULA INSIDER SEO/GEO');
  p(`${run.date} · ${run.cycle} cycle · run ${run.runId}`);
  p('');

  if (run.noMaterialAction) {
    p('SEO/GEO: No material action required today.');
    p('');
    p(systemBlock(run));
    return L.join('\n');
  }

  // ---------------------------------------------------------------- STATUS --
  p('STATUS');
  p(`Overall health: ${run.health.label} (${run.health.score}/100)`);
  p(`Pages checked: ${run.inventory.total} (${run.inventory.newOrChanged} new or changed since last run)`);
  p(`Critical issues: ${run.priorities.bySeverity?.critical ?? 0} critical, ${run.priorities.bySeverity?.major ?? 0} major`);
  p(`Audit target: ${run.target.label}`);
  if (run.target.caveat) p(`  ${run.target.caveat}`);
  if (run.deployDelta?.available) {
    const d = run.deployDelta;
    p('');
    p('DEPLOY DELTA (served build vs current source)');
    p(`Current source produces ${d.sourceTotal} findings against ${d.servedTotal} in the published build.`);
    if (d.fixedPendingDeploy.length) {
      p('Already fixed in source, awaiting deployment — do not action:');
      for (const r of d.fixedPendingDeploy.slice(0, 6)) p(`  - ${r.rule}: ${r.live} live -> ${r.source} in source (${r.resolved} resolved)`);
    }
    if (d.incomingRegression.length) {
      p('Introduced by unreleased source — fix before the next publish:');
      for (const r of d.incomingRegression.slice(0, 6)) p(`  - ${r.rule}: 0 live -> ${r.source} in source`);
    }
    for (const c of d.caveats ?? []) p(`  Caveat: ${c.note}`);
    if (d.liveAndUnfixed.length) {
      p('Outstanding in both — genuine work:');
      for (const r of d.liveAndUnfixed.slice(0, 6)) p(`  - ${r.rule}: ${r.source} page(s)`);
    }
  }
  p('');

  // --------------------------------------------------------------- CHANGES --
  p('CHANGES MADE');
  if (!run.changes.applied.length) {
    p(`None. The engine is in ${run.mode} mode.`);
    const wouldApply = run.changes.planned.filter((c) => c.wouldApply).length;
    p(`${run.changes.planned.length} change(s) planned, ${wouldApply} would pass the safety gate if autonomous action were enabled.`);
  } else if (run.changes.applied.length > 8) {
    p(`${run.changes.applied.length} changes applied. See ${run.paths.changeManifest}.`);
  } else {
    for (const c of run.changes.applied) {
      p(`- ${c.urlPath}`);
      p(`  Change: ${c.action}`);
      p(`  Reason: ${c.problem}`);
      p(`  Confidence: ${c.confidence} (${c.provider})`);
      p(`  Validation: ${c.validation}`);
    }
  }
  p('');

  // ---------------------------------------------------------------- SEARCH --
  p('SEARCH');
  if (!run.search.available) {
    p(`Not measurable this run. ${run.search.reason}`);
  } else {
    p(`${run.search.totals.impressions} impressions, ${run.search.totals.clicks} clicks, CTR ${round(run.search.totals.ctr * 100, 2)}%`);
    const hi = run.search.opportunities.highImpressionLowCtr.slice(0, 3);
    if (hi.length) {
      p('High impressions, weak CTR:');
      for (const r of hi) p(`  - "${r.query}" — ${r.impressions} impr, CTR ${round(r.ctr * 100, 2)}%, pos ${round(r.position, 1)}`);
    }
    const strike = run.search.opportunities.striking.slice(0, 3);
    if (strike.length) {
      p('Within striking distance (positions 4-20):');
      for (const r of strike) p(`  - "${r.query}" — pos ${round(r.position, 1)}, ${r.impressions} impr`);
    }
  }
  p('');

  // ------------------------------------------------------------------- GEO --
  p('GEO');
  p(`Benchmark: ${run.geo.benchmarkSize} questions, ${run.geo.assessed} assessed this cycle. ${run.geo.answeredWell} have a good answer on the site, ${run.geo.uncovered} do not.`);
  p(`Citation readiness across ${run.geo.scoredPages} scored pages: ${run.geo.citationTiers.strong ?? 0} strong, ${run.geo.citationTiers.workable ?? 0} workable, ${run.geo.citationTiers.weak ?? 0} weak.`);
  p(`AI answer surfaces: ${run.geo.aiVisibility.state}. ${run.geo.aiVisibility.reason}`);
  p('Site coverage above is INFERRED from Peninsula Insider\'s own pages. No AI citation was OBSERVED this run.');
  p('');

  // --------------------------------------------------------- OPPORTUNITIES --
  p('TOP OPPORTUNITIES');
  const top = run.topOpportunities.slice(0, MAX_OPPORTUNITIES);
  if (!top.length) p('None above the reporting threshold.');
  top.forEach((o, i) => {
    p(`${i + 1}. ${o.title}`);
    p(`   Why it matters: ${o.why}`);
    p(`   Recommended action: ${o.action}`);
    p(`   Confidence: ${o.confidence} (${o.provider}) · category ${o.category}`);
  });
  p('');

  // ----------------------------------------------------- CONTENT & PEOPLE --
  p('CONTENT OPPORTUNITIES');
  if (!run.contentOpportunities.length) p('None worth raising this cycle.');
  for (const c of run.contentOpportunities.slice(0, 5)) {
    p(`- ${c.label}`);
    p(`  ${c.rationale}`);
  }
  p('');

  p('NEEDS JAMES');
  if (!run.needsJames.length) p('Nothing requiring a human decision this cycle.');
  for (const n of run.needsJames) {
    p(`- ${n.decision}`);
    p(`  Context: ${n.context}`);
  }
  p('');

  p(systemBlock(run));
  p('');
  p('NEXT');
  p(run.next);

  return L.join('\n');
}

function systemBlock(run) {
  const L = [];
  L.push('SYSTEM');
  L.push(`Decision layer: ${run.system.decisionLayer}`);
  L.push(`Crawler: ${run.system.crawler}`);
  L.push(`Analytics: ${run.system.analytics}`);
  L.push(`CMS/source: ${run.system.cms}`);
  L.push(`Scheduled job: ${run.system.schedule}`);
  L.push(`Decisions this run: ${run.system.usage.totalDecisions} (${round((run.system.usage.shareWithoutFrontierModel ?? 1) * 100, 1)}% without a frontier model, est. cost $${run.system.usage.estimatedCostUsd})`);
  if (run.system.errors.length) {
    L.push('Errors requiring attention:');
    for (const e of run.system.errors) L.push(`  - ${e}`);
  } else {
    L.push('Errors requiring attention: none');
  }
  return L.join('\n');
}

/** Whole-site health, from findings weighted by severity against page count. */
export function computeHealth(prioritised, pageCount) {
  const weights = { critical: 6, major: 2.5, minor: 0.4, noise: 0 };
  const penalty = prioritised.reduce((n, o) => n + (weights[o.severity] ?? 0), 0);
  // Exponential decay rather than a linear subtraction: a large site with many
  // minor findings should not floor at zero and stop carrying information.
  const score = Math.max(0, Math.round(100 * Math.exp(-penalty / Math.max(pageCount, 1))));
  const label = score >= 90 ? 'good' : score >= 75 ? 'fair' : score >= 55 ? 'needs attention' : 'poor';
  return { score, label, penalty: round(penalty, 1) };
}
