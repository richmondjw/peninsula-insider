# Peninsula Insider — Vercel hybrid cutover plan

**Date drafted:** 2026-05-18
**Status:** Proposed — awaiting James approval to start execution
**Predecessor:** `next/docs/pi-cms-hybrid-cutover-2026-05-10.md` (admin-only
scope; this plan expands to full-site)
**Successor enables:** `ops/sanity-migration/PLAN.md` (blocked until this
lands)

---

## 1. Why this exists

The site currently deploys as fully static HTML to GitHub Pages
(`peninsulainsider.com.au` → GH Pages CDN). Astro builds with
`output: 'static'`, the GitHub Actions workflow commits `dist/` back to
`main`, GitHub Pages serves from `main/root`.

This deploy target has three structural limits that have started to
hurt:

1. **No request-time SSR.** Every page is pre-rendered at build time.
   Content edits require a rebuild — minutes, sometimes ten — to land on
   prod. The 5-editor team feels this daily.
2. **No serverless functions.** `/api/*` routes can't run. The Sanity
   webhook revalidation endpoint and the admin write surface both need
   compute. PR #91 noted this gap eight days ago; nothing has moved.
3. **Image serving is stuck in the static-bake era.** No on-the-fly
   transforms, no AVIF/WebP negotiation, no LQIP. The Sanity Asset
   Pipeline can fix this, but only behind an SSR target.

The Sanity migration (PR #161, 18 commits, 528 docs already in the
production dataset) is built and tested but **inert** until the deploy
target supports SSR. This plan describes the prerequisite cutover.

---

## 2. What "hybrid" means in Astro 6

Astro supports three output modes:

- `output: 'static'` — every route prerendered at build, no server
- `output: 'server'` — every route SSR per request, no static prerender
- `output: 'hybrid'` (default since Astro 5) — `'server'` by default,
  but per-page `export const prerender = true` opts a route into
  static-prerender

The right model for Peninsula Insider is **hybrid with most public
content prerendered**:

| Route family | Mode | Why |
|---|---|---|
| `/` (homepage) | SSR (or ISR-cached) | Editor publishes a homepage cover scene change → must reflect quickly |
| `/eat/[slug]`, `/wine/[slug]`, `/stay/[slug]`, `/places/[slug]`, `/journal/[slug]`, `/whats-on/[slug]`, `/explore/[slug]`, `/tour/[slug]`, `/tour/operators/[slug]`, `/tour-packages/[slug]`, `/plans/[slug]` | SSR + ISR | Detail content from Sanity, fresh on publish |
| `/about/`, `/contact/`, `/privacy/`, `/terms/`, `/newsletter/`, `/methodology/` | Static prerender | Rarely changes, no editor workflow |
| `/admin/**`, `/api/**` | SSR | Already need server execution |
| `/_astro/*` | Static (assets) | Pre-rendered build output |
| `/v2-staging/`, `/v3/`, `/v4/` | Static prerender (or delete) | Frozen preview directories |
| `/spa/`, `/map/`, hub indices | Static prerender | Built-once content |

The result: **most pages stay fast and static-equivalent**, but the
ones that need SSR get it.

---

## 3. Scope — what changes and what doesn't

### Changes

| Layer | Before | After |
|---|---|---|
| Host | GitHub Pages | Vercel |
| Astro output | `'static'` | `'server'` (hybrid in practice) |
| Build pipeline | GH Actions builds + commits dist/ | Vercel builds on git push |
| DNS | `peninsulainsider.com.au` → GH Pages | → Vercel |
| Cache layer | GH Pages CDN (Fastly Mel) | Vercel edge + ISR |
| `/api/*` | 404 (no compute) | Runs on Vercel functions |
| Webhook target | n/a | `/api/revalidate` live |
| Adapter | none | `@astrojs/vercel` |
| Env vars | none required at runtime | `PUBLIC_*` for client + server-only for SSR |
| Build artefact in repo | `dist/` committed to main | None (Vercel keeps build output) |

### Stays the same

- All Astro source in `next/src/`
- All content collections in `next/src/content/`
- All current `[slug].astro` page logic
- Pagefind search (built at deploy time; behaviour identical)
- Supabase (still the operational DB for saves/lists/concierge/alerts)
- Sanity Studio (already external; reachable from anywhere)
- All existing redirects + canonical URLs
- All SEO / sitemap / JSON-LD output
- Inline-editor client behaviour (already gated to admin-click as of
  commit `ce27406cbd`)

### Out of scope for this cutover

- Sanity migration (PR #161) — separate sequencing, this enables it
- Cron pipeline migrations (events scraper, dispatch generator, etc.) —
  carry forward as-is, still write to JSON
- Any UI / editorial / content changes
- New features

---

## 4. Risk surface

Each row is something that could break if we're not careful. Mitigation
in the right column.

| Risk | Severity | Mitigation |
|---|---|---|
| Routes that work statically but break under SSR (e.g. file-system reads at build) | High | Comprehensive route audit (§ 5.1) + per-page testing in preview |
| Pagefind index timing — currently built against `dist/` after Astro build | Medium | Keep `build:search` in the Vercel build command; verify the post-build hook still emits |
| Per-page `prerender = true` declarations missing → unnecessary SSR cost | Medium | Audit script that lists every page's mode + cost it |
| `getStaticPaths()` semantics change in hybrid | Medium | Astro doc says they still work for prerendered routes; verify on preview |
| Existing in-repo `dist/` build artefact conflicts with Vercel-managed builds | High | Delete `.github/workflows/deploy.yml` workflow + `dist/` from repo BEFORE first Vercel build |
| DNS cutover races with active traffic | Medium | Pre-bake Vercel deploy + custom-domain attachment behind preview alias; flip DNS in low-traffic window |
| Cookies / Supabase auth cookies set with wrong domain | Medium | Verify cookies on Vercel domain before flipping DNS |
| Lost build secrets — `PUBLIC_SUPABASE_*` etc. currently in GH Actions vars | High | Migrate every required env var to Vercel Project Settings → Env Vars BEFORE the cutover |
| Vercel cold-start latency on first SSR request | Low | Edge cache + ISR mostly mask this; only first request after deploy is slow |
| Existing GH Actions cron workflows (events-archive-expired etc.) still need to run | Low | Workflows continue to run on `main` and commit JSON; not affected by host change |
| The `[skip ci]` build commits will cease — anyone reading recent git log will see history end abruptly | Low | One-line note in CHANGELOG; not a real problem |
| Custom 404 / sitemap routes that worked under static GH Pages | Medium | Test each on preview; Vercel has slightly different fall-throughs |
| Existing `peninsulainsider.com.au` is on Cloudflare DNS pointing at GH Pages — there may be a CNAME flattening or page rule we need to handle | Medium | Document the current DNS + Cloudflare config before touching anything |

---

## 5. Phases

### Phase −1.0 — Audit & decide *(half day)*

**Goal:** Know exactly what's in scope before touching anything.

- [ ] **Route audit script** — walks `next/src/pages/**`, prints for each
      route: file path, has `getStaticPaths`, has `export const prerender`,
      detected I/O patterns (file reads, fetches), recommended mode.
      Output goes into this PLAN so decisions are reviewable.
- [ ] **Env var audit** — list every env var the build + runtime need.
      Cross-reference against current GH Actions variables and any
      hard-coded fallbacks. Output a `.env.production.example` for Vercel.
- [ ] **Cron workflow audit** — list every GH Actions workflow that
      writes to `main`. Confirm which keep running, which get retired.
      Especially: deploy.yml retirement plan.
- [ ] **DNS audit** — current peninsulainsider.com.au resolution chain.
      Cloudflare zone? GH Pages CNAME? Apex A records? TLS cert source?
      Document before touching.
- [ ] **Decision points** documented in this PLAN:
      - Vercel team to use (current: `team_AUFeyP0ViI2O79cp3NnF2Ajm`)
      - Vercel project to use (current: `prj_WHwlze5B8uTW8fPGfDFsuNNMHIaX`,
        named "next")
      - Will the existing project be the prod target, or do we create
        a new one named "peninsula-insider"?
      - Region(s) — Sydney + Melbourne edge nodes?

**Decision gate:** James reviews audit output. Greenlight or revise.

---

### Phase −1.1 — Astro config + adapter *(half day)*

**Goal:** Local dev still works, builds still pass, no deploy yet.

- [ ] In `next/`: `npm install @astrojs/vercel`
- [ ] Update `next/astro.config.mjs`:
      - Default `output: 'server'` (was `'static'`)
      - Always load `@astrojs/vercel` adapter (drop the
        `PI_ADMIN_HYBRID=1` gating — that env flag retires)
      - Configure `webAnalytics`, `imageService`, regions per audit decisions
- [ ] Add `export const prerender = true` to every page in `next/src/pages/`
      that the audit marked static
- [ ] Verify `npm run build` succeeds locally and produces `.vercel/output/`
- [ ] Verify `npm run dev` still works for local dev
- [ ] Verify `dist/` still emits for the static-prerendered portion (sanity
      check that Pagefind has something to index)

**Decision gate:** A clean local build of the hybrid configuration before
anything touches Vercel.

---

### Phase −1.2 — Preview deploy on Vercel *(1 day)*

**Goal:** A working Vercel deployment of the branch at a Vercel-owned
URL, alongside the existing GH Pages prod. Side-by-side comparison
possible.

- [ ] Push the hybrid branch (`claude/vercel-hybrid-cutover` or similar)
- [ ] Confirm Vercel auto-deploys (or trigger manually via Vercel API)
- [ ] Walk through every entity detail page on the Vercel preview URL:
      - `/eat/alba-thermal-springs/` (venue)
      - `/wine/pt-leo-estate/` (winery)
      - `/stay/jackalope/` (hotel)
      - `/places/red-hill/` (place)
      - `/journal/a-flinders-weekend/` (article, .md)
      - `/journal/cape-schanck-guide/` (article, .mdx with embeds)
      - `/whats-on/portsea-polo/` (event)
      - `/explore/bushrangers-bay-walk/` (experience)
      - `/tour/wine-discovery/` (tour)
      - `/tour/operators/wine-compass/` (tour operator)
      - `/tour-packages/anniversary-long-weekend/` (tour package)
      - `/plans/flinders-and-cape-reset/` (itinerary)
      - `/` (homepage)
      - `/eat/` (hub index)
- [ ] Check each page renders identical to GH Pages version. Diff HTML
      where possible (lots of noise on dates, build timestamps, etc; aim
      for "structure identical, content identical")
- [ ] Test `/api/revalidate` accepts a manual POST with valid HMAC
- [ ] Test `/admin/login` flow works
- [ ] Run Lighthouse on a sample of detail pages. Note any regression
      vs GH Pages baseline (cold-start TTFB will be longer; cached
      requests should match)
- [ ] Verify Pagefind search still works on the Vercel deploy

**Decision gate:** Side-by-side parity confirmed. If anything's broken,
fix on the branch before proceeding.

---

### Phase −1.3 — DNS cutover *(2 hours of attention, plus 24h TTL bake)*

**Goal:** `peninsulainsider.com.au` resolves to Vercel, not GH Pages.

This is the only irreversible-ish step. Plan it for a low-traffic
window (Australia evening / Sunday morning?).

**Pre-cutover checklist:**

- [ ] Vercel preview deploy is green and verified per Phase −1.2
- [ ] Custom domain `peninsulainsider.com.au` is attached to the Vercel
      project (Settings → Domains). Vercel issues a verification record
      that you add to DNS while still pointing at GH Pages.
- [ ] All required env vars set in Vercel (Production environment)
- [ ] `.github/workflows/deploy.yml` is DISABLED but not yet deleted
      (so we can re-enable if rollback needed)
- [ ] Cloudflare or your DNS provider's TTL is **lowered to 60s** for
      the apex + www records 24 hours BEFORE the planned cutover, so
      the eventual flip propagates quickly

**Cutover steps:**

- [ ] Update DNS to point `peninsulainsider.com.au` at Vercel's
      verification target
- [ ] Wait 60s, hit the apex with curl, confirm `Server` header is no
      longer `GitHub.com`
- [ ] Test live URLs: same set as Phase −1.2
- [ ] Test cookie domain on sign-in flow (auth cookies need to scope
      to peninsulainsider.com.au, not the Vercel preview URL)
- [ ] Restore DNS TTL to its previous value (typically 3600s or longer)

**Rollback path:**
- DNS TTL is 60s during the cutover window. To rollback: change DNS
  back to GH Pages target, wait 60s, re-enable deploy.yml, done.
- After the 24-hour stability bake (no errors, traffic looks normal),
  raise TTL back to normal and consider the cutover committed.

---

### Phase −1.4 — Decommission GH Pages workflow *(half day)*

**Goal:** Remove the old build/commit/deploy machinery now that Vercel
owns the deploy lifecycle.

- [ ] Delete `.github/workflows/deploy.yml`
- [ ] Delete `dist/` from main (git rm; the build output never needs to
      live in source)
- [ ] Delete the `CNAME` file at repo root (was GH Pages convention)
- [ ] Remove all `[skip ci]` auto-build-commit history from any pinned
      branches
- [ ] Remove GitHub Pages source configuration in repo Settings → Pages
- [ ] Update `CLAUDE.md` and `workspace/CLAUDE.md` to reflect the new
      deploy target
- [ ] Update `workspace/JWR_PKM_2026/07-projects/peninsula-insider/architecture.md`

---

### Phase −1.5 — Verify and document *(2 hours)*

**Goal:** Leave the project in a clean, documented state for the next
person.

- [ ] Update `ops/sanity-migration/PLAN.md` — Phase 0 prereqs are now
      met; can proceed with `SANITY_*_ENABLED` flag flips
- [ ] Create a deploy-runbook in `ops/runbooks/deploy.md` describing
      how prod deploys work now (`git push to main → Vercel webhook →
      build → publish`)
- [ ] Update `workspace/JWR_PKM_2026/07-projects/peninsula-insider/cms-architecture-2026-05-18.md`
      with the actual deploy URL + topology now that it's real, not
      future-tense
- [ ] Document any cold-start latency observations
- [ ] Note any pages that regressed Lighthouse scores and the cause

---

## 6. Total timeline

| Phase | Effort | Calendar |
|---|---|---|
| −1.0 Audit & decide | half day | Day 1 morning |
| −1.1 Config + adapter | half day | Day 1 afternoon |
| −1.2 Preview deploy | 1 day | Day 2 |
| −1.3 DNS cutover | 2 hours + 24h bake | Day 3 (low-traffic window) |
| −1.4 Decommission GH Pages | half day | Day 4 |
| −1.5 Verify and document | 2 hours | Day 4 |

**Working days:** ~3.5 of focused effort
**Calendar days:** 4–5 (one phase per day, plus DNS bake)
**Realistic with context-switching:** 1.5–2 calendar weeks

---

## 7. Cost impact

Vercel Pro is already paid (the team exists, the project exists). The
incremental cost is bandwidth + function invocations, not the seat fee.

**Estimated runtime cost (peninsulainsider.com.au current traffic):**

| Vercel resource | Free tier (Pro plan) | Expected use | Cost over |
|---|---|---|---|
| Function invocations | 1M / mo | ~100k / mo (most requests hit edge cache) | $0 |
| Edge requests | unlimited | n/a | $0 |
| Bandwidth | 1 TB / mo | ~50 GB / mo current | $0 |
| Build minutes | 6000 / mo | ~300 / mo (10 deploys × 3 min × 10 builds) | $0 |
| Image optimisation | 5000 transformations / mo | n/a — we use Sanity Asset Pipeline | $0 |

**Expected monthly increment: $0–10 AUD.** Could change if traffic grows
materially or if we trigger a lot of revalidations per day.

---

## 8. Definition of done

This cutover is "complete" when:

1. `curl -sI https://peninsulainsider.com.au` returns Vercel headers
   (not `Server: GitHub.com`)
2. A test edit in Sanity Studio → publish → page updates on prod within
   30 seconds (via `/api/revalidate`)
3. `.github/workflows/deploy.yml` no longer exists
4. `dist/` no longer lives in the repo
5. Lighthouse scores for sample detail pages have not regressed by >5
   points vs the GH Pages baseline (measured during Phase −1.2)
6. No 5xx errors in Vercel's deployment logs for 24 hours after cutover
7. The Sanity migration plan (`ops/sanity-migration/PLAN.md`) is updated
   to remove "blocked on hybrid cutover" notes

When all eight are true, the Sanity migration phases (PR #161) can land
and the per-entity `SANITY_*_ENABLED` flag rollout can begin.

---

## 9. What I (James) need to decide before kick-off

1. **Vercel project choice** — use the existing `prj_WHwlze5B8uTW8fPGfDFsuNNMHIaX`
   ("next") or create a fresh one with a clearer name? My recommendation:
   keep the existing one. It's already wired up.
2. **Region** — Sydney + Melbourne is the obvious primary; do you want
   a fallback US region for tourist traffic from overseas?
3. **DNS provider** — what's the current setup? Cloudflare? Need
   confirmation before Phase −1.0 audit.
4. **Cutover window** — when do you want the DNS flip? Sunday morning
   AEST tends to be lowest-traffic.
5. **Pagefind future** — once on hybrid, search keeps working but feels
   slightly off-pattern. Eventually we may want a real search backend
   (Algolia / Typesense / Sanity's own search). Not urgent; flag for
   later.
6. **Who else needs to know** — Emma (her workflow is unaffected),
   anyone with deploy-key dependencies on the GH Pages output?

---

## 10. What happens AFTER this lands

The Sanity migration sequence from `ops/sanity-migration/PLAN.md`
becomes executable:

1. Merge PR #161 (Sanity migration code) → no immediate visible change,
   all flags still off
2. Configure the Sanity webhook in Studio Manage UI (5 min, manual)
3. Flip `SANITY_READ_ENABLED=true` + `SANITY_VENUES_ENABLED=true`
4. Watch for 24h; if stable, flip next entity. Etc.
5. After 14 days of stable Sanity-only operation, run the decommission
   script
6. Image performance is fully unlocked — Sanity Asset Pipeline serving
   AVIF/WebP at exact display widths with LQIP placeholders

The two plans together describe the full path from "static GH Pages
with flicker" to "headless CMS hybrid SSR with image pipeline."

---

## 11. Sanity check on the premise

Before kicking off, worth double-checking we want to do this at all:

**Pros (why we should):**
- Editorial workflow improves dramatically — publish-to-live in
  seconds, not minutes
- Image performance class of bugs disappears structurally
- Unlocks the Sanity migration that's already built
- `/admin/*` becomes properly secure (server-side session check)
- Future-proofs against the GH Pages CNAME-on-apex limitations

**Cons (why we might not):**
- More moving parts than a static site — Vercel could have an outage
  GH Pages wouldn't have shared
- Build/deploy is now in someone else's hands (Vercel) rather than
  GitHub Actions
- Cost goes from $0 to $0–10/mo — rounding error, but non-zero
- Adds operational surface that a tiny team has to learn

**Honest take:** the pros vastly outweigh the cons for an editorial
site that's growing. The cons are real but small. If this site is going
to be the canonical guide to the Mornington Peninsula for the next five
years, doing the architecture work now is cheap.

---

## 12. Open questions for review

- [ ] Are there any private/staging URLs that need to keep resolving
      during/after cutover? (`v2-staging`, `v3`, `v4` paths)
- [ ] Is the existing `peninsula-insider-platform-api.vercel.app`
      (concierge API) related to this project, separate, or to be
      merged?
- [ ] What's the source of `PUBLIC_CONCIERGE_API_URL` — does it stay
      hardcoded or move into Vercel env vars?
- [ ] Are there any pages that rely on `Astro.url.pathname` only being
      accurate at build time (some static-only patterns assume this)?
- [ ] Do we want to keep `peninsulainsider.com.au` as the apex and
      treat the Vercel preview URL as ephemeral, or set up a permanent
      `staging.peninsulainsider.com.au` Vercel alias for previews?
