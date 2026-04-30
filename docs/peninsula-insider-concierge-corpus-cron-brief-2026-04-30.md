# Peninsula Insider Concierge: Daily Corpus Refresh CRON Brief

**Prepared for:** IT Department / Platform Operations
**Prepared by:** Remy (Chief of Staff, Peninsula Insider)
**Date:** 30 April 2026
**Status:** Operationalisation request
**Purpose:** Hand over everything required to institutionalise the daily database refresh that keeps the Peninsula Insider concierge ("Ask The Insider") current with editorial source content. This brief assumes no prior knowledge of the product.

---

## 1. Executive summary

Peninsula Insider is a destination publication for the Mornington Peninsula. The site is a static Astro build deployed to GitHub Pages at `https://peninsulainsider.com.au`. On top of that static surface, we run a conversational concierge at `/ask` called "The Insider", which answers reader questions like "best cellar door lunch near Red Hill" or "rainy day with two kids near Rye" by retrieving from a curated knowledge base of Peninsula venues and editorial articles.

The concierge front end is part of the static site. The concierge brain is a separate Vercel API service (`peninsula-insider-platform-api.vercel.app`) that talks to a Supabase Postgres database with pgvector embeddings. The database is populated from the JSON and Markdown source files in this repo.

**Today the source content drifts ahead of the database.** Editors update venue records and publish articles continuously, but the concierge only reflects those changes when a refresh job runs. We have a working refresh script (`scripts/refresh-corpus.mjs`) and a GitHub Actions workflow (`.github/workflows/refresh-corpus.yml`) that already run it daily, but the cadence sits at 06:00 Melbourne local, the report path is informal, and ownership has not been formally handed to IT.

**What we need from IT:**

1. Take ownership of the daily corpus refresh job as a named, monitored, on-call piece of platform infrastructure.
2. Move the schedule from 06:00 Melbourne local to a fixed evening Melbourne slot (recommended 21:00 AEST / 11:00 UTC) so the day's editorial work is captured before the next morning.
3. Persist a daily report artifact (machine-readable JSON + human-readable Markdown) into `reports/concierge-corpus/` and surface a one-line digest into Mission Control.
4. Wire alerting so a failed run, a stale-row anomaly, or an embedding-cost anomaly pages someone before the next editorial day starts.
5. Document the runbook so anyone on the IT roster (not just the original author) can diagnose and recover the pipeline.

The infrastructure already exists. This brief is about institutionalising it.

---

## 2. Product context (so IT understands what this database actually does)

### 2.1 What the concierge is

"The Insider" is the public face of Peninsula Insider's editorial intelligence. It is reached from `/ask` on the static site, plus an embedded drawer triggered from the masthead on every page. A reader types a free-form question; the front end posts that question to the concierge API; the API runs a hybrid retrieval (keyword + vector) against the Supabase corpus, ranks results with editorial weighting, and returns a structured response: a short prose answer in The Insider voice, plus up to three "tiles" linking to canonical venue or article pages on the site, plus follow-on suggested questions.

The concierge is **grounded only in Peninsula Insider's own editorial corpus.** It does not freely browse the web, and it does not invent venues. If the corpus is wrong or stale, the concierge is wrong or stale. This is why the daily refresh matters.

### 2.2 Where it sits in the product architecture

Reader to product flow:

```
Reader (browser)
   │
   ▼
peninsulainsider.com.au  (static Astro site, GitHub Pages)
   │  /ask page → fetch POST
   ▼
peninsula-insider-platform-api.vercel.app/concierge/ask  (Vercel serverless)
   │  hybrid retrieval (keyword + pgvector cosine)
   ▼
Supabase Postgres   (database: mvdtkgsfuhmkioygxgge.supabase.co)
   │  table: concierge_chunks
   ▼
Embeddings (text-embedding-3-small, 1024 dims) + structured filters
```

Editorial to database flow (the part this brief is about):

```
Editors / agents commit JSON or Markdown
   │
   ▼
next/src/content/venues/*.json       (135 venue records as of 2026-04-30)
next/src/content/articles/*.md       (long-form journal pieces)
   │
   ▼
GitHub Actions workflow: refresh-corpus.yml
   │  runs scripts/refresh-corpus.mjs
   │  reads source, builds chunks, hashes, diffs, embeds delta, upserts
   ▼
Supabase concierge_chunks table   (the live concierge brain)
   │
   ▼
Daily report: reports/concierge-corpus/YYYY-MM-DD.md  (the artifact this brief asks IT to formalise)
```

### 2.3 Why daily and why evening

Peninsula Insider's editorial cadence runs through the Australian business day. Venue facts get verified, partner pages get edited, weekend dispatches go through copy edits, and accuracy autofixes run nightly. By the time the day's editorial work is committed, settled, and audited, it is roughly 21:00 to 22:00 Melbourne local. Running the refresh in that evening window means readers waking up the next day, including the Saturday morning peak that drives most "what should we do today" concierge traffic, are talking to a corpus that already reflects yesterday's work.

A morning run misses an entire editorial day. A midday run interrupts editors mid-flow and risks half-committed states. Evening Melbourne local is the right window, every day.

---

## 3. Infrastructure inventory

### 3.1 Source of truth

| Asset | Location | What it holds |
|---|---|---|
| Repository | `github.com/[org]/peninsula-insider` (deployed to `peninsulainsider.com.au`) | All editorial source and the refresh script |
| Venue records | `next/src/content/venues/*.json` | 135 venue files. Restaurants, wineries, cafes, stays, experiences. Each file has name, type, region, signature line, editor note, practical fields, tags, hero image, partner status, last-verified date. |
| Article records | `next/src/content/articles/*.md` | Long-form Journal pieces. YAML frontmatter (title, dek, region, status, tags) plus Markdown body. |
| Schema | `next/src/content.config.ts` | Zod schema, validated at build time. If a record is malformed the site build fails. |

Editors and agents commit changes against `main`. There is no separate CMS. The repo is the database.

### 3.2 Live database

| Asset | Identifier | Notes |
|---|---|---|
| Supabase project | `mvdtkgsfuhmkioygxgge` | Region and tier owned by IT. Service-role key only used by the refresh job and the concierge API. |
| Database table | `concierge_chunks` | One row per retrievable chunk. ~5 to 10 chunks per venue, ~3 to 8 chunks per article. Currently in the order of 800 to 1,200 rows total. |
| Vector extension | `pgvector` | Embeddings stored as 1024-dim vectors. |
| Vector index | HNSW or IVFFlat on `embedding` column | Owned by IT; check `pg_indexes`. Tune as corpus grows. |

`concierge_chunks` columns (read this once and the rest of the brief makes sense):

| Column | Type | Purpose |
|---|---|---|
| `chunk_id` | text, PK | Stable deterministic ID. Format: `<slug>::<purpose>::<index>`. Example: `paringa-estate::editor_note::0`. |
| `source_entity_type` | text | `venue` or `article`. |
| `source_entity_id` | text | Stable entity key derived from slug. |
| `page_slug` | text | The slug used on the public site. |
| `page_title` | text | Human-readable title. |
| `chunk_purpose` | text | `summary`, `editor_note`, `practical`, `tags`, `lede`, `body`. Drives ranking weight. |
| `section_heading` | text | Display label for the chunk. |
| `editorial_tier` | text | `A` for editor-voice content (article ledes, venue editor notes), `B` for structured fields (practical, tags). Concierge ranks A above B. |
| `category` | text | `restaurant`, `winery`, `cafe`, `bakery`, etc. Drives hard filters. |
| `region` | text | Place slug, e.g. `red-hill`, `sorrento`. Drives geographic filters. |
| `vendor_relationship` | text | `featured` for featured partners, `none` otherwise. Used for transparency, not ranking boost. |
| `freshness_flag` | text | `fresh`, `stale`, `verify`. Set from `lastVerified` date. |
| `text` | text | The actual chunk content the embedder sees and the LLM cites. |
| `embedding` | vector(1024) | OpenAI `text-embedding-3-small` at 1024 dims. |
| `embedding_source_hash` | text | SHA-256 of `text`. Powers the diff (see Section 5). |
| `approx_tokens` | int | Rough token count of `text`. Cost forecasting. |
| `ingested_at` | timestamptz | When this row was last written. |

### 3.3 Concierge API (downstream consumer)

| Asset | Identifier | Notes |
|---|---|---|
| Service | Vercel project `peninsula-insider-platform-api` | URL: `https://peninsula-insider-platform-api.vercel.app` |
| Public endpoint | `POST /concierge/ask` | Called by the static site at `/ask` and by the masthead drawer. Stateless. |
| Reads | `concierge_chunks` (Supabase) | The refresh job is the only writer. The API is read-only on this table. |
| Embedding model in API | `text-embedding-3-small` 1024 dims | **Must match the refresh job exactly.** Mismatched dims means cosine distances are meaningless. |

### 3.4 Runner and scheduling

| Asset | Identifier | Notes |
|---|---|---|
| Workflow file | `.github/workflows/refresh-corpus.yml` | Already exists. Runs `scripts/refresh-corpus.mjs`. |
| Triggers | `schedule` cron + `push` to content paths + `workflow_dispatch` | The push trigger means edits to `next/src/content/venues/**` or `articles/**` refresh the corpus within minutes. The cron is the safety net. The manual trigger supports `dry` and `force` modes. |
| Current schedule | `0 19 * * *` UTC (`06:00` Melbourne AEST) | This brief proposes moving it. See Section 7. |
| Runtime | GitHub-hosted `ubuntu-latest`, Node 22 | Typical run: 60 to 180 seconds. Cost: covered by the GitHub Pages plan. |

### 3.5 Secrets and variables

These are already configured but listed here so IT can inventory and rotate them:

| Name | Type | Used by | Notes |
|---|---|---|---|
| `SUPABASE_URL` | Variable (or Secret) | Refresh job | The Supabase project REST URL. |
| `SUPABASE_SERVICE_KEY` | Secret | Refresh job (writer); concierge API (reader, if same key, recommend separating) | Service role key. Rotate quarterly or on staff change. **Recommend IT issue a write-only role specifically for the refresh job.** |
| `OPENAI_API_KEY` | Secret | Refresh job (embeddings); concierge API (chat completion) | Same key today. Recommend IT split into two scoped keys with budget caps. |
| `PUBLIC_CONCIERGE_API_URL` | Variable | Astro build (deploy workflow) | Already configured at `https://peninsula-insider-platform-api.vercel.app`. |

---

## 4. Architecture: how a venue edit becomes a concierge answer

Walking the path end to end, because this is the unfamiliar piece for IT.

### Step 1: Editor commits a change

An editor (human or agent) edits, for example, `next/src/content/venues/paringa-estate.json`. They might update the editor note, change opening hours, add an award, or adjust the price band. They commit and push to `main`. The Astro site rebuilds via `deploy.yml` (separate workflow) and the static HTML is regenerated within minutes.

The static HTML on its own does **not** update the concierge. The concierge does not read HTML.

### Step 2: Refresh trigger fires

One of three triggers wakes the refresh job:

1. **Push to a content path.** GitHub Actions sees the changed file under `next/src/content/venues/**` or `articles/**` and queues a workflow run. This is the immediate path: changes are live in the concierge usually within 2 to 4 minutes.
2. **Daily cron.** A scheduled run fires at the configured UTC time regardless of whether anyone pushed. This is the safety net.
3. **Manual dispatch.** Anyone with workflow access can trigger a run from the GitHub Actions UI, optionally in `dry` (report only, no writes) or `force` (re-embed everything ignoring hashes) mode.

### Step 3: Refresh job reads source content

The job runs `scripts/refresh-corpus.mjs`. The script reads every `*.json` in `next/src/content/venues/` and every `*.md` in `next/src/content/articles/` from the working directory of the checked-out commit. Records with `status` set to anything other than `published` are skipped.

### Step 4: Chunking

For each entity, the script builds a small set of chunks. A "chunk" is a self-contained passage of text that the embedder can turn into a vector and the LLM can cite back to a reader. Chunking is deterministic: given the same source file you always get the same chunk IDs.

A typical venue produces:

- **`<slug>::summary::0`**: one-line overview (`name. type in region. signature.`)
- **`<slug>::editor_note::0`**: the full editor note (the richest, most opinionated chunk; tier A)
- **`<slug>::practical::0`**: address, phone, website, booking provider, price band
- **`<slug>::tags::0`**: mood, season, audience, occasion tags

A typical article produces:

- **`<slug>::lede::0`**: title plus dek plus first paragraph
- **`<slug>::body::0`** through **`<slug>::body::N`**: body chunks grouped to roughly 500 tokens each

This deterministic chunking is the foundation of the diff strategy. If editors change one paragraph in an article, only that body chunk's hash changes. Everything else gets skipped.

### Step 5: Diff against the live database

The script fetches the existing `chunk_id` and `embedding_source_hash` for every row currently in `concierge_chunks`, paged 1,000 at a time. It then walks the freshly built chunks and compares hashes:

- **Hash matches existing**: skip. No embedding API call. No database write. Free.
- **Hash differs from existing**: re-embed, upsert.
- **Chunk does not exist in database**: embed, insert.
- **Chunk exists in database but not in source**: flag as **stale** in the report. (See Section 6 for the stale-deletion policy.)

This delta-only behaviour is what makes the daily run cheap and fast even when the corpus grows. On a typical day with no editorial changes, the job reads source, computes hashes, fetches existing hashes, finds zero deltas, writes nothing, and exits in under 60 seconds at zero embedding cost.

### Step 6: Embed and upsert (delta only)

For each delta chunk, the job calls `https://api.openai.com/v1/embeddings` with `model=text-embedding-3-small` and `dimensions=1024`. Retries: 3, with exponential backoff on 429. The returned vector plus the chunk metadata plus the new SHA-256 hash plus `ingested_at = now()` is upserted to `concierge_chunks` via the Supabase REST API with `on_conflict=chunk_id`.

### Step 7: Concierge serves new content

The next time a reader asks a question that retrieves the affected chunk, the new content is served. There is no cache invalidation step. The concierge always reads the live row.

---

## 5. The fundamental parts that need to be updated

This is the explicit list of "what changes between yesterday and today, and how the database should reflect that."

| Source change | What needs to update in the database | How the refresh handles it |
|---|---|---|
| New venue file added under `venues/` | New rows inserted (one per chunk: summary, editor_note, practical, tags) | Detected because new `chunk_id`s have no existing hash. All chunks are embedded and inserted. |
| Existing venue's editor note rewritten | The `<slug>::editor_note::0` row's `text`, `embedding`, and `embedding_source_hash` are overwritten. Other chunks of the same venue are untouched. | Diffed by hash. Only the changed chunk re-embeds. |
| Venue partner status flipped to `featured` | The `vendor_relationship` field on every chunk for that venue updates. | Currently the field is computed at chunk-build time, so the chunk text might be unchanged but the metadata changes. **See "Known limitation A" below.** |
| Venue's `lastVerified` date moved forward | The `freshness_flag` field updates. Chunk text typically unchanged. | Same metadata-without-text caveat. |
| New article file added under `articles/` | New rows inserted: one lede chunk plus N body chunks. | New `chunk_id`s, all embedded and inserted. |
| Article body edited | Only the body chunks whose paragraphs landed in the changed group re-embed. Lede is untouched if the title/dek/first paragraph are untouched. | Diffed by hash. |
| Venue file deleted | Source no longer contains the chunk. Database still does. | Detected and reported as **stale**. **Not auto-deleted today.** See "Known limitation B" below. |
| Venue field renamed in schema | All chunks for that entity rebuild and re-embed if the field appears in the chunk text. | Standard hash diff. |
| Embedding model changed | Every chunk needs to re-embed because cosine distances across models are meaningless. | Run with `--force` once. The script supports this via `workflow_dispatch` `mode: force`. |

### Known limitation A: metadata-only changes do not retrigger

Today the diff is keyed off `embedding_source_hash` of the chunk `text`. If a venue's `featuredPartner` flips from `false` to `true` but no chunk text changes, the refresh treats it as a no-op. The `vendor_relationship` column in the database stays at the old value until something else changes that venue's text.

**IT mitigation:** add a metadata-fingerprint column (separate hash over the structured metadata fields) and re-upsert when either the text hash or the metadata hash changes. Tracked as a follow-up; not blocking initial operationalisation.

### Known limitation B: stale rows are reported, not deleted

If a venue file is deleted from the repo, its chunks remain in `concierge_chunks` and the concierge can still surface them. The script logs them under "stale" but does not issue a `DELETE`.

**IT mitigation:** add a `--prune` flag that deletes stale rows after a 7-day grace period to allow accidental-delete recovery. Tracked as a follow-up; not blocking initial operationalisation. Until then the daily report's stale list must be reviewed weekly.

### Known limitation C: status field is honoured, drafts are skipped

Records with `status` set to anything other than `published` are excluded. This is intentional. If editors save a draft, the concierge will not surface it. **There is currently no warning if a previously-published venue gets flipped to draft;** its chunks become stale silently. The daily report should flag any newly-stale chunks loud enough that an editor sees them.

---

## 6. The audit and diff process, in detail

This is the part the user asked to see most explicitly. Each daily run produces an auditable record of what changed.

### Inputs to the audit

1. The set of source files in the checked-out commit at run time.
2. The set of `(chunk_id, embedding_source_hash)` rows currently in `concierge_chunks`.

### Audit logic

For every freshly built chunk:

1. Compute `new_hash = SHA-256(chunk.text)`.
2. Look up `existing_hash = existing.get(chunk_id)`.
3. Classify:
   - `existing_hash === new_hash`: **unchanged**, skipped.
   - `existing_hash !== new_hash` and `existing_hash` defined: **updated**, re-embed and upsert.
   - `existing_hash` undefined: **added**, embed and insert.

For every row in `concierge_chunks` whose `chunk_id` is not in the new chunk set: **stale**.

### Audit output today (informal)

The script writes to stdout:

```
🌊  Concierge corpus refresh
     Mode:        delta only
     Content dir: next/src/content
     Embed model: text-embedding-3-small

  Venues:   135 files
  Articles: 14 files
  → 612 chunks built from source

  908 chunks currently in Supabase

  + paringa-estate::editor_note::0
  ~ ten-minutes-by-tractor::practical::0
  ...

  Done in 47.3s
     +3 added
     ~7 updated
     =602 unchanged
     ✗0 errors
     ⌫4 stale (in DB but not in source — not auto-deleted)
```

### Audit output this brief proposes (formalised)

In addition to stdout, the workflow should write two artifacts for each run:

**A. Machine-readable JSON** at `reports/concierge-corpus/YYYY-MM-DD.json`:

```json
{
  "run_id": "2026-04-30T11:00:00Z",
  "trigger": "schedule",
  "mode": "delta",
  "duration_seconds": 47.3,
  "source": {
    "venues": 135,
    "articles": 14,
    "chunks_built": 612
  },
  "database": {
    "chunks_before": 908,
    "chunks_after": 911
  },
  "delta": {
    "added": 3,
    "updated": 7,
    "unchanged": 602,
    "errors": 0,
    "stale": 4
  },
  "added_chunk_ids": ["paringa-estate::editor_note::0", "..."],
  "updated_chunk_ids": ["..."],
  "stale_chunk_ids": ["..."],
  "errors": [],
  "embedding_cost_usd_estimate": 0.0008,
  "git_sha": "abcd1234",
  "embedding_model": "text-embedding-3-small",
  "embedding_dims": 1024
}
```

**B. Human-readable Markdown** at `reports/concierge-corpus/YYYY-MM-DD.md`:

```
# Concierge corpus refresh, 30 April 2026

**Trigger:** scheduled (21:00 Melbourne)
**Duration:** 47s
**Result:** 3 added, 7 updated, 602 unchanged, 0 errors, 4 stale

## Added
- paringa-estate::editor_note::0
- ten-minutes-by-tractor::summary::0
- ten-minutes-by-tractor::editor_note::0

## Updated
...

## Stale (review)
- defunct-cafe::summary::0  (last seen 2026-04-22)
...

## Estimated embedding cost
$0.0008 USD

## Health
All green. No retries. No 429s.
```

### Where reports live

- Committed to the repo at `reports/concierge-corpus/YYYY-MM-DD.{json,md}` as part of the workflow run, so they are auditable through git history.
- Mirrored to Mission Control (Supabase `cron_run_logs`) so the dashboard shows pass/fail at a glance.
- Posted as a one-line summary to the operator's chosen channel (Telegram for James today, can be Slack/email for IT).

### Failure escalation

| Failure mode | Detection | Escalation |
|---|---|---|
| Refresh job fails (any non-zero exit) | GitHub Actions native | Email to repo admins, plus Telegram alert via the existing notification stack |
| Embedding API returns 429 sustained | Script logs and retries; if retries exhausted, exits non-zero | Same as above |
| Supabase upsert fails | Script logs, increments error count; if any errors, exits non-zero | Same as above |
| Stale count jumps unexpectedly (e.g. > 10) | Daily report comparison vs prior day | IT review, possible accidental-delete check |
| No run for > 26 hours | Mission Control absence-of-heartbeat check | Page IT on-call |
| Chunk count drops by > 5 percent in one run | Daily report comparison vs prior day | IT review before allowing deploy of any dependent changes |

---

## 7. The CRON schedule recommendation

### Current

```yaml
on:
  schedule:
    - cron: '0 19 * * *'   # 06:00 Melbourne local
```

### Proposed

```yaml
on:
  schedule:
    - cron: '0 11 * * *'   # 21:00 Melbourne AEST (22:00 AEDT)
```

### Why 21:00 Melbourne

- After the daily editorial cadence has settled. Most venue edits and article publishes land between 09:00 and 18:00 local. By 21:00 the day's commits are in.
- After the existing `pi-daily-accuracy-scan` (20:20 UTC) and `pi-daily-link-audit` (21:20 UTC), so any autofixes those produce are already committed.
- Comfortably before midnight Melbourne, so a failure has hours of headroom for a human or alert system to retry before the morning concierge traffic.
- Stable across the year: 11:00 UTC is 21:00 AEST in winter and 22:00 AEDT in summer. Both are evening Melbourne local. We do not chase daylight savings.
- Push triggers continue to handle in-day urgent updates. The cron is the safety net.

### Alternative if IT prefers

`0 12 * * *` UTC (`22:00` AEST / `23:00` AEDT) for a later slot. Still evening Melbourne, gives even more headroom for daily editorial work. Pick one and stick to it.

### Per-environment

Production only. There is no staging concierge corpus today. If we add one in future, IT should fork this workflow into a `refresh-corpus-staging.yml` pointing at a separate Supabase project with the same schema. **Never** point staging and prod at the same Supabase database.

---

## 8. Operationalisation checklist for IT

### 8.1 One-time setup (most of this is already done; confirm)

- [ ] Confirm `SUPABASE_URL` is configured as a repo Variable.
- [ ] Confirm `SUPABASE_SERVICE_KEY` and `OPENAI_API_KEY` are configured as repo Secrets.
- [ ] **Recommended:** rotate the existing service key into a write-only role specifically for the refresh job. The concierge API should use a separate read-only role.
- [ ] **Recommended:** rotate the OpenAI key into a project-scoped key with a monthly spend cap (suggested USD $25/month, currently the realistic ceiling is well under USD $5/month).
- [ ] Update the schedule in `.github/workflows/refresh-corpus.yml` from `0 19 * * *` to `0 11 * * *`.
- [ ] Add a step at the end of the workflow that writes both the JSON and Markdown reports under `reports/concierge-corpus/YYYY-MM-DD.{json,md}` and commits them on a separate branch or via a `[skip ci]` commit so it does not retrigger the deploy workflow.
- [ ] Wire failure notifications to IT's preferred channel (currently Telegram; suggest also adding email-to-IT-DL).
- [ ] Add the daily run to Mission Control's `cron_run_logs` so the absence-of-heartbeat alarm fires after 26 hours without a run.
- [ ] Document the runbook (Section 9) in IT's internal wiki.

### 8.2 Recurring operational duties

- **Daily (automated):** the workflow runs, writes the report, posts the digest.
- **Daily (human):** glance at the digest. Anything unusual gets a 5-minute review.
- **Weekly:** review the stale list. Confirm any stale chunks are intentional (deleted venues) and run a manual cleanup if so.
- **Monthly:** review embedding spend. Should be in single-digit USD.
- **Quarterly:** rotate `SUPABASE_SERVICE_KEY` and `OPENAI_API_KEY`. Confirm vector index health (`pg_stat_user_indexes`).
- **On staff change:** rotate keys.

---

## 9. Runbook

### 9.1 The daily run failed. What do I do?

1. Open the failed Actions run in GitHub. Read the tail of the logs.
2. Common causes, in order of frequency:
   - **OpenAI rate limit (429).** The script retries 3 times with backoff. If it still fails, wait 10 minutes and rerun via `workflow_dispatch` in `normal` mode.
   - **Supabase 5xx.** Transient. Rerun.
   - **Supabase auth 401.** The service key was rotated and the GitHub Secret was not updated. Update the secret, rerun.
   - **Source file fails to parse.** A malformed JSON or YAML frontmatter slipped through. The Astro build would have caught this on push. If you see it here it usually means the workflow ran on a commit where the build also failed. Fix the source file, push, the next run will recover.
3. If the run failed after partial writes, the corpus is in a half-updated state. Run again in `normal` mode (delta-only) to converge. Do **not** run `force` unless told to: it costs ~30x more in embeddings.

### 9.2 The concierge is returning weird answers. Is the corpus broken?

1. Pick a chunk ID you suspect (e.g. `paringa-estate::editor_note::0`).
2. Query Supabase: `SELECT chunk_id, page_title, ingested_at, length(text) FROM concierge_chunks WHERE chunk_id = $1`.
3. Confirm `ingested_at` is recent (within 24 hours of the last edit to the source file).
4. If `ingested_at` is stale, run the workflow manually in `dry` mode and check whether the chunk shows up as "WOULD update". If yes, the schedule is not running. Check the schedule and Actions enablement. If no, the source file's text matches what is in Supabase and the issue is in retrieval/ranking, not in the corpus.

### 9.3 We need to re-embed everything (e.g. model upgrade)

1. Confirm the new model and dimensions match between the refresh script and the concierge API. **They must match exactly.**
2. Coordinate a maintenance window (during Melbourne overnight is easiest).
3. Trigger `workflow_dispatch` with `mode: force`.
4. Watch the run. Expected duration: 5 to 15 minutes for the current corpus size. Expected cost: USD $0.50 to $2.00.
5. After completion, smoke-test the concierge with five known queries.

### 9.4 We need to point at a different Supabase project (e.g. recovery)

1. Update `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in repo settings.
2. Run `workflow_dispatch` with `mode: force`. This will populate the new database from scratch.
3. Update the concierge API's environment to point at the same new database.
4. Smoke-test.

### 9.5 The stale count jumped to 50. What happened?

Most likely a bulk rename or restructure of source files. Compare the stale list against the diff of recent commits to `next/src/content/`. If the stale chunks correspond to renamed slugs, the orphaned rows should be deleted (manually for now; this becomes the `--prune` follow-up). Do not delete blindly.

---

## 10. Open follow-ups (not blocking, log to backlog)

1. **Metadata-fingerprint column.** Re-upsert when metadata changes even if chunk text is unchanged. Closes "Known limitation A".
2. **`--prune` flag.** Auto-delete stale rows after a 7-day grace period. Closes "Known limitation B".
3. **Draft regression alerting.** Warn loudly when a previously-published venue is flipped to draft. Closes "Known limitation C".
4. **Cost dashboard panel.** Track embedding spend per day in the same dashboard that shows the run summary.
5. **Per-region health.** Surface chunk counts by `region` over time so we can spot if Sorrento or Red Hill quietly stops growing.
6. **Vector index tuning.** Revisit HNSW/IVFFlat parameters once corpus passes 5,000 chunks.
7. **Read-only role for the API.** Split the current single service key into a write-only refresh role and a read-only API role.
8. **Concierge-corpus staging.** Stand up a second Supabase project so model upgrades and schema changes can be exercised before production.

---

## 11. Contacts and ownership

| Role | Owner | Responsibility |
|---|---|---|
| Editorial source content | Peninsula Insider editorial desk (James, Remy) | Quality of venues, articles, partner records |
| Concierge corpus refresh job | **IT (this brief is the handover)** | Schedule, secrets, failure response, runbook |
| Concierge API (Vercel) | Platform / IT | Uptime, scaling, model selection |
| Supabase project | Platform / IT | Backups, vector index health, key rotation |
| Reader-facing concierge UX | Peninsula Insider product (James) | What the answer looks like, voice, ranking weights |
| Cost governance | IT, reviewed monthly with Sterling (CFO) | Embedding spend, Supabase tier, Vercel tier |

---

## 12. What "done" looks like

This brief is delivered. IT operationalises the daily refresh. From that point forward:

1. Every day at 21:00 Melbourne the concierge corpus refresh runs without human involvement.
2. Every day a JSON and Markdown report lands in `reports/concierge-corpus/`.
3. Every failure pages someone before the next morning.
4. The runbook is in IT's internal wiki, not just in this document.
5. Editors do not need to know any of this exists. They commit content. The concierge stays current.

That is what continual improvement of the product looks like at the database layer: invisible when it works, recoverable when it does not, observable always.
