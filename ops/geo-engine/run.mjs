#!/usr/bin/env node
// Peninsula Insider SEO/GEO optimisation cycle.
//
//   node run.mjs                       incremental cycle against the served tree
//   node run.mjs --cycle=weekly        expanded audit (Sunday)
//   node run.mjs --target=source       audit next/dist (current source), not the
//                                      deployed build output
//   node run.mjs --apply               permit autonomous changes (policy-gated)
//
// The cycle fails safe: any stage that throws is recorded, state is preserved,
// the remaining safe analysis continues where practical, and nothing uncertain
// is published.

import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { applySourceFixes, registerPatchDecision } from './lib/source-fixes.mjs';
import { assessCoverage, generateBenchmark, mergeBenchmark, MEASUREMENT_STATES } from './lib/benchmark.mjs';
import { buildGraph, entityCoverage } from './lib/graph.mjs';
import { buildInventory, loadInventory, saveInventory } from './lib/inventory.mjs';
import { buildRegistry } from './lib/decisions.mjs';
import { DecisionService, PROVIDERS } from './lib/jev.mjs';
import { Ledger } from './lib/ledger.mjs';
import { adjudicate, generateCandidates } from './lib/links.mjs';
import { analyseSearch, attachToInventory, loadSearchData } from './lib/gsc.mjs';
import { auditAll, summariseFindings } from './lib/technical.mjs';
import { computeHealth, renderReport } from './lib/report.mjs';
import { compareWithSource } from './lib/delta.mjs';
import { findGaps } from './lib/gaps.mjs';
import { loadPolicy, planChanges, PLANE } from './lib/autofix.mjs';
import { prioritiseFindings, summarisePriorities } from './lib/prioritise.mjs';
import { scoreDistribution, scorePages } from './lib/scoring.mjs';
import { loadVocabulary } from './lib/vocab.mjs';
import { ENGINE_DIR, Logger, REPO_ROOT, RUNS_DIR, STATE_DIR, ensureDir, melbourneNow, readJson, round, writeJson, writeText } from './lib/util.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

const logger = new Logger();
const errors = [];
const stage = async (name, fn, fallback) => {
  try {
    return await fn();
  } catch (err) {
    errors.push(`${name}: ${err.message}`);
    logger.error(`stage failed: ${name}`, { error: err.message, stack: err.stack?.split('\n')[1]?.trim() });
    return fallback;
  }
};

async function main() {
  const now = melbourneNow();
  const cycle = args.cycle ?? (now.weekday === 'Sun' ? 'weekly' : 'incremental');
  const runId = `${now.date}-${now.time.replace(':', '')}-${cycle}-${randomUUID().slice(0,8)}`;
  const mode = args.apply ? 'apply' : 'audit';
  const runDir = ensureDir(path.join(RUNS_DIR, runId));

  logger.info('cycle starting', { runId, cycle, mode, melbourne: `${now.date} ${now.time}` });

  // ---------------------------------------------------- target resolution --
  const distRoot = path.join(REPO_ROOT, 'next', 'dist');
  if (args.target === 'source' && !fs.existsSync(distRoot)) throw Error('Requested source build is missing');
  const useSource = args.target === 'source' && fs.existsSync(distRoot);
  const root = useSource ? distRoot : REPO_ROOT;
  const target = useSource
    ? { label: 'next/dist (freshly built source)', plane: PLANE.SOURCE, caveat: 'This is unreleased output; findings may already be fixed relative to the live site.' }
    : { label: 'served tree at repository root (last published build)', plane: PLANE.BUILD_OUTPUT, caveat: buildOutputCaveat() };

  // ------------------------------------------------------- decision layer --
  const vocab = loadVocabulary();
  const registry = buildRegistry(vocab);
  registerPatchDecision(registry);
  const service = new DecisionService({ registry, logger });

  // A controlled round trip before anything depends on the provider.
  const probe = await stage('decision-probe', () => service.probe('query.classification', { query: 'best wineries near red hill for lunch' }), null);
  logger.info('decision layer', service.status());

  // ------------------------------------------------------------ inventory --
  const inventoryFile = path.join(STATE_DIR, useSource ? 'inventory-source.json' : 'inventory.json');
  const previous = loadInventory(inventoryFile);
  const built = await stage('inventory', () => buildInventory({ root, previous, vocab, logger }), { pages: {}, stats: {}, sitemap: null });
  const { pages, stats, sitemap } = built;
  if (!Object.keys(pages).length) {
    errors.push('inventory: no pages found; aborting before any analysis');
    return finish({ aborted: true });
  }
  logger.info('inventory built', stats);

  // Reserve the first remote decisions for actionable, exact source patches.
  const findings = await stage('technical-audit', () => auditAll(pages, { sitemapAvailable: stats.sitemapAvailable, sitemap }), []);
  const policy = loadPolicy();
  let sourceFixes = {changes:[],deferred:[]};
  if (mode === 'apply' && policy.enabled && useSource && !errors.length) {
    sourceFixes = await applySourceFixes({findings,pages,service,policy,runId});
  }

  // -------------------------------------------------------- search console --
  const searchData = loadSearchData();
  const searchAttach = attachToInventory(pages, searchData);
  const search = await stage('search-analysis', () => analyseSearch(searchData, pages, service), {
    available: false, reason: 'analysis stage failed', opportunities: { highImpressionLowCtr: [], striking: [], queriesWithoutGoodPage: [] }, byTerm: null, totals: null,
  });

  // ------------------------------------------------------ technical audit --
  const findingSummary = summariseFindings(findings);
  logger.info('technical audit', findingSummary);

  // Separate what is genuinely outstanding from what a deploy would already fix.
  const deployDelta = useSource
    ? null
    : await stage('deploy-delta', () => compareWithSource(findings, { vocab, logger }), null);
  if (deployDelta?.available) logger.info('deploy delta', { served: deployDelta.servedTotal, source: deployDelta.sourceTotal, fixed: deployDelta.fixedPendingDeploy.length, regressions: deployDelta.incomingRegression.length });

  // ---------------------------------------------------------------- graph --
  const graph = await stage('knowledge-graph', () => buildGraph({ vocab, pages }), { nodes: {}, edges: [], stats: {} });
  const coverage = await stage('entity-coverage', () => entityCoverage(graph), null);

  // ------------------------------------------------------------- scoring --
  // Incremental cycles score only what changed; the weekly cycle scores all.
  const scoreTargets = cycle === 'weekly'
    ? null
    : Object.values(pages).filter((p) => p.changedSinceLastRun !== false || !p.scores);
  const scored = await stage('scoring', () => scorePages(pages, service, { logger, only: scoreTargets }), { scored: 0, pages: {} });
  for (const [urlPath, s] of Object.entries(scored.pages)) {
    if (pages[urlPath]) { pages[urlPath].scores = s; pages[urlPath].lastAuditAt = new Date().toISOString(); }
  }
  const allScores = Object.fromEntries(Object.entries(pages).filter(([, p]) => p.scores).map(([u, p]) => [u, p.scores]));
  const distribution = scoreDistribution(allScores);

  // ----------------------------------------------------------- benchmark --
  const benchmarkFile = path.join(STATE_DIR, 'geo-benchmark.json');
  const benchmark = await stage('geo-benchmark', async () => {
    const generated = generateBenchmark({ vocab, graph });
    const merged = mergeBenchmark(readJson(benchmarkFile, null), generated);
    // Coverage assessment is the expensive part; cap it on incremental days.
    return assessCoverage(merged, pages, service, { limit: cycle === 'weekly' ? null : 200 });
  }, null);

  // -------------------------------------------------------- internal links --
  const linkResult = await stage('internal-links', async () => {
    const candidates = generateCandidates({ graph, pages, maxTotal: cycle === 'weekly' ? 400 : 150 });
    return adjudicate(candidates, service);
  }, { accepted: [], rejected: [], summary: { proposed: 0, accepted: 0 } });

  // --------------------------------------------------------------- gaps ---
  const gaps = benchmark
    ? await stage('content-gaps', () => findGaps({ benchmark, graph, pages, service, searchDemand: search.available ? search : null }), { candidates: [], summary: { proposed: 0 } })
    : { candidates: [], summary: { proposed: 0 } };

  // ------------------------------------------------------------- ledger ---
  const ledger = new Ledger();
  const prioritised = await stage('prioritisation', () => prioritiseFindings(findings, {
    pages, service, ledger, searchAvailable: search.available,
  }), []);
  const reconciled = ledger.reconcileIssues(prioritised, runId, now.date);
  const prioritySummary = summarisePriorities(prioritised);
  logger.info('priorities', { ...prioritySummary, new: reconciled.isNew.length, recurring: reconciled.recurring.length, resolved: reconciled.resolved.length });

  // ------------------------------------------------------------ changes ---
  const applyRequested = mode === 'apply';
  const planned = planChanges(prioritised.filter((o) => o.category === 'AUTO-FIX').slice(0, 40), { ...policy, enabled: policy.enabled && applyRequested }, { plane: target.plane });
  const appliedChanges = sourceFixes.changes;
  if (applyRequested && !policy.enabled) {
    errors.push('--apply was passed but ops/geo-engine/policy.json has enabled=false; no changes were made');
  }

  // Record every unactioned opportunity as a recommendation, so the ledger
  // remembers what was advised and when.
  for (const opp of prioritised.slice(0, 20)) {
    if (ledger.lastInterventionFor(opp.urlPath)?.runId === runId) continue;
    ledger.recordIntervention({
      runId, date: now.date, urlPath: opp.urlPath, problem: opp.problem,
      action: opp.proposedAction, mode: 'recommended',
      scoresBefore: pages[opp.urlPath]?.scores ?? null,
      searchBefore: pages[opp.urlPath]?.search ?? null,
      geoBefore: pages[opp.urlPath]?.scores?.geoScore ?? null,
      expectedOutcome: expectedOutcomeFor(opp),
      confidence: opp.confidence, provider: opp.provider,
    });
  }

  // ------------------------------------------------------- measurement ----
  const due = ledger.dueForMeasurement(now.date);
  for (const intervention of due) {
    ledger.measure(intervention.id, {
      searchAfter: pages[intervention.urlPath]?.search ?? null,
      geoAfter: pages[intervention.urlPath]?.scores?.geoScore ?? null,
      window: searchData.window,
    });
  }

  // ------------------------------------------------------------- report ---
  const health = computeHealth(prioritised, stats.total);
  const run = {
    runId, date: now.date, cycle, mode, target,
    noMaterialAction: prioritised.filter((o) => ['critical', 'major'].includes(o.severity)).length === 0
      && reconciled.isNew.length === 0 && gaps.summary.createCount === 0,
    health,
    inventory: {
      total: stats.total,
      newOrChanged: (stats.new ?? 0) + (stats.reparsed ?? 0),
      reused: stats.reused ?? 0,
      sitemapUrls: stats.sitemapUrls ?? 0,
    },
    priorities: prioritySummary,
    deployDelta,
    changes: { applied: appliedChanges, planned, deferred: sourceFixes.deferred, releaseStatus: appliedChanges.length ? 'pending_validation' : 'no_changes' },
    search: search.available
      ? { available: true, totals: search.totals, opportunities: search.opportunities }
      : { available: false, reason: search.reason ?? searchData.reason },
    geo: {
      benchmarkSize: benchmark?.total ?? 0,
      assessed: benchmark?.coverageSummary?.assessed ?? 0,
      answeredWell: benchmark?.coverageSummary?.answeredWell ?? 0,
      uncovered: benchmark?.coverageSummary?.uncovered ?? 0,
      scoredPages: Object.keys(allScores).length,
      citationTiers: distribution?.citationTiers ?? {},
      aiVisibility: {
        state: MEASUREMENT_STATES.NOT_MEASURABLE,
        reason: 'This cycle did not measure live AI citations; benchmark scores are inferred coverage, not observed visibility.',
      },
    },
    topOpportunities: buildTopOpportunities({ prioritised, reconciled, gaps, linkResult, search, deployDelta }),
    contentOpportunities: gaps.candidates.filter((c) => c.verdict === 'create').slice(0, 5).map((c) => ({
      label: c.label,
      rationale: `No page on the site currently answers this well (best existing fit ${round(c.bestExistingFit, 2)}), and the knowledge graph already models ${c.supportingEntities} supporting local entities to write it from.`,
    })),
    needsJames: buildNeedsJames({ prioritised, search, service, policy, target }),
    system: {
      decisionLayer: describeDecisionLayer(service, probe),
      crawler: `local corpus reader over ${stats.total} rendered production-surface pages; candidate patches separately checked against live pages`,
      analytics: search.available ? `Search Console rows from ${search.source}` : `unavailable — ${searchData.reason}`,
      cms: `Astro content collections: ${vocab.counts.venues} venues, ${vocab.counts.events} events, ${vocab.counts.towns} towns`,
      schedule: describeSchedule(),
      usage: service.usageSummary(),
      errors,
    },
    next: describeNext(cycle, prioritised, reconciled),
    paths: {
      run: path.relative(REPO_ROOT, runDir),
      changeManifest: path.relative(REPO_ROOT, path.join(runDir, 'changes.json')),
    },
  };

  const reportText = renderReport(run);

  // -------------------------------------------------------------- persist --
  ledger.startRun({
    runId, date: now.date, cycle, mode,
    pages: stats.total,
    findings: findings.length,
    newIssues: reconciled.isNew.length,
    resolvedIssues: reconciled.resolved.length,
    decisions: service.usageSummary().totalDecisions,
    provider: service.status().primary,
    errors: errors.length,
  });

  saveInventory(inventoryFile, pages, stats);
  writeJson(benchmarkFile, benchmark ?? { questions: [] });
  writeJson(path.join(STATE_DIR, 'knowledge-graph.json'), { updatedAt: new Date().toISOString(), stats: graph.stats, coverage, edges: graph.edges.length });
  writeJson(path.join(STATE_DIR, 'internal-link-candidates.json'), { updatedAt: new Date().toISOString(), ...linkResult });
  writeJson(path.join(STATE_DIR, 'opportunities.json'), { runId, updatedAt: new Date().toISOString(), summary: prioritySummary, opportunities: prioritised.slice(0, 300) });
  writeJson(path.join(STATE_DIR, 'content-gaps.json'), { runId, updatedAt: new Date().toISOString(), ...gaps });
  ledger.save();
  service.persist();

  writeJson(path.join(runDir, 'summary.json'), run);
  writeJson(path.join(runDir, 'findings.json'), { summary: findingSummary, findings: findings.slice(0, 5000) });
  writeJson(path.join(runDir, 'changes.json'), { planned, applied: appliedChanges });
  writeText(path.join(runDir, 'report.txt'), reportText);
  writeJson(path.join(runDir, 'log.json'), logger.lines);
  writeText(path.join(STATE_DIR, 'latest-report.txt'), reportText);
  writeJson(path.join(STATE_DIR, 'latest-run.json'), {runId,runDir,errors,completedAt:new Date().toISOString()});

  process.stdout.write(`${reportText}\n`);
  logger.info('cycle complete', { runId, errors: errors.length });
  return { run, errors };

  function finish(extra) {
    writeJson(path.join(runDir, 'log.json'), logger.lines);
    return { aborted: true, errors, ...extra };
  }
}

function buildOutputCaveat() {
  // The repository root is generated by build-live.sh. If next/src has moved on
  // since the last publish, a finding here may already be fixed and merely
  // awaiting deployment — so never act on one without checking source.
  return 'The repository root is build output from the last publish. Re-check any finding against next/src (or run with --target=source) before acting on it.';
}

function describeDecisionLayer(service, probe) {
  const s = service.status();
  if (s.primary === PROVIDERS.JEV) {
    return `Jev via ${s.endpoint} (model ${s.model}) — probe ${probe?.ok ? 'passed' : 'FAILED'}`;
  }
  if (s.primary === PROVIDERS.FRONTIER) {
    return `frontier model ${s.model} — probe ${probe?.ok ? 'passed' : 'FAILED'}. ${s.reason}`;
  }
  return `deterministic rules only — ${s.reason}. ${s.decisionsRegistered} atomic decisions registered; scores are rule-derived, not model judgements.`;
}

function describeSchedule() {
  const wf = path.join(REPO_ROOT, '.github', 'workflows', 'seo-geo-engine.yml');
  return 'OpenClaw pi-seo-daily-pull — 05:30 Australia/Melbourne daily; expanded Sunday. GitHub Actions validates releases, not the JEV schedule.';
}

function expectedOutcomeFor(opp) {
  return {
    fix_broken_internal_link: 'Restores crawl path and removes a dead link for readers.',
    sitemap_include: 'Page becomes discoverable for indexing; expect impressions within 28 days.',
    sitemap_remove_noindex: 'Removes a conflicting signal between sitemap and robots meta.',
    rewrite_title: 'Improved CTR on queries already ranking for this page.',
    rewrite_meta_description: 'Improved CTR at unchanged position.',
    add_internal_link: 'Increases internal authority flow to an under-linked page.',
    add_schema_from_verified_facts: 'Improves machine readability and citation likelihood.',
  }[opp.proposedAction] ?? 'Reduction in the technical finding; effect on search to be measured.';
}

function buildTopOpportunities({ prioritised, reconciled, gaps, linkResult, search, deployDelta }) {
  const out = [];
  // A finding that current source no longer produces is a deployment away from
  // being gone. Reporting it as a top opportunity would send someone to fix
  // something already fixed, so it is excluded here and shown in DEPLOY DELTA.
  const alreadyFixed = new Set(
    (deployDelta?.fixedPendingDeploy ?? []).filter((r) => r.source === 0).map((r) => r.rule),
  );
  const grouped = new Map();
  for (const o of prioritised) {
    if (!['critical', 'major'].includes(o.severity)) continue;
    if (alreadyFixed.has(o.rule)) continue;
    if (!grouped.has(o.rule)) grouped.set(o.rule, []);
    grouped.get(o.rule).push(o);
  }
  for (const [rule, items] of [...grouped.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const head = items[0];
    out.push({
      title: `${rule.replace(/_/g, ' ')} on ${items.length} page${items.length > 1 ? 's' : ''}`,
      why: `${head.problem}. Highest-value affected page: ${head.urlPath} (${head.pageType}).`,
      action: `${head.proposedAction.replace(/_/g, ' ')} — category ${head.category}`,
      confidence: head.confidence,
      provider: head.provider,
      category: head.category,
    });
  }
  const topGap = gaps.candidates.find((c) => c.verdict === 'create');
  if (topGap) {
    out.push({
      title: `Content gap: ${topGap.label}`,
      why: topGap.rationale,
      action: 'Research and commission; do not generate',
      confidence: topGap.confidence,
      provider: topGap.provider,
      category: 'NEW CONTENT',
    });
  }
  if (linkResult.accepted.length) {
    const l = linkResult.accepted[0];
    out.push({
      title: `${linkResult.accepted.length} internal links judged editorially legitimate`,
      why: `e.g. ${l.sourceUrl} → ${l.targetUrl} on the "${l.relationship}" relationship (${l.anchorConcept}).`,
      action: 'Review and implement in next/src',
      confidence: l.confidence,
      provider: l.provider,
      category: 'DRAFT',
    });
  }
  return out;
}

function buildNeedsJames({ prioritised, search, service, policy, target }) {
  const out = [];
  if (service.status().primary === PROVIDERS.DETERMINISTIC) {
    out.push({
      decision: 'Run the engine where the protected TYPESAFE_API_KEY is available (the OpenClaw gateway exec), set JEV_API_KEY as a secret for this runner, or approve running the decision layer on deterministic rules only.',
      context: 'Jev (TypeSafe) is supported natively but no credential reached this run. All classification and scoring is rule-derived, which is honest but less discriminating than a model.',
    });
  }
  if (!search.available) {
    out.push({
      decision: 'Supply a Search Console export or GSC_TOKEN_JSON so the engine can see real demand.',
      context: `${search.reason} Without it, prioritisation uses a neutral demand prior instead of measured impressions.`,
    });
  }
  if (!policy.enabled) {
    out.push({
      decision: 'Decide whether to enable the first tier of autonomous changes after reviewing this audit.',
      context: 'The mechanism, safety gate and rollback are built and tested but disabled. Recommended first tier is in ops/geo-engine/README.md.',
    });
  }
  const structural = prioritised.filter((o) => o.category === 'STRUCTURAL PROJECT');
  if (structural.length > 20) {
    out.push({
      decision: `Confirm the intended indexing scope: ${structural.length} pages carry structural findings.`,
      context: `Largest group: ${structural[0].rule} starting at ${structural[0].urlPath}.`,
    });
  }
  return out;
}

function describeNext(cycle, prioritised, reconciled) {
  if (cycle === 'weekly') return 'Tomorrow: incremental cycle over pages that changed, plus any new Search Console data.';
  const top = prioritised[0];
  return `Next cycle: re-check ${reconciled.isNew.length} newly-seen issue(s) and ${reconciled.recurring.length} recurring one(s)${top ? `, starting with ${top.rule} on ${top.urlPath}` : ''}. Sunday runs the expanded audit.`;
}

main().then(result => { if (result?.aborted || result?.errors?.length) process.exitCode = 1; }).catch((err) => {
  process.stderr.write(`FATAL ${err.stack}\n`);
  process.exitCode = 1;
});
