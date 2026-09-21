# Peninsula Insider SEO/GEO engine

A persistent optimisation system: it observes the site, structures what it sees,
classifies and scores it, prioritises, recommends (and — once enabled — safely
applies) changes, then measures and remembers the outcome.

```
OBSERVE -> STRUCTURE -> CLASSIFY -> PRIORITISE -> REASON -> IMPLEMENT -> VERIFY -> MEASURE -> LEARN
```

It runs on stock Node 22 with **no third-party dependencies**.

```sh
cd ops/geo-engine
npm test                  # 24 unit tests
npm run cycle             # incremental cycle (Mon-Sat)
npm run cycle:weekly      # expanded audit (Sun)
npm run cycle:source      # audit next/dist instead of the published build
```

## The decision layer

`lib/jev.mjs` is the fast decision service. It is provider-agnostic:

| provider | when it is used | cost |
|---|---|---|
| `jev` | `JEV_ENDPOINT` **and** `JEV_API_KEY` are set | per-item, tracked |
| `frontier` | `PI_GEO_FRONTIER=on` with `ANTHROPIC_API_KEY` | per-item, tracked |
| `deterministic` | otherwise — registered rule code | zero |

**Jev is not installed in this environment.** There is no Jev package, binary,
config, credential or wrapper anywhere on this filesystem. The service is built
to accept it the moment credentials exist, and until then every decision is made
by deterministic rules. The provider is carried on every decision record and
printed in the daily report, so a rule-derived score is never presented as a
model judgement.

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

AI answer surfaces are currently **not yet measurable**: outbound access to them
is denied by the egress policy. Benchmark coverage is INFERRED and is labelled as
such in every report. The engine never claims a citation it did not observe.

## Persistent state

`state/` is committed, because containers here are ephemeral and the memory must
outlive them.

| file | contents |
|---|---|
| `state/inventory.json` | every URL, its metadata, scores, issues and intervention history |
| `state/ledger.json` | runs, issue lifecycles, interventions, measurements, lessons |
| `state/geo-benchmark.json` | the benchmark with every prior observation preserved |
| `state/knowledge-graph.json` | graph statistics and entity coverage |
| `state/opportunities.json` | the current prioritised backlog |
| `state/content-gaps.json` | scored content gaps |
| `state/internal-link-candidates.json` | adjudicated link candidates |
| `state/decision-cache.json` | decision cache, keyed by decision + provider + input hash |
| `state/latest-report.txt` | the most recent report |

Per-run evidence goes to `.runs/<runId>/` (gitignored).

## Enabling autonomous changes

The engine ships in **audit/recommendation mode**. `policy.json` has
`enabled: false`, and `--apply` without it is refused and recorded as an error.

A change is applied only when *all* of these hold:

1. `policy.enabled` is true and `--apply` was passed
2. the action is on `allowedActions`
3. the decision layer rated it `auto_safe`
4. confidence ≥ `confidenceThreshold` (0.92)
5. the change is reversible
6. the target is **source**, never build output

Recommended first tier, after reviewing a cycle's output:

- `fix_broken_internal_link` — deterministic, reversible, no new facts
- `sitemap_remove_dead_url` — removes a URL with no page behind it
- `fix_malformed_jsonld` — repairs a block that already fails to parse

Never autonomous, at any tier: deleting pages, changing URLs, creating
redirects, rewriting editorial prose, or asserting any fact (hours, prices,
events, venue details) not already in the repository.

### Rollback

Every applied change is backed up before the write and recorded in
`.rollback/<runId>/manifest.json` with the base commit and a `git checkout`
hint. Post-write validation re-reads the file; a failure reverts automatically.
A successful write is never taken as evidence that the site still renders.

## Failure behaviour

Each stage is wrapped: a stage that throws is recorded, state is preserved, the
remaining safe analysis continues, and the failure is reported. Missing data is
reported as missing — the engine never invents a number to fill a gap.

## Schedule

`.github/workflows/seo-geo-engine.yml` — 05:30 Australia/Melbourne daily.
Monday–Saturday incremental, Sunday expanded. This does not duplicate the
existing `SEO Audit` workflow (SiteOne + Lighthouse, 07:35 Melbourne), which
measures different things and is left untouched.
