import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildView } from "./build-data.mjs";

const definitions = {
  decisions: { decision: "INVESTIGATE", queue: [], experiments: [] },
  opportunities: {
    extractedAt: "2026-10-01",
    estimatesNote: "estimates",
    rows: [],
  },
};
const now = new Date("2026-10-01T00:00:00Z");
const missing = { kind: "missing" };
const loaded = (value) => ({ kind: "loaded", value });

test("missing Ads and GA4 stay unavailable, never zero", () => {
  const view = buildView(
    { gsc: missing, ads: missing, ga4: missing, engine: missing },
    definitions,
    now,
  );
  assert.equal(view.sources.ads.state, "UNAVAILABLE");
  assert.equal(view.sources.ga4.state, "UNAVAILABLE");
  assert.equal(view.data.ads, null);
  assert.equal(view.data.ga4, null);
  assert.equal(view.spendPolicy.launchState, "GATED_APPROVALS_UNVERIFIED");
});

test("GSC property aggregate is used without summing privacy-filtered rows", () => {
  const gsc = loaded({
    extractedAt: now.toISOString(),
    finality: "final",
    ranges: { last28d: { startDate: "2026-09-01", endDate: "2026-09-28" } },
    headline: {
      last28d: { clicks: 7, impressions: 100, ctr: 0.07, position: 65 },
    },
    pages: [{ clicks: 1, impressions: 20 }],
    queries: [],
  });
  const view = buildView(
    { gsc, ads: missing, ga4: missing, engine: missing },
    definitions,
    now,
  );
  assert.equal(view.data.gsc.clicks, 7);
  assert.equal(view.data.gsc.impressions, 100);
  assert.equal(view.sources.gsc.state, "FINAL");
});

test("a historical baseline stays visibly cached", () => {
  const gsc = loaded({
    extractedAt: now.toISOString(),
    provenance: "historical-baseline",
    finality: "final",
    headline: { clicks: 7, impressions: 100 },
  });
  const view = buildView(
    { gsc, ads: missing, ga4: missing, engine: missing },
    definitions,
    now,
  );
  assert.equal(view.sources.gsc.state, "CACHED");
});

test("stale and malformed receipts are not presented as fresh", () => {
  const stale = loaded({
    extractedAt: "2026-09-20T00:00:00Z",
    headline: { clicks: 1, impressions: 10 },
  });
  const malformedAds = loaded({
    extractedAt: now.toISOString(),
    currency: "USD",
    billedCostAud: 5,
    clicks: 1,
  });
  const view = buildView(
    { gsc: stale, ads: malformedAds, ga4: missing, engine: missing },
    definitions,
    now,
  );
  assert.equal(view.sources.gsc.state, "STALE");
  assert.equal(view.sources.ads.state, "FAILED");
});

test("empty GA4 and engine receipts fail shape checks", () => {
  const empty = loaded({ extractedAt: now.toISOString() });
  const view = buildView(
    { gsc: missing, ads: missing, ga4: empty, engine: empty },
    definitions,
    now,
  );
  assert.equal(view.sources.ga4.state, "FAILED");
  assert.equal(view.sources.engine.state, "FAILED");
});

test("paid checkpoint uses billed AUD and reviewed-click denominator", () => {
  const ads = loaded({
    extractedAt: now.toISOString(),
    currency: "AUD",
    billedCostAud: 152,
    clicks: 54,
    reviewedClicks: 20,
    relevantReviewedClicks: 12,
  });
  const view = buildView(
    { gsc: missing, ads, ga4: missing, engine: missing },
    definitions,
    now,
  );
  assert.equal(view.data.ads.checkpoint, "RELEVANCE_REVIEW");
  assert.equal(view.data.ads.relevantShare, 0.6);
  assert.equal(view.data.ads.overspend, false);
  assert.equal(view.spendPolicy.launchState, "GATED_APPROVALS_UNVERIFIED");
  const over = buildView(
    {
      gsc: missing,
      ads: loaded({ ...ads.value, billedCostAud: 301 }),
      ga4: missing,
      engine: missing,
    },
    definitions,
    now,
  );
  assert.equal(over.data.ads.overspend, true);
});

test("complete current gate receipts are separate from an Ads cost receipt", () => {
  const approvals = Object.fromEntries(
    ["spend", "editorial", "engineering", "analytics", "accountPreview"].map(
      (name) => [
        name,
        {
          approved: true,
          reviewedAt: now.toISOString(),
          reviewer: name === "spend" ? "James" : "PI reviewer",
        },
      ],
    ),
  );
  const gates = loaded({
    extractedAt: now.toISOString(),
    validFrom: "2026-10-01",
    validThrough: "2026-10-31",
    ceilingAud: 300,
    approvals,
  });
  const view = buildView(
    { gsc: missing, ads: missing, ga4: missing, engine: missing, gates },
    definitions,
    now,
  );
  assert.equal(view.data.gates.present, 5);
  assert.equal(view.spendPolicy.launchState, "GATE_RECEIPTS_PRESENT");
  assert.equal(view.data.ads, null);
  const badTime = buildView(
    {
      gsc: missing,
      ads: missing,
      ga4: missing,
      engine: missing,
      gates: loaded({ ...gates.value, extractedAt: "invalid" }),
    },
    definitions,
    now,
  );
  assert.equal(badTime.sources.gates.state, "FAILED");
  assert.equal(badTime.spendPolicy.launchState, "GATED_APPROVALS_UNVERIFIED");
});

test("pilot draft ad copy fits RSA field lengths", () => {
  const pilot = JSON.parse(
    fs.readFileSync(
      new URL(
        "../../campaigns/search-pilot-2026-10/pilot.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  for (const group of pilot.adGroups) {
    for (const headline of group.headlines)
      assert.ok(headline.length <= 30, headline);
    for (const description of group.descriptions)
      assert.ok(description.length <= 90, description);
  }
  assert.equal(
    pilot.averageDailyBudgetAud * 30.4 < pilot.monthlyBilledCeilingAud,
    true,
  );
});
