#!/usr/bin/env node
/**
 * factory-status.mjs
 *
 * The observability surface for the content factory. Five views, answering
 * the five questions worth asking. View 1 is job health and it is first on
 * purpose: this estate's demonstrated failure mode is silent non-execution,
 * not loud breakage. Three workflows were listed as `live` for months while
 * no matching file existed, and pi-daily-events-scan never produced a single
 * output. A view that answers "what should have run and did not" is worth
 * more than any performance chart.
 *
 * Usage:
 *   node ops/scripts/factory-status.mjs
 *   node ops/scripts/factory-status.mjs --json
 *   node ops/scripts/factory-status.mjs --markdown > ops/reports/factory-status.md
 *   node ops/scripts/factory-status.mjs --days 14
 *
 * Exit code is 1 when anything is genuinely wrong (a stale expected job, a
 * failed publication, a campaign blocked over its SLA), so a cron can alert
 * on it rather than a human remembering to look.
 *
 * Env: SUPABASE_SERVICE_KEY
 */

import { hasDb, select } from './lib/pi-factory.mjs';

const args = process.argv.slice(2);
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const AS_JSON = args.includes('--json');
const AS_MD = args.includes('--markdown');
const DAYS = Number(val('--days') ?? 7);

/**
 * Jobs the factory expects to see. `maxAgeHours` is how long we tolerate
 * silence before calling it stale. A job that is registered but has never
 * run at all is the loudest possible finding, so it is reported separately.
 */
const EXPECTED_JOBS = [
  { name: 'campaign-build',    maxAgeHours: 24 * 8, note: 'weekly: packages the Featured Plan' },
  { name: 'campaign-derive',   maxAgeHours: 24 * 8, note: 'weekly: generates channel copy' },
  { name: 'campaign-schedule', maxAgeHours: 24 * 8, note: 'weekly: queues the release ladder' },
];

const hours = (ms) => ms / 36e5;
const ago = (iso) => {
  if (!iso) return 'never';
  const h = hours(Date.now() - new Date(iso).getTime());
  if (h < 1) return `${Math.round(h * 60)}m ago`;
  if (h < 48) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

async function main() {
  if (!hasDb()) {
    console.error('[factory-status] SUPABASE_SERVICE_KEY is not set.');
    process.exit(2);
  }

  const since = new Date(Date.now() - DAYS * 864e5).toISOString();
  const problems = [];

  // ── View 1: job health ───────────────────────────────────────────────────
  const runs = await select(
    `pi_run_log?select=job_name,run_id,stage,status,started_at,error_code,error_detail,degradations,cost_usd` +
    `&started_at=gte.${since}&order=started_at.desc&limit=1000`
  );
  const byJob = new Map();
  for (const r of runs ?? []) {
    if (!byJob.has(r.job_name)) byJob.set(r.job_name, []);
    byJob.get(r.job_name).push(r);
  }

  const jobHealth = EXPECTED_JOBS.map((j) => {
    const rows = byJob.get(j.name) ?? [];
    const last = rows[0] ?? null;
    const ageH = last ? hours(Date.now() - new Date(last.started_at).getTime()) : Infinity;
    const stale = ageH > j.maxAgeHours;

    // Verdict reflects the MOST RECENT run, not any run in the window. A job
    // that blocked on Monday and succeeded on Tuesday is healthy; reporting it
    // as blocked trains people to ignore this view, which is the one failure
    // mode an observability surface cannot afford.
    const lastRunId = last?.run_id ?? null;
    const lastRun = lastRunId ? rows.filter((r) => r.run_id === lastRunId) : (last ? [last] : []);
    const lastFailed = lastRun.some((r) => r.status === 'failed');
    const lastBlocked = lastRun.some((r) => r.status === 'blocked');

    const failures = rows.filter((r) => r.status === 'failed').length;
    const blocked = rows.filter((r) => r.status === 'blocked').length;
    const verdict = !last ? 'NEVER RUN'
      : stale ? 'STALE'
        : lastFailed ? 'FAILING'
          : lastBlocked ? 'BLOCKED'
            : 'ok';
    if (verdict !== 'ok') {
      problems.push(`job ${j.name}: ${verdict}${last ? ` (last ${ago(last.started_at)})` : ''}`);
    }
    return {
      job: j.name, verdict, last_run: last?.started_at ?? null,
      runs: new Set(rows.map((r) => r.run_id)).size,
      failures, blocked, note: j.note,
    };
  });

  // Jobs that ran but nobody expected. Not a problem, but worth seeing.
  const unexpected = [...byJob.keys()].filter((n) => !EXPECTED_JOBS.some((j) => j.name === n));

  // ── View 2: campaigns in flight ──────────────────────────────────────────
  const campaigns = await select(
    `pi_campaigns?select=campaign_key,publication_week,featured_plan_slug,state,risk_class,risk_note,` +
    `blocked_reason,thesis_approved_by,actual_cost_usd,updated_at&order=publication_week.desc&limit=20`
  );
  const TERMINAL = new Set(['published', 'archived', 'killed', 'measuring']);
  for (const c of campaigns ?? []) {
    const stuckH = hours(Date.now() - new Date(c.updated_at).getTime());
    if (!TERMINAL.has(c.state) && stuckH > 72) {
      problems.push(`campaign ${c.campaign_key}: ${stuckH.toFixed(0)}h in state ${c.state}`);
    }
    if (c.state === 'qa_failed' || c.state === 'publication_failed') {
      problems.push(`campaign ${c.campaign_key}: ${c.state} - ${c.blocked_reason ?? 'no reason recorded'}`);
    }
  }

  // ── View 3: approval queue ───────────────────────────────────────────────
  const pendingAssets = await select(
    `pi_campaign_assets?select=channel,approval_level,state,campaign_id&approval_level=eq.L3&state=in.(draft,qa_failed)&limit=100`
  );

  // ── View 4: distribution ─────────────────────────────────────────────────
  const pubs = await select(
    `pi_publications?select=platform,state,scheduled_for,submitted_at,verified_at,last_error,attempt_count` +
    `&order=scheduled_for.asc&limit=200`
  );
  const pubByState = {};
  for (const p of pubs ?? []) pubByState[p.state] = (pubByState[p.state] ?? 0) + 1;
  for (const p of pubs ?? []) {
    if (p.state === 'failed') problems.push(`publication failed on ${p.platform}: ${p.last_error ?? 'no error recorded'}`);
    // Submitted but never verified live is the failure nobody notices.
    if (p.state === 'submitted' && p.submitted_at &&
        hours(Date.now() - new Date(p.submitted_at).getTime()) > 24 && !p.verified_at) {
      problems.push(`publication on ${p.platform} submitted ${ago(p.submitted_at)} and still unverified`);
    }
    if (p.state === 'verify_failed') problems.push(`publication on ${p.platform} submitted but is NOT LIVE`);
  }

  // ── View 5: cost + media debt ────────────────────────────────────────────
  const spend = (runs ?? []).reduce((n, r) => n + Number(r.cost_usd ?? 0), 0);
  const modelCalls = await select(`pi_model_calls?select=cost_usd&at=gte.${since}&limit=5000`);
  const modelSpend = (modelCalls ?? []).reduce((n, r) => n + Number(r.cost_usd ?? 0), 0);
  const budgets = await select('pi_budgets?select=*&limit=10');

  const media = await select('pi_media_assets?select=licence,permitted_channels,approval_status&limit=5000');
  const mediaTotal = (media ?? []).length;
  const mediaSocial = (media ?? []).filter((m) => (m.permitted_channels ?? []).includes('ig_reel')).length;
  const mediaNone = (media ?? []).filter((m) => !(m.permitted_channels ?? []).length).length;

  const payload = {
    generated_at: new Date().toISOString(),
    window_days: DAYS,
    healthy: problems.length === 0,
    problems,
    job_health: jobHealth,
    unexpected_jobs: unexpected,
    campaigns: (campaigns ?? []).map((c) => ({
      key: c.campaign_key, week: c.publication_week, plan: c.featured_plan_slug,
      state: c.state, risk: c.risk_class, signed: Boolean(c.thesis_approved_by),
      blocked: c.blocked_reason, updated: c.updated_at,
    })),
    approval_queue: (pendingAssets ?? []).length,
    distribution: pubByState,
    cost: { run_log_usd: Number(spend.toFixed(4)), model_calls_usd: Number(modelSpend.toFixed(4)), budgets: budgets ?? [] },
    media: { total: mediaTotal, social_cleared: mediaSocial, no_channel: mediaNone },
  };

  if (AS_JSON) {
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
    process.exit(problems.length ? 1 : 0);
  }

  const out = [];
  const H = (s) => out.push(AS_MD ? `\n## ${s}\n` : `\n${s}\n${'-'.repeat(s.length)}`);
  out.push(AS_MD ? `# Peninsula Insider — Content Factory Status` : `\nPENINSULA INSIDER — CONTENT FACTORY STATUS`);
  out.push(`${payload.generated_at.slice(0, 16).replace('T', ' ')} UTC · last ${DAYS} days`);
  out.push(problems.length ? `\n**${problems.length} problem(s)**` : `\nAll green.`);
  for (const p of problems) out.push(`  ! ${p}`);

  H('1. Job health');
  if (AS_MD) { out.push('| Job | Verdict | Last run | Runs | Failures |'); out.push('|---|---|---|---:|---:|'); }
  for (const j of jobHealth) {
    out.push(AS_MD
      ? `| \`${j.job}\` | ${j.verdict} | ${ago(j.last_run)} | ${j.runs} | ${j.failures} |`
      : `  ${j.verdict.padEnd(10)} ${j.job.padEnd(20)} last ${ago(j.last_run).padEnd(10)} ${j.runs} runs, ${j.failures} failures`);
  }
  if (unexpected.length) out.push(`  (also saw: ${unexpected.join(', ')})`);

  H('2. Campaigns');
  if (AS_MD) { out.push('| Campaign | Week | State | Risk | Thesis signed |'); out.push('|---|---|---|---|---|'); }
  for (const c of payload.campaigns.slice(0, 10)) {
    out.push(AS_MD
      ? `| \`${c.key}\` | ${c.week} | ${c.state} | ${c.risk} | ${c.signed ? 'yes' : 'NO'} |`
      : `  ${c.week}  ${c.state.padEnd(26)} ${c.risk.padEnd(6)} ${c.signed ? 'signed' : 'UNSIGNED'}  ${c.plan}`);
    if (c.blocked) out.push(`      blocked: ${c.blocked}`);
  }
  if (!payload.campaigns.length) out.push('  none');

  H('3. Approval queue');
  out.push(`  ${payload.approval_queue} L3 asset(s) waiting on a human`);

  H('4. Distribution');
  if (Object.keys(pubByState).length) {
    for (const [s, n] of Object.entries(pubByState)) out.push(`  ${String(n).padStart(4)}  ${s}`);
  } else out.push('  nothing queued');

  H('5. Cost and media');
  out.push(`  run-log spend (${DAYS}d):   $${payload.cost.run_log_usd.toFixed(4)}`);
  out.push(`  model calls  (${DAYS}d):   $${payload.cost.model_calls_usd.toFixed(4)}`);
  for (const b of payload.cost.budgets) {
    const spent = b.scope === 'monthly' ? payload.cost.model_calls_usd : null;
    const pct = spent !== null && b.cap_usd ? ` (${((spent / b.cap_usd) * 100).toFixed(0)}% used)` : '';
    out.push(`  budget ${String(b.scope).padEnd(10)} cap $${b.cap_usd}${pct}, alerts at ${(b.alert_pcts ?? []).join('/')}%`);
  }
  out.push(`  media: ${mediaTotal} assets, ${mediaSocial} cleared for social video, ${mediaNone} with no channel at all`);
  if (mediaTotal && mediaSocial / mediaTotal < 0.2) {
    out.push(`  NOTE: media readiness is the binding constraint. Derivatives fall back to typographic cards.`);
  }

  out.push('');
  console.log(out.join('\n'));
  process.exit(problems.length ? 1 : 0);
}

main().catch((err) => {
  console.error(`[factory-status] fatal: ${err.stack || err.message}`);
  process.exit(2);
});
