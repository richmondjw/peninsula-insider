# Peninsula Insider homepage design review — 30 September 2026

**Outcome:** The mobile navigation passed an independent 23-criterion local browser audit at **99.48/100**. The homepage as a whole has not yet met that threshold. Publication was authorised on 30 September; production verification is a separate release gate.

**Decision:** Adapt the incumbent coastal editorial design.

**Owner:** James Richmond for brand direction; Codex for implementation and release verification.

**Project:** Peninsula Insider.

## Evidence and scoring

Three independent grade agents assessed the supplied 3251 × 7685 desktop capture and homepage source. They then reassessed the first changed local page at `http://localhost:4323/`. Scores are design judgments out of 100, not a percentile or a measured conversion result. The baseline mean was **71.2/100**; the first revision mean was **78.6/100**. This table records that first pass, not the current `4327` preview.

| # | Layer | Before | Revised | Finding after revision |
|---:|---|---:|---:|---|
| 1 | First impression | 72 | 80 | Local editorial promise now appears in the hero; headline remains broad. |
| 2 | Composition and hierarchy | 69 | 78 | Discovery leads before the seasonal feature; page remains long. |
| 3 | Typography | 77 | 78 | Headline and body are legible; small utility text remains. |
| 4 | Color and contrast | 79 | 79 | Brand palette is coherent; full contrast audit remains. |
| 5 | Imagery and art direction | 68 | 74 | Area photos add place context; CMS feature images remain uneven. |
| 6 | Whitespace and density | 61 | 74 | Journal feature is tighter; plan and area sections still add height. |
| 7 | Component consistency | 73 | 77 | Stronger section actions; header and card treatments still vary. |
| 8 | Premium differentiation | 58 | 70 | Independence is visible; a distinctive editorial voice needs further work. |
| 9 | Navigation and findability | 74 | 81 | Place exploration moves earlier; desktop navigation remains dense. |
| 10 | Task clarity and information architecture | 70 | 83 | Weekend, browse, place and plan now form a clearer sequence. |
| 11 | Action clarity | 76 | 82 | Plan and newsletter actions are more explicit; save/trip icons remain terse. |
| 12 | Mobile responsiveness | 72 | 76 | 360/390px fit checks found no page overflow; hero is still tall. |
| 13 | Accessibility | 68 | 84 | Persistent photo pause works; screen reader and zoom tests remain. |
| 14 | Interaction and motion | 75 | 83 | Autoplay can be stopped; its value for first-time visitors remains debatable. |
| 15 | Trust and reassurance | 61 | 82 | Independence and method link are visible near the opening. |
| 16 | Perceived speed | 74 | 75 | Static build and lazy images help; field Web Vitals remain unmeasured. |
| 17 | Audience relevance | 73 | 76 | Core travel journeys are clearer; weekend picks remain wellness-heavy. |
| 18 | Value proposition | 64 | 82 | Local, independent selection now explains why to use PI. |
| 19 | Editorial content | 76 | 81 | Seasonal story no longer blocks task-led exploration. |
| 20 | Discovery and personalization | 78 | 84 | Photo-backed places and plan preview improve decision support. |
| 21 | Newsletter conversion | 59 | 59 | Button is clearer; no current issue preview is available to show. |
| 22 | Local authenticity | 77 | 84 | Named places and local method are stronger; image curation remains. |
| 23 | SEO and content semantics | 84 | 85 | One H1 and semantic sections persist; dated content needs reliable rebuilds. |

### Second independent homepage pass

Three separate reviewers graded the later `http://localhost:4327/` preview against their own 23-point rubrics. These were **83.0 visual**, **81.6 travel/editorial** and **93.1 UX**, or **85.9** as an unweighted mean. The scores preceded the final licensed-image, dated-content and mobile-menu corrections, so they are evidence of progress rather than a grade for the final files. No reviewer has certified the whole homepage above 99.

The visual reviewer cited remaining whitespace, mixed image quality, small labels and newsletter persuasion. The travel reviewer cited unverified event depiction, stale seasonal advice, editorial specificity and image provenance. The UX reviewer saw stronger task paths and plans, but still lacked device, screen-reader and field performance evidence. The subsequent corrections target those concrete findings; they do not make an unmeasured conversion result.

### Mobile menu: independent 23-criterion audit

The new modal navigation was graded independently after a repeat-open scroll defect was found, fixed and retested. It scored **2,288/2,300 = 99.48/100** in the local browser. Each criterion carries equal weight.

| Criterion | Score | Criterion | Score |
|---|---:|---|---:|
| Menu discovery | 100 | Open and close controls | 100 |
| Information hierarchy | 99 | Label clarity | 100 |
| Scanability | 99 | Search access | 100 |
| Text contrast | 100 | Link integrity | 100 |
| Current-page indication | 100 | Touch targets | 100 |
| Initial focus | 100 | Focus containment | 98 |
| Keyboard order | 99 | Escape behavior | 100 |
| Focus restoration | 100 | Background inertness | 100 |
| Page scroll lock | 100 | Menu scrolling | 100 |
| Mobile layout | 99 | Narrow reflow and zoom | 97 |
| Screen-reader semantics | 99 | Motion and performance | 98 |
| Desktop breakpoint | 100 | | |

At 320, 360 and 390 CSS pixels the drawer had no horizontal overflow and all measured controls were at least 44 pixels high. All 15 link targets returned HTTP 200. Search opened and focused its query field; the Plans page acquired its current-page state. Escape restored focus, the dialog kept background controls out of the accessibility tree, and a resize to desktop closed the drawer and unlocked scrolling. After keyboard scrolling to 484.8 pixels, closing and reopening reset the drawer to the top. The small row numbers were darkened to 5.26:1 contrast. The source-level Impeccable scan found no issues. Actual 200% device zoom, VoiceOver/TalkBack and throttled hardware were not tested, and native focus wrapping briefly traversed the dialog/document rather than moving directly between controls.

## Bounded change and hypothesis

**Hypothesis:** Showing the independent local proposition in the first screen and moving place/plan decisions ahead of the seasonal article will make the site more distinctive and help visitors reach a relevant path faster.

The local revision adds a sourced editorial promise and direct method link, a user-controlled pause for the photo deck, photo-backed area choices using licensed Visit Victoria assets, three visible plan cards with a full-plan action, a shorter Journal feature, and a clearer newsletter preview and form. The article moves below exploration and planning. A modal mobile menu replaces the long inline menu. Final image and event passes added truthful context labels, visible photo credits, and metadata gates so an uncredited published CMS image does not silently replace a credited fallback. The final school-holiday story removes past activities. The campaign case and prize copy remain unchanged.

## Checks and limitations

- The final `npm run build` completed with exit code 0: 1,007 static pages, 689 responsive-image sources and the post-build audits. The project-wide `astro check` previously reported 134 existing errors across 745 files, so the separate type gate is not green.
- Plans, navigation, rights, media-provenance, style, CSS-budget, listener and event-safeguard checks passed within that build. An accessibility-form change required a test fixture update; its receipt test passed in the final run. The event check initially rejected a new free-text verification field; it passed after the evidence was moved into the declared structured verification fields.
- Impeccable source scans reported no finding in the changed homepage and mobile-menu files. Browser review confirmed hero pause, plan visibility, menu behavior and mobile fit. Desktop was reviewed at 1440 CSS pixels.
- A full screen-reader, 200% zoom and field Core Web Vitals run has not been completed. No conversion or visitor feedback is available. The public CMS view exposes 531 published image-slot rows with no visible alt-text or credit metadata; the revised homepage uses a credited local fallback when an override lacks those fields. Other site surfaces need a separate metadata audit.

## Next decision and evaluation

1. **Editorial follow-up:** The wellness and school-holiday feature images, weekend shortlist and date-sensitive claims now have sourced local replacements or contextual labels. Review the final artwork and headline for the next iteration. James owns the brand direction; Codex owns the implementation record.
2. **Brand rule follow-up:** The homepage game band advertises a $250 prize while PRODUCT.md says no prices. Clarify whether prize disclosure is an approved exception. The campaign case and terms were unchanged in this pass.
3. **Release evaluation:** After deployment, measure mobile LCP/CLS/INP, hero-to-plan/place clicks, newsletter signups, and weekend event clicks against a pre-release baseline. Evaluate after seven days or the next content cycle, whichever is later. Preserve the previous homepage version for rollback if task completion or performance worsens.
4. **Independent review:** Repeat the whole-homepage 23-layer critique with final rendered imagery, real mobile/assistive-technology evidence and field metrics before claiming a world-class threshold. The menu's local 99.48 score is scoped to that interaction; it cannot be applied to the whole site.
