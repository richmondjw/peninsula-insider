# Stay Set 6: independent QA, 1 October 2026

**Outcome:** The exact local build:search artifact passes the measured route, responsive, image disclosure, link, and visible search checks below. It does not meet a defensible 99/100 design grade. The public pi.search backend still contains the paused Yurt row and needs a post-release entity-index refresh.

**Scope and independence:** Read-only source, final static artifact at http://localhost:4339/, and public operator pages were reviewed independently of the implementation agents. The final artifact was inspected at 320×568, 390×844, and 1365×900. Scores are equal-weight manual assessments across the 23 lenses below. They are comparative design judgments, not user-test results or a validated industry percentile. Local artifact evidence is not a claim that production has deployed.

## 23-lens scores

| Lens | Best accommodation guide | Glamping guide | Eco Lodges detail | Paused Yurt detail |
| --- | ---: | ---: | ---: | ---: |
| First-fold promise | 93 | 92 | 89 | 90 |
| Category scope | 96 | 97 | 95 | 95 |
| Format differentiation | 96 | 95 | 93 | 90 |
| Booking dependencies | 93 | 91 | 90 | 93 |
| Factual traceability | 92 | 89 | 91 | 86 |
| Freshness disclosure | 89 | 86 | 85 | 95 |
| Copy economy | 90 | 84 | 85 | 87 |
| Hierarchy and scanning | 91 | 90 | 88 | 88 |
| Wayfinding | 93 | 91 | 90 | 88 |
| Link integrity | 96 | 95 | 95 | 94 |
| Mobile reflow | 94 | 94 | 92 | 91 |
| 320px first visit | 92 | 91 | 89 | 90 |
| Desktop composition | 88 | 92 | 88 | 87 |
| Typography | 92 | 92 | 90 | 89 |
| Contrast | 94 | 94 | 93 | 92 |
| Tap targets | 94 | 93 | 92 | 91 |
| Keyboard and focus | 91 | 89 | 90 | 88 |
| Semantics and headings | 93 | 92 | 91 | 91 |
| State and feedback | 90 | 91 | 89 | 94 |
| Image truth | 96 | 91 | 94 | 89 |
| Media and performance | 90 | 90 | 88 | 87 |
| Motion and stability | 97 | 96 | 96 | 95 |
| Newsletter fit | 87 | 88 | 87 | 86 |
| **Equal-weight average** | **92.48** | **91.43** | **90.43** | **90.26** |

The strongest gains are the explicit distinction between Eco Lodges, on-site tents, and Alba accommodation; the honest illustrative captions; and the paused Yurt state. The main design opportunities are desktop hero space on the best-accommodation guide, repeated accommodation caveats in the Glamping guide, and the generic newsletter block. No score was raised to 99 without reader testing and stronger evidence of freshness and booking comprehension.

## Measured acceptance

- **Canonical guide first fold:** Browse all stays is visible and hit-clear at 320×568 (top 473px, bottom 517px) with the cookie notice present; after accepting cookies it moves to 366–410px. It is hit-clear at 390×844 (336–380px) and 1365×900 (476–520px). The earlier local artifact had put it below the 320px first fold; the final build resolves that finding.
- **Card text:** At 320, 390, and 1365px all three thermal descriptions have scrollHeight equal to clientHeight, visible overflow, and no line clamp. No format-card description was clipped in the same inspection. All tested pages have zero horizontal overflow and zero browser page errors.
- **Prices and listing state:** The rendered best-accommodation guide, Eco Lodges detail, and Stay hub have zero double-dollar price-band tokens. The final guide and Stay hub contain no Yurt detail links. Direct /stay/yurt-hideaway/ remains accessible as a historical paused page with noindex, nofollow, Pagefind exclusion, no Yurt booking action, and no LodgingBusiness schema. Three booking actions in its related-stays cards belong to other venues.
- **Images:** The guide’s three thermal cards load at 1280px natural width. The Eco Lodge room photo is labelled as a room and credited to Visit Victoria. The Peninsula Hot Springs and Alba photographs show bathing grounds and are visibly captioned as illustrative of the setting, not accommodation. The Eco detail’s inline open-plan Lodge photo loads after scroll at 860×573 and carries a Visit Victoria credit. The earlier blank full-page capture was a lazy-load capture artifact, not a broken visible image.
- **Links and focus:** Unique internal links within the four main page areas returned no 4xx: best accommodation 10, Glamping 6, Eco Lodges 17, Yurt 16. Keyboard Tab traversal reaches the skip link and main actions with a visible solid focus outline. This is a bounded path check, not a full assistive-technology audit.
- **Search, final Pagefind:** Browser queries Yurt Hideaway, Yurt, Hideaway, and Yur with the Stay filter show no direct /stay/yurt-hideaway/ result. Exact phrase results include other matches such as Hideaways at Red Hill; that is not a Yurt listing leak. The final search asset loads after build:search.

## Outstanding operational risk

The **raw public pi.search RPC response**, captured from the POST network response before search-client.ts filters results, still returns one yurt-hideaway venue for both Yurt Hideaway and Yurt (HTTP 200). The browser client reduces each to zero, so the visible site is protected, but the backend index is stale. The Eco Lodge positive control returned two venue slugs, peninsula-hot-springs-eco-lodges and peninsula-hot-springs-glamping, both in the raw response and client result. Normal static deployment runs build:search but does **not** refresh pi.entity_index; the separate PI Data Refresh workflow’s Phase B must run after deployment. Verify the deletion receipt and repeat the raw Yurt query before calling backend cleanup complete.

No public-production deployment, post-release workflow run, analytics, reader comprehension study, screen-reader session, or operator booking conversion was verified in this independent local QA pass.
