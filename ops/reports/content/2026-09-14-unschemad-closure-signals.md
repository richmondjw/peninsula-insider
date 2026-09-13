# Closure signals the build cannot see: a corpus survey

PI-007 (GitHub issue #368), register item A6, second half. Branch `pi/007-la-baracca`.
Companion to `2026-09-14-la-baracca-false-closure.md`, which handles the one restaurant.
This file answers the wider question: **the defect class is a stripped field, not one venue — how
many others are there?**

Scan performed 2026-09-14 over the working tree, all 24 glob-loaded collections, 1,976 records.

## Answer

**One. It was La Baracca, and it is the only one there has ever been in the venue corpus.**

That is not asserted from a grep. `next/scripts/lint-unschemad-closure-signals.mjs`, added on this
branch, was run against the tree as it stood at `6fcfe92bc0~1` — the last commit before
`operatingStatus` was declared in `next/src/content.config.ts`, which is the exact tree in which the
defect was live and undetectable:

```
Unschema'd closure signals - 138 files across 1 collections

  closures written where the schema will discard them
    distinct key paths .......... 1   [gated, per key path]
    records affected ............ 1

    HIDDEN  venues.operatingStatus  "permanently-closed"
            src/content/venues/la-baracca-tgallant.json
```

One record, one key path, out of 138 venues. Against the current tree the same gate reports zero
across all 1,968 glob-loaded records in all 24 collections, because `operatingStatus` and
`closureNote` are now declared and the La Baracca marker is gone.

## The wider sweep, including fields the schema does read

The gate above only looks at undeclared fields, so it would say nothing about a closure written
somewhere visible but inconsistent. A second sweep applied the same closure vocabulary to every
string in every record regardless of whether the schema declares its key. Twelve hits, all
accounted for:

| Record | Where | `status` | `operatingStatus` | Verdict |
|---|---|---|---|---|
| `venues/maxs-red-hill-estate.json` | `status`, `operatingStatus`, `signature` | `permanently_closed` | `permanently-closed` | **Consistent.** Both fields agree, the prose agrees, and PI-007 sourced the closure to two news outlets. Nothing to do. |
| `venues/ouest-france-bistro.json` | `status`, `operatingStatus`, `signature`, `editorNote`, `closureNote` | `permanently_closed` | `verify-open` | **Self-contradictory, and live.** See below. |
| `venues/crittenden-villas.json` | `editorNote` | absent (active) | absent | **Correct as written.** The prose says *Stillwater at Crittenden* — a different entity — is closed, and PI-007 verified both halves: Stillwater is closed, the villas trade. A closure in prose about a neighbour is not a closure of the record. |
| `articles/dog-friendly-beaches-mornington-peninsula.mdx`, `articles/mornington-peninsula-beach-guide.mdx` | body | — | — | The toilet at Flinders Ocean Beach, sourced to Parks Victoria. Not a business. |
| `articles/rainy-day-peninsula.md` | body | — | — | "a wet weekend will shut down a few of the options" — weather prose. |
| `articles/where-to-eat-mornington-peninsula.mdx` | body | — | — | Stillwater at Crittenden, correctly described, with a verify-before-visiting note. |

Nothing here is hidden from the build. Every venue-level hit is in a field
`next/src/content.config.ts` declares, and the article hits are body prose, which no status
predicate reads.

### The one that is worth an editor: `venues/ouest-france-bistro.json`

It carries `status: permanently_closed` and `operatingStatus: verify-open` simultaneously. Both are
declared, so both survive to the build, and `isPermanentlyClosed` ORs them — so the record is
delisted from every listing surface and renders a closure notice, while the field beside it says
nobody has confirmed it is shut. PI-007 recorded that Tripadvisor, OpenTable and AGFG all carry it
as trading, at a different address from the one on file, and declined to reverse the `status`
because a wrong address leaves open the possibility of two different businesses.

That is unresolved, not resolved, and it is the same shape as La Baracca: a business that may be
trading, marked closed by this site, on a desk judgement nobody has re-checked. It is **not** fixed
here — the address ambiguity is a genuine editorial call, and this branch is already reversing one
closure. Flagged, with the recommendation in the companion report.

No gate catches this one, and deliberately so: a lint can see that two declared fields disagree, but
it cannot see which of them is right, and failing the build over a disagreement would just teach
someone to delete the honest field. It needs a person.

## The gate

`next/scripts/lint-unschemad-closure-signals.mjs`, wired into `npm run build` as
`assert:unschemad-closures`, immediately after `assert:schema-drift`.

**Why a second gate when `audit-content-schema-drift.mjs` exists.** The drift gate counts *key
names*, and its ratchet then licenses the nineteen ghost keys already in the corpus at their current
counts — `venues.faq` at 21, `venues.openingHours` at 2, and so on. A closure written into the
*value* of an already-baselined ghost key changes no count and passes drift clean.
`"openingHours": "Permanently closed"` on a record that already carries `openingHours` is invisible
to drift by construction, and it is exactly the shape an editor reaches for. This gate asks the
narrower question: not "is this key declared?" but "does this discarded value say the business is
shut?".

**Contract**, matching `audit-content-schema-drift.mjs` and `audit-closed-venue-leaks.mjs`:

- Report-only by default; `--assert` compares against
  `ops/reports/content/unschemad-closure-baseline.json` and exits 1 on regression.
- The ratchet is per `collection.keyPath`: a key path already in the baseline may not carry the
  signal on more records than its ceiling, and a key path **not** in the baseline fails on its first
  appearance.
- Fails closed. An unreadable config or a missing baseline is a failure, never a clean pass.
- `--update-baseline` re-seeds, deliberately and visibly.

**The baseline is seeded empty** (`"ceilings": {}`). There is no inherited debt in this class, so the
gate starts fully tight: the very next closure written into an undeclared field fails the build.

**Nothing here is time-driven.** The schemas come from `src/content.config.ts` and the values come
from the content files. Same tree, same answer, today and next April, on any machine. No date is
read, and nothing expires.

**The vocabulary is narrow on purpose.** It matches permanent closure only — `permanently closed` in
all three separator spellings, `ceased trading`, `no longer trading`, `out of business`,
`closed down`, `shut its doors`, and a handful of near neighbours. A venue closed on Mondays, closed
for winter, in a closed fishing season, temporarily closed for renovations, or with closed-loop
irrigation is not closed, and each of those is an explicit exclusion with a test. A gate that cries
about a seasonal cellar door is a gate people learn to skip.

**What it cannot do.** It cannot tell whether a business is open. The marker it is named after
turned out to be wrong about a restaurant that trades daily. All this gate does is refuse to let a
closure hide where the build cannot see it; whether the closure is *true* is still a person's job,
and the failure message says so.

12 tests in `next/scripts/lint-unschemad-closure-signals.test.mjs`, including the real La Baracca
record asserted against a schema that does not declare `operatingStatus` — if that test ever stops
failing the gate has stopped working — the ghost-key-value gap the drift baseline licenses, every
false-positive exclusion, both fail-closed paths, the ratchet in both directions, and a check that
the live corpus is genuinely clean so the gate is asserting something true rather than passing
vacuously.
