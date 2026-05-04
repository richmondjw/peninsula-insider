# SEO experiments — Peninsula Insider

Every shipped SEO change is logged here as a hypothesis-driven experiment. Wins and losses both kept; failed experiments are as informative as successful ones.

## Format

```
## YYYY-MM-DD — short title
- **PR**: link
- **Pages affected**: list
- **Hypothesis**: specific, measurable. "If we do X then metric Y will move from A to B by date Z."
- **Mechanism**: why we expect it to work, in one sentence.
- **Measurement**: which line in `daily-log.md` we'll read on date Z to confirm or refute.
- **Outcome (filled later)**: what actually happened, hypothesis confirmed/refuted, what we learned.
```

## Active experiments

### 2026-05-04-01 — CTR snippet rewrite on dog-friendly journal page

- **Status**: shipped to worktree branch `claude/seo-day1-followup` 2026-05-04. Awaiting deploy.
- **PR**: pending
- **Pages affected**: `/journal/dog-friendly-mornington-peninsula/` (single page)
- **Baseline (May 3 pull, 28d window Apr 4-May 1)**: 138 impressions on with-slash variant + 317 on no-slash variant = 455 combined impressions, **0 clicks**, average position 8.9-12.8. Page ranks position 1-10 across 13 dog-related queries. Top queries: "a dog-friendly guide mornington peninsula" (14 impr, pos 7.4), "dog friendly guide mornington peninsula" (12 impr, pos 7.3), "mornington peninsula dog rules regulations beaches parks" (9 impr, pos 4.4), "dog friendly mornington peninsula guide" (2 impr, pos 1.0).
- **Hypothesis**: rewriting the title and meta description to add a freshness signal (2026), front-load the core query, and promise specific value props (off-leash beaches, cafés, stays, rules) will move CTR from 0% to ≥1.5% on the with-slash variant within 14 days. Specifically: by 2026-05-18, this page earns ≥3 clicks per 7-day window with impression count similar (~138/wk).
- **Mechanism**: 0% CTR across 138+ impressions at page-1 positions is structurally low — strong indication the snippet is failing to win the click. Old title was generic ("Dog-Friendly Guide to the Mornington Peninsula · Peninsula Insider") with no freshness signal, vague brand suffix consuming character budget. Old meta used em-dash punctuation (project rule violation) and softer phrasing ("complete guide... what to avoid"). New title front-loads the topic + year + three concrete value props in 62 chars. New meta opens with a specific value prop ("Off-leash beaches at Rye and Blairgowrie") and adds a freshness signal at the end ("2026 dog guide").
- **Files changed**: `next/src/pages/journal/dog-friendly-mornington-peninsula.astro` — `BaseLayout` title and description props, plus matching `articleSchema.description`.
- **Verification** (2026-05-04): rebuilt locally with `npm run build` — 1027 pages built in 16.46s, no errors. New title and meta confirmed in `dist/journal/dog-friendly-mornington-peninsula/index.html`.
- **Measurement**: read the indexation + queries blocks in `daily-log.md` on 2026-05-11 (7d) and 2026-05-18 (14d). Headline metric: CTR on `/journal/dog-friendly-mornington-peninsula/` (with slash) in the page-level data.
- **Outcome (filled later)**: _pending — measure 2026-05-11 and 2026-05-18_

## Completed experiments

### 2026-05-01-01 — Remove duplicate broken `/places/undefined` canonical ✓ EXCEEDED

- **Status**: shipped 2026-05-01 ([PR #16](https://github.com/richmondjw/peninsula-insider/pull/16)), deployed same day, verified live across 7 spot-checked pages.
- **Pages affected**: all 20 pages under `/places/*`.
- **Hypothesis**: by 2026-05-16, priority URL indexed count rises from 2/14 to ≥7/14.
- **Mechanism**: `PlaceDetailTemplate.astro:62-77` defined a `canonical` const from `place.slug` (undefined; correct property is `place.id`) and emitted it via `<Fragment slot="head">` alongside duplicate `<title>`, meta description, og: tags, and JSON-LD. Result: every place page had two `<link rel="canonical">` tags (second pointing to `/places/undefined`). Removed the entire fragment block and the unused locals that fed it. The parent `places/[slug].astro` already passed correct head metadata to BaseLayout.
- **Outcome (2026-05-04, 3 days after deploy)**: hypothesis EXCEEDED. **Priority URL indexed count went 2/14 → 11/14 by 2026-05-03 → 14/14 by 2026-05-04.** Hit the 7/14 target 12 days early; hit 14/14 (full sweep) 12 days early. All 9 stuck "Discovered" / "Alternate canonical" priority URLs flipped to "PASS — Submitted and indexed":
  - Day 2 gainers: `/wine/best-cellar-doors/`, `/explore/best-walks/`, `/stay/best-accommodation/` (was Alt canonical), `/journal/mornington-peninsula-day-trip/`, `/journal/dog-friendly-mornington-peninsula/` (was Alt canonical), `/places/sorrento/`, `/places/red-hill/` (was Alt canonical), `/places/mornington/`, `/places/rye/`
  - Day 3 gainers: `/eat/best-restaurants/`, `/journal/mornington-peninsula-in-autumn/` (recovered from "URL unknown"), `/journal/mornington-peninsula-with-kids/`
- **Side effects observed**: 28d impressions rose 1,780 → 2,415 (+36% in 3 days). 14 new pages now appearing in search. 8+ fishing pages from PR #8/#38 also lit up at page-1 positions in the same window. Clicks finally moved off the floor (23 → 26 in 28d).
- **What we learned**: (1) duplicate canonicals on a young site are catastrophic — fixing them unblocked indexation across an entire URL pattern. (2) Google's response time was much faster than the 14-day budget — likely because the canonical conflict was the dominant blocker, not crawl budget. (3) Manual reindex requests (which James submitted on 2026-05-01-02) probably helped accelerate, but the magnitude (9 URLs in 48h) suggests Google was waiting for the canonical signal to clear and recrawled aggressively once it did. (4) Fixing one root-cause template bug had ripple effects across pages we weren't measuring (fishing pack, journal pages) — supports the "fix templates first, then content" prioritisation.
