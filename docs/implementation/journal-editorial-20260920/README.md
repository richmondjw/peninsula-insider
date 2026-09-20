# Journal and shared editorial shell

Implementation branch: `codex/journal-editorial-20260920`.
Baseline: `ca1ebc9aff` (origin/main fetched 20 September 2026).
Review reference: local Journal design, brand-v4. Not deployed.

## Changes

- Shared header and warm footer across BaseLayout pages. Existing Sora wordmark, blue Insider text and dark-blue dynamic conditions ribbon retained.
- Seven direct pillar destinations; personal tools grouped under Your Peninsula. Existing search overlay, Play configuration, signed-in profile mount, consent controller and newsletter destination remain connected.
- Compact mobile navigation replaces the old drawer/bottom bar. Legacy fixed-header compensation is restricted to the old shell so the ribbon stays visible. Navigation is also exposed without JavaScript.
- Outer frame widened to 1280px of content, with responsive gutters. Existing narrower prose, form and application layouts retain their own measures.
- Native Astro Journal index, using the current editorial eligibility rule (including the separation of Insider Picks). All eligible archive links are in server-rendered HTML; filtering and pagination progressively enhance the archive.
- Curation lives in src/data/journal-front.json: expiry, ordered slots, and approved index-only teaser copy. Unavailable/expired choices fall back to eligible content; featured slots are deduplicated. Article titles and prose are not rewritten.
- Source Serif 4 and Inter are self-hosted with OFL licences. Journal component styles are isolated from non-Journal bodies.
- Standard article template gets the editorial hero and prose treatment, contents navigation and existing persistent text-size controls. Save/share, correction notes, CMS hooks, related entities and schema remain.
- Images resolve through the existing CMS-aware resolver. Missing local images fall back to text-only cards and omit broken article hero figures; current credits and illustrative disclosures are preserved. Index and article images opt into the existing responsive-image build pipeline.
- Fixed consent controls losing their bindings after Astro navigation. The inline controller reruns with one AbortController-managed set of document listeners.

## Verification

The final Astro build passed: 993 pages generated, with responsive images processed. All 18 post-build checks were run independently: 17 passed; only the existing media-provenance gate failed. Listener hygiene and the CSS budget also passed. See release-checks.json and structural-checks.json.

Browser checks on the generated static site:
- Journal index: 320, 390, 768, 1024, 1440 CSS-pixel widths; no horizontal overflow, no broken loaded story images; menu fits its frame.
- Home, Eat hub, Map and Account: 390 and 1440px; shared header/footer present and no document overflow.
- Standard walks article: 390 and 1440px; prose and hero inspected. Existing Largest text size changes prose from 20px to 23.6px, and Default restores it.
- Archive: 82 eligible stories; Quealy search returns one; combining it with Dog-friendly yields the empty state; clear resets; Show more expands 8 to 16.
- Desktop personal disclosure and Escape; mobile menu and Escape; real search overlay; footer cookie settings, manage preferences and rejection tested.
- Logged-in backend/account mutation journeys were not exercised. This is a layout integration, not an authentication/backend rewrite.

## Existing release blockers

`astro check` reports 147 errors across 72 files. Each error-bearing file was compared with HEAD and is unchanged (normalising line endings). No errors remain in files changed by this implementation. Do not describe the repository-wide type check as passing.

The media-provenance release gate reports 13 images without recorded licences against a baseline ceiling of one. All 13 source records are unchanged from HEAD. This is not resolved by inventing licence information or raising the ceiling. The records are the luxury-hotels article and twelve species entries. The complete release must remain unmerged/unpublished until the repository's release checks are resolved or handled through its existing process.

## Review and release

Local built preview: http://127.0.0.1:18745/journal/
Article: http://127.0.0.1:18745/journal/the-peninsulas-best-late-afternoon-walks/

The original working checkout and its unrelated changes are untouched. Print layouts and the separately deployed Play game are unchanged. Bespoke static Journal guides keep their existing bodies; they receive the shared shell/frame. Review the complete preview, resolve the existing release blockers, then merge/deploy with the normal release workflow and verify production. No production change was made in this task.
