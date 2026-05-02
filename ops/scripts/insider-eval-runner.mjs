#!/usr/bin/env node
/**
 * Run the frozen Insider eval set against the live concierge API and
 * score each response for latency + quality signals. Used to verify that
 * latency optimizations don't regress quality (and vice versa).
 *
 * Usage:
 *   node ops/scripts/insider-eval-runner.mjs           # 30-query default set
 *   node ops/scripts/insider-eval-runner.mjs --label baseline
 *   node ops/scripts/insider-eval-runner.mjs --label after-perf-pass-1
 *   node ops/scripts/insider-eval-runner.mjs --concurrency=3
 *
 * Required env:
 *   CONCIERGE_API_URL    default: https://peninsula-insider-platform-api.vercel.app
 *
 * Output:
 *   reports/insider-eval/<label>-<date>.json    machine-readable per-query
 *   reports/insider-eval/<label>-<date>.md      human summary + diff vs baseline
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";

const API = process.env.CONCIERGE_API_URL || "https://peninsula-insider-platform-api.vercel.app";
const EVAL_FILE = resolve("ops/eval/insider-eval-set.json");
const REPORT_DIR = resolve("reports/insider-eval");

const LABEL = (() => {
  const arg = process.argv.find((a) => a.startsWith("--label="));
  if (arg) return arg.slice("--label=".length);
  const idx = process.argv.indexOf("--label");
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return "run";
})();
const CONCURRENCY = (() => {
  const arg = process.argv.find((a) => a.startsWith("--concurrency="));
  if (!arg) return 1;
  const n = Number(arg.slice("--concurrency=".length));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 5) : 1;
})();

const dateLabel = new Date().toISOString().slice(0, 10);

// ─── Helpers ──────────────────────────────────────────────────
const fmtMs = (ms) => (ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`);
const median = (arr) => {
  if (arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
};
const percentile = (arr, p) => {
  if (arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

// ─── Run one query against the live API ───────────────────────
async function runOne(query, sessionId) {
  const t0 = Date.now();
  const res = await fetch(`${API}/concierge/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-Id": sessionId,
    },
    body: JSON.stringify({ query }),
  });
  const elapsed = Date.now() - t0;

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      latency_ms: elapsed,
      error: await res.text().catch(() => "unknown"),
    };
  }
  const data = await res.json();
  return {
    ok: true,
    status: 200,
    latency_ms: elapsed,
    data,
  };
}

// ─── Score one query ──────────────────────────────────────────
function scoreOne(spec, result) {
  if (!result.ok) {
    return {
      id: spec.id,
      query: spec.query,
      ok: false,
      error: result.error,
      latency_ms: result.latency_ms,
      quality: { score: 0, reasons: ["api error"] },
    };
  }

  const d = result.data;
  const answer = (d.answer || "").toLowerCase();
  const recs = d.recommendations || [];
  const reasons = [];
  let score = 0;
  const max = 5;

  // 1. Answer non-empty (1 pt)
  if (answer.length > 50) score += 1;
  else reasons.push("answer too short");

  // 2. At least one expected topic mentioned in answer or recommendations (1 pt)
  const corpus = `${answer} ${recs.map((r) => `${r.title} ${r.slug} ${r.why}`).join(" ")}`.toLowerCase();
  const topicHits = (spec.expected_topics || []).filter((t) => corpus.includes(t.toLowerCase()));
  if (topicHits.length > 0) score += 1;
  else reasons.push(`no expected topic matched (looked for: ${(spec.expected_topics || []).slice(0, 3).join(", ")})`);

  // 3. At least one expected kind in recommendations (1 pt)
  const kinds = new Set(recs.map((r) => r.kind));
  const kindHits = (spec.expected_kinds || []).filter((k) => kinds.has(k));
  if (kindHits.length > 0) score += 1;
  else reasons.push(`no expected kind matched (got: ${[...kinds].join(", ") || "none"})`);

  // 4. No forbidden phrases (1 pt)
  const forbiddenHits = (spec.forbidden_phrases || []).filter((p) =>
    answer.includes(p.toLowerCase())
  );
  if (forbiddenHits.length === 0) score += 1;
  else reasons.push(`forbidden phrases: ${forbiddenHits.join(", ")}`);

  // 5. Recommendations are unique (post-dedupe sanity) (1 pt)
  const uniqueRecs = new Set(recs.map((r) => r.slug));
  if (recs.length === 0 || uniqueRecs.size === recs.length) score += 1;
  else reasons.push(`duplicate slug recommendations (${recs.length - uniqueRecs.size} dupes)`);

  return {
    id: spec.id,
    query: spec.query,
    ok: true,
    latency_ms: result.latency_ms,
    server_latency_ms: d._debug?.latency_ms ?? null,
    timings: d._debug?.timings ?? null,
    cost_aud: d._debug?.cost_approx_aud ?? null,
    recommendations_count: recs.length,
    recommendation_kinds: [...kinds],
    sources_count: (d.sources || []).length,
    topic_hits: topicHits,
    kind_hits: kindHits,
    forbidden_hits: forbiddenHits,
    quality: { score, max, reasons },
  };
}

// ─── Bounded concurrency runner ───────────────────────────────
async function runWithConcurrency(items, fn, n) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

// ─── Find the most recent baseline for diff ───────────────────
async function findBaseline(currentLabel) {
  try {
    const files = await readdir(REPORT_DIR);
    const candidates = files
      .filter((f) => f.endsWith(".json") && !f.startsWith(`${currentLabel}-`))
      .filter((f) => f.startsWith("baseline-") || f.startsWith("run-"))
      .sort();
    if (candidates.length === 0) return null;
    const latest = candidates[candidates.length - 1];
    const raw = await readFile(join(REPORT_DIR, latest), "utf8");
    return { name: latest, data: JSON.parse(raw) };
  } catch {
    return null;
  }
}

// ─── Render markdown summary ──────────────────────────────────
function renderMd(report, baseline) {
  const s = report.summary;
  const lines = [];
  lines.push(`# Insider eval — ${report.label} · ${report.date}`);
  lines.push("");
  lines.push(`API: ${report.api}`);
  lines.push("");
  lines.push("## Summary");
  lines.push(`- Queries: ${s.total} · errors: ${s.errors}`);
  lines.push(`- Median latency: **${fmtMs(s.median_latency_ms)}** · p95: ${fmtMs(s.p95_latency_ms)}`);
  if (s.median_server_latency_ms != null) {
    lines.push(`- Median server latency: ${fmtMs(s.median_server_latency_ms)}`);
  }
  lines.push(`- Median quality: **${s.median_quality_score}/${s.max_quality_score}** (mean ${s.mean_quality_score.toFixed(2)})`);
  lines.push(`- Quality distribution: ${Object.entries(s.quality_distribution).map(([k, v]) => `${k}:${v}`).join(", ")}`);
  lines.push(`- Total cost: $${s.total_cost_aud_estimate.toFixed(4)} AUD`);
  lines.push("");

  if (baseline) {
    const bs = baseline.data.summary;
    const dLat = s.median_latency_ms - bs.median_latency_ms;
    const dQual = s.mean_quality_score - bs.mean_quality_score;
    lines.push(`## Diff vs baseline (\`${baseline.name}\`)`);
    lines.push(`- Median latency: ${fmtMs(bs.median_latency_ms)} → ${fmtMs(s.median_latency_ms)} (${dLat >= 0 ? "+" : ""}${fmtMs(Math.abs(dLat))})`);
    lines.push(`- Mean quality: ${bs.mean_quality_score.toFixed(2)} → ${s.mean_quality_score.toFixed(2)} (${dQual >= 0 ? "+" : ""}${dQual.toFixed(2)})`);
    lines.push(`- Total cost: $${bs.total_cost_aud_estimate.toFixed(4)} → $${s.total_cost_aud_estimate.toFixed(4)} AUD`);
    lines.push("");
  }

  lines.push("## Per-query results");
  lines.push("| ID | Query | Latency | Quality | Recs | Issues |");
  lines.push("|---|---|---:|:---:|:---:|---|");
  for (const r of report.results) {
    const issues = r.quality.reasons.slice(0, 2).join("; ") || "—";
    lines.push(`| ${r.id} | ${r.query.slice(0, 60)} | ${fmtMs(r.latency_ms)} | ${r.quality.score}/${r.quality.max} | ${r.recommendations_count ?? "?"} | ${issues} |`);
  }
  lines.push("");

  // Aggregate timings if present
  const withTimings = report.results.filter((r) => r.timings);
  if (withTimings.length > 0) {
    lines.push("## Median per-step timings (ms)");
    const keys = new Set();
    withTimings.forEach((r) => Object.keys(r.timings).forEach((k) => keys.add(k)));
    for (const k of keys) {
      const vals = withTimings.map((r) => r.timings[k]).filter((n) => Number.isFinite(n));
      if (vals.length === 0) continue;
      lines.push(`- ${k}: ${fmtMs(median(vals))}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log(`\n🧪 Insider eval — label "${LABEL}" against ${API}`);
  console.log(`   Concurrency: ${CONCURRENCY}\n`);

  const evalSet = JSON.parse(await readFile(EVAL_FILE, "utf8"));
  const queries = evalSet.queries;
  console.log(`   ${queries.length} queries loaded`);

  const sessionPrefix = `eval-${LABEL}-${Date.now()}`;
  const results = await runWithConcurrency(
    queries,
    async (spec, idx) => {
      const sessionId = `${sessionPrefix}-${spec.id}`;
      process.stdout.write(`   [${idx + 1}/${queries.length}] ${spec.id}… `);
      const result = await runOne(spec.query, sessionId);
      const scored = scoreOne(spec, result);
      console.log(`${fmtMs(result.latency_ms)} · q=${scored.quality.score}/${scored.quality.max}`);
      return scored;
    },
    CONCURRENCY
  );

  const ok = results.filter((r) => r.ok);
  const latencies = ok.map((r) => r.latency_ms);
  const serverLats = ok.map((r) => r.server_latency_ms).filter((n) => Number.isFinite(n));
  const costs = ok.map((r) => r.cost_aud).filter((n) => Number.isFinite(n));
  const qualities = ok.map((r) => r.quality.score);
  const dist = {};
  for (const q of qualities) dist[q] = (dist[q] || 0) + 1;

  const report = {
    label: LABEL,
    date: dateLabel,
    timestamp: new Date().toISOString(),
    api: API,
    summary: {
      total: results.length,
      errors: results.length - ok.length,
      median_latency_ms: median(latencies),
      p95_latency_ms: percentile(latencies, 95),
      median_server_latency_ms: serverLats.length > 0 ? median(serverLats) : null,
      mean_quality_score: qualities.reduce((a, b) => a + b, 0) / Math.max(1, qualities.length),
      median_quality_score: median(qualities),
      max_quality_score: 5,
      quality_distribution: dist,
      total_cost_aud_estimate: costs.reduce((a, b) => a + b, 0),
    },
    results,
  };

  await mkdir(REPORT_DIR, { recursive: true });
  const baseName = `${LABEL}-${dateLabel}`;
  const jsonPath = join(REPORT_DIR, `${baseName}.json`);
  const mdPath = join(REPORT_DIR, `${baseName}.md`);
  await writeFile(jsonPath, JSON.stringify(report, null, 2));

  const baseline = await findBaseline(LABEL);
  const md = renderMd(report, baseline);
  await writeFile(mdPath, md);

  console.log(`\n   Report:`);
  console.log(`     ${jsonPath}`);
  console.log(`     ${mdPath}`);
  console.log(`\n   Median latency: ${fmtMs(report.summary.median_latency_ms)}`);
  console.log(`   Mean quality: ${report.summary.mean_quality_score.toFixed(2)}/5`);
  if (baseline) {
    const bs = baseline.data.summary;
    const dLat = report.summary.median_latency_ms - bs.median_latency_ms;
    console.log(`   vs baseline (${baseline.name}): latency ${dLat >= 0 ? "+" : ""}${fmtMs(Math.abs(dLat))}, quality ${(report.summary.mean_quality_score - bs.mean_quality_score).toFixed(2)}`);
  }
}

main().catch((err) => {
  console.error("\nFatal:", err);
  process.exit(1);
});
