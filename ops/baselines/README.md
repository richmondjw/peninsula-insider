# ops/baselines — ceilings somebody chose, not numbers anybody measured

Every file here is a **ratchet baseline**: a committed statement of how much of a known
defect a gate will tolerate. `link-health-baseline.json` says one dead source URL may be
cited; `claim-support-baseline.json` says the `accessibility` claim class may carry
twenty-nine claims with no standing evidence. The gates read these ceilings, count what
the tree actually has, and fail when the count exceeds the ceiling.

That makes a baseline **policy**. It is not observed — no probe produced these numbers.
It is not derived — no build can recompute them from the tree, because the correct value
is not a fact about the tree, it is a decision about how much debt is tolerable while it
is being paid down. A person chose each one, and a person changes it.

## Why this is not under `ops/reports/`

`ops/reports/` is build output. Every file there can be reproduced by running the build
again, which is why the standing instruction when working in this repository is to revert
it wholesale before committing:

```
git checkout -- ops/reports
```

That instruction is correct for reports and it is dangerous for ceilings. Ratcheting a
gate **down** — tightening it, the thing this whole mechanism exists to make possible —
is an edit to a committed JSON file. Until it is staged, it is indistinguishable from
build noise. The habitual cleanup would have discarded it silently, leaving the gate
looser than its author intended, with no error, no diff and nothing anywhere to say the
tightening had ever happened. A loosening survives the same cleanup just as silently, and
is worse.

Nothing in this directory is ever written by a build, so nothing in this directory is ever
reverted by that cleanup. That is the entire point of the move.

This is the same reasoning that put the link-health probe record in
[`ops/records/`](../records/README.md), applied to the other half of the problem: records
are evidence a build must not be able to manufacture, baselines are policy a build must
not be able to erase. Reports are what is left.

## The rules

1. **A build never writes anything under `ops/baselines/`.** Gates read ceilings and write
   reports. Refreshing a baseline is `--update-baseline`, a separate deliberate command
   that a human runs and then reviews in the diff.
2. **Every baseline is a reviewed decision.** A ratchet that moves up is debt being taken
   on and belongs in a commit message that says why. `--update-baseline` exists to reseed
   a baseline after a measurement change, not to make a failing build pass.
3. **Ratchets fall.** Each of these is meant to reach the value at which it can be deleted
   and replaced with a plain assertion. Several already carry that instruction in their
   own `note` field.
4. **A baseline file never appears under `ops/reports/`.** `assert:baseline-placement`
   (`next/scripts/assert-baseline-placement.mjs`) fails the build if one does, so the
   convention does not depend on anybody remembering it.

## What lives here

| File | Gate that reads it | Refreshed by |
|---|---|---|
| `claim-support-baseline.json` | `npm run assert:claim-support` | `node scripts/audit-claim-support.mjs --update-baseline` |
| `closed-venue-leak-baseline.json` | `npm run assert:closed-venues` | `node scripts/audit-closed-venue-leaks.mjs --update-baseline` |
| `commercial-firewall-baseline.json` | `npm run assert:commercial-firewall` | `node scripts/audit-commercial-firewall.mjs --update-baseline` |
| `event-safeguards-baseline.json` | `npm run assert:event-safeguards` | `node scripts/audit-event-safeguards.mjs --update-baseline` |
| `link-health-baseline.json` | `npm run assert:link-health` | `node scripts/audit-link-health.mjs --update-baseline` |
| `link-loser-baseline.json` | `ops/scripts/seo/build-url-ledger.mjs` | hand-edited |
| `media-provenance-baseline.json` | `npm run assert:media-provenance` | `node scripts/audit-media-provenance.mjs --update-baseline` |
| `migration-ledger-baseline.json` | `npm run assert:migration-ledger` | `node scripts/audit-migration-ledger.mjs --update-baseline` |
| `provenance-dates-baseline.json` | `npm run assert:provenance-dates` | `node scripts/audit-provenance-dates.mjs --update-baseline` |
| `schema-drift-baseline.json` | `npm run assert:schema-drift` | `node scripts/audit-content-schema-drift.mjs --update-baseline` |
| `seo-architecture-baseline.json` | `npm run lint:seo-architecture` | hand-edited |
| `unschemad-closure-baseline.json` | `npm run assert:unschemad-closures` | `node scripts/lint-unschemad-closure-signals.mjs --update-baseline` |

The `npm run` commands are run from `next/`. The ten gates with a `--update-baseline`
refresh also accept `--baseline <path>`, which is how their tests point them at a fixture
instead of the real ceiling. The two hand-edited ones — `lint-seo-architecture.mjs` and
`ops/scripts/seo/build-url-ledger.mjs` — hardcode their path and take no override.

## What does not live here

- **`ops/reports/seo/baseline.md`** is a frozen SEO measurement from 2026-05-01 — a
  snapshot of what search traffic was, not a ceiling anything asserts against. It is
  evidence, and nothing reads it, so it stays where it was captured.
- **`ops/data/gsc-coverage-baseline.json`** is rewritten by `gsc-coverage-monitor.py` on
  every run. It is a rolling observation, not policy, and `ops/data/` is untracked.
- **`next/scripts/check-css-budget.mjs`** keeps its `BASELINE` inline in the script. It is
  the same idea, and it is deliberately in the file whose budget it guards.
