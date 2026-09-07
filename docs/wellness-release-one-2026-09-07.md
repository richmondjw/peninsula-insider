# Wellness foundations — release 1

Tracker: https://pi-wellness-implementation.richmondjw.chatgpt.site

Scope: W02, W03 and the content portion of W06. W04 is separately gated on serving-layer access; a GitHub Pages redirect document is not an HTTP 301.

## Changes

- Add the missing Alba section at the already-used canonical fragment; derive the hub ItemList from its displayed ranking and use one valid section identity per venue.
- Replace the wellness-stays page's spa list with six actual accommodation records grouped into on-site bathing, hotel spa, external package and separate accommodation base. All cards use the shared venue URL resolver.
- Generate visible FAQs and FAQ data from the same array. Remove unsupported shuttle, monopoly, location and spa-facility claims from this page.
- Correct Alba's address and locality, plus the three thermal accommodation localities; align their zones with the maintained Fingal place record. Remove misleading glamping/eco-lodge conflation and unsupported accommodation superlatives and access-time claims from their maintained copy.
- Keep prior whole-record verification dates: these are targeted corrections, not proof that every field, photograph or coordinate has been re-verified.

## Evidence checked 7 September 2026

- https://albathermalsprings.com.au/alba-experiences/spa/ — current treatments and bathing packages.
- https://albathermalsprings.com.au/faqs/ — 282 Browns Road, Fingal; five villas and two studio rooms; transport guidance.
- https://albathermalsprings.com.au/alba-experiences/the-sanctuary/rooms/ — published room inclusions.
- https://albathermalsprings.com.au/alba-experiences/the-sanctuary/villas/ — published villa inclusions.
- https://www.peninsulahotsprings.com/accommodation — glamping and eco lodges are separate accommodation formats at Fingal.
- https://www.peninsulahotsprings.com/accommodation/stay-local/flinders-hotel-stay-and-bathe — current external bathing partnership and blackout dates.

## Verification

From `next/`, run the existing build and release checks, then `node scripts/assert-wellness-foundations.mjs`. After release run the same script with `--live`.

The assertion checks real rendered fragments, ItemList parity, distinct accommodation targets that are not redirect stubs, retired claims and visible FAQ parity. Add `--redirects` only to verify the serving-layer rollout; it must fail while the five URLs still serve 200 documents.

Local validation passed on 7 September: editable coverage, content admission, agent-readiness tests, event-safeguard tests, content schema, full build/search (977 pages built; 715 indexed), and the wellness assertions. Production verification will be recorded in the tracker after deployment. No browser interaction or authenticated Save workflow is claimed by these rendered-output checks.

## Pending HTTP redirects

`ops/wellness-redirects.csv` records the exact five mappings. Preserve query strings, use HTTP 301 and verify one hop to a 200 response. Existing client-side documents remain until edge rules are deployed. Do not import the broader historical migration list or change unrelated rules.

Previous evidence in `docs/seo/2026-08-16-redirect-rules-to-paste.md` records a Dynamic Redirect API permission problem. No suitable credential was found at the documented current-host or WSL paths in this session. Current account access and rule capacity remain unverified; W04 must not be marked complete.

## Remaining work

W05 still needs the full eight-venue register, coordinates, image rights and current access checks. Hotel Sorrento, new venues, town/map integration and the broader comparison/itinerary review remain in release 2. The new Alba entry does not assert the existing ranking has been re-reviewed end to end.

Rollback: revert this bounded change and rebuild. No data migrations or external booking mutations are involved.
