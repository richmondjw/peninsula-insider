# WS4 — Redirect Map Reconciliation + Historical Decisions (§21)

**Date:** 2026-08-16 16:30 UTC · **Scope:** Read-only analysis. No Cloudflare, git, or content changes made.
**Sources:** `ops/cloudflare-redirects.csv` (85 lines / 69 data rows, authored 2026-07-11, SEOMIG T-902), `docs/seo/2026-08-16-redirect-rules-to-paste.md`, `docs/seo/2026-08-16-cloudflare-edge-301s.md`, live edge checks via `curl --resolve` against `104.21.14.135`, and `next/dist` (the actual deployed build — confirmed via `.github/workflows/build-and-deploy.yml`: gh-pages publishes `next/dist` only).

## Headline risk

**CSV row `/explore/plans/*,/plans/*` (line 14) would create a live redirect chain that lands on a canonical mismatch, and must NOT be imported.** Page Rule #2 already sends `/escape/<slug>/` → `/explore/plans/<slug>/` (301, live). If the CSV's wildcard were added on top, `/escape/mornington-peninsula-itinerary/` would become a 2-hop chain: `/escape/…` → `/explore/plans/…` → `/plans/…` — landing on a page whose own `<link rel="canonical">` points back to `/explore/plans/…`, the middle hop. Verified directly: `next/dist/plans/mornington-day-guide/index.html` canonicalises to `/explore/plans/mornington-day-guide/`, the reverse of what the CSV row assumes. This is the exact conflict `docs/seo/2026-08-16-cloudflare-edge-301s.md` already flagged from the other direction ("`/plans/*` deliberately NOT wildcarded... a blanket rule would bounce `/plans/` → `/explore/plans/` → back"). The CSV's "tree promotion" direction (par 3.5, dated 2026-07-11) was superseded by a later architectural decision — the current split is real and CSV row 14 is simply wrong now. Second-highest risk: CSV row `/account/*,/me/*` (line 18) is internally inconsistent with the CSV's own specific rows beneath it — `/account/pass/` should go to `/me/account/` and `/account/likes/` to `/me/saved/`, not the `/me/pass/` and `/me/likes/` a blind wildcard rewrite would produce.

---

## Objective A — Reconciled, deduplicated, priority-ordered redirect list

CSV structure: 85 lines total (11 header/comment lines, 1 CSV header, 69 data rows, 4 trailing comment lines). Columns: `source_url,target_url,status,notes`. 2 wildcard rows (`/explore/plans/*`, `/account/*`), 67 exact-path rows. All 69 source URLs currently return live **200** (none are already 404 or redirected — confirmed no overlap with the 3 live Page Rules' patterns `/places/*`, `/escape/*`, `/spa/*`). Every non-wildcard source still exists in `next/dist`.

Status legend: **live** = safe to import now (canonical already confirms target). **stale** = contradicts current site architecture, do not import even in corrected form without a content decision. **blocked** = target page not built yet, or source content hasn't actually been retired/redirected at the content level despite the CSV's "canonicals-first" claim.

### Priority 1 — Ready now (46 rows, all exact-path, canonicals confirmed)

The winery de-dupe set (40 rows, `/eat/<winery>/` → `/wine/<winery>/`) plus 6 "best-of consolidation" rows all have `<link rel="canonical">` already pointing at the CSV target. Safe to bulk-import as-is.

| source | target | type | risk | note |
|---|---|---|---|---|
| `/wine/cellar-doors/` | `/wine/best-cellar-doors/` | exact | none | canonical confirmed |
| `/wine/best-wineries-mornington-peninsula/` | `/wine/best-cellar-doors/` | exact | none | canonical confirmed |
| `/stay/where-to-stay-mornington-peninsula/` | `/stay/best-accommodation/` | exact | **dedupe** | canonical confirmed; **exact duplicate of paste-ready doc Rule 4** — implement once, not twice |
| `/explore/where-to-base-yourself/` | `/stay/best-accommodation/` | exact | **dedupe** | canonical confirmed; duplicate of doc Rule 4 |
| `/journal/where-to-stay-mornington-peninsula/` | `/stay/best-accommodation/` | exact | **dedupe** | canonical confirmed; duplicate of doc Rule 4 |
| `/stay/couples/` | `/stay/couples-retreats/` | exact | none | CSV flagged this as "canonical NOT yet edited" on 2026-07-11 — it has since been fixed. Now ready. |
| `/eat/avani-wines/` … `/eat/yabby-lake/` (40 rows) | `/wine/<same-slug>/` | exact | none | winery de-dupe cluster (par 3.3), all 40 canonicals confirmed pointing at target. Full list in CSV lines 42–81. `/eat/barmah-park-vineyard/` correctly excluded (CSV comment) — confirmed it self-canonicalises to `/eat/barmah-park/`, a genuinely distinct page. `/eat/port-phillip-estate/` overlaps in *target* (not source) with doc Rule 7 — complementary, not duplicate; both should land at `/wine/port-phillip-estate/`. |

**Action:** import all 46 via Bulk Redirect List, but **drop the 3 accommodation rows** from whichever side (CSV import or paste-ready doc) is applied second, to avoid a duplicate rule.

### Priority 2 — Superseded/stale target, needs correction before import (2 rows)

| source | CSV target | correct target | type | risk | note |
|---|---|---|---|---|---|
| `/explore/plans/*` | `/plans/*` | **do not wildcard** | wildcard | **HIGH — chain + canonical mismatch** | See headline risk above. Reverse of current canonical direction. Content split (`/plans/` = index, `/plans/<slug>/` = non-canonical, `/explore/plans/<slug>/` = canonical) needs to be resolved or accepted as permanent before any edge rule touches this tree. |
| `/walks/` | `/explore/best-walks/` | `/explore/walks/` | exact | low (wrong target, not a loop) | `/explore/best-walks/` is no longer canonical — it now self-declares canonical `/explore/walks/`. Redirecting to it would land users on a page that immediately re-points elsewhere: a wasted hop, and stale relative to the newer decision already captured in `docs/seo/2026-08-16-redirect-rules-to-paste.md` Rule 3 (`/explore/best-walks/`, `/explore/mornington-peninsula-walk/`, `/walks/` → `/explore/walks/`, all 4 confirmed self/cross-canonical to `/explore/walks/`). **Use the doc's Rule 3, not this CSV row.** |

### Priority 3 — Blocked: content not actually migrated yet (20 exact rows + 1 wildcard)

The CSV header claims "canonicals already point at every target below (canonicals-first protocol)" — **false for this entire block.** Every source below still self-canonicalises (still declares itself the canonical URL) and returns live 200 with no sign of retirement. Importing these now would create redirects that fight the page's own canonical tag, or 301 users into 404s.

| source | target | type | status | note |
|---|---|---|---|---|
| `/explore/plans/build/` | `/me/trip` | exact | blocked | page still self-canonical, titled "Build a plan · Peninsula Insider" — tool retirement (par 3.5) never executed |
| `/itinerary/` | `/me/trip` | exact | blocked | still self-canonical |
| `/plan/` | `/me/trip` | exact | blocked | still self-canonical |
| `/picks/` | `/whats-on/` | exact | blocked | still self-canonical |
| `/account/*` | `/me/*` | wildcard | blocked + inconsistent | none of the 4 specific account subpaths are actually retired; wildcard rewrite also contradicts 2 of the CSV's own specific rows below it (see headline risk) |
| `/account/` | `/me/` | exact | blocked | still self-canonical |
| `/account/saved/` | `/me/saved/` | exact | blocked | still self-canonical |
| `/account/likes/` | `/me/saved/` | exact | blocked | still self-canonical |
| `/account/pass/` | `/me/account/` | exact | **blocked — target does not exist** | `next/src/pages/me/` only has `index.astro`, `saved.astro`, `trip.astro`. No `account.astro`. This target was never built. |
| `/events/` | `/whats-on/` | exact | blocked | still self-canonical |
| `/events/annual-festivals/` | `/whats-on/` | exact | blocked | still self-canonical |
| `/events/sailing-regattas/` | `/whats-on/` | exact | blocked | still self-canonical |
| `/events/wine-weekends/` | `/whats-on/` | exact | blocked | still self-canonical; CSV's own note says winter-wine content must merge first (par 3.4) — not done |
| `/events/main-street-mornington-festival/` | `/whats-on/main-street-mornington-festival-2026/` | exact | blocked | target page exists and is built, but source hasn't been flipped to redirect/canonicalise yet |
| `/events/mornington-winter-music-festival/` | `/whats-on/mornington-winter-music-festival-2026/` | exact | blocked | same — target built, source not yet flipped |
| `/events/sorrento-writers-festival/` | `/whats-on/sorrento-writers-festival-2026/` | exact | blocked | same |
| `/events/winter-wine-weekend/` | `/whats-on/mornington-peninsula-winter-wine-weekend-2026/` | exact | blocked | target built; CSV flags a "slug-collision cluster... merge signature editorial into ONE canonical page before import" — not done |
| `/events/peninsula-film-festival/` | `/whats-on/peninsula-film-festival/` | exact | **blocked — target does not exist** | matches CSV's own note ("no whats-on twin built yet") |
| `/events/portsea-polo/` | `/whats-on/portsea-polo/` | exact | **blocked — target does not exist** | matches CSV's own note |
| `/events/portsea-swim-classic/` | `/whats-on/portsea-swim-classic/` | exact | **blocked — target does not exist** | matches CSV's own note |
| `/events/portsea-twilight/` | `/whats-on/portsea-twilight/` | exact | **blocked — target does not exist** | matches CSV's own note |

**Action:** none of Priority 3 should be imported yet. They need one of: (a) the source page's canonical flipped to the target and the source content actually retired, or (b) for the 5 rows marked "target does not exist," the target page built first. Re-run this reconciliation after that work lands.

---

### Cross-check against `docs/seo/2026-08-16-redirect-rules-to-paste.md`

- **No conflicts** between the CSV and 8 of the doc's 10 rule groups (boat hire, editorial-approach, golf, boat ramps, eat hub, fishing charters, beaches, and — as a complementary, non-duplicate target — Port Phillip Estate). Verified all 6 remaining doc-rule targets not already checked (`/boating/hire/`, `/editorial-approach/`, `/boating/ramps/`, `/eat/`, `/fishing/charters/`, `/explore/beaches/`) are self-canonical — no further chain risk from the doc's list.
- **1 exact duplicate:** doc Rule 4 (accommodation) and CSV rows 37–39 cover the identical 3 source URLs → identical target. Implement once.
- **1 direct conflict:** doc Rule 3 (walks → `/explore/walks/`) vs CSV row 40 (walks → `/explore/best-walks/`). Doc rule is correct and current; CSV row is stale. Use the doc rule.
- The doc's "deliberately excluded" `/plans/*` note is the same conflict as CSV row 14, independently discovered from the opposite direction — corroborates rather than contradicts this reconciliation.

---

## Objective B — Historical decisions still affecting the site (§21)

| Decision | Date/evidence | Status | Still active? |
|---|---|---|---|
| **Domain typo: `peninsularinsider.com.au`** | CSV header explicitly warns against it; commit `1577e2caa7 fix: correct domain from peninsularinsider to peninsulainsider` | **Resolved** | No — but the stale `docs/cloudflare-implementation-checklist-2026-04-13.md` (13 April) still has the typo throughout and references a `/V2/` path prefix that no longer exists anywhere in the live site. It's a superseded draft, not current guidance. Recommend marking it superseded-by the 2026-08-16 docs so nobody actions it by mistake. |
| **Sanity CMS full round-trip** | May 2026: Phases 0–11 migrated all content (venues, places, articles, events, itineraries, tours) from Astro content collections to Sanity CMS + Vercel SSR (`c1af3bad1b`, `70e71e6819`, `40bd098442`…). Then reversed: `80fb4fc39a Strip Sanity CMS: revert to Astro content collections`, `1c1f398b53 Drop Vercel — pure-static build for GitHub Pages only`, `4c47cbdbe4 Strip Sanity + Vercel — back to Astro collections on GitHub Pages (#220)`. `ops/sanity-migration/PLAN.md` still shows "Status: Phases 0–8 complete; awaiting prod cutover" — that status line is now false; the whole migration was undone. | **Resolved (content layer), but with a live structural consequence** | **Yes, directly caused today's work.** The Sanity round-trip left the site on GitHub Pages, which cannot emit server-side 301s — only client-side canonical-tag stubs, which Google was observed declining to honour (`docs/seo/2026-08-16-cloudflare-edge-301s.md`: "`/places/hastings/`, `/places/dromana/` were 'Submitted and indexed' with Google canonicalising them to themselves"). That is the direct reason Cloudflare had to go in front of the site today and the entire redirect-map problem this report reconciles exists. Recommend updating `ops/sanity-migration/PLAN.md`'s status line so it isn't read as current. |
| **90 pages hidden by a bulk `sitemapExclude` flag, then unhidden** | `c19f8d9c96 fix(seo): unhide 90 published pages withheld by a bulk sitemapExclude flag` | **Resolved** | Legacy pattern worth remembering: a blanket content-model flag silently pulled 90 live pages out of the sitemap. No evidence it recurred, but it's the kind of regression this audit should re-check periodically — a single boolean default flip could do it again silently. |
| **PR-5: Places/Plans moved under `/explore/`** | `docs/specs/pr-5-explore-url-migration.md` — moved `/places/` → `/explore/places/`, `/plans/` & `/escape/` → `/explore/plans/`, "add ~50 redirects" | **Partially resolved** | The URL move happened (confirmed live in `next/dist`). The "~50 redirects" it called for map directly onto the CSV/doc work being reconciled here — i.e. this spec's redirect requirement was never actually delivered until today's Page Rules + this reconciliation. Three years... no, months later, still not fully closed (Priority 3 above). |
| **Internal admin/preview/ops surfaces excluded from deploy** | `c366ae3d74 chore(deploy): stop shipping staging sites, previews, and internal tooling to the public site`; `robots.txt` still explicitly disallows `/admin/`, `/access/`, `/account/`, `/ops/`, `/next/`, `/docs/`, `/reports/`, `/engine/`, `/preview/` as "defence-in-depth... if they ever reach the served branch again" | **Resolved, actively defended** | The `robots.txt` comment itself signals this was a real past leak risk, not hypothetical caution. No evidence of current leakage in `next/dist`. |
| **Root-level static mirror (`/eat/`, `/wine/`, `/explore/`… at repo root, separate from `next/dist`)** | `d7990236c5 build: refresh live root mirror from clean source` — the repo root carries a full parallel copy of built HTML, tracked in git, distinct from the gitignored `next/dist` | **Unclear — flag, don't assume** | Not directly examined for live-serving status; the deploy workflow publishes `next/dist` to a `gh-pages` branch, so this root mirror should not be what's served. But its existence and periodic refresh ("clean source") wasn't explained by anything read in this pass. Recommend a follow-up check that it isn't itself indexed or served through some other path (e.g. an old GitHub Pages "serve from root of main" setting left on). |
| **`/escape/` index chain** | `docs/seo/2026-08-16-cloudflare-edge-301s.md`: "`/escape/` index canonicalises to `/plans/`, not `/explore/plans/`, so the wildcard sends it via a 1-hop chain. One low-value URL; accepted." | **Legacy effect, accepted, will not decay** | Deliberate, documented, low-value single URL. Not worth further action — noting only for completeness of the redirect picture, since it's a real (if tiny) chain sitting right next to the higher-risk one this report leads with. |

---

## Summary of recommended next actions (not executed — analysis only)

1. **Do not import CSV row 14** (`/explore/plans/*`) in any form. It is structurally wrong given the current canonical split.
2. **Correct CSV row 40** (`/walks/`) to target `/explore/walks/`, or just use doc Rule 3 instead and drop the CSV row.
3. **Dedupe** the 3 accommodation rows between the CSV and doc Rule 4 before importing either.
4. **Import the 46 Priority-1 rows now** — they're genuinely ready and verified.
5. **Fix `/account/pass/`'s target** (`/me/account/` doesn't exist) before that row can ever be imported.
6. **Do not touch the `/events/*` or `/account/*` clusters** (21 rows) until the underlying content migration (canonical flip + retirement) that the CSV assumed was already done actually happens.
7. Correct the stale status line in `ops/sanity-migration/PLAN.md` and mark `docs/cloudflare-implementation-checklist-2026-04-13.md` as superseded, so neither is mistaken for current guidance.
