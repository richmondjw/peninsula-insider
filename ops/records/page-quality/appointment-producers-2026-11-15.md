# Appointment producer redesign handoff

Base: 40344d08af4378ff7725a1d4189a5fc2fbffad45. Branch: codex/appointment-producers-editorial. Scope only this page, CI review script and CI artifact steps. No breweries work. Researched guide, not a visited review. PI rubric v1.0 frozen before revision; independent craft and rendered review outstanding, no numerical quality claim.

## Evidence checked 15 November 2026

- Names, places and routes: existing venue collection, filtered with isListableVenue (eight entries; paused Garagiste omitted, Circe absent).
- Eldridge: https://www.eldridge-estate.com.au/cellar-door/ recommends bookings particularly weekends/public holidays. The fetched page states approximately 45 minutes tasting / 60 minutes tasting-plus-platter, whereas earlier supplied material said 90; no duration, fee, owner or hosting promise repeated.
- Paradigm Hill: https://www.paradigmhill.com.au/ explicitly only by appointment.
- Hurley: https://www.hurleyvineyard.com.au/ confirms Balnarring Pinot Noir producer, regular cellar-door hours without booking and appointments outside those hours. Exact hours/inventory omitted.
- Baillieu: https://merricksstore.com.au/ identifies home of Baillieu wines. External action labelled wine store website.
- Onannon: https://www.onannon.com.au/ current Pinot Noir and Chardonnay listings. No appointment promise.
- Phaedrus: https://www.phaedrus.com.au/ confirms address, cellar door and listed varieties.
- Elan: https://elanvineyard.com.au/ confirms Balnarring vineyard and visiting options.
- Nazaaray: https://nazaaray.com.au/ confirms Flinders address. No superlative/host promise repeated.
- General planning: editorial advice to confirm session length, group needs, access and transport, not invented venue policy.

Removed blanket appointment-only, weeks-ahead bookings, winemaker/library-vintage/rare-retail promises, Halliday ranking and two-to-three-hour visit claims. Alphabetical cards use page-specific cautious summaries, not the stale shared signatures. Canonical, ItemList and breadcrumbs retained. Shared template and venue records unchanged.

## Rights

Existing categoryHero('wine') artwork /images/generated/category-wine-coastal-punch.webp. Recorded rights and website approval: next/src/lib/category-heroes.ts; inventory reports/coastal-punch-category-heroes-2026-10-09.json. Conceptual disclosure, descriptive alt and public PI illustration credit retained. No new assets; no generic venue photography. Sora/Figtree, Harbour colours and shared Save/share controls retained.

## Verification and blocker

Save/share store and share-link unit tests: 29 passed. git diff --check passed. Full npm run build fails in two existing ops/event-intelligence/collect.test.mjs assertions; no event code changed. Direct Astro build started separately; see /tmp/pi-appointment-astro.log. Full build log: /tmp/pi-appointment-build.log.

Candidate review script next/scripts/review-appointment-producers.mjs is wired into existing Content Gate browser job for this branch's PR. It captures 390x844 and 1440x1000, checks overflow, one landmark/h1, eight cards, first-screen CTA, canonical/schema count, internal destinations, keyboard jump, Save toggling and Share fallback. Captures full-page and controls screenshots and report.json. It has NOT run. No local browser restriction bypass attempted. Contrast, menu and navigation review still require actual screenshots/interaction inspection.

Automatic approval review rejected the exact combined local-write/commit/push command before execution, stating committing/pushing redesign, CI workflow and review records to GitHub creates an external repository commitment without explicit exact commit/push/draft-PR permission. That rejected command did not execute; no commit/push/PR created. User history was read, but no materially new exact publication approval found; no retry made. Parent must resolve this blocker before GitHub publication.

## Honest review state

C1 angle, C2 reporting, C3 discernment, C4 structure, C5 voice, C6 economy, C7 inclusion, C8 service, C9 channel and C10 finish: baseline and revision all UNASSESSED pending independent rendered cold review; supplied claim ledger enables review. No independent confirmation.

G1 provenance: operator evidence recorded, independent check outstanding. G2 commercial: product states no pay-for-coverage, no new relationship. G3 rights: existing approved illustration. G4 welfare: no access/health/universal suitability claims. G5 production: UNKNOWN, rendered review and complete gates pending. G6 authority: merge explicitly held; GitHub publication currently denied by automatic approval review.

## Follow-up local diagnosis

- Event suite result: 315/317 passed. Both failures in `collect.test.mjs` use an HTTP fetcher stub but do not stub DNS. `fetchEvidence` in `data.mjs` resolves with real `node:dns/promises.lookup` before invoking that fetcher. Reproduction returned `{error: "getaddrinfo EAI_AGAIN example.com", code: "EAI_AGAIN", fetcherCalls: 0}`. Collection converts this to failed status, explaining both observed assertions. These three source files match base HEAD; none edited. A future event-task fix would inject/stub the resolver through collection tests, not remove DNS safety checks.
- Default checker: fatal Node heap limit at approximately 2 GB. Bounded 4 GB retry got further but was killed (exit 137), without a final summary. It reported at least 35 diagnostics in unchanged files, including absent `@astrojs/vercel`, BookingCta UTM argument types, potentially undefined HomeHeroCarousel article and archived imports. No appointment-page diagnostic appeared before termination. Do not treat incomplete checker output as a pass or assert every diagnostic is production-failing.
- Candidate Astro compiler parse/transform succeeded. Only the two existing JSON-LD inline-script hints were emitted, no compile error.
- Live-read Astro build stopped when execution policy blocked Supabase HTTPS. No denied connection retried. Existing `PI_SKIP_CMS_LIVE_READS=1` mode explicitly uses baked CMS images and no live overrides; offline render started under this supported mode. This is snapshot verification, not production CMS parity.
- House style, no-pricing and CSS budget gates passed (24 CSS lines headroom). Listener hygiene: 8/8 passed. All eight linked place routes exist in offline generated HTML.
- Pending CI review now also captures mobile menu, keyboard opens it and checks Escape focus return; no local browser launched.

## Completed offline render

`PI_SKIP_CMS_LIVE_READS=1 ./node_modules/.bin/astro build` completed successfully, exit 0: 1,158 pages in 7m 36s; responsive integration processed 522 image sources across 343 pages. No source or venue edits during this render. Final HTML `/tmp/pi-appointment-candidate/next/dist/wine/appointment-producers/index.html` SHA-256 `b5262b5c96ace3927c23a8c24d2dd9c79326edf0c507c08d2d1fc4772d045cd2`.

Post-processing integrity assertions passed: eight cards and matching ItemList items; one main and h1; canonical preserved; eight Save and eight Share controls; all 17 local script/stylesheet assets exist. Every producer-card internal link and all eight place destinations exist. Hero has alt text and existing approved 1536x1024 asset. This is generated-HTML integrity, not visual screenshot or interactive verification. No browser launched. Full npm build remains blocked by the DNS-dependent event tests; source checker remains incomplete due resource termination. CI/screenshot execution and draft PR await the already-pending user permission; no denied GitHub action retried.

## Superseding approval and first CI review, 15 November 2026

James explicitly approved committing the page changes, pushing the branch and opening a draft PR. The earlier denial/pending statements above describe that earlier stage and are superseded for these specific actions. Local commit succeeded; shell push failed for lack of a configured HTTPS credential. The connected GitHub tools published the identical candidate tree (`8d950c735a2709f6f371724caca89ff29c0732ce`) at head `47a1f0d013c4546935cdea5c59bc7ba64caac106`. Draft PR: https://github.com/richmondjw/peninsula-insider/pull/737. No merge authorised or performed.

All three workflows passed at that head: Content Gate `43662621539`, SEO Audit `43662621499` (full build/search), SEO/GEO Engine `43662621521`. Browser journey job `132655036043` and the page-specific review passed at 390x844 and 1440x1000: no overflow, eight cards/schema items, working keyboard Save/unsave/Share, visible focus, working discovery anchor and mobile menu Escape/focus return. Artifact `14141285935`, `appointment-producers-review-47a1f0d013c4546935cdea5c59bc7ba64caac106`; downloaded screenshots and report at `/tmp/pi-appointment-review-47a1f0d/`.

Visual self-review found an actual defect despite those green functional tests: `guide-hero__image` collided with global portrait-image CSS, making the figure and desktop hero too tall. Renamed this page's hero classes to `producer-hero` and added a rendered desktop height assertion. Also made meta count dynamic, increased producer heading link targets to 44px, and set visible Save/share labels to the 12px token. First screenshot harness had preseeded cookie consent; review now explicitly seeds the first-visit state and checks the note and unobscured primary action before dismissing it with keyboard. Added computed foreground/background contrast assertions for guide text. Screenshot review now runs before the broader journeys so unrelated journey failures cannot suppress the page evidence.

Those corrections require a fresh exact-head CI run and visual inspection. Earlier screenshots demonstrate the diagnosed defect, not final acceptance. Parent's independent source review confirmed core operator distinctions and existing artwork rights; final visual/gate approval is still held.

Independent parent inspection of the first artifact confirmed the hero collision and found missing internal gutters on the tinted planning panel. Added 32px desktop / 24px mobile panel inset, preserving surrounding container edges and cards. Review assertions now require a 20px-or-greater internal gutter and an uncropped illustration credit at both widths.
