#!/usr/bin/env node
/**
 * Daily usage report for The Insider concierge.
 *
 * Reads concierge_queries from Supabase, computes usage / latency / cost /
 * top-query analytics for the previous 24h, writes a JSON + Markdown report,
 * and posts a digest to Telegram.
 *
 * Modes:
 *   --dry       compute the report but do not write files or post to Telegram
 *   --window=N  hours to look back (default 24)
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY
 *
 * Optional env:
 *   TELEGRAM_BOT_TOKEN   if set with TELEGRAM_CHAT_ID, posts a digest
 *   TELEGRAM_CHAT_ID     target chat / group id
 *   TELEGRAM_TOPIC_ID    optional forum topic id
 *   REPORT_DIR           default reports/insider-usage
 *   COST_PER_QUERY_AUD   fallback when cost_approx_aud is not populated (default 0.012)
 */
import { writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";

const DRY = process.argv.includes("--dry");
const WINDOW_HOURS = (() => {
  const arg = process.argv.find((a) => a.startsWith("--window="));
  if (!arg) return 24;
  const n = Number(arg.slice("--window=".length));
  return Number.isFinite(n) && n > 0 ? n : 24;
})();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const REPORT_DIR = process.env.REPORT_DIR || resolve("reports/insider-usage");
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_TOPIC_ID = process.env.TELEGRAM_TOPIC_ID;
const COST_PER_QUERY_AUD = Number(process.env.COST_PER_QUERY_AUD ?? 0.012);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing required env: SUPABASE_URL / SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const sbHeaders = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

const now = new Date();
const since = new Date(now.getTime() - WINDOW_HOURS * 3600 * 1000);
const sinceISO = since.toISOString();
const dayLabel = now.toISOString().slice(0, 10);

// ─── Helpers ──────────────────────────────────────────────────
function median(arr) {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
function percentile(arr, p) {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}
function isLikelyTestSession(sessionId) {
  if (!sessionId) return false;
  return /^(transcript-test|test|debug|smoke|qa)/i.test(sessionId);
}

// Cluster queries by lowercased token-jaccard similarity. Cheap, deterministic,
// good enough to surface "long lunch" appearing 4 times across slightly varied
// phrasings without the dependency tax of sentence embeddings.
function clusterQueries(queries) {
  const STOP = new Set([
    "a","an","the","and","or","of","in","on","at","to","for","with","near",
    "is","are","do","does","this","that","what","where","when","how","why",
    "we","i","my","our","me","you","your","s","its",
  ]);
  const tokenize = (q) =>
    new Set(
      q.toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP.has(w))
    );

  const items = queries.map((q) => ({ q, tokens: tokenize(q) }));
  const clusters = [];
  for (const item of items) {
    let bestCluster = null;
    let bestOverlap = 0;
    for (const cluster of clusters) {
      const intersection = [...item.tokens].filter((t) => cluster.tokens.has(t)).length;
      const union = new Set([...item.tokens, ...cluster.tokens]).size;
      const jaccard = union ? intersection / union : 0;
      if (jaccard >= 0.4 && jaccard > bestOverlap) {
        bestOverlap = jaccard;
        bestCluster = cluster;
      }
    }
    if (bestCluster) {
      bestCluster.queries.push(item.q);
      for (const t of item.tokens) bestCluster.tokens.add(t);
    } else {
      clusters.push({ tokens: new Set(item.tokens), queries: [item.q] });
    }
  }
  return clusters
    .map((c) => ({
      label: pickClusterLabel(c.queries, c.tokens),
      count: c.queries.length,
      examples: c.queries.slice(0, 3),
    }))
    .sort((a, b) => b.count - a.count);
}

function pickClusterLabel(queries, tokens) {
  // Pick the 2-3 most distinctive tokens as the cluster label, weighted by
  // how often they appear across this cluster's queries.
  const freq = new Map();
  for (const q of queries) {
    const words = q.toLowerCase().match(/[a-z0-9]+/g) || [];
    for (const w of words) {
      if (w.length > 3 && tokens.has(w)) {
        freq.set(w, (freq.get(w) || 0) + 1);
      }
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w]) => w)
    .join(" / ") || queries[0].slice(0, 40);
}

function fmtMs(ms) {
  if (ms == null) return "—";
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}

// ─── Fetch ────────────────────────────────────────────────────
async function fetchQueries() {
  const select = [
    "query_id",
    "session_id",
    "query_text",
    "current_page",
    "model_used",
    "latency_ms",
    "ttft_ms",
    "token_input_approx",
    "token_output_approx",
    "cost_approx_aud",
    "gap_detected",
    "gap_reason",
    "refusal_reason",
    "retrieved_chunk_ids",
    "reranked_chunk_ids",
    "answer",
    "timestamp",
  ].join(",");
  const url = `${SUPABASE_URL}/rest/v1/concierge_queries?select=${select}&timestamp=gte.${encodeURIComponent(sinceISO)}&order=timestamp.desc&limit=2000`;
  const res = await fetch(url, { headers: sbHeaders });
  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function fetch7DayRollingAverage() {
  // Average daily query volume across the previous 7 days (excluding the current window).
  const sevenDayStart = new Date(now.getTime() - (7 + WINDOW_HOURS / 24) * 86400 * 1000);
  const sevenDayEnd = new Date(now.getTime() - WINDOW_HOURS * 3600 * 1000);
  const url = `${SUPABASE_URL}/rest/v1/concierge_queries?select=timestamp&timestamp=gte.${encodeURIComponent(sevenDayStart.toISOString())}&timestamp=lt.${encodeURIComponent(sevenDayEnd.toISOString())}&limit=2000`;
  const res = await fetch(url, { headers: sbHeaders });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows.length / 7;
}

// ─── Telegram ─────────────────────────────────────────────────
async function postTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return { skipped: true };
  const body = {
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  };
  if (TELEGRAM_TOPIC_ID) body.message_thread_id = Number(TELEGRAM_TOPIC_ID);

  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    return { ok: false, status: res.status, error: json.description || `HTTP ${res.status}` };
  }
  return { ok: true, message_id: json.result?.message_id };
}

// ─── Build report ─────────────────────────────────────────────
function buildReport(queries, rolling7d) {
  const realQueries = queries.filter((q) => !isLikelyTestSession(q.session_id));
  const testQueries = queries.length - realQueries.length;

  const latencies = realQueries.map((q) => q.latency_ms).filter((n) => Number.isFinite(n));
  const ttfts = realQueries.map((q) => q.ttft_ms).filter((n) => Number.isFinite(n));
  const costs = realQueries.map((q) => q.cost_approx_aud).filter((n) => Number.isFinite(n));
  const totalCostAUD = costs.length === realQueries.length
    ? costs.reduce((a, b) => a + b, 0)
    : realQueries.length * COST_PER_QUERY_AUD; // fallback while telemetry isn't populated

  const sessions = new Set(realQueries.map((q) => q.session_id));
  const queriesPerSession = realQueries.length / Math.max(1, sessions.size);

  const gaps = realQueries.filter((q) => q.gap_detected === true);
  const refusals = realQueries.filter((q) => q.refusal_reason);
  const slowQueries = realQueries.filter((q) => Number(q.latency_ms) > 15000);

  const queryTexts = realQueries.map((q) => q.query_text).filter(Boolean);
  const clusters = clusterQueries(queryTexts).slice(0, 6);

  const modelUse = new Map();
  realQueries.forEach((q) => modelUse.set(q.model_used || "unknown", (modelUse.get(q.model_used || "unknown") || 0) + 1));

  // Page sources where queries originated
  const pageOrigin = new Map();
  realQueries.forEach((q) => {
    const p = q.current_page || "(unknown)";
    pageOrigin.set(p, (pageOrigin.get(p) || 0) + 1);
  });

  const samples = realQueries
    .slice(0, 10)
    .map((q) => ({
      timestamp: q.timestamp,
      query: q.query_text,
      latency_ms: q.latency_ms,
      gap: q.gap_detected || false,
    }));

  const volumeDelta =
    rolling7d != null ? realQueries.length - rolling7d : null;

  return {
    window_hours: WINDOW_HOURS,
    window_since: sinceISO,
    window_until: now.toISOString(),
    generated_at: now.toISOString(),
    summary: {
      total_queries: realQueries.length,
      test_queries_excluded: testQueries,
      distinct_sessions: sessions.size,
      queries_per_session: Number(queriesPerSession.toFixed(2)),
      median_latency_ms: median(latencies),
      p95_latency_ms: percentile(latencies, 95),
      median_ttft_ms: ttfts.length ? median(ttfts) : null,
      slow_queries_over_15s: slowQueries.length,
      gaps_detected: gaps.length,
      refusals: refusals.length,
      total_cost_aud_estimate: Number(totalCostAUD.toFixed(4)),
      cost_source: costs.length === realQueries.length ? "telemetry" : "fallback_estimate",
      rolling_7d_avg_queries: rolling7d != null ? Number(rolling7d.toFixed(1)) : null,
      volume_delta_vs_7d_avg: volumeDelta != null ? Number(volumeDelta.toFixed(1)) : null,
    },
    clusters,
    model_usage: Object.fromEntries(modelUse),
    page_origin: Object.fromEntries([...pageOrigin.entries()].sort((a, b) => b[1] - a[1])),
    gaps: gaps.map((q) => ({
      query: q.query_text,
      reason: q.gap_reason,
      timestamp: q.timestamp,
    })),
    refusals: refusals.map((q) => ({
      query: q.query_text,
      reason: q.refusal_reason,
      timestamp: q.timestamp,
    })),
    slow_queries: slowQueries.slice(0, 10).map((q) => ({
      query: q.query_text,
      latency_ms: q.latency_ms,
      timestamp: q.timestamp,
    })),
    samples,
  };
}

function renderMarkdown(r) {
  const s = r.summary;
  const arrow = (n) => (n == null ? "" : n > 0 ? `+${n}` : `${n}`);
  const lines = [];
  lines.push(`# Insider — usage report, ${dayLabel}`);
  lines.push("");
  lines.push(`Window: ${r.window_since} → ${r.window_until} (${r.window_hours}h)`);
  lines.push("");
  lines.push("## Summary");
  lines.push(`- Reader queries: **${s.total_queries}**${s.rolling_7d_avg_queries != null ? ` (vs 7-day avg ${s.rolling_7d_avg_queries}, ${arrow(s.volume_delta_vs_7d_avg)})` : ""}`);
  lines.push(`- Distinct sessions: **${s.distinct_sessions}** (${s.queries_per_session} queries/session)`);
  lines.push(`- Median latency: **${fmtMs(s.median_latency_ms)}** · p95: ${fmtMs(s.p95_latency_ms)}${s.median_ttft_ms != null ? ` · median TTFT: ${fmtMs(s.median_ttft_ms)}` : ""}`);
  lines.push(`- Slow queries (>15s): ${s.slow_queries_over_15s}`);
  lines.push(`- Gaps detected: ${s.gaps_detected} · Refusals: ${s.refusals}`);
  lines.push(`- Estimated cost: $${s.total_cost_aud_estimate} AUD ${s.cost_source === "fallback_estimate" ? "(fallback estimate; telemetry not yet populated)" : ""}`);
  lines.push(`- Test queries excluded from totals: ${r.summary.test_queries_excluded}`);
  lines.push("");
  if (r.clusters.length > 0) {
    lines.push("## Top reader intents");
    for (const c of r.clusters) {
      lines.push(`- **${c.label}** (${c.count}× ): ${c.examples.map((q) => `"${q}"`).join(" · ")}`);
    }
    lines.push("");
  }
  if (Object.keys(r.model_usage).length > 0) {
    lines.push("## Models");
    for (const [m, n] of Object.entries(r.model_usage)) lines.push(`- ${m}: ${n}`);
    lines.push("");
  }
  if (Object.keys(r.page_origin).length > 0) {
    lines.push("## Page origin");
    for (const [p, n] of Object.entries(r.page_origin)) lines.push(`- ${p}: ${n}`);
    lines.push("");
  }
  if (r.gaps.length > 0) {
    lines.push("## Gaps detected (content opportunities)");
    for (const g of r.gaps) lines.push(`- "${g.query}"${g.reason ? ` — ${g.reason}` : ""}`);
    lines.push("");
  }
  if (r.refusals.length > 0) {
    lines.push("## Refusals");
    for (const f of r.refusals) lines.push(`- "${f.query}" — ${f.reason}`);
    lines.push("");
  }
  if (r.slow_queries.length > 0) {
    lines.push("## Slow queries");
    for (const s of r.slow_queries) lines.push(`- ${fmtMs(s.latency_ms)} · "${s.query}"`);
    lines.push("");
  }
  if (r.samples.length > 0) {
    lines.push("## Sample queries (most recent)");
    for (const s of r.samples) lines.push(`- [${s.timestamp.slice(11, 16)}] ${fmtMs(s.latency_ms)} ${s.gap ? "⚠ " : ""}— "${s.query}"`);
    lines.push("");
  }
  return lines.join("\n");
}

function renderTelegramDigest(r) {
  const s = r.summary;
  const lines = [];
  lines.push(`*Insider usage — ${dayLabel}*`);
  lines.push("");
  lines.push(`Queries: *${s.total_queries}* · Sessions: ${s.distinct_sessions}`);
  if (s.rolling_7d_avg_queries != null) {
    const delta = s.volume_delta_vs_7d_avg;
    const sign = delta != null && delta > 0 ? "▲" : delta != null && delta < 0 ? "▼" : "·";
    lines.push(`vs 7d avg: ${s.rolling_7d_avg_queries} ${sign} ${delta != null ? Math.abs(delta).toFixed(1) : ""}`);
  }
  lines.push(`Median latency: ${fmtMs(s.median_latency_ms)} · p95: ${fmtMs(s.p95_latency_ms)}`);
  lines.push(`Cost (est): $${s.total_cost_aud_estimate} AUD`);
  if (s.gaps_detected > 0) lines.push(`⚠ Gaps detected: ${s.gaps_detected}`);
  if (s.refusals > 0) lines.push(`⚠ Refusals: ${s.refusals}`);
  if (s.slow_queries_over_15s > 0) lines.push(`⚠ Slow >15s: ${s.slow_queries_over_15s}`);
  if (r.clusters.length > 0) {
    lines.push("");
    lines.push("*Top intents*");
    for (const c of r.clusters.slice(0, 4)) lines.push(`• ${c.label} (${c.count}×)`);
  }
  if (r.gaps.length > 0) {
    lines.push("");
    lines.push("*Gap queries (content opportunities)*");
    for (const g of r.gaps.slice(0, 3)) lines.push(`• ${g.query}`);
  }
  return lines.join("\n");
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log(`\n📊 Insider usage report — ${dayLabel}`);
  console.log(`   Window: last ${WINDOW_HOURS}h (since ${sinceISO})`);
  console.log(`   Mode:   ${DRY ? "DRY RUN" : "live"}\n`);

  const [queries, rolling7d] = await Promise.all([fetchQueries(), fetch7DayRollingAverage()]);
  console.log(`   Fetched ${queries.length} query rows`);

  const report = buildReport(queries, rolling7d);
  console.log(`   Real queries: ${report.summary.total_queries} · Sessions: ${report.summary.distinct_sessions}`);
  console.log(`   Median latency: ${fmtMs(report.summary.median_latency_ms)}`);

  const md = renderMarkdown(report);
  const digest = renderTelegramDigest(report);

  if (DRY) {
    console.log("\n--- markdown preview ---\n");
    console.log(md);
    console.log("\n--- telegram digest preview ---\n");
    console.log(digest);
    return;
  }

  await mkdir(REPORT_DIR, { recursive: true });
  const jsonPath = join(REPORT_DIR, `${dayLabel}.json`);
  const mdPath = join(REPORT_DIR, `${dayLabel}.md`);
  await writeFile(jsonPath, JSON.stringify(report, null, 2));
  await writeFile(mdPath, md);
  console.log(`\n   Report written:\n     ${jsonPath}\n     ${mdPath}`);

  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    const tg = await postTelegram(digest);
    if (tg.ok) console.log(`   Posted to Telegram (msg ${tg.message_id})`);
    else if (tg.skipped) console.log(`   Telegram skipped (no chat id configured)`);
    else console.error(`   Telegram delivery failed: ${tg.error}`);
  } else {
    console.log("   Telegram delivery skipped (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set)");
  }
}

main().catch((err) => {
  console.error("\nFatal:", err);
  process.exit(1);
});
