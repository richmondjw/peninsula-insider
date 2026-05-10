# Peninsula Insider — Live vs Staging Surface Map
**Last reviewed:** 2026-05-10
**Authority:** Definitive list of which surfaces are production, which are staging, and which are deprecated. Editors and automation should treat anything not listed under **Production** as out of scope for routine work.

## How to read this file

- **Production** — public, indexable, treated as live. Routine editorial work and automation target these.
- **Staging / preview** — intentionally accessible but not promoted. Used for design or content review, not for SEO or distribution.
- **Versioned alternates** — deliberate parallel implementations kept for A/B or migration purposes.
- **Deprecated** — present in the repo or live tree but no longer maintained. Should be either retired or formally re-promoted.
- **Internal-only** — referenced by tooling but not user-facing.

If a path is on the live tree and **not in this file**, it is undeclared and should be either added here or retired.

---

## Production surfaces (public, indexable, monitored)

### Top-level destinations
- `/` — homepage
- `/eat/`
- `/stay/`
- `/wine/`
- `/explore/`
- `/escape/`
- `/places/`
- `/whats-on/` (rendered as `/explore/whats-on/` and via the homepage rail)
- `/journal/` and all dated dispatch/article children
- `/quick-note/` and all dated daily children
- `/itinerary/`
- `/map/`
- `/ask/`
- `/awards/`
- `/insiders-30/`
- `/partners/`
- `/pass/`
- `/about/`
- `/contact/`
- `/methodology/`
- `/privacy/`

### Specialist verticals (production)
- `/dog-friendly/`
- `/spa/`
- `/golf/`
- `/boating/`
- `/fishing/`
- `/fish/`
- `/corporate-events/`
- `/guides/`
- `/alerts/`

### Account / membership surfaces (production but auth-gated)
- `/account/`
- `/account/saved/`
- `/account/likes/`
- `/account/lists/`

### Operator / partner surfaces (production but limited audience)
- `/partners/claim/`
- `/partners/dashboard/`
- `/partners/change-request/`
- `/submit/`
- `/downloads/`

### Site-wide assets (production)
- `/sitemap.xml`
- `/robots.txt`
- `/404.html`
- `/CNAME`
- `/favicon.svg`
- `/_astro/` (hashed JS/CSS bundle output)
- `/assets/styles.css` (stable fallback stylesheet)
- `/images/` (production image library)
- `/pagefind/` (search index)

---

## Staging / preview surfaces (NOT production)

These exist on the live tree (because PI deploys via `main` → GitHub Pages) but are **explicitly not production**. They should not appear in sitemaps, should not be linked from production navigation, and should not be optimised for SEO.

- `/preview/` — generic preview surface
- `/preview-hero/` — homepage hero preview
- `/preview-home-b/` — homepage variant B
- `/preview-insider-plans/` — pricing/plans preview
- `/v2-staging/` — Astro v2 build staging tree (legacy)
- `/v2-staging/logo-preview/` — logo preview page (added 2026-05-09)

**Operating rule:** these paths are owned by James for design/QA review. No automation should write to them. They are excluded from the daily accuracy/link/governance audits.

---

## Versioned alternates

These are deliberate parallel implementations:

- `/next/` — the Astro v6 build directory (where source lives; output goes to repo root). **Internal-only — not a public URL.**

---

## Deprecated / candidate-for-retirement

These are present on the live tree but no longer actively maintained. The first move on any of these is **decide: retire or re-promote**, not "treat as production".

- _(none currently flagged — first-pass audit pending)_

> **Action:** A first-pass audit of the live tree against this list is part of Tranche 3 (item 9 — Overlap audit).

---

## Internal-only paths

Referenced by tooling, not by humans:

- `/sitemap.xml` (production, but tooling-driven)
- `/_astro/` (Astro build output — internal cache-busted assets)
- `/pagefind/` (search index — internal)
- `/HANDOVER-CLAUDE.md`, `/CHANGELOG.md`, `/CNAME`, `/build-live.sh`, `/build-v2.sh` — repo artifacts that happen to be deployed at site root because PI deploys from `main`

> **Recommendation:** these repo artifacts (`HANDOVER-CLAUDE.md`, `build-live.sh`, `build-v2.sh`) should be excluded from the deploy in `deploy.yml` rather than published to root. Tracked as a Tranche 4 cleanup.

---

## Source-of-truth note

PI's deploy model is **build-output-equals-source-tree**: the Astro build emits its dist into the repo root, and GitHub Pages serves from there. This means:
- **Source for production pages** lives in `next/src/`
- **Generated production HTML** lives at the repo root
- The same path can simultaneously be source-of-truth (for `next/`) and build-artifact (for `/`)

Anything edited at the repo root that is *also* a generated artifact will be overwritten by the next deploy. Real edits go in `next/src/`.

The only exceptions are surfaces that are **hand-built static** and not Astro-rendered (currently: `/preview-*`, `/v2-staging/*`, the deploy-meta files at root).

---

## Maintenance rule

Any time a new top-level path appears in the live tree, it must either:
1. be added to **Production** here, with a stated owner, or
2. be added to **Staging / preview** here, with a stated reason, or
3. be removed from the deploy.

If the live tree contains undeclared top-level paths, the daily accuracy/link/governance audits cannot reason about them correctly.
