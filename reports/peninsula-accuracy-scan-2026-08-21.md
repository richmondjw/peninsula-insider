# Peninsula Insider, daily accuracy scan 2026-08-21

Generated after the required fast-forward pull. Detection only; no content edits or publishing were performed.

## Summary

- Event source records inspected: 82, of which 34 are marked published.
- Bucket 1, safe auto-fix: **1**
- Bucket 2, needs approval: **3**
- Bucket 3, needs verification: **0**

## Bucket 1, safe auto-fix

| Check | Finding | File/surface | Suggested action |
|---|---|---|---|
| A1 | Compiled What's On output contains cards for archived event records, including Boneo Community Market and Pearcedale Community Market, while their source records are archived/past-dated. | `whats-on/index.html` | Remove or filter archived event cards from the live collection. |

## Bucket 2, needs approval

| Check | Finding | File/surface | Suggested action |
|---|---|---|---|
| B2 / F | Homepage and What's On navigation promote “MPRG school holiday workshops”; the trusted source record is archived and ended 2026-07-10. | `index.html`, `whats-on/index.html`, `next/src/content/events/archive/mornington-peninsula-regional-gallery-school-holiday-workshops.json` | Replace the editorial pick and “this weekend” link with a current live event. |
| B2 / A | Homepage and What's On newsletter rails still lead to the 27–28 June dispatch, including “final Sunday Sessions”; this is no longer the current weekend window. | `index.html`, `whats-on/index.html`, `/journal/peninsula-this-weekend-jun-27/` | Replace the rail with the current dispatch or remove the stale front-door promotion. |
| F | Homepage and What's On navigation still frame an Autumn Exhibition/editorial pick as current; the source record ended 2026-06-30 and is archived. | `index.html`, `whats-on/index.html`, `next/src/content/events/mprg-autumn-exhibition.json` | Refresh the seasonal/editorial framing for the current calendar. |

## Bucket 3, needs verification

None identified from the available source state. External booking, cancellation, and reschedule verification was not performed.

## Checks not performed

- External booking-link availability.
- Full prose-to-source verification for every older dispatch/article.

## Scan basis

Checked the homepage, What's On surface, current dated editorial files, event source files, and compiled live output against the 2026-08-21 UTC date. The scan did not modify content.
