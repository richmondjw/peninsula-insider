# Peninsula Insider — Overlap Audit
**Date:** 2026-05-10
**Scope:** Journal, evergreen service pages, What's On, Quick Note. Plus the discovery layer (/explore/) and section hubs (/eat/, /stay/, /wine/, /escape/) where they intersect with the four named surfaces.
**Goal:** Name the duplication, classify it, recommend what to do — without restructuring anything yet.

## TL;DR

Three real overlaps, ranked by operational impact:

1. **Journal evergreens vs Explore hubs vs vertical hubs** — same intent, three competing pages. **High impact.**
2. **What's On vs the homepage rail vs Quick Note** — three different freshness layers, unclear hierarchy. **Medium impact.**
3. **/explore/ discovery layer vs section hubs** — /explore/ has begun to overlap section hubs; not clear when /explore/dog-friendly/ supersedes /dog-friendly/. **Medium impact.**

## Surface census

Counts from the worktree as of 2026-05-10:

| Surface | Items | Source pattern |
|---|---|---|
| Journal articles | 172 | `next/src/content/articles/*.{md,mdx}` |
| Quick Notes | 39 | `next/src/content/quick-notes/*.md` |
| Events | 91 | `next/src/content/events/*.json` |
| /explore/ pages | 22 | `next/src/pages/explore/*.astro` |
| Vertical hubs | 9 | `/dog-friendly`, `/spa`, `/golf`, `/boating`, `/fishing`, `/fish`, `/escape`, `/corporate-events`, `/awards` |
| Section hubs | 5 | `/eat`, `/stay`, `/wine`, `/places`, `/journal` |

## Overlap 1 — Journal evergreens vs Explore hubs vs vertical hubs

### Symptom
The same reader question — "what are the best X on the Peninsula?" — has up to **three competing pages**:

| Question | Journal evergreen | /explore/ hub | Vertical hub |
|---|---|---|---|
| Best golf courses | `/journal/best-golf-courses-mornington-peninsula/` | `/explore/golf/` | `/golf/` |
| Best spas | `/journal/best-spas-mornington-peninsula/` | `/explore/spas-and-wellness/` | `/spa/` |
| Best fishing spots | `/journal/best-fishing-spots-mornington-peninsula/` | _(none)_ | `/fishing/` and `/fish/` |
| Best brunch | `/journal/best-brunch-mornington-peninsula/` | _(none)_ | _(none — falls under /eat/)_ |
| Dog-friendly things | `/journal/dog-friendly-cafes-pubs-wineries-mornington-peninsula/` | `/explore/dog-friendly/` | `/dog-friendly/` |
| Best walks | `/explore/best-walks/` and `/explore/walks/` | `/explore/best-walks/` | _(none)_ |
| Free things | `/journal/free-things-to-do-mornington-peninsula/` | `/explore/free/` | _(none)_ |
| Family-friendly | _(spread across multiple)_ | `/explore/family-friendly/` | _(none)_ |

### Why it matters
1. **SEO competition between PI's own pages.** Three URLs targeting "best golf courses Mornington Peninsula" split link equity and confuse Google about the canonical answer.
2. **Editorial duplication.** The same recommendation has to be maintained in three places, or it will drift.
3. **Reader confusion** — what is the "right" page to send someone to? Internal nav implies different answers from different surfaces.

### Classification
- Journal evergreens: **tighten role** — their job should be _opinionated, dated, voicy_, not "the canonical list".
- /explore/ hubs: **tighten role** — should be _discovery / decision_, not "the canonical list".
- Vertical hubs (/golf/, /spa/, etc.): **keep distinct as the canonical list** — these own the topic.

### Recommended near-term move (no restructure)
1. Pick the canonical owner per topic. Default rule: **vertical hub if one exists, else /explore/ hub, else journal evergreen.**
2. Add canonical link tags pointing to the canonical owner from the other two surfaces.
3. Edit the non-canonical pages to *cross-link to* the canonical, not duplicate it.
4. Add a one-line role statement at the top of each surface ("This is the editorial take" / "This is the canonical list" / "This is the decision tool").

This is a copy + linking change, not a structural change. Restructuring is explicitly out-of-scope per the operational review.

## Overlap 2 — What's On vs homepage rail vs Quick Note

### Symptom
Three surfaces present **time-bounded freshness**, unclear hierarchy:

| Surface | Time scope | Voice | Refresh cadence |
|---|---|---|---|
| Homepage What's On rail | "this weekend" | curated — 4–6 picks | weekly (Sunday dispatch chain) |
| /whats-on/ page | "all upcoming" | exhaustive event listing | continuous (events scan) |
| Quick Note | "today / this week" | editorial diary entry | daily |

### Why it matters
1. **Reader entry path is unclear.** Someone arriving at "what should I do on the Peninsula this weekend?" can land on any of the three with different answers.
2. **Quick Note rapidly becomes invisible.** It is a daily editorial product but the homepage rail and What's On both surface stronger candidates.
3. **Cross-linking is incomplete.** Quick Notes don't reliably link to relevant What's On entries, and vice versa.

### Classification
- Quick Note: **keep distinct** — it has a real role as *editorial diary, "what's on my mind today"*.
- Homepage rail: **keep distinct** — it is the curated weekend product.
- /whats-on/: **tighten role** — it should be the *exhaustive* list, not the curated one. Currently overlaps with the curated layer.

### Recommended near-term move
1. Quick Note's homepage placement currently competes with the weekend rail. Consider rotating quick-note presence on homepage by time-of-day rather than always-visible.
2. Add explicit role headers: What's On = "Everything happening". Quick Note = "What I noticed this morning". Weekend rail = "Our pick for this weekend".
3. Cross-link: Quick Notes that mention a specific event should link to its What's On entry. What's On entries should optionally surface a relevant Quick Note.

## Overlap 3 — /explore/ discovery layer vs section hubs

### Symptom
The /explore/ directory has 22 pages. Some are unique to /explore/ (decision tools like `where-to-base-yourself`, `weekend-trips`, `getting-here`). Others duplicate vertical hubs (`golf`, `spas-and-wellness`, `dog-friendly`, `fishing`-shaped pages).

### Why it matters
- /explore/ was designed in Phase 1 as a discovery / intent layer.
- Some /explore/ pages have evolved into list-style hubs that compete with their vertical equivalents.
- Without a rule, every new content type ends up being a candidate for both /explore/ and a vertical home.

### Classification
- Decision tools (`where-to-base-yourself`, `weekend-trips`, `getting-here`, `getting-around`, `markets`, `rainy-day`, `mornington-peninsula-walk`, `things-to-do`, `family-friendly`, `free`, `day-trips`, `bushrangers-bay`): **keep distinct** — these are unique to /explore/.
- Topic duplicates (`golf`, `spas-and-wellness`, `dog-friendly`, `beaches`, `walks`, `best-walks`, `hot-springs`): **tighten role** — these should be intent-style entry points, not topic lists.

### Recommended near-term move
1. Define the rule: **/explore/ is for intent ("what kind of weekend"), vertical hubs are for topic ("where to play golf").**
2. Audit the 7 topic-duplicate pages above against their vertical equivalent. Either:
   - Make /explore/ the intent entry → vertical hub the canonical list (rename, recopy), OR
   - Retire /explore/golf/ in favour of /golf/ (etc.)

## Surfaces I am NOT recommending to change yet

- `/places/` (place hubs) — no overlap with Journal/evergreen; it is its own orthogonal layer.
- `/eat/`, `/stay/`, `/wine/` — section hubs serve a different role from /explore/ and Journal evergreens. Their internal information architecture is a separate problem from this overlap audit.
- `/escape/` — is the canonical hub for weekend-trip and one-night-escape content; the overlap with `/explore/weekend-trips/` is mild and the names already imply different intent.

## What this audit deliberately does not do

- It does not propose a new IA. The IA blueprint that landed today (`peninsula-insider-content-architecture-ia-blueprint-2026-05-10.md`) is the right place for IA decisions, and that work has its own approval path.
- It does not prescribe URL changes. URL changes have SEO consequences — that is downstream of the overlap classification.
- It does not name a single owner per topic. That is an editorial decision for James / Emma.

## Pre-decision checklist

For James / Emma to act on this audit, three decisions unlock the next move:

1. **Per-topic canonical owner rule** — vertical hub > /explore/ hub > Journal evergreen, OR a different default? (Default proposed above.)
2. **Quick Note placement on homepage** — always visible, time-of-day-rotated, or moved to a "today" rail?
3. **/explore/ scope** — intent only (decision tools), or intent + topic? If "intent only", which 7 pages need to retire or rename.

## Coverage

This audit covers the four surfaces named in the backlog (Journal, evergreen, What's On, Quick Note) and the two adjacent surfaces (Explore, vertical hubs) where the overlap is most visible. It does not cover:
- The newsletter / pass / membership product layer.
- The partner / claim flow.
- The map / itinerary builder.

Those have separate operational roles and were excluded from the overlap audit on purpose.
