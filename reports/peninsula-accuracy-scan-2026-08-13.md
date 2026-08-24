# Peninsula Insider accuracy scan — 13 August 2026

## Result

- Scan complete; no accuracy issues requiring action found.
- Safe auto-fix: 0
- Needs approval: 0
- Needs verification: 0
- Content edits: none

## Checks performed

- Reviewed the homepage, What’s On, current editorial surfaces, event source files, and live build output named by the job configuration.
- Confirmed the current dated editorial recommendation: Red Hill Brewery Secret Stash Weekend is listed for Saturday 15 and Sunday 16 August 2026, matching its published event record (`startDate` 2026-08-15, `endDate` 2026-08-16).
- Confirmed the expired Peninsula Hot Springs Bathe-in Cinema Thursdays record is archived through 31 July 2026 and is not an active event record.
- Confirmed current August event records inspected are published and date-valid for the scan date, including MPRG exhibitions through 23 August and Red Hill Brewery through 16 August.
- No reportable stale date, structured/editorial mismatch, route issue, or seasonal-context drift was identified.

## Source/configuration

- `docs/peninsula-insider-daily-accuracy-scan-spec-2026-04-14.md`
- `ops/editorial-jobs.json` — `pi-daily-accuracy-scan`
- Scan date: 2026-08-13 UTC
- Repository refreshed with `git pull --ff-only origin main` before inspection.
