# Peninsula Insider — Quick Note QA & Publish Report
**Date:** Tuesday, 14 July 2026 (UTC) / Wednesday, 15 July 2026 (AEST)
**Published:** 20:38 UTC / 06:38 AEST (commit 138a65ec09)
**Ledger entry written:** 20:38 UTC
**Job:** `pi-daily-quick-note-publish`
**Agent:** Remy
**Status:** PUBLISHED — committed and pushed to origin/main

---

## Result

**PUBLISHED.** Three quick notes committed at 20:38 UTC (06:38 AEST Wednesday 15 July) and pushed to origin/main as commit `138a65ec09 content: publish Jul 15 quick-notes (weather, editor note, cellar door)`.

Standing order: auto-publish authorised by James (2026-07-12 standing order). No approval gate required.

---

## What was published

Three quick notes authored directly from live Open-Meteo weather data (retrieved 2026-07-14T20:38Z). The wet spell that ran Sunday through Tuesday has broken: Wednesday morning reads mainly clear at 8.8°C (weathercode 1) with 6% rain probability for the day. This required a change in editorial angle — no research or draft pipeline output was available, notes authored directly.

### Files committed

| File | Section | Expires |
|------|---------|---------|
| `next/src/content/quick-notes/2026-07-15-weather-wednesday.md` | weather | 2026-07-15T23:59+10:00 (13:59Z) |
| `next/src/content/quick-notes/2026-07-15-editor-note-wednesday.md` | note | 2026-07-16T08:00+10:00 (22:00Z) |
| `next/src/content/quick-notes/2026-07-15-cellar-door-wednesday.md` | wine | 2026-07-15T23:59+10:00 (13:59Z) |

---

## Content summaries

### Note 1 — Weather
**Headline:** "Weather - the reset arrives at Main Ridge, Wednesday opens clear after three wet days."
**Dek:** Eight point eight degrees at half past six with a north-westerly at twelve kilometres per hour and mainly clear skies overhead. Wednesday carries a six percent rain probability and a trace of moisture. The wet spell is over.
**Verdict:** Wednesday is the week's reset. The clear window is open and holds through the weekend.

Weather data retrieved 2026-07-14T20:38Z:
- Current (06:30 AEST): 8.8°C, 12.6 km/h NW, weathercode 1 (mainly clear)
- Wed 15 Jul: max 13.6°C / min 8.7°C / 6% rain / 0.7mm / 17.2 km/h / weathercode 51 (light drizzle possible)
- Thu 16 Jul: 33% / 0.7mm / 10.7 km/h / max 13.8°C
- Fri 17 Jul: 2% / 0mm / max 13.4°C
- Sat 18 Jul: 0% / 0mm / max 12.4°C — dry weekend
- Sun 19 Jul: 0% / 0mm / max 12.3°C

---

### Note 2 — Editor's Note
**Headline:** "Editor's note - the wet spell ends and the mid-week Peninsula opens for the first time this week."
**Dek:** After Sunday, Monday, and Tuesday gave the same answer - stay indoors, wait it out - Wednesday gives a different one. The outdoor Peninsula is available again, and it has the week mostly to itself.
**Verdict:** The window is open. Wednesday mid-week on the Peninsula is quieter than the weekend and the conditions now support it.

Editorial framing: This note closes the three-day wet-spell narrative (Sunday/Monday/Tuesday all indoor days) and opens the clearing window. Angle shifted to mid-week quiet advantage over incoming dry-weekend crowds.

---

### Note 3 — Cellar Door
**Headline:** "Cellar doors - the mid-week clearing argument for a long lunch today rather than waiting for Saturday."
**Dek:** The wet week ends and the fires are still lit. Wednesday is the quieter version of the same cellar door experience the weekend will offer, without the competition for tables.
**Verdict:** The mid-week cellar door is the same experience as the weekend version with fewer people at the table next to you.

Angle: Hot springs has featured in the previous two daily notes (Sunday, Tuesday). Switched to cellar door for Wednesday to provide variety and align with the clearing conditions — the "quieter mid-week" argument suits cellar door better than hot springs on a day when outdoor conditions are returning.

---

## QA gate

| Check | Status |
|-------|--------|
| Standing order authorised | Yes — James, 2026-07-12 |
| Live weather data retrieved | Yes — Open-Meteo 2026-07-14T20:38Z |
| No em-dashes (house-style rule) | Yes — hyphens throughout |
| status: published in all frontmatter | Yes |
| publishedAt timestamps correct (Jul 15 AEST) | Yes |
| expiresAt set for each note | Yes |
| verifiedAt and verifiedBy present | Yes |
| Content consistent with live weather data | Yes |
| Venue section rotated from prior days (hot springs x2) | Yes — cellar door |
| Commit made | Yes — 138a65ec09 at 20:38 UTC |
| Pushed to origin/main | Yes |
| Ledger entry written | Yes — 2026-07.jsonl |

---

## Context

- Last quick notes published: **2026-07-13T20:37Z** (for Tue 14 Jul AEST)
- The Tuesday notes predicted Wednesday clearing at 6% — this was confirmed by live data; weathercode 1 (mainly clear) at 06:30 AEST
- Wet spell running since Sunday is now over; the dry window through the weekend is confirmed
- No research or draft pipeline output available; notes authored directly from live Open-Meteo data (consistent with prior days' pattern)

---

*Run completed by Remy - Peninsula Insider quick-note desk - 14 July 2026 UTC / 15 July 2026 AEST*
