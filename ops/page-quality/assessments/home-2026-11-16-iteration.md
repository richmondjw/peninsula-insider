# Homepage quality iteration — 16 November 2026

**Project:** Peninsula Insider page quality programme. **Page:** `/` (T1). **Rubric:** `ops/page-quality/rubric-v1.md`. **Decision:** adapt. **Owner:** Codex for bounded remediation and release; independent graders for acceptance.

## Exact-live baseline

Three independent reviews inspected production revision `c03da848ab7ba4cf3aaa17e5b101f15299ba85cb`, deployment run `43723157564`, at mobile and desktop widths. They scored **95.25**, **96.25** and **97.5** out of 100. The median baseline is **96.25/100**. No reviewer observed a hard-gate failure, but all three withheld acceptance because no direct spoken-screen-reader task had been performed. The access/technical reviewer also measured mobile Lighthouse performance 83 with LCP 4.1 seconds; the editorial and visual reviewers found current weekend event checks dated 2 November, 3 October and 8 October.

## Hypothesis and bounded change

If the browser receives the right responsive hero candidate, the page serialises a bounded six-event reserve instead of every eligible weekend event, and the three visible event claims are rechecked against their primary organisers, the page should load faster and present materially fresher decision evidence without changing its information architecture.

Changes:

- changed the homepage hero's responsive size contract from a fixed 1200px mobile candidate to `100vw`;
- limited the server-rendered weekend reserve to six already-qualified picks, preserving three visible picks plus three fallbacks for the reader-clock recheck;
- rechecked Moonah Links, Emu Plains Market and National Works on Paper against their primary organiser pages on 16 November;
- named Sam O'Connell in the 21 November Acoustic Saturdays verdict and linked the exact current Moonah Links programme;
- recorded the previously uncatalogued Emu Plains November organiser URL in the link-health probe ledger.

## Candidate evidence

- Focused event/publication tests: **35/35 passed**.
- Full production build: **passed**, including reader boundary, image rights, event safeguards, link health, source claims and agent-readiness gates.
- Built homepage HTML fell from **297,427 bytes** on the exact-live baseline to **200,204 bytes** locally, a 32.7% reduction.
- Weekend promotion payloads fell from **18** live to **7** in the built page, including the separate non-weekend promotion surface.
- Local mobile Lighthouse: performance **93**, accessibility **100**, best practices **100**, SEO **100**; LCP **3.09 seconds**, FCP **1.51 seconds**, CLS **0.0026**, total transfer **532KB**.
- The LCP remained the hero image, loaded eagerly with `fetchpriority="high"`; Lighthouse confirmed it was discoverable in the initial document.

## Open acceptance gates

This is a local candidate, not a public pass. It still requires protected CI, exact production deployment verification, independent grading of the released SHA, a direct spoken-screen-reader task, exact-release image-rights review and field Core Web Vitals evidence. Do not infer 99 from the build or candidate Lighthouse result.

