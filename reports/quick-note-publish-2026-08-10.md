# Peninsula Insider — Quick Note QA & Publish Report

**Date:** Monday, 10 August 2026 (UTC) / Tuesday, 11 August 2026 (AEST)
**Job:** `pi-daily-quick-note-qa-publish`
**Agent:** Remy
**Status:** PUBLISHED — external deployment verification failed; live notification blocked

## Published content

| File | Section | Expires |
| --- | --- | --- |
| `next/src/content/quick-notes/2026-08-11-weather-tuesday.md` | weather | 2026-08-11T23:59:00+10:00 |
| `next/src/content/quick-notes/2026-08-11-editor-note-tuesday.md` | note | 2026-08-12T08:00:00+10:00 |

## Editorial basis and QA

- The scheduled research (`pi-daily-quick-note-research`) and draft (`pi-daily-quick-note-draft`) outputs were absent for today's cycle, so this edition used the established direct-source fallback (as on 2026-08-09).
- Open-Meteo Main Ridge retrieval at 2026-08-10T20:35Z: 9.5°C at 06:30 AEST, apparent 6.4°C, 0.0mm precipitation, overcast, 17.8km/h WNW wind. Tuesday: 37% precipitation probability, 0.90mm, 9.4–13.1°C. Wednesday: 87%, 4.40mm, 9.5–13.2°C.
- Both notes carry current first-party government (Open-Meteo) citations, valid schema fields, clear expiry windows and no unsupported venue or operational claims.
- `npm run lint:house-style` initially flagged one em-dash violation in the editor's note; fixed and re-linted clean. `npm run validate:content` passed with only pre-existing unrelated warnings (draft/archive duplicate IDs).

## Verification

External post-publish verification ran after the `Build and Deploy` workflow completed (confirmed via `gh run list`), so this was not the usual deploy-timing race. HTTP, canonical, title, OG, stylesheet and target-copy checks all passed on both URLs. Two findings caused a FAIL:

1. **Sitemap** — neither URL is in `sitemap.xml`. By design, `next/src/pages/sitemap.xml.ts` only lists `/quick-note/` (the index page), not individual daily entries, and the quick-note content schema has no `sitemapExclude` field to make that exclusion explicit. This looks like an intentional omission for ephemeral daily content that the gate isn't currently told about.
2. **Meta description** — the editor-note URL read as 7 characters on two consecutive script runs, but a direct `curl` fetch of the same URL shows a single, correct 91-character description tag. Likely a transient edge-cache or script-timing artifact, not a real content defect.

`EXC-2026-08-10-015` is open for both findings. No live notification was sent; rerun/owner review needed before the item can be closed.
