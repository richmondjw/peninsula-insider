---
target: "https://peninsulainsider.com.au/explore/walks/"
total_score: 19
max_score: 36
na_heuristics: 9
p0_count: 1
p1_count: 3
timestamp: 2026-08-09T01-47-02Z
slug: peninsulainsider-com-au-explore-walks
---
Method: dual-agent (A: design-review subagent · B: detector subagent), run in parallel isolated contexts. Pixel screenshots were unobtainable (Chrome window hidden/minimized on the host); visual claims are measured from the live rendered DOM (computed styles, geometry, CSSOM) plus the deterministic detector injected into the live page.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Breadcrumb + section labels solid; lazy card images have no real placeholder treatment |
| 2 | Match System / Real World | 2 | "600 MIN · MODERATE" on cards; nobody thinks in 600 minutes, and 10 hours is not "moderate" |
| 3 | User Control and Freedom | 2 | ~8,300px (desktop) to ~16,000px (mobile) page with no TOC, no anchors on the 11 ranked entries, no back-to-top |
| 4 | Consistency and Standards | 1 | Prose ranks 11 walks; grid shows 10 different ones sorted longest-first, including two cards for the same walk under different names; H1, title tag, and schema name all differ |
| 5 | Error Prevention | 3 | Read surface; only form is newsletter email |
| 6 | Recognition Rather Than Recall | 2 | Tier/rank info never carried onto the cards; reader must join the two halves in their head |
| 7 | Flexibility and Efficiency | 1 | Zero filters, no map, no anchors, for an 11-option decision task |
| 8 | Aesthetic and Minimalist Design | 2 | Clean type system, but the page says everything twice and ships a visible empty "FAQ" heading |
| 9 | Error Recovery | n/a | No error states exist on a static read surface |
| 10 | Help and Documentation | 3 | "What to bring", "Last fact-verified 23 April 2026", Best-for lines: quietly excellent |
| **Total** | | **19/36** | **Acceptable (53%): significant improvements needed** |

## Design Specificity Verdict

**LLM assessment:** The words are unmistakably Peninsula Insider; the design is not. The ranked prose (effort/payoff tiers, "the car park off Boneo Road", a fact-verified date, dry verdicts like "better as a morning walk framing a visit to the town") is the brand argument executed in full. But that ranking renders as body-size text on an imageless white document for over 4,000px, while the generic card grid at the bottom (interchangeable with any regional directory) gets all the photography, tags, and visual investment. The authored part looks generic; the generic part looks authored.

**Deterministic scan:** Source file scanned clean (0 findings). Live page: 64 findings across 61 elements. Real ones: 25 undersized-text hits (10.4px labels like "All walks · 10 tracked" and card place-links), 3 WCAG contrast failures in the newsletter block (worst: disclaimer at 1.9:1), 20 repeated "cyan gradient" card-visual hits, monotonous ~4px spacing (98% of gaps), all-caps body text in the newsletter footer, one 87ch line in the footer AoC. False positives to ignore: 9 of 10 thin-border/wide-shadow hits are on hidden closed drawers; one "broken image" fired on an HTML comment; the stale built copy in the repo root requests a completely different font set (Space Grotesk et al.) than the live page actually renders (Sora/Figtree), which is repo drift, not a live defect. Copy scans were spotless: 0 em-dashes, 0 banned tourism adjectives, 0 prices across the full rendered page.

**Overlays:** injection succeeded and the detector ran in the live page (console: 61 anti-patterns). The Chrome window was hidden/minimized during the run, so the overlay tab may not be on screen; it persists in that tab until reload.

## Overall Impression

This is a well-written verdict wearing a phone book's clothes. Trust signals are genuinely strong (fact-verified date, ranked calls, clean voice), and the footer/newsletter close is the most branded moment on the page. But the page contradicts itself factually within one scroll, buries its own ranking visually, and duplicates all content into a second, worse list. The single biggest opportunity: make the ranked entries be the designed objects (photo, tier badge, rank, duration chip, verdict) and delete the duplicate grid.

## What's Working

1. **TL;DR verdict block above the fold.** Five ranked calls before any scrolling ("Cape Schanck boardwalk is the best effort-to-payoff ratio"). The "ranked calls, not equal lists" positioning executed structurally.
2. **The ranked entries' information design (content).** Every entry: Distance / Elevation / Start point / verdict / Best-for. Consistent, scannable, hyper-specific. This is the brand.
3. **Voice compliance and the close.** Zero banned adjectives, zero em-dashes, zero prices in the page's own copy; wordmark to spec; "Every pick earns its place. Every verdict, a reason." plus Acknowledgement of Country is a strong peak-end.

## Priority Issues

- **[P0] Card-grid data integrity is broken.** Two cards for the same Two Bays track ("Two Bays Walking Track", 600 min vs "The Two Bays Walking Track", 180 min) with different notes; the coastal-walk card says "Twenty-six kilometres" while the prose above says 13 km one-way; the #1-ranked walk (Cape Schanck boardwalk) and #4 (Point Nepean) have no card at all; label says "10 tracked" while the meta description promises 11. Why: the brand is "locally verified" and the page contradicts itself on distances within one scroll. Fix: dedupe the experiences collection, add the two missing entries, reconcile distances with the prose, render durations as "10 h" / "1.5 h". Suggested command: /impeccable harden
- **[P1] The ranking and the grid are the same 11 objects rendered twice, and the design investment is on the wrong one.** Walk names in the ranking are 17px, identical to paragraph text; the unranked duplicate grid gets the photography and cards, sorted longest-first (inverting the effort/payoff logic). Fix: merge; ranked entries become the cards (photo, tier badge, rank number, duration chip, verdict), cut the grid. Fixes hierarchy, the 4,000px imageless valley, and working-memory load at once. Suggested command: /impeccable shape, then /impeccable layout
- **[P1] Visible empty FAQ heading; FAQ content exists only in JSON-LD.** Looks broken to readers, and invisible FAQ structured data violates Google's rich-result guidelines, risking the page's structured data standing. Fix: render the five Q&As visibly (details/summary) or delete heading and schema together. Suggested command: /impeccable harden
- **[P1] Accessibility misses that contradict PRODUCT.md's own commitments.** All 10 images have empty alt=""; newsletter block has three contrast failures (eyebrow 4.3:1, submit 4.3:1, disclaimer 1.9:1); 25 text nodes at 10.4px; inline links are colour-only. PRODUCT.md promises "alt text on every image, sufficient contrast". Suggested command: /impeccable audit
- **[P2] Four pages compete for "walks".** /explore/walks/ (self-canonical), /explore/best-walks (identical title tag, canonical without trailing slash), /walks/ (canonicals to a third URL variant), plus two more walk pages. Splits link equity; nav and search deliver different rankings of the same walks. Fix: crown this page, 301 the rest, kill the duplicate title. Suggested command: /impeccable shape (IA decision)

## Persona Red Flags

**Jordan (first-timer planning a trip):** trusts the ranking, scrolls to the cards to shortlist, and finds the #1 recommendation absent, two Two Bays cards that disagree, and a "600 MIN · MODERATE" walk. No map to relate 11 unfamiliar place names. Colour-only inline links are easy to miss.

**Casey (one thumb, in the car park):** ~16,000px of mobile scrolling, no anchors, no back-to-top, no filters. The TL;DR answers "which one is best" but not "which is short and near me right now". Tiny 13px uppercase place-links sit directly above the big card tap target: mis-tap territory. Place labels lie ("MAIN RIDGE" for Greens Bush vs prose "Rosebud/Dromana"; "RED HILL" for Arthurs Seat).

## Minor Observations

- Wayfinding: add anchor links from the TL;DR/tiers to entries, filter chips (under 1 h / half day / full day), and a map link.
- Performance: hero images ship at up to 12.6x displayed size; ~26 client-side Supabase image-slot queries (N+1, fired twice) plus 3 user_saves POSTs on a page view.
- Brand ground-truth drift: live tokens self-identify as v6 "Evergreen Coast" with display weight 600; PRODUCT.md says "v6 Harbour", Sora 700. Reconcile before any brand-fidelity scoring. (Reported, not repaired.)
- Page ground is #FFFFFF; the cream token #F2EFEA exists but is unused here.
- "Greens Bush - Two Bays Section" card title has doubled-space hyphens (data artifact).
- Card editorNote register drift: "The spectacular clifftop traverse", "one of the most impressive coastal walks anywhere in Victoria". Not on the literal banned list, but tourism-board register the ranked prose never uses.
- Grid sorted by duration descending: the most committing walks lead the section.
- mobile-fixes.css as a named patch file signals accumulated band-aids.
- Repo-root built copy is stale (different font links than production renders).

## Questions to Consider

1. If the ranking is the product, why does the design system (photography, cards, tags) only activate for the unranked duplicate list? Would you ship a restaurant guide where the reviews are plain text and the phone book gets the art direction?
2. Which of the four walks pages is the walks page, and what does it say about the pipeline that two of them ship the identical title tag?
3. Casey gets her answer in the first 900px and Jordan needs the next 13,000. Is this one page, or a verdict page and a reference database wearing one URL?
