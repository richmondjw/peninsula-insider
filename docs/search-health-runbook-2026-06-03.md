# Peninsula Insider Search Health Runbook

Date: 2026-06-03
Status: Active, with one section corrected 2026-08-27 (see "Deploy workflow" below)
Owner surface: `/search/`, masthead search overlay, `pi.search`, `pi.entity_index`, PageFind fallback

> **Correction, 2026-08-27.** The "Deploy workflow" section below described `.github/workflows/deploy.yml` refreshing the search index on every deploy. **That workflow no longer exists and those steps did not move to its replacement.** The index refresh is now manual-only. The corrected text is inline below. Everything else in this runbook was re-verified and is current.

## Purpose

This note records the current operating contract for Peninsula Insider search so operators do not re-solve the same problem.

The important lesson from the June 2026 search incident is that PageFind and `pi.search` are separate surfaces:

- PageFind indexes the static built site and is used as a fallback.
- `pi.search` reads Supabase `pi.entity_index` and is the preferred live result source on `/search/`.
- A fresh PageFind index does not guarantee live search is clean if Supabase still has stale rows.

## Current Guardrails

### Deploy workflow — CORRECTED 2026-08-27

Workflow: `.github/workflows/build-and-deploy.yml`

`deploy.yml` was consolidated into `build-and-deploy.yml`. **The search-index steps did not survive the consolidation.**

What the deploy workflow does today:

1. Runs the CMS editable-coverage gate and the content admission gates.
2. Builds Astro and PageFind via `npm run build:search`.
3. Generates `llms.txt` / `llms-full.txt` from the built sitemap.
4. Writes `deployment.json` provenance.
5. Prunes `dist/admin` and `dist/dev`.
6. Runs the SEO artefact integrity gate against `next/dist`.
7. Publishes to `gh-pages`.

What it **no longer** does, despite the original text below claiming otherwise:

- It does **not** refresh `pi.content_registry`.
- It does **not** refresh `pi.entity_index`.
- It does **not** embed entity vectors.
- It does **not** run post-publish verification.
- It does **not** run `npm run search:audit`, so a broken live search **cannot** fail a deploy.

**Operational consequence.** `pi.entity_index` is refreshed only by dispatching `PI Data Refresh` by hand. Between dispatches, live `/search/` can serve stale rows indefinitely, while PageFind refreshes on every deploy. This is exactly the two-surface trap described under Purpose above, except the guardrail that used to catch it is gone.

**After any content deploy that needs to be searchable, dispatch `PI Data Refresh`, then run:**

```bash
cd next && npm run search:audit -- --limit=10 --fail-on-broken
```

**Open decision:** whether to restore the index refresh and search audit to the deploy path (cost: embedding calls on every deploy, plus a new way for a deploy to fail after publish) or to keep it manual and accept the staleness window. Not yet decided.

---

*Original text, retained for history and no longer accurate:*

> On manual deploy, the workflow now:
>
> 1. Refreshes `pi.content_registry`.
> 2. Refreshes `pi.entity_index` with `--apply --prune`.
> 3. Embeds entity vectors when `OPENAI_API_KEY` is configured.
> 4. Builds Astro and PageFind via `npm run build:search`.
> 5. Publishes to `gh-pages`.
> 6. Runs post-publish verification.
> 7. Runs `npm run search:audit -- --limit=10 --fail-on-broken`.
>
> If the live Supabase search RPC returns broken links for representative queries, deploy fails after publish and the run log records a failed job.

### Data refresh workflow

Workflow: `.github/workflows/pi-data-refresh.yml`

On scheduled or manual data refresh, the workflow:

1. Refreshes `pi.content_registry`.
2. Refreshes `pi.entity_index` with `--apply --prune`.
3. Embeds entity vectors unless manual input disables embeddings.
4. Runs `npm run search:audit -- --limit=10 --fail-on-broken`.

This catches stale live-search rows even when no site deploy is happening.

## Known Implementation Details

Script: `next/scripts/refresh-entity-index.mjs`

The projector excludes non-public content before upsert:

- `draft`
- `review`
- `archived`

It also trims string statuses before comparison. This matters because CRLF Markdown frontmatter can parse a value like `archived\r`; without trimming, archived quick notes can leak into `pi.entity_index`.

The projector also prunes stale rows when run with `--prune`.

Script: `next/scripts/audit-search-links.mjs`

The audit queries the live `pi.search` RPC for representative terms and checks the returned URLs on the public site. It is deliberately independent of PageFind.

Default queries currently include:

- `red hill`
- `sorrento`
- `winter wine`
- `dog friendly`
- `hot springs`
- `market`
- `birthday weekend`
- `corporate retreat`
- `winery tour`
- `moonah`
- `sunny ridge`
- `continental`

## How To Check Last Updated

### Entity index

Use the latest `PI Data Refresh` GitHub Actions run. (Deploy runs no longer touch the index, so a recent green deploy tells you nothing about index freshness.) The entity refresh step prints:

- total projected rows
- per-collection counts
- stale rows pruned
- apply completion

Expected healthy signs:

- `Refresh entity index` succeeds.
- `quick-note` count reflects only currently published notes, not all quick-note files.
- `pruned N stale entities` appears when stale rows exist.

### PageFind

Use the latest deploy workflow. `npm run build:search` runs Astro build and then:

```bash
npx pagefind --site dist
```

The PageFind output is published with the static site under `/pagefind/`.

### PI Chat / embeddings

Use the latest deploy or data-refresh workflow. The `Embed entity index` step runs:

```bash
node next/scripts/embed-entity-index.mjs --apply
```

If `OPENAI_API_KEY` is missing, the step logs a notice and skips embeddings. Lexical and facet search still work, but semantic ranking will not refresh.

## Local Operator Commands

From `next/`:

```bash
npm run entity-index:report
npm run search:audit -- --limit=10 --fail-on-broken
```

With service-role credentials available:

```bash
node scripts/refresh-entity-index.mjs --apply --prune
node scripts/embed-entity-index.mjs --apply
```

## Incident Response

If search returns 404s:

1. Confirm whether the bad result comes from PageFind or Supabase `pi.search`.
2. If `/search/` prefers grouped live results, inspect `pi.entity_index` first.
3. Check the source content status and routeability.
4. Run the projector in dry-run/report mode to confirm whether the row should still be projected.
5. If it should not exist, run the entity index refresh with `--apply --prune`.
6. Run the live search audit.
7. Trigger deploy only after the audit is clean.

## June 2026 Baseline

The latest clean baseline after the Red Hill incident:

- Deploy audit passed for 95 checked URLs across 12 representative queries.
- `/search/?q=red%20hill` returned 71 expanded grouped cards.
- All 71 Red Hill result links resolved.
- Archived quick-note leakage was fixed by trimming projected status values.
