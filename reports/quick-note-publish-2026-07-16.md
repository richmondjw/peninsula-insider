# Peninsula Insider — Quick Note QA & Publish Report
**Date:** Thursday, 16 July 2026 (UTC) / Friday, 17 July 2026 (AEST)
**Published:** 20:40 UTC / 06:40 AEST (commit 01deaf9447)
**Ledger entry written:** 20:40 UTC
**Job:** `pi-daily-quick-note-publish`
**Agent:** Remy
**Status:** PUBLISHED — committed and pushed to origin/main

---

## Result

**PUBLISHED.** Three quick notes committed at 20:40 UTC (06:40 AEST Friday 17 July) and pushed to origin/main as commit `01deaf9447 content: publish Jul 17 quick-notes (weather, editor note, coastal walk)`.

Standing order: auto-publish authorised by James (2026-07-12 standing order). No approval gate required.

---

## What was published

Three quick notes authored directly from live Open-Meteo weather data (retrieved 2026-07-16T20:39Z). No research or draft pipeline output was available for today - notes authored directly as per the pattern. Section rotated to `explore` (coastal walk) following hot-springs (Jul 12, 14) and cellar-door (Jul 15).

### Files committed

| File | Section | Expires |
|------|---------|---------|
| `next/src/content/quick-notes/2026-07-17-weather-friday.md` | weather | 2026-07-17T23:59+10:00 (13:59Z) |
| `next/src/content/quick-notes/2026-07-17-editor-note-friday.md` | note | 2026-07-18T08:00+10:00 (22:00Z) |
| `next/src/content/quick-notes/2026-07-17-coastal-walk-friday.md` | explore | 2026-07-17T23:59+10:00 (13:59Z) |

---

## Content summaries

### Note 1 — Weather
**Headline:** "Weather - eight degrees and still at Main Ridge, Friday opens a four-day dry block."
**Dek:** Eight degrees at half past six with a north-north-easterly at under six kilometres per hour and partly cloudy overhead. Friday carries zero rain probability. The dry run through the weekend and into Monday is confirmed.
**Verdict:** Four dry days from Friday to Monday. Rain returns Wednesday. The weekend ahead is the week's main event.

Weather data retrieved 2026-07-16T20:39Z:
- Current (06:30 AEST): 8.0°C, 5.7 km/h NNE, weathercode 2 (partly cloudy)
- Fri 17 Jul: max 12.8°C / min 7.9°C / 0% rain / 0mm / 10.7 km/h max / weathercode 3 (overcast)
- Sat 18 Jul: 0% / 0mm / max 12.5°C / 14.4 km/h / weathercode 3
- Sun 19 Jul: 0% / 0mm / max 13.0°C / 10.6 km/h / weathercode 3
- Mon 20 Jul: 0% / 0mm / max 13.1°C / 19.4 km/h
- Tue 21 Jul: 4% / 0mm / max 12.9°C
- Wed 22 Jul: 53% / 1.6mm - rain returns
- Thu 23 Jul: 42% / 2.9mm

---

### Note 2 — Editor's Note
**Headline:** "Editor's note - Friday opens four dry days on the Peninsula, and the weekend arrives without the usual trade-off."
**Dek:** Zero rain probability across Friday, Saturday, Sunday, and Monday. The Peninsula has not had a four-day dry run in the past week. The question is what to do with it.
**Verdict:** A Friday start into a clean four-day Peninsula window. The dry block runs through Monday - the whole weekend is inside it.

Editorial framing: The wet week (Sun-Tue) earned a clean run at the other end. The angle inverts the usual mid-week quiet vs weekend crowd framing - when the entire block is dry, all four days hold equally.

---

### Note 3 — Coastal Walk (Explore)
**Headline:** "Coastal walks - the calm and overcast Friday argument for the cliff tracks and foreshore paths today."
**Dek:** Five point seven kilometres per hour at Main Ridge this morning and zero rain probability through the weekend. Overcast and still is often the best version of the Peninsula coast.
**Verdict:** Calm conditions on Friday morning make today one of the better days for the Peninsula's coastal and cliff-top tracks. The four-day dry block means Saturday and Sunday hold the same.

Section: `explore` - selected to rotate from hot-springs (used Jul 12 and Jul 14) and cellar-door (Jul 15). Overcast/calm mid-winter coastal conditions are the editorial hook.

---

## QA gate

| Check | Status |
|-------|--------|
| Standing order authorised | Yes - James, 2026-07-12 |
| Live weather data retrieved | Yes - Open-Meteo 2026-07-16T20:39Z |
| No em-dashes (house-style rule) | Yes - hyphens throughout |
| status: published in all frontmatter | Yes |
| publishedAt timestamps correct (Jul 17 AEST) | Yes |
| expiresAt set for each note | Yes |
| verifiedAt and verifiedBy present | Yes |
| Content consistent with live weather data | Yes |
| Venue section rotated (explore, not spa or wine) | Yes |
| Commit made | Yes - 01deaf9447 at 20:40 UTC |
| Pushed to origin/main | Yes |
| Ledger entry written | Yes - 2026-07.jsonl |

---

## Context

- Last quick notes published: **2026-07-14T20:38Z** (for Wed 15 Jul AEST) - gap of approx. 48 hours; Thu 16 Jul AEST had no notes
- Four-day dry block (Fri-Mon) is the dominant editorial story this week
- Wet spell (Sun 12 - Tue 14 Jul AEST) now fully resolved; dry window confirmed through Mon 20 Jul
- Rain returns Wed 22 Jul at 53% / 1.6mm; Thu 23 Jul at 42% / 2.9mm
- No research or draft pipeline output available; notes authored directly from live Open-Meteo data

---

*Run completed by Remy - Peninsula Insider quick-note desk - 16 July 2026 UTC / 17 July 2026 AEST*
