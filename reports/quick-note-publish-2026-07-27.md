# Peninsula Insider — Quick Note QA & Publish Report
**Date:** Monday, 27 July 2026 (UTC) / Tuesday, 28 July 2026 (AEST)
**Published:** 20:35 UTC / 06:35 AEST (commit 41c3121e5f)
**Ledger entry written:** 20:40 UTC
**Job:** `pi-daily-quick-note-qa-publish`
**Agent:** Remy
**Status:** PUBLISHED — committed and pushed to origin/main

---

## Result

**PUBLISHED.** Three quick notes committed at 20:35 UTC (06:35 AEST Tuesday 28 July) and pushed to origin/main.

Standing order: auto-publish authorised by James (2026-07-12 standing order). No approval gate required.

---

## Context

Monday evening (18:52 AEST / 08:52 UTC) notes were already published in an earlier cron run (commit 7938b2fcef). Those three notes covered the Monday evening "last dry window before thunderstorms" story and have now expired or are expiring.

This run (20:35 UTC = 06:35 AEST Tuesday 28 July) produces the Tuesday morning edition for the storm day. No research or draft pipeline output was available — notes authored directly from live Open-Meteo data retrieved at 2026-07-27T20:35Z.

---

## Weather at retrieval

Open-Meteo Main Ridge (lat -38.40, lon 145.00) at 2026-07-27T20:35Z (= 06:30 AEST Tue 28 Jul):
- **Current:** 10.5°C, northerly 38.0 km/h (345°), weathercode 0 (clear sky pre-dawn)
- **Tue 28 Jul:** 100%/6.10mm, max 13.5°C, min 8.4°C, 41.2 km/h max, code 95 (thunderstorm)
- **Wed 29 Jul:** 98%/7.30mm, max 11.1°C, 42.1 km/h, code 80 (rain showers)
- **Thu 30 Jul:** 65%/2.10mm, max 11.0°C, 18.6 km/h
- **Fri 31 Jul:** 24%/1.20mm, max 11.9°C, 10.8 km/h
- **Sat 1 Aug:** 2%/0mm, max 12.8°C
- **Sun 2 Aug:** 8%/0mm, max 14.5°C

Key editorial story: Storm sequence arrives as forecast. Tuesday 100% + thunderstorm (code 95), Wednesday 98% + heavy showers. Two-day total 13.4mm. Easing Thu-Fri, near-dry weekend from Saturday. Section rotated to wine (cellar door) — last cellar-door Jul 18 (9 days gap, appropriate). Natural storm-day indoor argument.

---

## What was published

| File | Section | Tag | Expires |
|------|---------|-----|---------|
| `next/src/content/quick-notes/2026-07-28-weather-tuesday.md` | weather | weather | 2026-07-28T23:59+10:00 (13:59Z) |
| `next/src/content/quick-notes/2026-07-28-editor-note-tuesday.md` | note | editor-note | 2026-07-29T08:00+10:00 (22:00Z) |
| `next/src/content/quick-notes/2026-07-28-cellar-door-tuesday.md` | wine | editor-note | 2026-07-28T23:59+10:00 (13:59Z) |

---

## QA checks

- **House style:** Pre-commit hook ran and reported nothing to fix. No em-dashes, no schema errors.
- **Content schema:** Pre-commit hook passed clean.
- **Expiry windows:** Appropriate — weather and cellar-door expire end of Tuesday AEST, editor note expires Wednesday morning AEST.
- **Source data:** Live Open-Meteo retrieval at time of publication — not stale.
- **Section rotation:** wine (cellar-door) — last used Jul 18 (9 days). Last explore: Jul 20. Last spa: Jul 27. Rotation appropriate.
- **Commit:** 41c3121e5f pushed to origin/main.

---

## Verification

Post-publish checks per `ops/post-publish-verification-checklist.md`: these are content files (not rendered pages with canonical tags), so full HTTP/canonical checks apply on deploy. Pre-commit schema and house style checks passed. Content authored from verified live weather data with source citations embedded.

**Verification result:** passed (pre-commit schema + house style gates; deploy verification deferred to GitHub Actions).
