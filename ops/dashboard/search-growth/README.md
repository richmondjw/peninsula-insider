# Private Search Growth view

This source-only view extends the existing daily GSC pull and Monday SEO/GEO decision loop. It does not create a new scheduler, call APIs, store credentials or live in the public Astro build. Serve it only on localhost or another access-controlled private surface. The existing `ops/dashboard/index.html` contains static demonstration figures, so it is not a trustworthy data source for this view.

## Build a local receipt

From the repository root, run:

```sh
node ops/dashboard/search-growth/build-data.mjs
```

The adapter finds the newest existing `ops/data/seo/YYYY-MM-DD.json` from `pi-seo-daily-pull`. It writes `ops/dashboard/search-growth/data.json`, which Git ignores. If the daily snapshot or account receipts are absent, those sources are `UNAVAILABLE`. Missing Ads data cannot prove the account is unlaunched or that spend is zero. An older receipt is `STALE`, a failed pull is `FAILED`, and a marked historical baseline is `CACHED`. A collector snapshot without a finality flag is `OBSERVED`, never silently `FINAL`.

Optional private receipts can be passed with `--gsc`, `--ads`, `--ga4`, `--engine`, `--gates` and `--out` paths. Each needs `extractedAt` (ISO timestamp). `--gsc` accepts the existing daily collector shape (`headline.last28d`, `ranges.last28d`, `property`) or a small baseline receipt (`headline`, `period`, optional `auHeadline`). A baseline may carry `provenance: "historical-baseline"` and `finality: "final"` when those are documented at source. `--ads` expects `currency: "AUD"`, `billedCostAud`, `clicks`, and optionally `reviewedClicks`, `relevantReviewedClicks`, `campaign`, `period`, `finality`. `--ga4` expects an `events` object with `newsletter_signup_succeeded`, `save_add`, `trip_add`, and optionally `booking_outbound_clicked`. `--engine` expects `accepted`, `releaseSha`, `runId`, `note`. Only these known aggregate fields enter the view; raw search terms, email, user IDs and credentials do not.

The separate `--gates` receipt needs `validFrom`, `validThrough`, `ceilingAud: 300`, and `approvals` for `spend`, `editorial`, `engineering`, `analytics` and `accountPreview`. Each approval needs `approved: true`, `reviewedAt` and `reviewer`; the spend reviewer must be `James`. Store the exact account and approval evidence in the private source system, not Git. The view only reports that gate receipts are present within their window. It never interprets an Ads cost receipt as launch authority or proof that an account was safely configured.

Run a localhost static server from this dashboard directory and open `/` in a browser, or open `index.html` and use the local JSON picker. Keep the server rooted here so private `ops/data`, tokens and other project files are not exposed by the HTTP server. For example:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

The view reads `data.json`. The file picker keeps the chosen JSON in the browser. Do not serve the repo root or expose this port publicly. The repository is public: current keyword estimates and GSC page observations belong in ignored `ops/data/search-growth/opportunities.json`, not in tracked `opportunities.json`. The adapter automatically reads that private file, or accepts `--opportunities` with another local path. Without it, the opportunity table shows an unavailable state. The tracked JSON is an empty fallback only.

## Weekly decision

The operator checks source state first, then the top three actions, spend gates and experiment windows. GSC property totals come from the aggregate row, never from a sum of privacy-filtered page or query rows. The opportunity register's third-party estimates are frozen 1 October research and explicitly dated. Refresh them only when a new bounded research receipt is available; do not make automated DataForSEO calls with a credential in source. Paid data is provisional until billing reconciliation. GA4 events are consent-gated and may not equal Ads clicks. Close each cycle in the existing experiment and task records with baseline, bounded change, measured outcome, decision, owner, independent reviewer and next check.

`decisions.json` is a tracked decision snapshot, not a second work board. Update its links to the existing Asana/PI work items when available. Remove completed entries rather than stacking a new queue. `opportunities.json` holds estimates and observed baseline notes; update observations only with new, dated evidence. The dashboard will still show their extraction date when source receipts are missing.
