# Peninsula Insider — Quick Note QA & Publish Report
**Date:** Friday, 17 July 2026 (UTC) / Saturday, 18 July 2026 (AEST)
**Published:** 20:40 UTC / 06:40 AEST (commit a79687af4f)
**Ledger entry written:** 20:40 UTC
**Job:** `pi-daily-quick-note-publish`
**Agent:** Remy
**Status:** PUBLISHED — committed and pushed to origin/main

---

## Result

**PUBLISHED.** Three quick notes committed at 20:40 UTC (06:40 AEST Saturday 18 July) and pushed to origin/main as commit `a79687af4f content: publish Jul 18 quick-notes (weather, editor note, cellar door)`.

Standing order: auto-publish authorised by James (2026-07-12 standing order). No approval gate required.

---

## What was published

Three quick notes authored directly from live Open-Meteo weather data (retrieved 2026-07-17T20:37Z). No research or draft pipeline output was available for today - notes authored directly as per the pattern. Section rotated to `wine` (cellar door) following explore/coastal-walk (Jul 17), cellar-door (Jul 15), and hot-springs (Jul 12, 14). Saturday is the natural cellar door day on the Peninsula.

Key editorial story: the dry window has extended from four days (as reported Friday) to five days - Sat through Tue are effectively dry, with rain arriving Wed 22 Jul at 73% / 2.8mm.

### Files committed

| File | Section | Expires |
|------|---------|---------|
| `next/src/content/quick-notes/2026-07-18-weather-saturday.md` | weather | 2026-07-18T23:59+10:00 (13:59Z) |
| `next/src/content/quick-notes/2026-07-18-editor-note-saturday.md` | note | 2026-07-19T08:00+10:00 (22:00Z) |
| `next/src/content/quick-notes/2026-07-18-cellar-door-saturday.md` | wine | 2026-07-18T23:59+10:00 (13:59Z) |

---

## Content summaries

### Note 1 — Weather
**Headline:** "Weather - six point nine degrees at Main Ridge on Saturday morning, the dry block has extended to five days."
**Dek:** Six point nine degrees at half past six with a north-north-westerly at six point five kilometres per hour and partly cloudy overhead. Saturday carries zero rain probability. The window now runs through Tuesday before rain arrives Wednesday.
**Verdict:** Saturday is dry. Sunday and Monday are dry. Tuesday reads at two percent - effectively dry.

Weather data retrieved 2026-07-17T20:37Z:
- Current (06:30 AEST 18 Jul): 6.9°C, 6.5 km/h NNW (332°), weathercode 2 (partly cloudy)
- Sat 18 Jul: max 13.1°C / min 6.8°C / 0% rain / 0mm / 11.5 km/h max / weathercode 3 (overcast)
- Sun 19 Jul: max 13.5°C / min 5.5°C / 0% / 0mm / 14.3 km/h / weathercode 3
- Mon 20 Jul: max 13.3°C / min 8.5°C / 0% / 0mm / 17.1 km/h / weathercode 3
- Tue 21 Jul: max 13.1°C / min 9.4°C / 2% / 0mm / 19.1 km/h / weathercode 3
- Wed 22 Jul: 73% / 2.8mm / max 14.8°C - rain returns
- Thu 23 Jul: 41% / 8.9mm / max 9.6°C

---

### Note 2 — Editor's Note
**Headline:** "Editor's note - Saturday is the second morning of the dry run, and the window has extended to five days."
**Dek:** Zero rain probability today, Sunday, and Monday. Tuesday now reads at two percent - effectively dry. The window has grown since Friday's note and the weekend is fully inside it.
**Verdict:** The dry window has extended to five days. Saturday through Tuesday are all effectively dry.

Editorial framing: Friday's note confirmed four dry days. Saturday's retrieval adds Tuesday (2% / 0mm - effectively dry). The story is the extension and what it means for the week: the whole weekend is inside the window with room to spare. Rain arrives Wednesday.

---

### Note 3 — Cellar Door (Wine)
**Headline:** "Cellar door - the mid-winter Peninsula argument for a Saturday in wine country when the conditions are calm."
**Dek:** Overcast and six point five kilometres per hour. Zero rain probability. The Peninsula's cellar doors read differently in this kind of weather than they do in summer - quieter, and often better.
**Verdict:** Calm, overcast, and dry. Saturday on the Peninsula is the mid-winter cellar door argument.

Section: `wine` - selected for natural weekend fit (Saturday is prime cellar door day). Last used cellar-door: Jul 15 (Wed). Last used hot-springs: Jul 14. Last used explore: Jul 17 (Fri). Rotation appropriate.

---

## QA gate

| Check | Status |
|-------|--------|
| Standing order authorised | Yes - James, 2026-07-12 |
| Live weather data retrieved | Yes - Open-Meteo 2026-07-17T20:37Z |
| No em-dashes (house-style rule) | Yes - hyphens throughout; pre-commit confirmed clean |
| status: published in all frontmatter | Yes |
| publishedAt timestamps correct (Jul 18 AEST) | Yes |
| expiresAt set for each note | Yes |
| verifiedAt and verifiedBy present | Yes |
| Content consistent with live weather data | Yes |
| Venue section rotated (wine/cellar-door) | Yes |
| Schema auto-fix applied | Yes - verdict fields trimmed to limit, tag normalised on cellar-door note |
| Commit made | Yes - a79687af4f at 20:40 UTC |
| Pushed to origin/main | Yes |
| Ledger entry written | Yes - 2026-07.jsonl |

---

## Context

- Last quick notes published: **2026-07-16T20:40Z** (for Fri 17 Jul AEST) - consistent daily cadence maintained
- Dry window extended: Friday's note reported four days (Fri-Mon); Saturday's live data confirms five days (Fri-Tue, with Tue at 2%)
- Rain returns Wed 22 Jul at 73% / 2.8mm; Thu 23 Jul at 41% / 8.9mm
- No research or draft pipeline output available; notes authored directly from live Open-Meteo data
- Section rotation: weather, editor-note, wine (cellar door) - appropriate for Saturday

---

*Run completed by Remy - Peninsula Insider quick-note desk - 17 July 2026 UTC / 18 July 2026 AEST*
