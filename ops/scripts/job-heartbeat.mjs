#!/usr/bin/env node
/**
 * job-heartbeat.mjs
 *
 * Answers the one question this estate has never been able to answer:
 * **what should have run today, and did it?**
 *
 * Why this shape rather than editing nine job definitions
 * ------------------------------------------------------
 * The documented failure mode here is not loud breakage, it is silent
 * non-execution. `ops/operating-surface.md` records that three workflows were
 * listed as `live` for months while no matching file existed, and that
 * `pi-daily-events-scan` "has never produced a single output file". Nine of
 * ten Tier-1 jobs have an alert path of `silent`.
 *
 * Wiring an alert into each job only helps when the job RUNS and FAILS. It
 * does nothing when the job never fires, which is the actual problem. So this
 * checks the opposite way round: it knows what artifact each job is supposed
 * to leave behind, and alerts when the artifact is missing or stale.
 *
 * A job cannot lie to this check by not running. That is the entire point.
 *
 * Usage:
 *   node ops/scripts/job-heartbeat.mjs
 *   node ops/scripts/job-heartbeat.mjs --json
 *   node ops/scripts/job-heartbeat.mjs --markdown
 *
 * Exit 1 if any expected artifact is missing or stale, so a cron can alert.
 */

import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { REPO, hasDb, select, RunLog } from './lib/pi-factory.mjs';

const args = process.argv.slice(2);
const AS_JSON = args.includes('--json');
const AS_MD = args.includes('--markdown');

/**
 * The expectation register. One row per job that is supposed to leave a trace.
 *
 *   kind: 'file-glob'  a dated artifact under a directory
 *         'db-row'     a row in a pi_* table
 *
 *   maxAgeHours: how long we tolerate silence before calling it stale.
 *
 * Sourced from ops/operating-surface.md Tier-1 and Tier-2, restricted to jobs
 * that genuinely produce a dated artifact. A job with no artifact cannot be
 * heartbeat-checked and is listed in UNCHECKABLE below, which is itself a
 * finding worth seeing.
 */
const EXPECTATIONS = [
  {
    job: 'pi-daily-accuracy-scan', tier: 1, kind: 'file-glob',
    dir: 'reports', pattern: /^peninsula-accuracy-scan-\d{4}-\d{2}-\d{2}\.md$/,
    maxAgeHours: 36, note: 'daily 20:20 UTC, report-only',
  },
  {
    job: 'pi-daily-accuracy-autofix', tier: 1, kind: 'file-glob',
    dir: 'reports', pattern: /^peninsula-accuracy-autofix-\d{4}-\d{2}-\d{2}\.md$/,
    maxAgeHours: 36, note: 'daily 20:35 UTC, MUTATES LIVE',
  },
  {
    job: 'pi-daily-link-audit', tier: 2, kind: 'file-glob',
    dir: 'reports', pattern: /^peninsula-link-audit-\d{4}-\d{2}-\d{2}\.md$/,
    maxAgeHours: 36, note: 'daily 21:20 UTC, report-only',
  },
  {
    job: 'pi-daily-events-scan', tier: 2, kind: 'file-glob',
    dir: 'reports', pattern: /^peninsula-events-brief-\d{4}-\d{2}-\d{2}\.md$/,
    maxAgeHours: 36,
    note: 'daily 05:30 UTC. operating-surface records this has NEVER produced an output file.',
  },
  {
    job: 'pi-daily-venue-healthcheck', tier: 2, kind: 'file-glob',
    dir: 'reports', pattern: /^peninsula-venue-health-\d{4}-\d{2}-\d{2}\.md$/,
    maxAgeHours: 36, note: 'daily 06:00 UTC, report-only',
  },
  {
    job: 'pi-strategy-brain', tier: 1, kind: 'file-glob',
    dir: 'ops/strategy/snapshots', pattern: /\.json$/,
    maxAgeHours: 36, note: 'daily, feeds commissioning',
  },
  {
    job: 'pi-perf-sync', tier: 2, kind: 'db-row',
    table: 'pi_performance_daily', tsColumn: 'date',
    maxAgeHours: 72, note: 'nightly GSC sync (GSC itself lags ~2 days)',
  },
  {
    job: 'pi-intel-ingest-sweep', tier: 2, kind: 'db-row',
    table: 'pi_l0_raw', tsColumn: 'created_at',
    maxAgeHours: 12, note: 'every 6h: fetch, extract, contradiction-detect',
  },
  {
    // CONDITIONAL OUTPUT. Verified 2026-07-28: this job runs fine and correctly
    // creates nothing when no cluster clears the bar. Judging it by row
    // recency produced a false "STALE" and a wrong diagnosis of "job is dead".
    // "No new rows" is not "did not run" for a table that only gains rows when
    // something qualifies. Its real health signal is source health, below.
    job: 'pi-opportunity-detection', tier: 2, kind: 'db-row',
    table: 'pi_opportunities', tsColumn: 'created_at',
    maxAgeHours: 48, conditionalOutput: true,
    note: 'daily L3 scoring. Zero output is a legitimate result, not a failure.',
  },
  {
    job: 'content-factory', tier: 0, kind: 'db-row',
    table: 'pi_run_log', tsColumn: 'started_at',
    maxAgeHours: 36, note: 'the factory itself',
  },
];

/**
 * Jobs that mutate but leave no dated artifact, so nothing can prove they ran.
 * Listing them is the point: an unobservable mutating job is a standing risk,
 * not an acceptable state.
 */
const UNCHECKABLE = [
  { job: 'pi-daily-quick-note-qa-publish', tier: 1, why: 'mutates live, artifact is a git commit with no fixed path' },
  { job: 'pi-daily-image-relevance-autofix', tier: 1, why: 'mutates content, no dated report' },
  { job: 'pi-maintenance-sweep', tier: 2, why: 'writes pi_maintenance_findings only when it finds something' },
];

const hoursSince = (d) => (Date.now() - new Date(d).getTime()) / 36e5;
const fmtAge = (h) => (h === Infinity ? 'never' : h < 48 ? `${h.toFixed(0)}h` : `${(h / 24).toFixed(0)}d`);

async function newestMatching(dir, pattern) {
  const full = join(REPO, dir);
  let names;
  try { names = await readdir(full); } catch { return null; }
  const matches = names.filter((n) => pattern.test(n));
  if (!matches.length) return null;
  let best = null;
  for (const n of matches) {
    try {
      const st = await stat(join(full, n));
      if (!best || st.mtimeMs > best.mtimeMs) best = { name: n, mtimeMs: st.mtimeMs };
    } catch { /* skip */ }
  }
  return best;
}

async function newestRow(table, tsColumn) {
  if (!hasDb()) return null;
  try {
    const rows = await select(`${table}?select=${tsColumn}&order=${tsColumn}.desc&limit=1`);
    return rows?.[0]?.[tsColumn] ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const log = new RunLog('job-heartbeat', { jobSource: 'manual' });
  const checks = [];

  for (const e of EXPECTATIONS) {
    let lastSeen = null;
    let evidence = null;

    if (e.kind === 'file-glob') {
      const f = await newestMatching(e.dir, e.pattern);
      if (f) { lastSeen = new Date(f.mtimeMs).toISOString(); evidence = `${e.dir}/${f.name}`; }
    } else if (e.kind === 'db-row') {
      const ts = await newestRow(e.table, e.tsColumn);
      if (ts) { lastSeen = new Date(ts).toISOString(); evidence = `${e.table}.${e.tsColumn}`; }
    }

    const age = lastSeen ? hoursSince(lastSeen) : Infinity;
    // A conditional-output job cannot be judged stale by row age: producing
    // nothing is one of its valid outcomes.
    const verdict = e.conditionalOutput
      ? (lastSeen ? 'ok (conditional)' : 'NEVER')
      : !lastSeen ? 'NEVER' : age > e.maxAgeHours ? 'STALE' : 'ok';
    checks.push({ ...e, lastSeen, evidence, ageHours: age, verdict });
  }

  // ── Source health: the real upstream signal for the intelligence pipeline ──
  // A source can be `active` with a 37-failure streak, which is how a dead feed
  // stays invisible. Judge on the streak, not the label.
  const sources = hasDb()
    ? await select('pi_sources?select=name,kind,tier,state,failure_streak,health_note&order=failure_streak.desc&limit=60')
    : null;
  const brokenSources = (sources ?? []).filter((s) => (s.failure_streak ?? 0) >= 3);
  const degradedSources = (sources ?? []).filter((s) => s.state === 'degraded');

  const never = checks.filter((c) => c.verdict === 'NEVER');
  const stale = checks.filter((c) => c.verdict === 'STALE');
  const ok = checks.filter((c) => c.verdict.startsWith('ok'));
  const problems = [...never, ...stale,
    ...brokenSources.map((s) => ({ job: `source: ${s.name}`, verdict: 'BROKEN' }))];

  const payload = {
    generated_at: new Date().toISOString(),
    healthy: problems.length === 0,
    counts: { ok: ok.length, stale: stale.length, never: never.length, unobservable: UNCHECKABLE.length },
    checks: checks.map((c) => ({
      job: c.job, tier: c.tier, verdict: c.verdict,
      last_seen: c.lastSeen, age: fmtAge(c.ageHours),
      tolerance_hours: c.maxAgeHours, evidence: c.evidence, note: c.note,
    })),
    unobservable: UNCHECKABLE,
    sources: {
      total: (sources ?? []).length,
      broken: brokenSources.map((s) => ({ name: s.name, tier: s.tier, state: s.state, failure_streak: s.failure_streak })),
      degraded: degradedSources.map((s) => ({ name: s.name, tier: s.tier })),
    },
  };

  await log.stage('heartbeat', {
    status: problems.length ? 'failed' : 'ok',
    outputs: payload.counts,
    errorCode: problems.length ? 'EXPECTED_ARTIFACT_MISSING' : null,
    errorDetail: problems.map((p) => `${p.job}: ${p.verdict}`).join('; ') || null,
    escalatedTo: never.length ? 'james' : null,
  });

  if (AS_JSON) {
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
    process.exit(problems.length ? 1 : 0);
  }

  const out = [];
  out.push(AS_MD ? '# Job heartbeat — what should have run, and did it?' : '\nJOB HEARTBEAT — what should have run, and did it?');
  out.push(`${payload.generated_at.slice(0, 16).replace('T', ' ')} UTC`);
  out.push('');
  out.push(`${ok.length} ok · ${stale.length} stale · ${never.length} never produced anything · ${UNCHECKABLE.length} unobservable by design`);
  out.push('');

  if (AS_MD) {
    out.push('| Tier | Job | Verdict | Last artifact | Tolerance |');
    out.push('|---:|---|---|---|---:|');
    for (const c of checks.sort((a, b) => a.tier - b.tier || a.job.localeCompare(b.job))) {
      out.push(`| ${c.tier} | \`${c.job}\` | ${c.verdict} | ${fmtAge(c.ageHours)} | ${c.maxAgeHours}h |`);
    }
  } else {
    for (const c of checks.sort((a, b) => a.tier - b.tier || a.job.localeCompare(b.job))) {
      const mark = c.verdict.startsWith('ok') ? 'ok   ' : c.verdict === 'STALE' ? 'STALE' : 'NEVER';
      out.push(`  [${mark}] T${c.tier} ${c.job.padEnd(32)} last ${fmtAge(c.ageHours).padEnd(6)} (tolerance ${c.maxAgeHours}h)`);
      if (!c.verdict.startsWith('ok')) out.push(`         ${c.note}`);
    }
  }

  out.push('');
  out.push(AS_MD ? '## Source health' : 'SOURCE HEALTH (a source can be "active" with a 37-failure streak):');
  out.push('');
  if (!sources) {
    out.push('  (no database access)');
  } else if (!brokenSources.length && !degradedSources.length) {
    out.push(`  all ${sources.length} sources healthy`);
  } else {
    for (const s of brokenSources) {
      out.push(AS_MD
        ? `- **BROKEN** T${s.tier} \`${s.name}\` — ${s.failure_streak} consecutive failures, still marked \`${s.state}\``
        : `  [BROKEN] T${s.tier} ${String(s.name).slice(0, 44).padEnd(46)} ${s.failure_streak} consecutive failures, still "${s.state}"`);
    }
    for (const s of degradedSources.filter((d) => !brokenSources.some((b) => b.name === d.name))) {
      out.push(AS_MD
        ? `- degraded T${s.tier} \`${s.name}\``
        : `  [degr  ] T${s.tier} ${String(s.name).slice(0, 44).padEnd(46)} marked degraded`);
    }
    out.push('');
    out.push('  A broken event source with a healthy statewide news feed is why opportunity');
    out.push('  detection produces nothing: the pipe is full, but full of the wrong material.');
  }

  out.push('');
  out.push(AS_MD ? '## Unobservable jobs' : 'UNOBSERVABLE (mutating jobs that leave no dated artifact):');
  out.push('');
  for (const u of UNCHECKABLE) {
    out.push(AS_MD ? `- \`${u.job}\` (T${u.tier}): ${u.why}` : `  T${u.tier} ${u.job.padEnd(36)} ${u.why}`);
  }
  out.push('');
  out.push('A mutating job that cannot be proven to have run is a standing risk, not an acceptable state. Each of the above should either emit a dated artifact or be retired.');
  out.push('');

  console.log(out.join('\n'));
  process.exit(problems.length ? 1 : 0);
}

main().catch((err) => {
  console.error(`[job-heartbeat] fatal: ${err.stack || err.message}`);
  process.exit(2);
});
