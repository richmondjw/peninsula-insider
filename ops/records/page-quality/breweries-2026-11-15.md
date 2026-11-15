# Breweries guide redesign

Base main: 9f84ffcd700d9cc5e8bac3e3fd819c0f4652c8cf, after appointment-producers PR737. Branch codex/breweries-editorial. Scope only brewery page, its rendered CI review, workflow artifact steps and this ledger. No shared template, venue-record, access, security or spending change. Candidate held for parent's independent acceptance before merge. PI editorial rubric v1.0 frozen; researched service guide, not visited review.

## Baseline and changes

Live/source baseline: five generic cards, partly unrelated context photos, generic mood labels, unsupported first/experiential claims for TWØBAYS, and a claimed place order without sorting. New page has a compact photo-led hero, place finder with native anchor navigation, all five listable records grouped by place, roomy consistent rows, clear guide/official visit links, retained Save/share and concise planning guidance. Original canonical/title and breadcrumb schema retained; added truthful ItemList. Counts and areas derive from isListableVenue-filtered collection, rather than a hardcoded five. All results rendered without JavaScript.

## Dated claim ledger, checked 15 November 2026

| Entry | Primary source | Claim and scope |
| --- | --- | --- |
| Jetty Road | https://www.jettyroad.com.au/dromana | Venue page links current menu, beers on tap and table booking; address12–14 Brasser Ave. No hours, walk-in guarantees, sensory verdict or ownership claim repeated. |
| TWØBAYS | https://www.twobays.beer/pages/taproom | Operator describes dedicated gluten-free beer/pizza taproom; current visiting page lists Unit1,2 Trewhitt Court, Dromana. Old PI card's2/4 Brasser Ave not repeated. No medical-safety promise or first/only superlative. |
| St Andrews Beach | https://standrewsbeachbrewery.com.au/fingal-brewery/ and homepage | Former horse-training stables, indoor spaces and beer garden; booking options differentiated. Fingal venue used, not Melbourne Park. Operator page has overlapping Sunday hours; omit all exact hours. No universal booking or walk-in promise. |
| Tar Barrel | https://tarbarrel.com.au/ |72 Watt Road Mornington, brewery/distillery, beer and spirit paddles, wood-fired pizza. Existing canonical slug mornington-peninsula-brewery retained. No award/owner claim. |
| Red Hill | https://www.redhillbrewery.com.au/whats-on/ and homepage | Red Hill South, deck/beer garden/hops, different kitchen/bar timing. Page varies on kitchen closing times and menus; omit exact time/menu promises and advise current check for late arrival. |
| Planning | Editorial advice | Check kitchen service, group/access/dietary/non-alcoholic needs and transport; no universal suitability, access, availability or timing claim. |

Names/place relationships come from existing collection, checked against these official pages. External links now land on verified relevant venue/visiting pages; canonical internal wine-section venue destinations are unchanged. Addresses appear only where currently supported above. More precise TWØBAYS information is page-local; linked venue articles/records remain outside scope.

## Image rights

Only existing St Andrews photograph used: /images/visit-victoria/vv-168568-st-andrews-beach-brewery.webp,2000x1334,231694 bytes. Its venue heroImage records actual depiction, recorded rights, verified provenance, website/social permitted uses, Visit Victoria rights holder, licence and download permission from28 September2026; rights established29 September2026. Visible food/beer/fireplace alt retained. Public caption names St Andrews Beach Brewery,Fingal and credits Courtesy of Visit Victoria, linked to existing photography credits. Positive regional editorial use fits recorded permission. No generic beach images presented as breweries, no new assets. Only show cover while listable St Andrews record and rights checks pass.

## Review and gates

C1 angle,C2 reporting,C3 discernment,C4 structure,C5 voice,C6 economy,C7 inclusion,C8 service,C9 channel,C10 finish: baseline/revision UNASSESSED numerically pending independent rendered cold review; source ledger above supplied. No numeric aesthetic claim.

G1: primary ledger recorded; independent confirmation pending. G2: no new commercial relationship; product records no pay-for-coverage. G3: existing licensed image, explicit credit and actual venue. G4: no diet-safety/access guarantees or invented visit. G5: final CI/screenshots pending. G6: user authorised committing/pushing/publishing routine updates; parent acceptance still required for this candidate.

Local Astro compiler transform: no diagnostics. House-style and CSS budget pass. Local/browser socket restrictions respected: review uses existing supported CI Site harness, no local browser launch. CI captures390px/1440px first visit, clean reading, controls and mobile menu; checks overflow, first-screen unobscured CTA, all five cards/schema, internal destinations, area jump, Save/unsave/Share, focus, mobile menu Escape return, photo credit/gutter and computed text contrast. Exact PR head checkout. Full build/search and required gates exercised by existing PR workflows. No tests reported as passed before execution.

First candidate72218c4: admission/lints passed, but full-build SEO lint caught the new credit link pointing to a nonexistent /photography-credits/ route. Corrected to the site's existing /photography/ route and widened rendered checks from card-only links to every internal guide link. No baseline or gate weakened; exact correction requires fresh CI.

The first browser review stopped before screenshots because an over-broad selector replacement also changed the property expression planningInset into subtraction. Corrected the property identifier and a stale producers anchor expectation, and moved the initial capture before assertions to retain visual evidence if a check fails. These are review-harness corrections, not relaxed acceptance criteria.
