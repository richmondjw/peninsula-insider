# Editorial refinement: implementation and verification

Approved direction: incremental Harbour refinement, 6 September 2026. Sora/Figtree, blue/sand, bold contrast, existing navigation and rounded components remain the publication identity.

## Changes by surface

| Surface | Implemented refinement |
|---|---|
| Homepage | Shorter static cover; differentiated 1.5:1:1 desktop shortlist; Journal split feature moved before category doors; concise category descriptions; dynamic content selection retained. |
| Masthead, footer and navigation | Existing navigation architecture retained; tighter footer rhythm; 44px touch targets; keyboard focus and Escape behaviour checked. |
| Articles and guides | More width for long headlines; smaller headline blocks; Figtree standfirst; quieter metadata/tags; natural image colour; clearer prose rhythm; mobile breadcrumb containment. |
| Categories, listings and events | Consistent hero spacing and card hierarchy; compact factual rows; empty decorative image panels removed automatically while preserving CMS image targets. |
| Saved, trip and account | Consistent shell typography; inactive states truly hidden; card + Trip actions connected on homepage and category hubs, with confirmation and protection against repeated-click duplicates. |
| Search and forms | Readable result cards; proper inactive/empty states; fieldset containment on phones; visible focus; mobile fields at least 16px. |
| Newsletter | Existing service and trigger logic retained; popup typography, corners, close controls and reduced-motion behaviour aligned with the site. |
| Printed guides and partner documents | Screen-only Harbour type/colour and responsive reading layout; scrollable tables on phones. Print-media geometry and existing PDF assets are not regenerated. |
| Motion | Static cover photography; no hover zoom or lift on shared cards; immediate editorial visibility; brief button feedback; reduced-motion overrides. |
| Semantics | Duplicate main wrappers removed from public templates that already use BaseLayout. |

## Verification scope

- Source inventory covers public, redirect and internal Astro page sources. Dynamic templates apply across their content entries.
- Desktop 1440px and mobile 390px review covers 94 representative routes across the public page families. Final regression evidence is stored alongside the original audit in the local rollout-review artifact folder.
- Compiled HTML landmark scan checks complete documents, excluding redirects and internal tools. Static account HTML includes alternative signed-in/signed-out headings; the browser displays one after authentication resolves.
- The separate access gate and historical email preview documents are not normal reading templates and retain their independent markup. Production access gate remains off.
- Existing content, search, SEO, link-graph, event, CMS and release checks remain enabled. Windows URL/path handling and one POSIX-only assertion command were made portable; no baselines were weakened.

## Interaction checks

Verified locally: mobile newsletter popup open, empty-email validation and dismissal; 320px header review; directory filter reducing 61 entries to 18; mobile menu open/close and Escape focus return; cookie preference rejection; save persistence; adding a homepage card to My Trip; repeated click retaining one stop; removal from trip; populated and empty search states; signed-out account; narrow-screen submission field containment.

Authenticated account/editor/partner roles, actual newsletter delivery, external booking and form submissions require real service transactions and were not exercised. Their integrations remain in place. This is not a claim that every conditional state or every editorial photograph was reviewed.

## Release and rollback

Use the existing main-branch build and GitHub Pages deployment. Preserve the independently released partner project dashboard and its route-contract tests. Verify deployment.json against the release commit, then inspect live homepage and representative inner pages. A rollback is a revert of this refinement commit followed by the same deployment workflow.

## Editorial follow-up

Some existing CMS photographs are representative location images, including the current NWOP event and daily Insider Picks feature. The refinement preserves authoritative content and CMS overrides; commissioning or selecting precise subject imagery remains an editorial task, not an invented replacement image.

## Recorded results

- Full build:search passed after integration of main d1baf94261; 976 generated pages, 714 indexed search pages.
- 188 final desktop/mobile route captures; no document-level horizontal overflow. One disabled access-gate template has no main landmark and remains separate.
- Store tests: 8/8. Event safeguard tests: 14/14. Agent-readiness tests: 10/10. CMS editable coverage and content validation passed. Campaign and partner-dashboard assertions run in the full build.
- Browser checks found and corrected duplicate main wrappers, inactive panels leaking into view, card trip actions missing outside the events hub, mobile fieldset overflow, narrow header clipping and booking-button contrast.
