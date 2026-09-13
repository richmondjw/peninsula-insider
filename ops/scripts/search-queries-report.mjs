#!/usr/bin/env node
/**
 * Daily search report for Peninsula Insider.
 *
 * Reads site_search_queries from Supabase and posts a digest to Telegram.
 *
 * REDACTED 2026-09-14 (action register A13). This report used to read the
 * reader's raw query string, cluster it by token similarity, and publish the
 * top clusters and zero-result examples verbatim into a Telegram channel.
 * The site no longer collects that text, and this script no longer asks for
 * it: it selects only the columns that survive.
 *
 * What went with it: intent clusters, the unique-query count, and the worked
 * examples under each zero-result gap. What partly replaces the last of those
 * is the zero-result breakdown BY PAGE, which still says where readers search
 * and come up empty without saying what they typed. Intent clustering has no
 * replacement, and that is the honest cost of the change.
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

// PI Supabase project — use PI_SUPABASE_URL / PI_SUPABASE_SERVICE_KEY if set,
// otherwise fall back to generic SUPABASE_URL / SUPABASE_SERVICE_KEY
const SUPABASE_URL = process.env.PI_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.PI_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;
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

function escTg(text) {
  // Escape Telegram MarkdownV2 special characters
  return String(text || "").replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

// ─── Fetch ────────────────────────────────────────────────────

async function fetchSearchQueries() {
  // `query` is deliberately absent. The column is retired (A13), and the
  // no-raw-query CHECK constraint means nothing new can appear in it.
  const select = [
    "id",
    "created_at",
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
  const res = await fetch(url, { headers: { ...sbHeaders, "Accept-Profile": "pi" } });
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
      zeroResultCount: 0,
      zeroResultRate: 0,
      zeroResultPaths: [],
      surfaceBreakdown: {},
      kindBreakdown: {},
    };
  }

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

  // Where readers searched and came up empty. The page is ours, not theirs:
  // it says which surface has a content gap without saying what was typed.
  const zeroByPath = {};
  for (const r of zeroRows) {
    const key = r.page_path || "(unknown)";
    zeroByPath[key] = (zeroByPath[key] || 0) + 1;
  }
  const zeroResultPaths = Object.entries(zeroByPath)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, count]) => ({ path, count }));

  return {
    total,
    zeroResultCount,
    zeroResultRate,
    zeroResultPaths,
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
    `${escTg(String(report.zeroResultCount))} with no results · ` +
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

  // Where the empty searches happened. Query text is not collected (A13), so
  // the page is what is left to point at - and it is enough to find the gap.
  if (report.zeroResultPaths.length > 0) {
    lines.push("*Zero\\-result searches by page*");
    for (const entry of report.zeroResultPaths) {
      lines.push(`  ⚠️ ${escTg(entry.path)} ×${escTg(String(entry.count))}`);
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

  lines.push(`_Counts only \u2014 query text is not collected \\(A13\\)_`);
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
    `[search-report] total=${report.total} ` +
    `zero=${report.zeroResultCount} (${report.zeroResultRate}%) ` +
    `zeroPaths=${report.zeroResultPaths.length}`
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
