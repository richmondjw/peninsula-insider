# AGENTS.md - Peninsula Insider (site + content engine)

Operating rules for coding agents working in this repository. Read this before touching anything. It is short on purpose.

`HANDOVER-CLAUDE.md` is a dated briefing from 13 April 2026 and is kept for history. Where the two disagree, **this file wins**.

---

## 1. Two agents work here. Coordinate.

Claude and Codex are both active in this repo, working the same launch plan.

| Rule | Detail |
|---|---|
| **Branch prefixes** | Claude uses `claude/*`. Codex uses `codex/*`. Never push to a branch carrying the other prefix. |
| **Never commit to `main`** | Always branch, always PR. `main` deploys to production on push. |
| **Claim before you start** | Work is tracked by item ID (see section 3). Say which IDs you are taking in your PR title or first commit so the other agent can see it. |
| **Rebase before every push** | The content engine commits to `main` daily around 06:00 AEST, and the freshness job again at 19:00 UTC. Your branch goes stale fast. |
| **Do not refactor across item boundaries** | If your change needs a file another item owns, note it and coordinate rather than reaching in. |

**Known gap:** the launch plan, tracker and product review live as Claude-published web artifacts that Codex cannot read. Section 3 below is the shared, in-repo copy of that state. Keep it updated when an item lands, because it is the only version both agents can see.

---

## 2. Five things that will bite you

**1. The HTML at the repo root is not the live site.**
`index.html`, `/eat/`, `/journal/` and friends at the repo root are a stale artifact of a retired deploy model. The live site is the **`gh-pages` branch**, built from `next/` by `.github/workflows/build-and-deploy.yml`. Reading root HTML to check live behaviour produced two rounds of confidently wrong conclusions on this project. To check what is actually live:

```sh
git fetch --depth=1 origin gh-pages
git show FETCH_HEAD:index.html | less
```

**2. There is no PR-time CI.**
Nothing runs on a pull request. The build runs only on push to `main`, and that same run deploys. So a broken commit is a broken production site. **Running the build locally is the only gate that exists.** See section 5.

**3. `npm run build` does not run every gate.**
`lint:house-style` (the em-dash rule) is only in `build:search`, and `build:search` is what the deploy runs. Use `npm run build:search` when you want to match CI. `npm run build` will pass on content the deploy rejects.

**4. Zod strips unknown keys in `next/src/content.config.ts`.**
There is no `.passthrough()` or `.catchall()`. Any field in a content file that is not in the schema is **silently discarded at build time**, with no warning. This hid structured opening hours on 28 venues for months. If authored data is not reaching a template, check the schema before assuming the template is wrong.

**5. Two environment flags are deliberately off. Do not flip them.**
- `PUBLIC_ACCESS_GATE: 'on'` in `build-and-deploy.yml` keeps the site behind a password gate. Turning it off is James's launch decision, not an agent's.
- `PI_AUTO_ACT: '0'` in `daily-content.yml` pauses the autonomous title and meta rewriter. Paused 11 July pending content guidelines. Leave it.

---

## 3. Current work state

Launch plan item IDs. Update this table when something lands.

| ID | Item | Owner | Status |
|---|---|---|---|
| A1 | Global `initV5Analytics()` in `BaseLayout.astro` | Claude | **Done, deployed** |
| A2 | Mint Search Console token | James | Open |
| A3 | Authenticate GA4 Data API | James | Open |
| A4 | Resolve GA property split (`G-0MR9YVZ9NW` vs `G-DBL14DE975`) | James | Open |
| B1 | Wire the three event freshness scripts | Claude | **Done, verified running** |
| B2 | Quick-note archival automation | Claude | **Done, 33 notes archived** |
| B3 | Venue staleness threshold as build gate | unclaimed | Open |
| B4 | Correct ops docs that claimed jobs were live | Claude | **Done** |
| B5 | Automated event ingest (replace manual spreadsheet) | unclaimed | Blocked on feed access |
| B6 | **Re-verify launch-scope venues** | James | Open, critical path |
| B7 | Weekly letter back on cadence | James | Open |
| C1 | Render `AudiencePicker` on hubs | unclaimed | Open |
| C2 | Operator claim link on venue pages | Claude | **Done, deployed** |
| C3 | `lint-nav-budget.mjs` into CI | Claude | **Done** |
| C4 | Delete dead `v3-nav.ts` / `v4-nav.ts` / `components/v4/` | unclaimed | Open |
| D1-D5 | Venue schema, hours, claim link, broken refs | Claude | **Done, deployed** |
| E1-E5 | Editorial: drafts, bylines, disclosure, partner copy | James + Emma | Open, decisions |
| F1 | Legacy heroes to `<img>` with `srcset` | unclaimed | Open, highest deploy risk |
| F2 | Rewrite generic image alt text | unclaimed | Open |
| F3 | Commission original photography | James | Blocked on budget |
| L1-L8 | ATDW, accessibility data, streaming, security, search, offline | unclaimed | Post-launch |

**Critical path is B6**, which is field work. No amount of code shortens it.

---

## 4. Hard rules enforced by the build

Every one of these fails the deploy, which means a red production build.

| Rule | Enforced by | In which chain |
|---|---|---|
| **No em-dashes. Anywhere.** Including code comments and `.astro` copy. Use ` - `, a colon, or parentheses. | `lint-house-style.mjs` | `build:search` only |
| **No pricing. Ever.** No dollar figures, no `priceCurrency` in JSON-LD, no price renderers. Prices go stale and stale prices erode trust faster than missing ones. | `lint-no-pricing.mjs` | `build`, `build:search` |
| Region hero images must exist on disk | `lint-region-images.mjs` | both |
| UI drift: native scrollbars on rails, mixed card systems, images bypassing the CMS hero resolver | `audit-surface-hardening.mjs` | both |
| Header choices capped at 55, drawer items at 14 | `lint-nav-budget.mjs` | both |
| CSS budget | `check-css-budget.mjs` | both |
| CMS editable coverage | `check-editable-coverage.mjs` | deploy workflow, before build |

**A pre-commit hook auto-fixes em-dashes** in staged content. Enable it once per checkout:

```sh
git config core.hooksPath .githooks
```

Do this first. It is the difference between a clean commit and a red deploy.

### CMS integrity, non-negotiable

Added after a shared-image bug let one click overwrite many venues at once:

- **Never key image overrides on filenames.** Use `editableImage({entityType, entitySlug, fieldPath})`.
- Run `node next/scripts/check-editable-coverage.mjs` after touching any image markup.
- `pi.assert_content_registry_match` is the database floor. Do not work around it.
- Do not casually edit `editableImage()` call sites. `check-editable-coverage.mjs` gates the deploy.

---

## 5. Build and verify

`next/` is the Astro app root. Everything below runs from there.

```sh
cd next
npm ci                  # works, roughly two minutes
npm run build:search    # what the deploy runs. Use this one.
npm run check           # astro check, typecheck only
```

There is no test suite. The build is the test.

**Before any push:** run `npm run build:search` and confirm exit 0. Then check the built output in `next/dist/`, not just that the build passed. A build can succeed and still emit the wrong HTML.

`next/dist/` and `next/node_modules/` are gitignored. Do not commit `next/public/admin/media-registry.json` unless its content genuinely changed: it regenerates on every build and its timestamps churn.

---

## 6. Repo layout

```
next/                   The Astro site. Almost all work happens here.
  src/content/          22 content collections, JSON and MD
  src/content.config.ts Zod schemas. See trap 4.
  src/components/       84 components. v5/* is current, v2/ and v4/ are legacy
  src/pages/            276 route files
  scripts/              Build gates and maintenance scripts
engine/                 Python content engine. See section 7.
ops/                    Runbooks, SEO reports, migrations for the runtime Supabase project
docs/                   ~90 strategy and architecture documents
.github/workflows/      Six workflows. See section 7.
<root>/*.html           STALE. Not the live site. See trap 1.
```

---

## 7. The autonomous content engine

This repo publishes without a human in the loop. Understand this before you are surprised by it.

| Workflow | Schedule | What it does |
|---|---|---|
| `daily-content.yml` | 20:00 UTC | Insider Picks column, corpus refresh. Commits to `main` with `[skip-review]` |
| `weekly-content.yml` | Sun 21:00 UTC | Signal brief, weekend picks, SEO piece, newsletter |
| `monthly-content.yml` | 1st, 20:00 UTC | Deep research, long-form batch, town hub refresh |
| `content-freshness.yml` | 19:00 UTC | Recomputes event occurrences, archives expired events and quick notes |
| `pi-data-refresh.yml` | 03:00 UTC | Content registry, entity index, embeddings |
| `build-and-deploy.yml` | push to `next/**` | Builds and publishes to `gh-pages` |

Commits authored by `Peninsula Insider Engine` are machine-generated. `[skip-review]` means exactly that: nobody looked. Do not hand-edit generated content without understanding which job produces it, or the next run will overwrite you.

---

## 8. Tooling that exists but is wired into nothing

Reach for these before writing something new:

- `next/scripts/taxonomy-lint.mjs` - validates the 13-family facet vocabulary. Note its gate auto-promoted to strict on 2026-06-01, so it will exit 1 until the backlog is cleared.
- `next/scripts/lint-content-caps.mjs` - length caps on standfirsts, verdicts, CTA labels.
- `next/scripts/qa-regression.mjs` - link integrity, one-h1 and one-canonical invariants across `dist`.
- `ops/scripts/editorial-quality-check.py` - detects broken cross-collection references. Available as `npm run lint:editorial-quality`. Currently exits 1 on three pre-existing house-style violations, which is why it is not in the build chain.
- `next/scripts/audit-search-links.mjs`, `test-facets.mjs`, `render-pdfs.mjs`.

---

## 9. House voice, if you touch reader-facing copy

Read `BRAND-PI.md`. The short version: specific over general, opinionated over neutral, never gushing. Banned words include "stunning", "amazing", "incredible", "must-visit", "hidden gem". The publication tells readers what to skip, and that is the point of it.

---

## 10. Where to look next

| For | Read |
|---|---|
| Brand voice and the PI character | `BRAND-PI.md` |
| Editorial governance, corrections | `docs/peninsula-insider-editorial-governance-standard-2026-05-02.md` |
| SEO strategy and prior audits | `ops/reports/seo/audit-2026-05/` |
| Job register and operational risk | `ops/operating-surface.md` |
| Commercial model and rate card | `docs/peninsula-insider-advertising-kit-2026-04-30.md` |
| History, superseded by this file | `HANDOVER-CLAUDE.md` |
