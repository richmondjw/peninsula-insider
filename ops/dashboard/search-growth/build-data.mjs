#!/usr/bin/env node
// Offline adapter for the private PI Search Growth view. No credentials or API calls.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const MAX_AGE_DAYS = { gsc: 5, ads: 2, ga4: 3, engine: 8, gates: 30 };

function argsOf(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i]?.startsWith("--") || !argv[i + 1])
      throw new Error(`Expected --name path near ${argv[i] || "end"}`);
    out[argv[i].slice(2)] = argv[i + 1];
  }
  return out;
}

async function latestGscPath() {
  const dir = path.join(root, "ops/data/seo");
  const names = (await fs.readdir(dir).catch(() => []))
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .sort();
  return names.length ? path.join(dir, names.at(-1)) : null;
}

async function readReceipt(filename) {
  if (!filename) return { kind: "missing" };
  try {
    return {
      kind: "loaded",
      value: JSON.parse(await fs.readFile(filename, "utf8")),
      path: filename,
    };
  } catch (error) {
    return {
      kind: "failed",
      reason:
        error.code === "ENOENT" ? "Receipt file missing" : "Receipt unreadable",
    };
  }
}

function source(name, receipt, now) {
  if (receipt.kind === "missing")
    return {
      state: "UNAVAILABLE",
      reason: `${name.toUpperCase()} receipt not supplied; ${name === "ads" ? "pilot account state unverified" : "no result inferred"}`,
    };
  if (receipt.kind === "failed")
    return { state: "FAILED", reason: receipt.reason };
  const value = receipt.value;
  if (value.status === "failed")
    return {
      state: "FAILED",
      reason: String(value.reason || "Source pull failed").slice(0, 160),
    };
  const extractedAt = value.extractedAt || value.runTimestamp;
  const age = (now - new Date(extractedAt).getTime()) / 86400000;
  if (!extractedAt || !Number.isFinite(age) || age < -1)
    return { state: "FAILED", reason: "Missing or invalid extraction time" };
  const provenance =
    value.provenance === "historical-baseline" ? "CACHED" : null;
  const state =
    age > MAX_AGE_DAYS[name]
      ? "STALE"
      : provenance || (value.finality === "final" ? "FINAL" : "OBSERVED");
  return {
    state,
    extractedAt,
    period: value.period || value.ranges?.last28d || null,
    finality: value.finality || "unverified",
    scope: value.scope || (name === "gsc" ? "property" : null),
    reason:
      state === "STALE"
        ? `Last receipt ${Math.floor(age)} days old`
        : provenance
          ? "Historical baseline only"
          : null,
  };
}

function nonnegative(value) {
  return Number.isFinite(value) && value >= 0 ? value : null;
}
function ratio(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}
function gscData(receipt) {
  if (receipt.kind !== "loaded" || receipt.value.status === "failed")
    return null;
  const r = receipt.value;
  const h = r.headline?.last28d || r.headline;
  if (
    !h ||
    nonnegative(h.clicks) === null ||
    nonnegative(h.impressions) === null
  )
    return null;
  return {
    property: r.property || null,
    clicks: h.clicks,
    impressions: h.impressions,
    ctr: ratio(h.ctr),
    position: nonnegative(h.position),
    // Search Console query/page rows are privacy-filtered. Never reconstruct totals from them.
    au:
      r.auHeadline && nonnegative(r.auHeadline.clicks) !== null
        ? {
            clicks: r.auHeadline.clicks,
            impressions: nonnegative(r.auHeadline.impressions),
            ctr: ratio(r.auHeadline.ctr),
            position: nonnegative(r.auHeadline.position),
          }
        : null,
  };
}

function adsData(receipt) {
  if (receipt.kind !== "loaded" || receipt.value.status === "failed")
    return null;
  const r = receipt.value;
  if (
    r.currency !== "AUD" ||
    nonnegative(r.billedCostAud) === null ||
    nonnegative(r.clicks) === null
  )
    return null;
  const reviewed = nonnegative(r.reviewedClicks);
  const relevant = nonnegative(r.relevantReviewedClicks);
  return {
    campaign: typeof r.campaign === "string" ? r.campaign.slice(0, 120) : null,
    billedCostAud: r.billedCostAud,
    ceilingAud: 300,
    clicks: r.clicks,
    reviewedClicks: reviewed,
    relevantReviewedClicks:
      relevant !== null && reviewed !== null && relevant <= reviewed
        ? relevant
        : null,
    relevantShare:
      relevant !== null && reviewed > 0 && relevant <= reviewed
        ? relevant / reviewed
        : null,
    checkpoint:
      r.billedCostAud >= 300
        ? "STOP_AND_REVIEW"
        : r.billedCostAud >= 150
          ? "RELEVANCE_REVIEW"
          : r.billedCostAud >= 75
            ? "TRACKING_REVIEW"
            : "MONITOR",
    overspend: r.billedCostAud > 300,
  };
}

function ga4Data(receipt) {
  if (receipt.kind !== "loaded" || receipt.value.status === "failed")
    return null;
  const r = receipt.value;
  const events = r.events || {};
  if (
    !["newsletter_signup_succeeded", "save_add", "trip_add"].some(
      (name) => nonnegative(events[name]) !== null,
    )
  )
    return null;
  return {
    newsletterSignupSucceeded: nonnegative(events.newsletter_signup_succeeded),
    saveAdd: nonnegative(events.save_add),
    tripAdd: nonnegative(events.trip_add),
    bookingOutboundClicked: nonnegative(events.booking_outbound_clicked),
    note: "Consent-gated events. An outbound booking click is not a reservation.",
  };
}

function engineData(receipt) {
  if (receipt.kind !== "loaded" || receipt.value.status === "failed")
    return null;
  const r = receipt.value;
  if (typeof r.accepted !== "boolean" || !r.runId) return null;
  return {
    accepted: r.accepted === true ? true : r.accepted === false ? false : null,
    releaseSha: /^[a-f0-9]{7,40}$/i.test(r.releaseSha || "")
      ? r.releaseSha
      : null,
    runId: typeof r.runId === "string" ? r.runId.slice(0, 100) : null,
    note: typeof r.note === "string" ? r.note.slice(0, 160) : null,
  };
}

function gatesData(receipt, now) {
  if (receipt.kind !== "loaded" || receipt.value.status === "failed")
    return null;
  const r = receipt.value;
  const names = [
    "spend",
    "editorial",
    "engineering",
    "analytics",
    "accountPreview",
  ];
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const present = names.filter(
    (name) =>
      r.approvals?.[name]?.approved === true &&
      r.approvals[name].reviewedAt &&
      r.approvals[name].reviewer,
  ).length;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(r.validFrom || "") ||
    !/^\d{4}-\d{2}-\d{2}$/.test(r.validThrough || "") ||
    r.ceilingAud !== 300
  )
    return null;
  return {
    present,
    total: names.length,
    validFrom: r.validFrom,
    validThrough: r.validThrough,
    ceilingAud: r.ceilingAud,
    receipted:
      present === names.length &&
      today >= r.validFrom &&
      today <= r.validThrough &&
      r.approvals.spend.reviewer === "James",
  };
}

export function buildView(receipts, definitions, now = new Date()) {
  const names = ["gsc", "ads", "ga4", "engine", "gates"];
  const sources = Object.fromEntries(
    names.map((name) => [
      name,
      source(name, receipts[name] || { kind: "missing" }, now),
    ]),
  );
  const data = {
    gsc: gscData(receipts.gsc || { kind: "missing" }),
    ads: adsData(receipts.ads || { kind: "missing" }),
    ga4: ga4Data(receipts.ga4 || { kind: "missing" }),
    engine: engineData(receipts.engine || { kind: "missing" }),
    gates: gatesData(receipts.gates || { kind: "missing" }, now),
  };
  for (const name of names) {
    if (sources[name].state !== "UNAVAILABLE" && !data[name]) {
      sources[name] = {
        state: "FAILED",
        reason: `Invalid ${name.toUpperCase()} receipt shape`,
      };
    }
  }
  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    timezone: "Australia/Melbourne",
    sources,
    data,
    decision: definitions.decisions.decision,
    queue: definitions.decisions.queue.slice(0, 3),
    experiments: definitions.decisions.experiments,
    opportunities: definitions.opportunities.rows,
    estimateExtractedAt: definitions.opportunities.extractedAt,
    estimateNote: definitions.opportunities.estimatesNote,
    spendPolicy: {
      proposedCeilingAud: 300,
      launchState:
        data.gates?.receipted &&
        ["FINAL", "OBSERVED"].includes(sources.gates.state)
          ? "GATE_RECEIPTS_PRESENT"
          : "GATED_APPROVALS_UNVERIFIED",
    },
  };
}

async function main() {
  const args = argsOf(process.argv.slice(2));
  const gscPath = args.gsc || (await latestGscPath());
  const receipts = Object.fromEntries(
    await Promise.all(
      ["gsc", "ads", "ga4", "engine", "gates"].map(async (name) => [
        name,
        await readReceipt(name === "gsc" ? gscPath : args[name]),
      ]),
    ),
  );
  const privateOpportunities =
    args.opportunities ||
    path.join(root, "ops/data/search-growth/opportunities.json");
  let opportunities;
  try {
    opportunities = JSON.parse(await fs.readFile(privateOpportunities, "utf8"));
  } catch (error) {
    if (args.opportunities)
      throw new Error(
        `Private opportunity receipt unreadable: ${error.message}`,
      );
    opportunities = JSON.parse(
      await fs.readFile(path.join(here, "opportunities.json"), "utf8"),
    );
  }
  const definitions = {
    decisions: JSON.parse(
      await fs.readFile(path.join(here, "decisions.json"), "utf8"),
    ),
    opportunities,
  };
  const view = buildView(receipts, definitions);
  const out = args.out || path.join(here, "data.json");
  await fs.writeFile(out, `${JSON.stringify(view, null, 2)}\n`);
  console.log(`Search Growth view: ${out}`);
  for (const [name, receipt] of Object.entries(view.sources))
    console.log(
      `${name}: ${receipt.state}${receipt.reason ? ` (${receipt.reason})` : ""}`,
    );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
