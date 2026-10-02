# Eco Lodges taxonomy and paused stay actions

**Project:** Peninsula Insider
**Owner:** Peninsula Insider editorial and site team
**Decision:** Adopt a distinct Lodge type for Peninsula Hot Springs Eco Lodges and keep the existing Stay URL.
**Review date:** 1 October 2026
**State:** Local source correction; integrated build and public release are separate gates.

## Why this set was needed

The Eco Lodges record used `type: glamping`, so readers saw “Glamping” on its detail page and cards, and the stay filter placed it with canvas stays. [Peninsula Hot Springs presents Eco Lodges](https://www.peninsulahotsprings.com/accommodation/eco-lodges) as rooms in shared lodges with private in-room or outdoor spring bathing, and [presents Glamping](https://www.peninsulahotsprings.com/accommodation/glamping) as tent accommodation. Both pages were checked on 1 October 2026. The bounded hypothesis was that a distinct `lodge` type would correct that decision cue without breaking the existing Stay route, filters, map or booking action.

## Changes and affected surfaces

| Surface | Correction |
| --- | --- |
| Venue record and content schema | Eco Lodges now uses `lodge`; the enum accepts it. The URL slug and broader `lastVerified` date are unchanged because this was a category check, not a full venue re-verification. |
| Stay route, cards and detail | `isStayVenue` and the category label recognize Lodge, while the detail booking button still says “Check availability.” The page keeps `/stay/peninsula-hot-springs-eco-lodges/` and its `LodgingBusiness` structured-data type. |
| Filters and maps | The Stay filter offers “Lodges”; the Eco Lodges item derives `cat=lodge`, remains under Stay on the main and place maps, and no longer derives `cat=glamping`. |
| Search and CMS indexes | Both refresh scripts route the new type to the existing Stay detail URL. The footer and subregion link helper also recognize it as accommodation. |
| Paused venue template | A parallel Yurt verification set paused an unsourced stay. The shared notice now says key visitor details are unverified and withholds the detail block neutrally; booking actions are suppressed for unsourced paused records. |

## Focused verification

- `node scripts/test-facets.mjs`: passed, including explicit Eco Lodges versus PHS Glamping assertions. The standalone test now bundles the app facet module with the project's installed esbuild so Node can resolve its TypeScript imports.
- `npm run validate:content`: passed after the schema change.
- `npm run lint:taxonomy:strict`: passed with 0 errors; 1,191 advisory warnings elsewhere in the corpus.
- A source-level assertion confirmed the paused Yurt record has no booking URL; the template now additionally hides booking actions for unsourced paused records. The rendered page still needs integrated-build review.
- `git diff --check`: passed.
- Repository-wide `npm run check` still reported 137 errors, including existing unrelated errors in the shared venue template and map page. No diagnostic pointed at an edited line. This check is not a green release gate.

The integrated Astro build, rendered mobile and desktop review, published filter behavior, public route, CMS/search refresh, and live monitoring remain for the coordinated release set. This scoped correction has no independent 23-layer page grade.

## Boundaries and follow-up

The glamping guide's editorial inclusion of Eco Lodges is being corrected in the parallel guide set. A licensed photograph of an actual Eco Lodge room and outdoor bath (Visit Victoria asset vv-172320) now leads the detail page. The former illustrative bathing image was removed from that hero slot, and the promoted asset was removed from the gallery to avoid a duplicate. The Visit Victoria placement ledger now names its hero use and the shifted gallery positions; the integrated media-rights gate remains required. Older accommodation articles and fact data may carry historical inventory claims and should be checked against current operator pages before reuse.

By **8 October 2026**, check the published Stay filter, detail label and booking action, map colour and route, and search/CMS results. If `lodge` drops the venue from Stay or breaks an existing link, revert this bounded type and shared predicate change together while preserving the original URL. Real reader outcome and accessibility testing are needed before any 99% claim.
## Paused stay release guard

A separate source review paused Yurt Hideaway as unsourced. The archival detail route remains available and noindexed, but the shared template previously still showed its relative spend band, generic live-hours action and active lodging schema. The template now withholds spend and hours rows, the top spend badge, the live-hours action, booking actions and opening-hours structured data for `paused + unsourced` records. The Stay route omits `LodgingBusiness` JSON-LD and adds `searchExclude` so the published Pagefind artifact ignores the detail while retaining breadcrumb context.

The site search uses the `pi.search` RPC first and Pagefind second. Normal Build/Deploy runs `npm run build:search`, but does **not** refresh the separate Supabase entity index. Only the manually dispatched `.github/workflows/pi-data-refresh.yml` calls `refresh-entity-index --apply`. For this release, the shared search client defensively filters the currently paused Yurt hit from both search and typeahead based on its source record status. The refresh script excludes all `paused + unsourced` venues from its projection and, on the coordinated apply, deletes only their existing entity-index and attribute rows. No production database action was taken in this task.

A local `--sql` projection omitted the Yurt venue row and retained Eco Lodges. The shared browser search client bundled successfully; the edited scripts passed syntax and diff checks. After the integrated build, run the rendered paused-page assertion in `next/scripts/emma-ui-render.test.mjs`. After publication, check `/search/?q=Yurt%20Hideaway` and the global search overlay for both exact and partial queries. After the coordinated PI Data Refresh run, check the public search RPC or generated index response for absence of `venue/yurt-hideaway`; site deployment alone cannot prove Supabase cleanup.

The paused Yurt detail now labels its context "About this listing" and omits the venue-name overlay. A published CMS override currently replaces the content-record illustrative beach image with a Yurt interior. The template correctly withholds the beach image disclosure for that different file and now uses only the override credit, if recorded. Active venue headings and image overlays are unchanged.
