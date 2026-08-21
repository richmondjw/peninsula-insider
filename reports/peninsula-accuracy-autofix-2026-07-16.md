# Peninsula Insider — Daily Accuracy Autofix Report
**Date:** Thursday, 16 July 2026  
**Run time:** 20:43 UTC  
**Agent:** Remy  
**Job:** `pi-daily-accuracy-autofix`

---

## Result: No changes required

Today's accuracy scan (`peninsula-accuracy-scan-2026-07-16.md`) reported **0 Bucket 1 items**. All live surfaces are clean for the July 18–19 weekend.

- No expired events on live surfaces
- Homepage weekendPlanner is current (eyebrow: "18 to 19 July", all 4 cards valid)
- Weekend picks and dispatch alignment verified clean
- No governance flags

## Actions Taken

None. No content edits, no build triggered, no commit.

## Forward Notice

Two events expire this Sunday (July 19):
- `faux-snow-flurries-arthurs-seat-eagle-2026`
- `sip-sketch-sculpture-park-pt-leo-estate-school-holidays-2026`

The **Monday July 20 autofix run** (20:35 UTC) should action:
1. Archive both expired school holiday events
2. Update `homepage.json` weekendPlanner eyebrow and dek for Jul 25–26 window
3. Replace card 3 (Faux Snow Flurries) with a valid Jul 25–26 event
4. Ensure `2026-07-25.json` weekend picks entry exists or create fallback

Candidate replacements identified in scan: `stonier-fire-wine-winter-lunch`, `red-hill-brewery-secret-stash-weekend`, `country-day-tar-barrel-august-2026`, `southern-peninsula-sleepout-the-ranch-2026`.

---

*Autofix complete. No changes made. Next action: Monday 20 July autofix.*
