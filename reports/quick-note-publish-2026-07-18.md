# Peninsula Insider — Quick Note QA & Publish Report
**Date:** Saturday, 18 July 2026 (UTC) / Sunday, 19 July 2026 (AEST)
**Published:** 20:40 UTC / 06:40 AEST (commit bb8e9bda15)
**Ledger entry written:** 20:45 UTC
**Job:** `pi-daily-quick-note-publish`
**Agent:** Remy
**Status:** PUBLISHED — committed and pushed to origin/main

---

## Result

**PUBLISHED.** Three quick notes committed at 20:40 UTC (06:40 AEST Sunday 19 July) and pushed to origin/main as commit `bb8e9bda15 content: publish Jul 19 quick-notes (weather, editor note, hot springs)`.

Standing order: auto-publish authorised by James (2026-07-12 standing order). No approval gate required.

---

## What was published

Three quick notes authored from live Open-Meteo weather data (retrieved 2026-07-18T20:37Z). No research or draft pipeline output was available for today - notes authored directly as per the standing pattern.

Key editorial story: Sunday is the last morning of the dry weekend. Saturday's note confirmed five dry days with Tuesday at 2%. Sunday's retrieval has cleaned Tuesday to 0% - the window has held across all three remaining days. Rain arrives Wednesday at 69%/2.2mm, Thursday at 75%/9.5mm (heavier than forecast on Saturday). Section rotated to `spa` (hot springs) - natural fit for a dry, cold Sunday; last used Jul 14 (five days gap, appropriate).

### Files committed

| File | Section | Expires |
|------|---------|---------|
| `next/src/content/quick-notes/2026-07-19-weather-sunday.md` | weather | 2026-07-19T23:59+10:00 (13:59Z) |
| `next/src/content/quick-notes/2026-07-19-editor-note-sunday.md` | note | 2026-07-20T08:00+10:00 (22:00Z) |
| `next/src/content/quick-notes/2026-07-19-hot-springs-sunday.md` | spa | 2026-07-19T23:59+10:00 (13:59Z) |

---

## Content summaries

### Note 1 — Weather
**Headline:** "Weather - seven point one degrees at Main Ridge on Sunday morning, the dry window enters its third day."
**Dek:** Seven point one degrees at half past six with a northerly at six kilometres per hour and overcast overhead. Sunday carries zero rain probability. The window reads three clean days - Sunday, Monday, and Tuesday - before rain arrives Wednesday.
**Verdict:** Sunday is dry. Monday and Tuesday are dry. Rain arrives Wednesday at 69 percent.

Weather data retrieved 2026-07-18T20:37Z:
- Current (06:30 AEST 19 Jul): 7.1°C, 6.0 km/h N (5°), weathercode 3 (overcast)
- Sun 19 Jul: max 13.3°C / min 5.0°C / 0% rain / 0mm / 13.5 km/h max / weathercode 3 (overcast)
- Mon 20 Jul: max 14.0°C / min 8.1°C / 0% / 0mm / 17.5 km/h / weathercode 3
- Tue 21 Jul: max 12.9°C / min 9.5°C / 0% / 0mm / 20.0 km/h / weathercode 3 (cleaned from 2% Sat)
- Wed 22 Jul: 69% / 2.2mm / max 14.2°C - rain returns (slightly lower than Sat's 73%/2.8mm)
- Thu 23 Jul: 75% / 9.5mm / max 9.8°C (heavier than Sat's 41%/8.9mm)

---

### Note 2 — Editor's Note
**Headline:** "Editor's note - Sunday is the last morning of the dry weekend, with three clean days still ahead."
**Dek:** Saturday and Sunday land inside the same dry window. Monday and Tuesday hold at zero percent. Rain arrives Wednesday. This is the close of the mid-winter clear run the Peninsula has carried since Friday.
**Verdict:** Sunday, Monday, and Tuesday are dry. Rain arrives Wednesday at 69 percent. This closes the dry run.

Editorial framing: The five-day dry block confirmed. Tuesday cleaned from 2% to 0% overnight. The narrative is the close of the run - Sunday is the last morning of the weekend inside it. Rain arriving Wednesday is sharper than forecast on Saturday (Thursday now at 75%/9.5mm vs prior 41%/8.9mm). The window is the story; the closing is the editorial moment.

---

### Note 3 — Hot Springs (Spa)
**Headline:** "Peninsula Hot Springs - the dry winter Sunday argument, when cold without rain is the right configuration."
**Dek:** Seven point one degrees, zero rain probability, overcast and still. The cold without the wet is the best configuration the hot springs get in winter. Sunday is the day.
**Verdict:** Book ahead for Sunday bathing. Dry, cold, and still - the right configuration for Peninsula Hot Springs.

Section: `spa` (hot springs) - selected for natural Sunday fit and differentiation from wet-Sunday note (Jul 12). The editorial argument is the inverse of Jul 12 - this is a dry cold Sunday, not shelter from rain but a chosen activity in good conditions. Last hot-springs note: Jul 14 (five days prior). Rotation appropriate.

---

## QA gate

| Check | Status |
|-------|--------|
| Standing order authorised | Yes - James, 2026-07-12 |
| Live weather data retrieved | Yes - Open-Meteo 2026-07-18T20:37Z |
| No em-dashes (house-style rule) | Yes - pre-commit hook confirmed clean |
| status: published in all frontmatter | Yes |
| publishedAt timestamps correct (Jul 19 AEST) | Yes |
| expiresAt set for each note | Yes |
| verifiedAt and verifiedBy present | Yes |
| Content consistent with live weather data | Yes |
| Venue section rotated (spa/hot-springs) | Yes - last used Jul 14 |
| Pre-commit checks | Passed - house style clean, schema clean |
| Commit made | Yes - bb8e9bda15 at 20:40 UTC |
| Pushed to origin/main | Yes (rebase required against 9fbdf5db08) |
| Ledger entry written | Yes - 2026-07.jsonl |

---

## Context

- Last quick notes published: **2026-07-17T20:40Z** (for Sat 18 Jul AEST) - consistent daily cadence maintained
- Dry window update: Saturday's note confirmed 5 days (Fri-Tue with Tue at 2%); Sunday's live data has Tue at 0% - window cleaned
- Rain returns Wed 22 Jul at 69%/2.2mm; Thu 23 Jul at 75%/9.5mm (heavier than previous forecast)
- No research or draft pipeline output available; notes authored directly from live Open-Meteo data
- Section rotation: weather, editor-note, spa (hot springs) - appropriate for Sunday

---

*Run completed by Remy - Peninsula Insider quick-note desk - 18 July 2026 UTC / 19 July 2026 AEST*
