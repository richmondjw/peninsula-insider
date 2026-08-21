# Peninsula Insider — Quick Note QA & Publish Report
**Date:** Sunday, 12 July 2026  
**Published:** 02:45 UTC / 12:45 AEST (commit 96d08fc12c)  
**Ledger entry written:** 20:35 UTC (retrospective — cron standing order)  
**Job:** `pi-daily-quick-note-publish`  
**Agent:** Remy  
**Status:** ✅ PUBLISHED — committed and pushed to origin/main

---

## Result

**PUBLISHED.** Three quick notes committed at 02:45 UTC (12:45 AEST Sunday 12 July) and pushed to origin/main as part of commit `96d08fc12c content: publish Jul 12 quick-notes + autofix reports`.

Standing order: auto-publish authorised by James (2026-07-12 standing order). No approval gate required.

---

## What was published

Three quick notes authored directly from live Open-Meteo weather data (retrieved 2026-07-11T20:40Z) and the active events list.

### Files committed

| File | Section | Expires |
|------|---------|---------|
| `next/src/content/quick-notes/2026-07-12-weather-sunday.md` | weather | 2026-07-12T23:59+10:00 (expired 13:59Z) |
| `next/src/content/quick-notes/2026-07-12-editor-note-sunday.md` | note | 2026-07-13T08:00+10:00 (expires 22:00Z) |
| `next/src/content/quick-notes/2026-07-12-hot-springs-sunday.md` | spa | 2026-07-12T23:59+10:00 (expired 13:59Z) |

---

## Content summaries

### Note 1 — Weather
**Headline:** "Weather — a committed wet Sunday at Main Ridge, the week's dry window arrives mid-week."  
**Dek:** Nine degrees at 6:30am with a north-westerly at thirty-one kilometres per hour. Today carries one-hundred percent rain probability and nearly eight millimetres expected. Wednesday is the first properly dry day.  
**Verdict:** Use today for one indoor booking. The dry window opens Wednesday and holds through next weekend.

Weather data: Sunday max 12.1°C / 100% rain / 7.8mm / 35.4 km/h winds. Monday thunderstorm (10.6mm). Tuesday still wet (4.5mm). Wednesday clears (0mm / 3%). Next weekend (18–19 Jul) dry.

---

### Note 2 — Editor's Note
**Headline:** "Editor's note — a wet Sunday concentrates the Peninsula into one deliberate choice."  
**Dek:** Mid-July rain removes the itinerary problem. The question on a morning like this is not what to do with the day, but which single thing is worth building it around.  
**Verdict:** One indoor booking, one meal, and let the rain make the timetable.

---

### Note 3 — Hot Springs
**Headline:** "Peninsula Hot Springs — the clearest call on a wet winter Sunday."  
**Dek:** Sunday bathing is available today, with Sound Healing Sessions and Daily Studio Yoga both on the weekly timetable. Rain and cold compress the day into exactly the shape the hot springs are designed for.  
**Verdict:** Book ahead for Sunday bathing — it is the right move in this weather.

---

## Governance check

| Gate | Status |
|------|--------|
| Standing order authorised | ✅ Yes — James, 2026-07-12 |
| Commit made | ✅ 96d08fc12c at 02:45 UTC |
| Pushed to origin/main | ✅ Yes |
| Ledger entry written | ✅ 2026-07.jsonl (retrospective, 20:35 UTC) |

---

## Context

- Last quick notes published before today: **2026-06-29** (13 days gap)
- Upstream pipeline gap: research and draft jobs did not produce outputs for 12 July (same gap pattern as 10–11 July); notes authored directly by autofix run
- Expiry note: weather and hot-springs notes expired at 13:59 UTC. Editor note valid until 22:00 UTC today. All notes published while in-window (commit at 02:45 UTC).

---

*Run completed by Remy · Peninsula Insider quick-note desk · 12 July 2026*  
*Report updated (ledger + status correction): 20:35 UTC 12 July 2026*
