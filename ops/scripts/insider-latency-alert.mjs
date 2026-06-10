#!/usr/bin/env node
/**
 * Hourly latency guard for The Insider concierge.
 *
 * Reads concierge_queries for the lookback window and posts a Telegram alert
 * immediately when latency breaches thresholds, instead of waiting for the
 * next morning's daily report. Motivated by the 2026-06-02 regression (model
 * drift to a reasoning model; 34–46s queries) that sat unnoticed for a week.
 * See docs/insider-tech-stack-review-2026-06-10.md (P0.6).
 *
 * Alert conditions (any):
 *   - any query latency_ms  > LATENCY_HARD_MS   (default 15000)
 *   - median  latency_ms    > LATENCY_MEDIAN_MS (default 10000) over >= 2 queries
 *   - median  ttft_ms       > TTFT_MEDIAN_MS    (default 3000)  over >= 2 queries with ttft
 *
 * Exits 0 whether or not an alert fires; exits 1 only on operational errors.
 *
 * Modes:
 *   --dry       compute and print, do not post to Telegram
 *   --window=N  minutes to look back (default 70, to overlap hourly runs)
 *
 * Required env:  SUPABASE_URL, SUPABASE_SERVICE_KEY
 * Optional env:  TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_TOPIC_ID,
 *                LATENCY_HARD_MS, LATENCY_MEDIAN_MS, TTFT_MEDIAN_MS
 */

const DRY = process.argv.includes("--dry");
const WINDOW_MIN = (() => {
  const arg = process.argv.find((a) => a.startsWith("--window="));
  if (!arg) return 70;
  const n = Number(arg.slice("--window=".length));
  return Number.isFinite(n) && n > 0 ? n : 70;
})();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_TOPIC_ID = process.env.TELEGRAM_TOPIC_ID;

const LATENCY_HARD_MS = Number(process.env.LATENCY_HARD_MS ?? 15000);
const LATENCY_MEDIAN_MS = Number(process.env.LATENCY_MEDIAN_MS ?? 10000);
const TTFT_MEDIAN_MS = Number(process.env.TTFT_MEDIAN_MS ?? 3000);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing required env: SUPABASE_URL / SUPABASE_SERVICE_KEY");
  process.exit(1);
}

function median(arr) {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

const sinceISO = new Date(Date.now() - WINDOW_MIN * 60 * 1000).toISOString();
const select = "timestamp,query_text,model_used,latency_ms,ttft_ms,session_id";
const url =
  `${SUPABASE_URL}/rest/v1/concierge_queries?select=${select}` +
  `&timestamp=gte.${encodeURIComponent(sinceISO)}&order=timestamp.desc&limit=500`;

const res = await fetch(url, {
  headers: {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  },
});
if (!res.ok) {
  console.error(`Supabase query failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}
const rows = await res.json();

if (rows.length === 0) {
  console.log(`No concierge queries in the last ${WINDOW_MIN} minutes — nothing to check.`);
  process.exit(0);
}

const latencies = rows.map((r) => r.latency_ms).filter((v) => Number.isFinite(v));
const ttfts = rows.map((r) => r.ttft_ms).filter((v) => Number.isFinite(v));
const medLatency = median(latencies);
const medTtft = median(ttfts);
const worst = rows
  .filter((r) => Number.isFinite(r.latency_ms))
  .sort((a, b) => b.latency_ms - a.latency_ms)[0];

const breaches = [];
if (worst && worst.latency_ms > LATENCY_HARD_MS) {
  breaches.push(
    `slowest query ${(worst.latency_ms / 1000).toFixed(1)}s (limit ${LATENCY_HARD_MS / 1000}s)` +
      ` — "${(worst.query_text || "").slice(0, 60)}" on ${worst.model_used}`
  );
}
if (latencies.length >= 2 && medLatency > LATENCY_MEDIAN_MS) {
  breaches.push(
    `median latency ${(medLatency / 1000).toFixed(1)}s over ${latencies.length} queries` +
      ` (limit ${LATENCY_MEDIAN_MS / 1000}s)`
  );
}
if (ttfts.length >= 2 && medTtft > TTFT_MEDIAN_MS) {
  breaches.push(
    `median time-to-first-token ${(medTtft / 1000).toFixed(1)}s over ${ttfts.length} queries` +
      ` (limit ${TTFT_MEDIAN_MS / 1000}s)`
  );
}

console.log(
  `${rows.length} queries in last ${WINDOW_MIN}m · median latency ` +
    `${medLatency != null ? (medLatency / 1000).toFixed(1) + "s" : "n/a"} · median ttft ` +
    `${medTtft != null ? (medTtft / 1000).toFixed(1) + "s" : "n/a"}`
);

if (breaches.length === 0) {
  console.log("Latency within thresholds.");
  process.exit(0);
}

const models = [...new Set(rows.map((r) => r.model_used).filter(Boolean))];
const message =
  `⚠️ <b>Insider latency alert</b>\n` +
  breaches.map((b) => `• ${b}`).join("\n") +
  `\nModel(s) in window: ${models.join(", ") || "unknown"}` +
  `\nWindow: last ${WINDOW_MIN} minutes (${rows.length} queries)`;

console.log("\nALERT:\n" + message.replace(/<\/?b>/g, ""));

if (DRY) {
  console.log("\n--dry: not posting to Telegram.");
  process.exit(0);
}
if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.log("Telegram not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID) — alert printed only.");
  process.exit(0);
}

const body = {
  chat_id: TELEGRAM_CHAT_ID,
  text: message,
  parse_mode: "HTML",
  disable_web_page_preview: true,
};
if (TELEGRAM_TOPIC_ID) body.message_thread_id = Number(TELEGRAM_TOPIC_ID);

const tg = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
if (!tg.ok) {
  console.error(`Telegram post failed: ${tg.status} ${await tg.text()}`);
  process.exit(1);
}
console.log("Alert posted to Telegram.");
