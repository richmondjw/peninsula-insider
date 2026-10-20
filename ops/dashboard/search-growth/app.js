const $ = (id) => document.getElementById(id);
const number = (value, digits = 0) =>
  Number.isFinite(value)
    ? new Intl.NumberFormat("en-AU", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(value)
    : "—";
const date = (value) =>
  value
    ? new Intl.DateTimeFormat("en-AU", {
        dateStyle: "medium",
        timeZone: "Australia/Melbourne",
      }).format(new Date(value))
    : "unknown date";
const el = (tag, className, content) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
};
const append = (parent, ...children) =>
  children.forEach((child) => parent.append(child));
const safeHref = (href) =>
  href?.startsWith("https://peninsulainsider.com.au/") ||
  href?.startsWith("https://github.com/richmondjw/peninsula-insider/") ||
  href?.startsWith("https://app.asana.com/0/0/")
    ? href
    : null;
const link = (label, href) => {
  const safe = safeHref(href);
  if (!safe) return el("span", "", label);
  const a = el("a", "", label);
  a.href = safe;
  return a;
};
let view = null;
let filter = "all";

function renderSources() {
  const box = $("sources");
  box.replaceChildren();
  for (const [name, source] of Object.entries(view.sources)) {
    const pill = el("div", `source-pill state-${source.state}`);
    append(
      pill,
      el("strong", "", name.toUpperCase()),
      el(
        "span",
        "",
        `${source.state.replaceAll("_", " ")} · ${source.extractedAt ? date(source.extractedAt) : source.reason || "No receipt"}`,
      ),
    );
    box.append(pill);
  }
}

function score(label, value, detail) {
  const card = el("article", "score");
  append(
    card,
    el("div", "label", label),
    el("div", "value", value),
    el("p", "detail", detail),
  );
  return card;
}

function renderCards() {
  const { gsc, ads, ga4, engine } = view.data;
  const source = view.sources;
  $("scorecards").replaceChildren(
    score(
      "Organic / GSC",
      gsc ? `${number(gsc.clicks)} clicks` : "—",
      gsc
        ? `${number(gsc.impressions)} property impressions · ${source.gsc.period?.startDate || "?"} to ${source.gsc.period?.endDate || "?"} · ${source.gsc.state}`
        : source.gsc.reason,
    ),
    score(
      "Paid / billed",
      ads ? `A$${number(ads.billedCostAud, 2)}` : "—",
      ads
        ? `against proposed A$300 ceiling · ${source.ads.state}`
        : "Account receipt unavailable. No campaign state or zero spend inferred.",
    ),
    score(
      "Consented actions",
      ga4?.newsletterSignupSucceeded !== null &&
        ga4?.newsletterSignupSucceeded !== undefined
        ? `${number(ga4.newsletterSignupSucceeded)} signups`
        : "—",
      ga4 ? `Positive receipt events · ${source.ga4.state}` : source.ga4.reason,
    ),
    score(
      "SEO/GEO run",
      engine?.accepted === true
        ? "Accepted"
        : engine?.accepted === false
          ? "Failed"
          : "—",
      engine
        ? `${engine.releaseSha || "Release SHA unknown"} · ${source.engine.state}`
        : source.engine.reason,
    ),
  );
}

function renderQueue() {
  const box = $("queue");
  box.replaceChildren();
  for (const item of view.queue) {
    const li = el("li");
    const body = el("div");
    append(
      body,
      el("h3", "", item.action),
      el("p", "", item.evidence),
      el("div", "meta", `${item.owner} · ${item.due} · Risk: ${item.risk}`),
      link("Work item", item.workItemUrl),
      el("span", "", " · "),
      link("Source", item.url),
    );
    li.append(body);
    box.append(li);
  }
}

function renderPilot() {
  const box = $("pilot-metrics");
  box.replaceChildren();
  const { ads, ga4 } = view.data;
  const state = $("pilot-state");
  const gatesReceipted =
    view.spendPolicy?.launchState === "GATE_RECEIPTS_PRESENT";
  state.textContent = ads?.overspend
    ? "STOP · ceiling exceeded"
    : ads && !gatesReceipted && ads.billedCostAud > 0
      ? "CHECK SPEND · gates unverified"
      : gatesReceipted
        ? "Gate receipts present · verify account"
        : "Gated · approvals unverified";
  state.className = `state-tag ${ads?.overspend || (ads?.billedCostAud > 0 && !gatesReceipted) ? "state-FAILED" : ""}`;
  if (!ads) {
    append(
      box,
      el("p", "pilot-number", "No campaign result"),
      el(
        "p",
        "muted",
        "Account state, billing and Google Ads conversion import are unverified. The pilot remains held.",
      ),
    );
    return;
  }
  const dl = el("dl", "pilot-data");
  for (const [label, value] of [
    ["Billed cost", `A$${number(ads.billedCostAud, 2)}`],
    ["Clicks", number(ads.clicks)],
    [
      "Reviewed query share",
      ads.relevantShare === null
        ? "—"
        : `${number(ads.relevantShare * 100, 0)}%`,
    ],
    [
      "Verified signups",
      ga4?.newsletterSignupSucceeded === null ||
      ga4?.newsletterSignupSucceeded === undefined
        ? "—"
        : number(ga4.newsletterSignupSucceeded),
    ],
  ]) {
    const row = el("div");
    append(row, el("dt", "", label), el("dd", "", value));
    dl.append(row);
  }
  box.append(dl);
  if (!gatesReceipted && ads.billedCostAud > 0)
    box.append(
      el(
        "p",
        "fine",
        "Billed cost was supplied without complete launch-gate receipts. Reconcile account and authority before further spend.",
      ),
    );
  if (ads.checkpoint === "TRACKING_REVIEW")
    box.append(
      el(
        "p",
        "fine",
        "A$75 checkpoint: inspect tracking and search-term relevance before further spend.",
      ),
    );
  if (ads.checkpoint === "RELEVANCE_REVIEW")
    box.append(
      el(
        "p",
        "fine",
        `A$150 checkpoint: ${ads.relevantShare !== null && ads.relevantShare < 0.7 ? "Below 70% relevant reviewed clicks; tighten and hold the remainder." : "Inspect reviewed search terms and decide whether to continue."}`,
      ),
    );
  if (ads.checkpoint === "STOP_AND_REVIEW")
    box.append(
      el(
        "p",
        "fine",
        "Ceiling checkpoint: pause and decide ADOPT, ADAPT, STOP or INVESTIGATE before another month.",
      ),
    );
}

function matches(item) {
  if (filter === "all") return true;
  if (filter === "paid") return item.channel.toLowerCase().includes("paid");
  if (filter === "organic")
    return item.channel.toLowerCase().includes("organic");
  return item.state === "BLOCKED";
}

function renderOpportunities() {
  const box = $("opportunities");
  box.replaceChildren();
  for (const item of view.opportunities.filter(matches)) {
    const tr = el("tr");
    const first = el("td");
    append(
      first,
      el("strong", "", `${item.rank}. ${item.cluster}`),
      el("small", "", `${item.intent} · ${item.channel}`),
      link(item.path, `https://peninsulainsider.com.au${item.path}`),
    );
    const evidence = el("td");
    append(
      evidence,
      el("div", "", item.observation),
      el("small", "", `${item.estimate} · ${item.estimateSource}`),
    );
    const state = el("td");
    state.append(
      el(
        "span",
        `badge ${item.state === "BLOCKED" ? "blocked" : ""}`,
        item.state,
      ),
    );
    append(tr, first, evidence, state, el("td", "", item.next));
    box.append(tr);
  }
  if (!box.children.length) {
    const tr = el("tr");
    const td = el(
      "td",
      "",
      view.opportunities.length
        ? "No opportunities in this filter."
        : "Private opportunity receipt unavailable. Load the local research file through the adapter.",
    );
    td.colSpan = 4;
    tr.append(td);
    box.append(tr);
  }
  $("estimate-note").textContent =
    `${view.estimateNote}${view.estimateExtractedAt ? ` Extracted ${view.estimateExtractedAt}.` : ""} GSC observations are baseline snapshots, not current rankings.`;
}

function renderExperiments() {
  const box = $("experiments");
  box.replaceChildren();
  for (const experiment of view.experiments) {
    const row = el("article", "experiment");
    append(
      row,
      el("div", "id", `${experiment.id} · ${experiment.status}`),
      el("h3", "", experiment.hypothesis),
      el("p", "", `Baseline: ${experiment.baseline}`),
      el("p", "", `Measure: ${experiment.measure}`),
      el(
        "p",
        "",
        `Evaluation: ${experiment.evaluation} · ${experiment.owner} · ${experiment.decision}`,
      ),
    );
    box.append(row);
  }
}

function renderExceptions() {
  const box = $("exceptions");
  box.replaceChildren();
  for (const [name, source] of Object.entries(view.sources)) {
    if (!["FINAL", "OBSERVED"].includes(source.state))
      box.append(
        el(
          "li",
          "",
          `${name.toUpperCase()}: ${source.state.replaceAll("_", " ")}. ${source.reason || "Check source receipt and owner."}`,
        ),
      );
  }
  if (view.data.ads?.overspend)
    box.append(
      el(
        "li",
        "",
        "Ads billed cost exceeds A$300. Pause immediately and reconcile billing.",
      ),
    );
  if (
    view.data.ads?.relevantShare !== null &&
    view.data.ads?.relevantShare !== undefined &&
    view.data.ads.billedCostAud >= 150 &&
    view.data.ads.relevantShare < 0.7
  )
    box.append(
      el(
        "li",
        "",
        "Reviewed search-term relevance is below 70% at the A$150 checkpoint. Hold remaining spend.",
      ),
    );
  box.append(
    el(
      "li",
      "",
      "Day-trip article and hub indexation remain unverified after any release; re-inspect before calling recovery.",
    ),
  );
  if (!box.children.length) box.append(el("li", "", "No current exceptions."));
}

function render(data) {
  if (
    data?.schemaVersion !== 1 ||
    !data.sources ||
    !data.data ||
    !Array.isArray(data.queue)
  )
    throw new Error("Unsupported Search Growth receipt");
  view = data;
  $("decision").textContent = data.decision;
  $("asof").textContent =
    `Generated ${date(data.generatedAt)} · Australia/Melbourne · release ${data.data.engine?.releaseSha || "unverified"}`;
  renderSources();
  renderCards();
  renderQueue();
  renderPilot();
  renderOpportunities();
  renderExperiments();
  renderExceptions();
}

function unavailable(reason) {
  view = null;
  filter = "all";
  document
    .querySelectorAll("[data-filter]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.filter === "all"),
      ),
    );
  $("decision").textContent =
    "Dashboard receipt unavailable. Run the local adapter, then open its data.json here.";
  $("asof").textContent = reason;
  for (const id of [
    "sources",
    "scorecards",
    "queue",
    "opportunities",
    "experiments",
    "exceptions",
  ])
    $(id).replaceChildren();
  $("pilot-metrics").textContent =
    "No Ads receipt. Campaign state and billed spend are unknown.";
  $("pilot-state").textContent = "Receipt unavailable";
  $("pilot-state").className = "state-tag";
  $("estimate-note").textContent = "No keyword or GSC data loaded.";
}

document.querySelectorAll("[data-filter]").forEach((button) =>
  button.addEventListener("click", () => {
    filter = button.dataset.filter;
    document
      .querySelectorAll("[data-filter]")
      .forEach((candidate) =>
        candidate.setAttribute("aria-pressed", String(candidate === button)),
      );
    if (view) renderOpportunities();
  }),
);

$("receipt-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    render(JSON.parse(await file.text()));
  } catch (error) {
    unavailable(error.message);
  }
});

fetch("./data.json", { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error(`Local receipt HTTP ${response.status}`);
    return response.json();
  })
  .then(render)
  .catch((error) => unavailable(error.message));
