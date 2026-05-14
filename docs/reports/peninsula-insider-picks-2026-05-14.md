# Peninsula Insider — Insider Picks Report

**Date:** 2026-05-14 (Thursday)
**Window covered:** Thu 14 May → Wed 20 May 2026 (Week 20)
**Owner:** Remy
**Format:** Insider Picks — current-week seasonal layer (complement to Sunday dispatch, not duplicate)
**Status:** First edition (the operating brief at `peninsula-insider-picks-operating-brief-2026-04-30.md` was not present; format established here against the cron's stated rules)

## Seasonal context

- Late autumn, third week of May. Day 4 of the **last clean autumn weather window** before winter sets in (forecast 14-20 °C, sunny, light wind, dry through Saturday at minimum — Mornington wttr.in snapshot 2026-05-14).
- Mother's Day (10 May) is now spent. No occasion overlay.
- King's Birthday long weekend is 3.5 weeks out (5–8 Jun). Too early to surface as a homepage module; correct timing to **pre-book**.
- Red Hill Truffles season opens **30 May**. Premium hunts (Max's, Epicurean) book 4–6 weeks ahead.
- This Sunday's dispatch (Peninsula This Weekend, 16–17 May) is the *quiet weekend* edition. Lead: Wild Mushroom Forage with The Kitchen. Alternates: Sustainable House Day, MPRG, Shoreham Market. Skip: multi-stop cellar door Saturday.

## The picks (4, in priority order)

### 1. The booking to lock in this week — Red Hill Truffles
**Why this pick, why now:** Season starts Saturday 30 May. The $189 pizza hunt is forgiving on lead time, but the two premium options — Truffle Hunt × Max's at Red Hill Estate ($217pp) and Truffle Hunt & Gourmet Lunch at The Epicurean Red Hill ($195pp) — consistently fill 4–6 weeks before the day. This is the week to book, not the week to wait.
**Source:** events/red-hill-truffles-winter-truffle-hunt-season.json

### 2. Tonight's move — Bathe-in Cinema at Peninsula Hot Springs
**Why this pick, why now:** Thursday-night cinema from inside the amphitheatre thermal pool. It is more interesting now than it was three weeks ago precisely because the nights are cold enough to make the contrast work. Recurring weekly through July; tonight (Thu 14 May) is in window. Bathing-session ticket required; amphitheatre pool fills early.
**Source:** events/peninsula-hot-springs-bathe-in-cinema-thursdays.json

### 3. Use the light while it holds — Bushrangers Bay
**Why this pick, why now:** Forecast confirms 14–20 °C and sunny through Saturday. Late-afternoon coastal light on the southern cliffs is at its annual best in mid-to-late May, when the haze of summer is gone and the sun is low enough to flatten silver across the basalt by 16:30. 90-minute moderate walk from the Cape Schanck lighthouse precinct. Sunset is ~17:25; start by 15:30.
**Source:** experiences/bushrangers-bay-walk.json

### 4. The long autumn lunch — Paringa Estate or Tedesca Osteria
**Why this pick, why now:** This week sits between Mother's Day (gone) and King's Birthday (not yet). It is the cleanest mid-autumn long-lunch window of the calendar — quiet rooms, no occasion premium, and produce that is at its peak (mushrooms, slow braises, the last of the autumn pinot pours). One named room, not three. Paringa Estate for the wine-led, terrace-driven version (Lindsay McCall's 'LJM' Pinot Noir, 1 hat). Tedesca Osteria for the set-menu, wood-oven version (Brigitte Hafner, 2 hats, book a fortnight out).
**Source:** venues/paringa-estate.json; venues/tedesca-osteria.json

## What we are deliberately not picking

- **Wild Mushroom Forage** — covered as the lead in the Sunday dispatch. Do not duplicate.
- **Sustainable House Day** — covered Sunday.
- **MPRG / Shoreham Market** — Sunday.
- **Multi-stop cellar door Saturday** — the Sunday dispatch explicitly recommends *against* this. We hold the line.
- **King's Birthday weekend stays** — the prepare-only call from the seasonal switch pack (2026-05-11). Activate w/c 1 Jun.
- **Mornington Winter Music Festival (5–8 Jun)** — pre-load, not now. Will lead the 1 Jun pick.

## Editorial notes

- This is the first published Insider Picks edition. Established the form here: four picks max, each headed with a one-sentence "why now," lean against the Sunday dispatch rather than competing with it, lead with the booking move when one is genuinely time-sensitive.
- Operating brief referenced by the cron prompt (`peninsula-insider-picks-operating-brief-2026-04-30.md`) is still missing — same gap flagged in the 2026-05-11 seasonal switch pack. Worth resolving before the next edition so the form has a written constitution rather than running on precedent.
- Article draft uses `format: "insider-edit"` per the cron instructions. Not published; status: `draft`. Vera's copy gate not yet run.

## Files created

- This report: `/home/node/.openclaw/workspace/peninsula-insider/docs/reports/peninsula-insider-picks-2026-05-14.md`
- Article draft: `/home/node/.openclaw/workspace/peninsula-insider/next/src/content/articles/insider-picks-2026-05-14.md`

## Sources

- Mornington forecast: wttr.in snapshot, 2026-05-14, 14 °C sunny / Fri 13–20 °C sunny / Sat 14–20 °C sunny.
- Seasonal context: `peninsula-seasonal-switch-pack-2026-05-11.md`.
- Weekend dispatch: `next/src/content/articles/peninsula-this-weekend-may-16.md`.
- Event and venue records: as cited per pick.
