#!/usr/bin/env node
/**
 * Daily search query report for Peninsula Insider.
 *
 * Reads site_search_queries from Supabase, computes intent clusters,
 * surfaces zero-result gaps, and posts a digest to Telegram.
 *
 * Modes:
 *   --dry       compute the report but do not post to Telegram
 *   --window=N  hours to look back (default 24)
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY
 *
 * Optional env:
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_CHAT_ID
 *   TELEGRAM_TOPIC_ID
 */

const DRY = process.argv.includes("--dry");
const WINDOW_HOURS = (() => {
  const arg = process.argv.find((a) => a.startsWith("--window="));
  if (!arg) return 24;
  const n = Number(arg.slice("--window=".length));
  return Number.isFinite(n) && n > 0 ? n : 24;
})();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_TOPIC_ID = process.env.TELEGRAM_TOPIC_ID;

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

// Cluster queries by lowercased token-jaccard similarity. Deterministic,
// no dependencies. Surfaces "long lunch" repeating across slight phrasings.
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

function escTg(text) {
  // Escape Telegram MarkdownV2 special characters
  return String(text || "").replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

// ─── Fetch ────────────────────────────────────────────────────

async function fetchSearchQueries() {
  const select = [
    "id",
    "created_at",
    "query",
    "result_count",
    "kind_filter",
    "surface",
    "page_path",
  ].join(",");
  const url =
    `${SUPABASE_URL}/rest/v1/site_search_queries` +
    `?select=${select}` +
    `&created_at=gte.${encodeURIComponent(sinceISO)}` +
    `&order=created_at.desc` +
    `&limit=5000`;
  const res = await fetch(url, { headers: sbHeaders });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase fetch failed: ${res.status} ${body}`);
  }
  return res.json();
}

// ─── Build report ─────────────────────────────────────────────

function buildReport(rows) {
  const total = rows.length;
  if (total === 0) {
    return {
      total: 0,
      uniqueQueries: 0,
      zeroResultCount: 0,
      zeroResultRate: 0,
      topClusters: [],
      zeroResultGaps: [],
      surfaceBreakdown: {},
      kindBreakdown: {},
    };
  }

  const uniqueQueries = new Set(rows.map((r) => r.query.toLowerCase().trim())).size;
  const zeroRows = rows.filter((r) => r.result_count === 0);
  const zeroResultCount = zeroRows.length;
  const zeroResultRate = total > 0 ? Math.round((zeroResultCount / total) * 100) : 0;

  // Surface breakdown
  const surfaceBreakdown = {};
  for (const r of rows) {
    surfaceBreakdown[r.surface] = (surfaceBreakdown[r.surface] || 0) + 1;
  }

  // Kind/filter chip breakdown (excluding nulls = "all")
  const kindBreakdown = {};
  for (const r of rows) {
    if (r.kind_filter) {
      kindBreakdown[r.kind_filter] = (kindBreakdown[r.kind_filter] || 0) + 1;
    }
  }

  // Cluster all queries for intent summary
  const allQueryTexts = rows.map((r) => r.query.trim()).filter(Boolean);
  const topClusters = clusterQueries(allQueryTexts).slice(0, 10);

  // Zero-result gaps: cluster the zero-result queries to surface intent gaps
  const zeroQueryTexts = zeroRows.map((r) => r.query.trim()).filter(Boolean);
  const zeroResultGaps = zeroQueryTexts.length > 0
    ? clusterQueries(zeroQueryTexts).slice(0, 5)
    : [];

  return {
    total,
    uniqueQueries,
    zeroResultCount,
    zeroResultRate,
    topClusters,
    zeroResultGaps,
    surfaceBreakdown,
    kindBreakdown,
  };
}

// ─── Render Telegram digest ───────────────────────────────────

function renderTelegramDigest(report) {
  const windowLabel = WINDOW_HOURS === 24 ? "last 24 h" : `last ${WINDOW_HOURS} h`;
  const lines = [];

  lines.push(`🔍 *Peninsula Insider — Search Queries* \\(${escTg(dayLabel)}\\)`);
  lines.push("");

  if (report.total === 0) {
    lines.push(`No search queries recorded in the ${escTg(windowLabel)}\\.`);
    lines.push("This probably means the tracking pixel just landed — check again tomorrow\\.");
    return lines.join("\n");
  }

  lines.push(
    `${escTg(String(report.total))} searches · ` +
    `${escTg(String(report.uniqueQueries))} unique queries · ` +
    `${escTg(String(report.zeroResultRate))}% zero\\-result`
  );
  lines.push("");

  // Surface breakdown
  const overlayCount = report.surfaceBreakdown["overlay"] || 0;
  const pageCount = report.surfaceBreakdown["search_page"] || 0;
  if (overlayCount + pageCount > 0) {
    lines.push(`_Overlay: ${escTg(String(overlayCount))} · Full page: ${escTg(String(pageCount))}_`);
    lines.push("");
  }

  // Top intent clusters
  if (report.topClusters.length > 0) {
    lines.push("*Top search intents*");
    for (const cluster of report.topClusters) {
      const examples = cluster.examples.map((e) => `"${escTg(e)}"`).join(", ");
      lines.push(
        `  ♦ *${escTg(cluster.label)}* ×${escTg(String(cluster.count))} — ${examples}`
      );
    }
    lines.push("");
  }

  // Zero-result gaps
  if (report.zeroResultGaps.length > 0) {
    lines.push("*Zero\\-result gaps* \\(content opportunities\\)");
    for (const gap of report.zeroResultGaps) {
      const examples = gap.examples.map((e) => `"${escTg(e)}"`).join(", ");
      lines.push(`  ⚠️ *${escTg(gap.label)}* ×${escTg(String(gap.count))} — ${examples}`);
    }
    lines.push("");
  }

  // Kind filter usage
  const kinds = Object.entries(report.kindBreakdown).sort((a, b) => b[1] - a[1]);
  if (kinds.length > 0) {
    lines.push(
      "*Filter chips used:* " +
      kinds.map(([k, v]) => `${escTg(k)} ×${escTg(String(v))}`).join(", ")
    );
    lines.push("");
  }

  lines.push(`_Full data: Supabase pi\\.site\\_search\\_queries_`);
  return lines.join("\n");
}

// ─── Telegram ─────────────────────────────────────────────────

async function postTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log("[telegram] not configured — skipping post");
    return;
  }
  const body = {
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: "MarkdownV2",
    disable_web_page_preview: true,
  };
  if (TELEGRAM_TOPIC_ID) body.message_thread_id = Number(TELEGRAM_TOPIC_ID);
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) {
    console.error("[telegram] send failed:", JSON.stringify(json));
  } else {
    console.log("[telegram] posted ok, message_id:", json.result.message_id);
  }
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  console.log(`[search-report] window=${WINDOW_HOURS}h since=${sinceISO} dry=${DRY}`);

  const rows = await fetchSearchQueries();
  console.log(`[search-report] fetched ${rows.length} rows`);

  const report = buildReport(rows);
  console.log(
    `[search-report] total=${report.total} unique=${report.uniqueQueries} ` +
    `zero=${report.zeroResultCount} (${report.zeroResultRate}%) ` +
    `clusters=${report.topClusters.length}`
  );

  const digest = renderTelegramDigest(report);
  console.log("\n--- Telegram digest ---\n" + digest + "\n---\n");

  if (!DRY) {
    await postTelegram(digest);
  } else {
    console.log("[search-report] dry run — Telegram post skipped");
  }
}

main().catch((err) => {
  console.error("[search-report] fatal:", err);
  process.exit(1);
});
