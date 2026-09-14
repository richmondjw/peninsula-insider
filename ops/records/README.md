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
