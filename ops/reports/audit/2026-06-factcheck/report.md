# Site-wide Fact-Check Audit — Findings Report

Audit started 2026-06-10. Companion to `tracker.md`. Each section is appended
as a verification batch completes. "Updated" items had high-confidence
corrections applied to content JSON; "flag" items need human review.

Note on method: direct HTTP fetches are blocked from the build sandbox
(egress proxy 403s), so URL liveness was established via current
search-engine indexing of each domain rather than direct fetches.

---

## Batch 1a — Signature events (11/11 complete, 2026-06-10)

**Updated (2):**

- `main-street-mornington-festival` — the page still framed 2026 as
  unconfirmed ("seeking sponsors") after the 2025 funding cancellation. The
  official site now confirms the festival returns **Sunday 19 October 2026**
  (28th year). `summary`, `whatItIs`, `editorialNotes`, `lastReviewed`
  updated; the "subject to funding confirmation" recurrence wording kept
  deliberately. Sources: mainstreetfestival.com.au, mornpen.vic.gov.au.
- `sailing-regattas` — `officialUrl` pointed at a dead SSCBC deep link
  (`/coutaboats/`, not in the site's current index). Switched to the
  verified club homepage `https://sscbc.com.au/`. Fleet/racing-season
  claims (largest Couta Boat fleet, 120+ boats, Nov–June racing) confirmed.

**Verified accurate (9):** annual-festivals, mornington-winter-music-festival,
peninsula-film-festival, portsea-polo, portsea-swim-classic,
portsea-twilight, sorrento-writers-festival, wine-weekends,
winter-wine-weekend. Key confirmations: Portsea Polo's Feb 2026 return under
F3Polo after a five-year hiatus; Sorrento Writers Festival 2026 ran 23–26
April (founder Corrie Perkin, ~6,000 visitors 2025); Winter Wine Weekend 2026
ran 6–8 June at Red Hill Showgrounds; Portsea Twilight 2027 announced for
9 Jan 2027.

**Optional enrichment suggestions (human, non-blocking):**

- `peninsula-film-festival` — page never names Rosebud, the festival's
  long-standing home venue; `relatedPlaces` lists mornington/sorrento only.
- `wine-weekends` — organiser's consumer-facing domain is now
  morningtonpeninsulawine.com.au; mpva.com.au still live and valid.
- `mornington-winter-music-festival` — official site still titles itself
  "Queen's Birthday"; our "King's Birthday" wording is the current correct
  name. No action needed.
