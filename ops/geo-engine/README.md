# Peninsula Insider SEO/GEO engine

A persistent optimisation system: it observes the site, structures what it sees,
classifies and scores it, prioritises, applies evidence-qualified source changes,
verifies releases, then measures and remembers the outcome.

```
OBSERVE -> STRUCTURE -> CLASSIFY -> PRIORITISE -> REASON -> IMPLEMENT -> VERIFY -> MEASURE -> LEARN
```

It runs on stock Node 22 with **no third-party dependencies**.

```sh
cd ops/geo-engine
npm test                  # engine and autonomy regression tests
npm run cycle             # incremental cycle (Mon-Sat)
npm run cycle:weekly      # expanded audit (Sun)
npm run cycle:source      # audit next/dist instead of the published build
```

## The decision layer

### Autonomous release contract (21 September 2026)

James authorised routine source improvements without individual human approval.
The gateway foreground runner is the only scheduled executor: 05:30 Melbourne,
expanded Sunday, at most five patches, 2,000 JEV requests and six in flight.
`--no-build` is no longer supported. A failed build or stale analytics fails closed.

`source-fixes.mjs` performs bounded extractive edits, never generated prose:
static Astro title from the existing H1; description from an existing sentence;
literal internal links to a verified destination; links around an existing exact
entity mention; trailing-comma repair of static JSON-LD; removal of a single
literal sitemap entry proven dead or noindex. Dynamic templates and ambiguous
sources are deferred, not guessed. Every exact patch requires JEV approval at
0.92 confidence or higher that no new factual claim is introduced, plus live/source
agreement. Reversibility is proved by exact backups and hashes, not model opinion.
The factual-risk question uses concrete yes/no criteria, following
https://docs.typesafe.ai/primitives/noul. Commissioning included an unsupported
free-brunch claim as a negative control; it must be rejected. No factual/editorial rewrite,
new spend, credential, commercial, policy, test or workflow edit is permitted.

The controller opens its own PR against main, waits for content, browser,
independent-evidence and engine checks, and merges the exact tested head without
`--admin`. A moving main is merged into the candidate and checks run again.
The existing production build/deploy workflow remains unchanged. Both its success
and matching deployment.json provenance and live HTML assertions are required.
A technical failure opens a scoped revert PR through the same checks; rollback
never resets main or overwrites a subsequent change to the affected files.

Runtime evidence lives in the bind-mounted `ops/geo-engine/.runs/state/`:
`latest-report.txt`, `latest-outcome.txt`, `release.json`, immutable per-release
receipts, the source inventory, provider/schema/model-separated seven-day cache,
and ledger. It is deliberately not committed into the site's main branch each day.
Pending releases resume before any new batch. Interrupted preparation or conflicting
edits stop with preserved evidence. Back up this runner directory with the gateway.

Only live-verified releases enter measurement and URL cooldown. Final GSC page
rows use complete non-overlapping equal-length windows after deployment. Sparse
data is inconclusive, and before/after movement is observational, not causal proof.
At least three measured outcomes are needed for a bounded 0.8–1.2 priority weight.
Learning cannot widen permissions or alter its own tests/release boundary.

Commissioning evidence must separately establish unit tests, a real JEV cycle,
CI, publication, live acceptance, and a preview rollback. Configuration alone is
not proof of any of those stages.

`lib/jev.mjs` is the fast decision service. It is provider-agnostic:

| provider | when it is used | cost |
|---|---|---|
| `jev` | `JEV_API_KEY` is set, **or** the protected `TYPESAFE_API_KEY` is present (it is, under the OpenClaw gateway's exec) | per input token, tracked from the API's usage counts |
| `frontier` | `PI_GEO_FRONTIER=on` with `ANTHROPIC_API_KEY` | per-item, tracked |
| `deterministic` | otherwise, registered rule code | zero |

**Jev is TypeSafe AI's Jev** (`POST https://api.typesafe.ai/v1/systemone`, model
`jev-latest`), called with plain `fetch`; no SDK is needed. `JEV_ENDPOINT` only
needs setting for a non-default host. On this stack the key is the protected
store secret `TYPESAFE_API_KEY`, which the gateway injects only into commands run
through its own exec tool (Codex `gateway_exec`, host=gateway); a plain shell,
a native harness shell, or GitHub Actions does not receive it, so those run on
deterministic rules unless `JEV_API_KEY` is supplied as a secret there. Nothing
in the repository holds a key.

**One decision per request.** Measured on 2026-09-21 with 228 labelled items:
putting 24 items in one request made every item receive near-identical answers
(within-request spread about 0.01 against 0.1 to 0.28 overall) and cut routing
accuracy from 70.6% to 20.6%. Jev answers a request's `state` as a whole, so
the service sends one input per request and gets its throughput from
concurrency (`JEV_CONCURRENCY`, default 6) instead. Each run is capped at
`JEV_MAX_DECISIONS` remote decisions (default 2000); anything beyond the cap is
decided by rules and the report says so. Schema fields map onto Jev's typed
questions: enum to `choice`, boolean to `noul` (yes/no), number to a five-level
`score` rescaled onto the field's range. A schema with a free-text field cannot
be served by Jev and stays deterministic. Cost is estimated from the returned
input-token count at the public list price ($0.042 per million input tokens,
checked 2026-09-21; override with `JEV_USD_PER_MILLION_INPUT_TOKENS`).

Three properties hold regardless of provider:

1. **Typed output.** Every decision declares a schema. A provider answer that
   fails validation is discarded, the failure is recorded, and the deterministic
   rule decides instead. A broken model degrades confidence, not correctness.
2. **A controlled probe.** Each cycle sends one real decision through the
   configured provider before anything depends on it. A failed probe demotes the
   service to rules for the rest of the run.
3. **Atomic questions.** 16 decisions in `lib/decisions.mjs`, each one narrow
   ("can an AI locate the primary answer?", "does a modelled relationship justify
   this link?"). Nothing asks "is this page good for SEO?".

## Modules

| module | responsibility |
|---|---|
| `lib/jev.mjs` | decision service: providers, validation, batching, cache, usage ledger |
| `lib/decisions.mjs` | the 16 atomic decisions and their deterministic rules |
| `lib/vocab.mjs` | towns, venues, events, activities, audiences, seasons from the content collections |
| `lib/inventory.mjs` | persistent, incremental site inventory |
| `lib/html.mjs` | dependency-free extraction of the SEO/GEO surface of a page |
| `lib/technical.mjs` | deterministic technical checks |
| `lib/delta.mjs` | served build vs current source comparison |
| `lib/graph.mjs` | local knowledge graph |
| `lib/benchmark.mjs` | GEO query benchmark |
| `lib/links.mjs` | internal link candidates + adjudication |
| `lib/gaps.mjs` | content gap engine |
| `lib/gsc.mjs` | Search Console intelligence |
| `lib/scoring.mjs` | page-level component scores |
| `lib/prioritise.mjs` | opportunity scoring and action categories |
| `lib/ledger.mjs` | durable memory and the learning loop |
| `lib/autofix.mjs` | change mechanism, safety gate, rollback |
| `lib/report.mjs` | the daily report |

## Two planes, and why it matters

The repository root is **build output**, replaced wholesale by `build-live.sh`.
`next/src` is the source. Editing a rendered page at the root would be silently
reverted by the next build, so `lib/autofix.mjs` refuses build-output writes
outright, and every cycle runs `lib/delta.mjs` to split findings into:

- **fixed pending deploy** — live, already fixed in source: do not action
- **outstanding in both** — genuine work
- **incoming regression** — introduced by unreleased source: fix before publish

Without this the engine would send someone to fix problems that are already
fixed. It also detects an incomplete source build (e.g. when the responsive-image
hook cannot reach the CMS asset host) and excludes the affected rules rather than
reporting the difference as work.

## What is measured, inferred, and not measurable

The report labels every GEO statement:

- **OBSERVED** — an answer surface was queried and recorded.
- **INFERRED** — derived from this site's own coverage.
- **NOT YET MEASURABLE** — nothing in this environment can query it.

AI answer surfaces are **not measured by this engine**. Benchmark coverage is INFERRED and is labelled as
such in every report. The engine never claims a citation it did not observe.

## Persistent state

The gateway sets `PI_GEO_STATE_DIR=ops/geo-engine/.runs/state` on the persistent
workspace bind mount. The table below uses `state/` as shorthand for that location.
The checked-in legacy `state/` is a historical audit snapshot, not live cron state.

| file | contents |
|---|---|
| `state/inventory-source.json` | source URLs, metadata, hashes and reusable scores (served-tree inventory is separate) |
| `state/ledger.json` | runs, issue lifecycles, interventions, measurements, lessons |
| `state/geo-benchmark.json` | the benchmark with every prior observation preserved |
| `state/knowledge-graph.json` | graph statistics and entity coverage |
| `state/opportunities.json` | the current prioritised backlog |
| `state/content-gaps.json` | scored content gaps |
| `state/internal-link-candidates.json` | adjudicated link candidates |
| `state/decision-cache.json` | decision cache, keyed by version + schema + model + provider + input hash |
| `state/latest-report.txt` | the most recent report |

Per-run evidence goes to `.runs/<runId>/` (gitignored).

## Enabling autonomous changes

The first tier is **enabled** (`policy.json`, 2026-09-21). Audit runs are
unaffected: a change is applied only when `--apply` is passed, which only the
gateway runner does, against the source plane.

A change is applied only when *all* of these hold:

1. `policy.enabled` is true and `--apply` was passed
2. the action is on `allowedActions`
3. JEV returns `containsNewClaim=false` on the exact changed lines and source evidence
4. confidence ≥ `confidenceThreshold` (0.92)
5. the change is reversible
6. the target is **source**, never build output

The enabled scope is the autonomous release contract above; its technical subset is:

- `fix_broken_internal_link` — deterministic, reversible, no new facts
- `sitemap_remove_dead_url` — removes a URL with no page behind it
- `fix_malformed_jsonld` — repairs a block that already fails to parse

Never autonomous, at any tier: deleting pages, changing URLs, creating
redirects, rewriting editorial prose, or asserting any fact (hours, prices,
events, venue details) not already in the repository.

### Rollback

Every applied change is backed up before the write and recorded in
`.rollback/<runId>/manifest.json` with before/after hashes and exact byte backups.
Failed local batches restore only unchanged engine-written files; failed published
batches get a scoped revert PR. Post-write validation re-reads the file.
A successful write is never taken as evidence that the site still renders.

## Failure behaviour

Each stage is wrapped: a stage that throws is recorded, state is preserved, the
remaining safe analysis continues, and the failure is reported. Missing data is
reported as missing — the engine never invents a number to fill a gap.

## Schedule and runner

The daily cycle runs on the **OpenClaw gateway**, not in GitHub Actions
(decided 2026-09-21). Only the gateway can reach the protected Jev credential
and the site's Search Console identity, so it is the one place a cycle can be
both model-scored and demand-aware. `scripts/gateway-cycle.sh` is the runner;
the `pi-seo-daily-pull` automation (05:30 Australia/Melbourne, Sunday expanded)
invokes it through the gateway's exec tool via
`workspace/peninsula-seo-geo/scheduled.py`, which also keeps the site's
existing Search Console collector. Each run: syncs the checkout, refreshes the
analytics document, builds the current source for the deploy delta, runs the
cycle with `--apply` against the source plane, retains state on the bind mount,
and opens, machine-validates, merges and live-verifies a bounded source PR.
It never pushes directly to `main`.

`.github/workflows/seo-geo-engine.yml` runs the tests on pull requests and
offers a manual, credential-less audit via `workflow_dispatch`.

Search demand comes from `GSC_ANALYTICS_JSON`, the gateway analytics pull
(page x query rows for the trailing 28 days); `GSC_ROWS_JSON` and the exported
files remain supported.

The Python engine that was commissioned in `workspace/peninsula-seo-geo` on
2026-09-21 is superseded by this one; its analytics pull is the part that
survives.
