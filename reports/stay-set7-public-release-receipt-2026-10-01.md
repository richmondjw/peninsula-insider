# Set 7 public release receipt — 1 October 2026

**Project:** Peninsula Insider\
**Decision:** Adopt the deployed Set 7 content and routing corrections; adapt two observed visual/navigation defects in a follow-up.\
**Owner:** Peninsula Insider site release.\
**Review:** Independent, read-only checks of the public site. This receipt is not a 99/100 usability certification.

## Deployment identity

The public [release manifest](https://peninsulainsider.com.au/release-manifest.json) served `sourceSha: 0ef81970038edc87834d02a453c6832aa74aa2c5`, release ID `0ef81970038e-36790157017`, and build run `36790157017`. Checks below were made only after that exact SHA appeared.

## Live route and layout acceptance

All six routes below returned HTTP 200 at **320×568** and **1365×900** in Edge headless browser. Across the 12 views, browser page errors were zero and document width equalled viewport width.

| Public route | Primary action at 320px, top–bottom | At 1365px, top–bottom | Result |
| --- | ---: | ---: | --- |
| [Luxury guide](https://peninsulainsider.com.au/stay/luxury/) | Find your setting, 475–523px | 628–676px | Visible and hit-clear |
| [Villas guide](https://peninsulainsider.com.au/stay/villas/) | Compare villas, 475–523px | 707–755px | Visible and hit-clear |
| [Couples Retreats](https://peninsulainsider.com.au/stay/couples-retreats/) | Find your setting, 422–466px | 627–671px | Visible and hit-clear |
| [Winery Accommodation](https://peninsulainsider.com.au/stay/winery-accommodation/) | Compare seven stays, 496–542px | 589–635px | Visible and hit-clear before click; anchor issue below |
| [Cassis Red Hill](https://peninsulainsider.com.au/stay/cassis/) | Check availability, 491–543px | 584–636px | Visible and hit-clear; direct booking URL responded 200 |
| [Port Phillip Estate](https://peninsulainsider.com.au/wine/port-phillip-estate/) | Check suite availability, 733–785px | 650–702px | Correct route; mobile action is below the first 568px screen |

The first 3,600px of each page was scrolled at 320px. Loaded image counts were Luxury **4/4**, Villas **4/4**, Couples **2/2**, Winery **3/3**, Cassis **2/2**, and Port Phillip **1/1**, with no broken image. The Jackalope and Alba guide images selected `_media/*-480.webp` sources at phone width. Several CMS hero overrides served the original JPEG with no `srcset`; all loaded, but that is a mobile-performance opportunity. The Polperro CMS JPEG served 416,563 bytes at 320px.

The Winery guide's seven venue destinations each returned 200: Polperro Villas, Crittenden Estate Villas, Port Phillip Estate, Mantons Creek Estate, Jackalope, Lindenderry and Cassis Red Hill. Cassis visibly distinguishes **two mineral-plunge-pool villas** from **three outdoor-bath villas**. Port Phillip's live buttons lead separately to the operator's [accommodation diary](https://www.portphillipestate.com.au/book-accommodation/), [tastings](https://www.portphillipestate.com.au/cellar-door-tastings/) and [dining reservations](https://www.portphillipestate.com.au/reservations/), all of which responded 200. Its visible hours say **Mon, Wed to Sun 11am–5pm; Tue Closed**; the winery JSON-LD omits Tuesday.

## Paused Villa Mallorca and search

The historical [Villa Mallorca detail](https://peninsulainsider.com.au/stay/villa-mallorca/) still returns 200, but carries `noindex, nofollow`, `data-pagefind-ignore`, a clear paused notice, no `LodgingBusiness` JSON-LD, and no live link to the retired operator domain. It is absent from the public sitemap and the Stay hub, Luxury, Villas, Cottages and map listing links. Public Pagefind exact and partial name queries returned no Villa Mallorca venue page; one unrelated journal page was a fuzzy match.

A separate read-only query of the **raw public `pi.search` RPC** returned **0** venue results for “Villa Mallorca.” “Port Phillip Estate” returned **5** venue results, including **1** exact `port-phillip-estate` slug. This is direct evidence that the stale Mallorca backend hit seen before release has been pruned.

The post-push PI Data Refresh run [36790242596](https://github.com/richmondjw/peninsula-insider/actions/runs/36790242596) completed with failure in its **Phase C — Embed entity index** step; the reported provider response was **401**. GitHub's public job metadata confirms the failed Phase C step. The successful raw RPC cleanup above does **not** prove embeddings refreshed. Repairing the Phase C credential/embedding path and rerunning that phase remains a separate operational task.

## Public defects and follow-up

1. **Winery guide primary anchor is obscured by sticky navigation.** Clicking “Compare seven stays” lands `#rankings` at y0. At 320px its heading occupies y52–106 while the fixed header ends at y68; at 1365px the heading occupies y76–112 while the header ends at y133. The heading is partially hidden on phone and fully hidden on desktop. A read-only public-browser trial of the scoped hotfix (`scroll-margin-top: 5rem` at ≤700px, `9rem` above) moved the rankings heading to y132–186 at 320 and y220–256 at 1365, both clear. The `#choose-your-base` heading also landed clear at y142–205 and y240–286. The fix is in Set 7 source but **was not in the manifest-confirmed public build at this check**.
2. **Polperro card image has a visible duplicate seam in the Winery guide.** At 1365px the card's photo box is 256px high, but its wide CMS `img` renders at only 135px; the anchor's same-image background shows beneath it. The first card therefore displays the photograph twice across a horizontal seam. Other inspected cards loaded. A read-only browser trial of full-cover child-image CSS made all seven card images fill their 179px boxes at 320 and 256px boxes at 1365; Polperro became visually seamless, while Crittenden and Port Phillip retained even cover. The shared VenueCard fix is pending public deployment.
3. **Port Phillip mobile first-screen action:** the suite button's y733–785 position requires scrolling on a 320×568 first visit. Its link and intent are correct; this is a hierarchy improvement opportunity, not a broken booking path.

**Release finding:** Core published Set 7 routes, corrected facts, links, images and paused-listing exclusions are live and functional. The two public visual/navigation defects above prevent an unqualified design sign-off; the proposed anchor fix was measured but still needs deployment and a new public check. Public speed, screen-reader use, actual booking completion and a 99/100 score were not validated here.
