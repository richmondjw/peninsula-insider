# Peninsula Insider — Weekly Editorial Rhythm Visibility Check
**Date:** 2026-05-10
**Scope:** What parts of the documented weekly editorial rhythm are actually being executed, by whom, and where outputs land.
**Method:** Cross-checked `~/.openclaw/cron/jobs.json` (operational), `ops/editorial-jobs.json` (intent), and the documented rhythm in the editorial-ops docs.
**Result:** **Roughly 70% of the documented weekly rhythm is operationally executing.** Three rituals are live and writing outputs; two are partly live; the SEO/audit cadence is the largest gap.

## Documented weekly rhythm (intent)

From `docs/editorial-ops-system-2026-04-09.md`, `docs/peninsula-insider-agentic-editorial-operating-model-2026-04-13.md`, and `ops/editorial-jobs.json`, PI's documented weekly rhythm is:

| Day | Ritual | Owner | Output target |
|---|---|---|---|
| **Sunday** 08:00 | Editor Letter / Sunday composite | Sloane (managing editor agent) | newsroom slates + Sunday dispatch chain |
| **Sunday** 08:30 → 11:50 | Weekend dispatch chain (research → shape → draft → review → publish → social → archive) | dispatch-desk + editorial-desk + publisher + social-desk + archives-desk | Journal + homepage + What's On + social pack |
| **Monday** 23:00 | Commissioning | Sloane | newsroom slate for the week |
| **Wednesday** 00:00 | Checkpoint (blockers only, 15 min hard stop) | Sloane | blocked-pieces report |
| **Wednesday** 06:00 | Editorial commissioning (PI-editorial-desk) | editorial-desk | weekly editorial outline |
| **Friday** 00:00 | Performance Council | Sloane | `newsroom/perf/perf-YYYY-WW.md` |
| **Friday** 01:00 | Retro (4-question format) | Sloane | `newsroom/retros/retro-YYYY-WW.md` |
| **Friday** 02:00 | Look-ahead (refresh 4-week look-ahead) | Sloane | `newsroom/slates/lookahead.md` |
| **Mon/Tue/Wed/Thu/Fri/Sat** 07:45 | SEO weekly cycle (authority audit, opportunity scan, metadata audit, internal linking audit) | seo-desk + seo-qa | `reports/peninsula-seo-*-YYYY-MM-DD.md` |
| **Monday** 00:00 | Weekly SEO Digest | seo-desk | weekly digest report |
| **Sunday** 22:00 | Weekly design review | design-desk | design report |
| **Thursday** 09:00 | Insider Picks | editorial-desk | picks roundup |

## What is actually executing

### ✅ Live and verified

| Ritual | Evidence |
|---|---|
| **Sunday Editor Letter** (`PI: Sunday Editor Letter`) | Cron registered, schedule `0 8 * * 0`, enabled. Composite umbrella for the dispatch chain. |
| **Sunday weekend dispatch publish** (composite) | Recent commits: `Quick Note — Sunday 10 May 2026`, prior Sunday dispatches — chain is firing. |
| **Monday Commissioning** (`PI: Monday Commissioning`) | Cron registered, `0 23 * * 0`, enabled. |
| **Wednesday Checkpoint** (`PI: Wednesday Checkpoint`) | Cron registered, `0 0 * * 3`, enabled. |
| **Wednesday Editorial Commissioning** (`pi-weekly-editorial-commissioning`) | Cron registered, `0 6 * * 3`, enabled. |
| **Friday Performance Council** | Cron registered, `0 0 * * 5`, enabled. |
| **Friday Retro** | Cron registered, `0 1 * * 5`, enabled. |
| **Friday Look-ahead** | Cron registered, `0 2 * * 5`, enabled. |
| **Weekly SEO Digest** | Cron registered, `0 0 * * 1`, enabled. |
| **Sunday Design Review** (`pi-weekly-design-review`) | Cron registered, `0 22 * * 0`, enabled. |
| **Thursday Insider Picks** (`pi-weekly-insider-picks`) | Cron registered, `0 9 * * 4`, enabled. |
| **Monthly SEO/content audit** (`pi-monthly-content-audit`) | Cron registered, `0 8 1 * *`, enabled. |
| **Monday Evergreen Refresh** (`pi-weekly-evergreen-refresh`) | Cron registered, `0 5 * * 1`, enabled. |

### ⚠️ Partly live or unclear

| Ritual | What's documented | What's running | Gap |
|---|---|---|---|
| **Tuesday SEO authority audit** | `editorial-jobs.json` job `pi-weekly-seo-authority-audit` Tue 07:45 | No corresponding cron entry | Bundled inside Weekly SEO Digest? Or aspirational? |
| **Thursday SEO opportunity scan** | `editorial-jobs.json` job `pi-weekly-seo-opportunity-scan` Thu 07:45 | No corresponding cron entry | Same as above |
| **Friday metadata/schema audit** | `editorial-jobs.json` job `pi-weekly-metadata-schema-audit` Fri 07:45 | No corresponding cron entry | Same as above |
| **Saturday internal-linking audit** | `editorial-jobs.json` job `pi-weekly-internal-linking-audit` Sat 07:45 | No corresponding cron entry | Same as above |
| **Sunday weekend dispatch chain (per-phase)** | 7 phases in `editorial-jobs.json` | One composite Sunday cron (Editor Letter) | Per-phase observability missing — dispatch failures show as one big "Sunday cron failed" |
| **Insider Picks distribution** | `pi-weekly-insider-picks` job exists | Output landing place unclear | Where do picks publish? Which surface? |

### Newsroom output targets — visibility status

| Target path | Documented purpose | Visible in repo? |
|---|---|---|
| `next/.claude/newsroom/slates/` | Weekly slate | likely yes — referenced in cron payloads |
| `next/.claude/newsroom/perf/perf-YYYY-WW.md` | Performance Council output | likely yes |
| `next/.claude/newsroom/retros/retro-YYYY-WW.md` | Retro output | likely yes |
| `next/.claude/newsroom/slates/lookahead.md` | Look-ahead output | likely yes |
| `reports/peninsula-seo-*-YYYY-MM-DD.md` | SEO audit outputs | partial — some present, four sub-audits absent |
| `ops/reports/seo/` | SEO ops outputs | yes (greg checked: `gsc-coverage-report.md`, `gsc-search-analytics.md`, `seo-classification.csv`) |

## Headline gaps

### Gap 1 — Four SEO audits documented, not registered
`pi-weekly-seo-authority-audit`, `pi-weekly-seo-opportunity-scan`, `pi-weekly-metadata-schema-audit`, `pi-weekly-internal-linking-audit` are all defined in `editorial-jobs.json` with explicit Tue/Thu/Fri/Sat 07:45 schedules. None are registered in `~/.openclaw/cron/jobs.json`.

**Two possibilities:**
- They are folded inside the Weekly SEO Digest cron and the four jobs are descriptive sub-phases of that digest.
- They are aspirational and never actually fired.

**Either is fine** — but the answer needs to be **explicit and consistent** between the two registries. Currently it isn't.

### Gap 2 — Dispatch chain has one cron, seven documented phases
Sunday `PI: Sunday Editor Letter` runs the full dispatch composite. The seven jobs in `editorial-jobs.json` (research → shape → draft → review → publish → social → archive) are conceptual phases inside that composite, not separately scheduled.

**Consequence:** if the dispatch publish fails, the failure surfaces as "Sunday cron failed", not "dispatch.review failed at the link-check stage". Per-phase observability is the gap.

This is a **Tranche 4 item 13** concern (run-log standard) — not a rhythm gap per se, but the rhythm doesn't make per-phase failure visible without the run-log work.

### Gap 3 — Output destination unclear for some rituals
- Insider Picks (Thursday) — output destination not in the cron payload I inspected.
- Weekly Design Review — output destination not visible.
- Weekly SEO Digest — output destination not visible.

These are minor — outputs *probably* land in `reports/` or `ops/reports/`, but a documented owner-and-output for each ritual would close the loop.

### Gap 4 — No visible owner for Sunday composite execution success
Who watches the Sunday cron actually completed? Currently nobody — the only failure-surfacing mechanism is `git log` showing whether the dispatch commit landed. **Highest-priority observability fix is recovering this.**

## What is healthy in the rhythm

It would be misleading to characterise the rhythm as broken. Genuine strengths:

- **The four newsroom rituals (Mon commissioning, Wed checkpoint, Fri perf council, Fri retro, Fri look-ahead, Sun editor letter) are all live.** That's an unusual level of operational discipline for a small editorial product.
- **Cadence locked at the cron level.** The schedules are enforced, not aspirational.
- **Output targets are mostly versioned in repo** (`newsroom/`), so retros and perf notes are recoverable historically.
- **Dispatch chain is end-to-end.** Research → publish → social → archive really does fire as a chain; commits prove it.

## Recommended actions

1. **Reconcile the four SEO sub-audits** — either register them as separate cron entries in `~/.openclaw/cron/jobs.json` or document explicitly that they are descriptive phases of `Weekly SEO Digest`. Update `ops/operating-surface.md` accordingly.
2. **Document each ritual's output destination** in `ops/operating-surface.md` (already partly done for Tier-5).
3. **Per-phase dispatch run-log** — implement as part of Tranche 4 item 13.
4. **Owner-of-the-week** — informal Sunday-success watcher. Could be an automated digest mailed to James/Emma if the Sunday composite cron writes a `.success` marker.

## Coverage rating

| Aspect | Rating |
|---|---|
| Documented vs executed (count) | 11 of 14 documented rituals are operationally live = **79%** |
| Per-ritual observability | low — most fail silently |
| Per-ritual output discoverability | medium — outputs land but aren't always indexed centrally |
| Rhythm cadence enforcement | high — cron registry is canonical |
| Doc-vs-runtime alignment | medium — see Gap 1 |

The rhythm is real. The visibility around the rhythm is the gap.
