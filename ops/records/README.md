# ops/records — things that were observed, not things that were derived

`ops/reports/` holds **reports**: files a build regenerates from the tree. They are
disposable by design. The standing instruction when working in this repository is
"build artefacts rewritten by the build: `next/public/admin/media-registry.json` and
everything under `ops/reports/` — revert before committing", and that instruction is
correct, because every one of those files can be reproduced by running the build again.

`ops/records/` holds **records**: files that are the only surviving trace of something a
human or a scheduled job actually did. Nothing here is reproducible from the tree. A
record cannot be regenerated; reverting one destroys evidence.

The distinction is not filing neatness. On 2026-09-14 five evidence rows citing URLs
nobody had ever fetched passed a local build. The probe record that was supposed to catch
them was filed under `ops/reports/`, so it was treated — by tooling, by convention, and in
the end by a person — as regenerable build output. Reverting the build artefacts and
re-running is what exposed the rows.

## The rules

1. **A build never writes anything under `ops/records/`.** Not a gate, not a lint, not an
   `astro build` side effect. If a build step needs to write, it writes to `ops/reports/`.
2. **A gate never asserts against a file its own build produced.** Gates read records and
   committed baselines; they write reports.
3. **Every record says who wrote it and when.** A row with no provenance is not a record of
   anything, and the readers here refuse such rows rather than trusting them.
4. **Writing a record is a deliberate act with its own command**, separate from the command
   that checks it, so that "make the check pass" and "write down what I saw" can never be
   the same keystroke.

## What lives here

| Path | Written by | Read by |
|---|---|---|
| `link-health/probe-ledger.json` | `next/scripts/probe-link-health.mjs` (human or scheduled job; touches the network) | `next/scripts/audit-link-health.mjs` (offline gate), `next/scripts/apply-link-dispositions.mjs` |

## What does not live here yet

Auditing every gate in `npm run build` on 2026-09-14 turned up no other gate asserting
against an artefact its own build produces: the only files a build rewrites are
`next/public/admin/media-registry.json` and five reports, none of which is anyone's
evidence or ceiling. One thing is still filed in `ops/reports/` that by the definition
above is not a report. It cannot be manufactured by a build, so it is not the 2026-09-14
defect, and it is left where it is rather than moved by a pull request about something
else:

- **`ops/reports/migrations/migration-ledger.json`** — a hand-maintained record of which
  migrations have been applied, which no program writes. The tree cannot reproduce it. If
  the wholesale revert reaches it, `assert:migration-ledger` fails closed and loudly,
  which is why this is a filing problem rather than a silent one.

The ratchet baselines were listed here too, as the second thing filed in `ops/reports/`
that is not a report. They have since moved — but not to here. A baseline is neither
observed nor derived: it is committed policy, a ceiling somebody chose, and this directory
is for evidence. They live in [`ops/baselines/`](../baselines/README.md), and
`assert:baseline-placement` fails any build that files one under `ops/reports/` again.
