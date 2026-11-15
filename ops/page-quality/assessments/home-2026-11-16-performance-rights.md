# Homepage performance and image-rights iteration — 16 November 2026

**Project:** Peninsula Insider page quality programme. **Page:** `/` (T1). **Rubric:** `ops/page-quality/rubric-v1.md`. **Decision:** adapt. **Owner:** Codex for bounded remediation and release; independent grader for acceptance.

## Exact-live baseline

Independent review of production revision `4df8ef4ce7f83519300abd7b1d4bbdc88250369e`, deployment run `43741266913`, scored the homepage **96.5/100**. It confirmed the previous release improved mobile Lighthouse performance from 83 to 88, LCP from 4.1s to 3.5s and transfer from 623KiB to 521KiB. It also confirmed all three visible weekend recommendations display a 16 November source check. Acceptance remained provisional because direct spoken assistive-technology evidence, page-scoped image-rights review and field Core Web Vitals evidence were open.

## Hypothesis and bounded change

The homepage was synchronously reading layout twice during its critical first paint for controls that are not active there: the sticky masthead offset used by inner pages, and a subscribe pill suppressed on the homepage. Its largest mobile image also began a perpetual cinematic transform during first paint. Skipping those two geometry reads on excluded routes and keeping the mobile LCP frame still should reduce avoidable layout/compositing work without changing content or navigation. Desktop retains the cinematic motion, and reduced-motion behaviour is unchanged.

## Candidate evidence

- Listener-hygiene regression suite: **8/8 passed**.
- Full production build: **passed**, including event, reader boundary, image-rights, provenance, SEO architecture, link health and partner-portal gates.
- Candidate mobile Lighthouse: accessibility **100**, best practices **100**, SEO **100**, CLS **0.0002**.
- Lighthouse no longer attributed any forced reflow to the homepage inline masthead or subscribe-pill scripts. The remaining lab performance score varied between runs, so no score uplift is claimed from the local candidate.
- Repository-wide `astro check` remains red on its established unrelated baseline (226 errors, including the missing optional `@astrojs/vercel` module); it introduced no diagnostic on the changed layout or homepage cover.

## Page-scoped image-rights review

The exact built homepage contains seven visible editorial images plus the decorative PI avatar. Each editorial image has meaningful alt text, visible or component-supplied attribution, and a source record accepted by the production media gates:

| Surface | Asset | Rights evidence |
|---|---|---|
| Hero | `vv-143799-cape-schanck.webp` | Visit Victoria asset; Peter Tarasiuk credit; `visit-victoria` licence; recorded permission and verified provenance in the Cape Schanck record. |
| Family plan | `vv-167058-arthurs-seat-eagle.webp` | Visit Victoria asset; visible Visit Victoria credit; `visit-victoria` licence; verified provenance in the Arthurs Seat record. |
| Ridge-to-sea plan | `vv-160356-montalto.webp` | Visit Victoria asset; Two Palms Australia / Visit Victoria credit; `visit-victoria` licence; recorded permission and verified provenance in the itinerary and Red Hill records. |
| Acoustic Saturdays | `acoustic-saturdays-peppers-moonah-links-2026.webp` | Original commissioned Peninsula Insider illustration; explicitly labelled conceptual; `original-commissioned` licence. |
| Emu Plains Market | `coastal-punch-produce.webp` | Original Peninsula Insider event illustration; explicitly labelled conceptual; rights established 9 October 2026 in the illustration registry. |
| National Works on Paper | `vv-143144-mornington-peninsula-regional-gallery.webp` | Visit Victoria asset; Robert Blackburn / Visit Victoria credit; `visit-victoria` licence; verified provenance in the gallery record. |
| Journal feature | `vv-26070118-jackalope-hotel.webp` | Visit Victoria asset; Peter Foster / Visit Victoria credit; `visit-victoria` licence; recorded permission and verified provenance in the itinerary and Red Hill records. |

The build's exact media-provenance gate passed across 1,340 image records with zero actual images lacking provenance, zero recorded-rights images lacking a source, zero invalid rights statuses and zero unknown licences. This closes the prior page-scoped review omission; it does not erase separately reported inherited media debt elsewhere on the site.

## Open acceptance gates

This remains a candidate until protected CI, exact deployment verification and independent regrading of the released SHA. A direct NVDA or VoiceOver task is still required for AT1. Field Core Web Vitals remain unavailable, so laboratory performance must not be represented as real-user evidence. Do not infer 99 from this record.
