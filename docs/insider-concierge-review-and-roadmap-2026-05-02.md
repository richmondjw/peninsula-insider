# The Insider Concierge — Review and Roadmap

**Date:** 2 May 2026
**Author:** Remy
**Purpose:** Comprehensive state-of-the-product review of "Ask The Insider" plus a phased enhancement roadmap.

---

## 1. Where The Insider stands today

### 1.1 Product surface
- `/ask` page on `peninsulainsider.com.au` (full-width chat dialog with postcard tile rail and follow-on chips)
- Embedded drawer triggered from masthead on every page (`ConciergeDrawer.astro`)
- Plain HTML/JS embedded in the static Astro build, posts to a separate Vercel API

### 1.2 API stack (peninsula-insider-platform repo, Vercel)
- `POST /concierge/ask` — synchronous full-response endpoint
- `POST /concierge/ask/stream` — SSE streaming variant (recently added; lower perceived latency)
- `GET /concierge/suggestions` — chip starter prompts
- `GET /admin/queries` — admin viewing of recent queries

Pipeline per request:

1. Classify reader intent (Claude Haiku) and embed query (OpenAI text-embedding-3-small, 1024 dims) in parallel
2. Hybrid retrieval against `concierge_chunks`: 25 vector results + 25 BM25 results
3. RRF merge top 30 candidates
4. Cohere rerank → top 5
5. Claude Sonnet 4.5 generates answer + structured recommendations + follow-on questions (system prompt cached)
6. Enrich recommendations with hero images, signatures, price bands from venues / articles tables
7. Log full transcript to `concierge_queries` table (fire-and-forget)
8. Return JSON response

Rate limiting: 20 queries / hour / session, in-memory (resets on Vercel cold start).

### 1.3 Knowledge base (Supabase `mvdtkgsfuhmkioygxgge`)

Live as of cutover yesterday:

| Source type (DB) | Rows | What it represents |
|---|---:|---|
| venue | 672 | 135 venue records, ~5 chunks each |
| article | 1,138 | 78 articles + 10 editorial blocks (best-of intros, hub framing) |
| experience | 186 | 42 experiences + 20 places (towns, capes, ridges) |
| itinerary | 27 | 6 curated multi-stop trip plans |
| event | 24 | 8 future / in-progress events |
| **Total** | **2,047** | up from 1,000 the day before |

Pipeline ran 4 daily reports cleanly so far (the one-off cutover day plus the next 2 cron fires).

### 1.4 Telemetry that already exists

`concierge_queries` schema captures per-query:
`query_id, user_id, session_id, query_text, current_page, model_used, prompt_hash (rich JSON: intent + recs + follow-ons), retrieved_chunk_ids, reranked_chunk_ids, answer, gap_detected, gap_reason, refusal_reason, token_input_approx, token_output_approx, cost_approx_aud, latency_ms, ttft_ms, timestamp`.

Several of these fields exist but **are not yet populated** by the API (gap_detected, gap_reason, refusal_reason, token counts, cost_approx_aud, ttft_ms). That's a no-cost analytics quick win waiting to happen.

### 1.5 Live usage (last 7 days)
- 29 queries logged
- 20 unique sessions
- Median latency: 12 seconds (range: 9 to 18 seconds)
- A handful of real reader queries already showing the right shape: "anniversary dinner Friday night, somewhere with a view", "best winery for a long lunch in red hill", "I want to plan my wedding down in the peninsula"
- Several test sessions pollute the data (`transcript-test-*` session IDs)

---

## 2. What's working well

1. **Editorial voice is intact.** Answers I've sampled don't read like generic AI tourism prose. The Sonnet 4.5 prompt is doing real work.
2. **Hybrid retrieval is the right architectural choice.** Vector + BM25 + RRF + Cohere rerank gives a strong relevance ceiling, especially as the corpus grows.
3. **Daily refresh pipeline is now reliable.** Five PRs in a day fixed every constraint, the script runs in compat mode whether or not the migration has been applied, and a dated audit artefact lands in the repo every night.
4. **The corpus more than doubled in 24 hours**, and the chunker is now extensible — adding a new collection takes ~30 lines.
5. **Streaming SSE endpoint exists**, which means the front end can dramatically improve perceived speed without backend changes.

---

## 3. Top observed gaps

Listed in roughly the order they hurt the reader experience.

### A. Latency (12s median is too slow for a chat surface)
A reader expects a chatbot to start responding within 1–2 seconds. Right now The Insider is silent for 9 to 18 seconds. The pipeline runs intent + embedding in parallel (good), but then has serial calls to retrieval, reranker, generator, and recommendation enricher. The streaming endpoint helps once the LLM starts emitting tokens, but the front end at `/ask` only calls the synchronous endpoint today.

### B. Recommendation tiles only render venues and articles
The enricher in `apps/api/src/routes/concierge.ts` looks up slugs in `venues` and `articles` tables. New types (place hubs, itineraries, events, experiences, editorial framing) ground the LLM's prose but **do not render as recommendation tiles**. Reader sees the answer text, no card. The corpus expansion is half-realised in UX terms until this lands.

### C. No usage report surfaced to anyone
This is the original ask. `concierge_queries` is being populated, and `/admin/queries` exists, but there's no daily summary going to James, no anomaly detection, no top-queries surfacing, no cost roll-up, no gap-detection signal. The data is there; the report isn't.

### D. Several telemetry fields are NOT being populated
The schema has space for cost tracking, gap detection, refusals, token counts, ttft. The API doesn't write any of them today. These are the inputs we'd need for a proper observability dashboard.

### E. Rate limiting resets on cold start
Vercel functions cold-start frequently. The 20-queries-per-hour limit is enforced in process memory only, so a determined user hits a fresh budget on every cold start. Acceptable today (low traffic, no abuse) but a real gap before promotion.

### F. No retrieval-quality eval
We don't currently know whether changes to the chunker, the rerank settings, or the generation prompt make answers better or worse. Eval harness would let us iterate confidently.

### G. No save / favourites / trip-board
The strategy doc you wrote (PI in Your Pocket) calls this out as the Phase 2 stickiness move. Single-session chat without persistence keeps the product in "novelty" rather than "habit."

### H. No personalisation
The concierge greets every reader the same way. Returning visitors don't get faster onboarding; couples-with-dogs don't get filtered defaults; locals don't get different framing. All reader intent has to be re-typed every session.

### I. Sources / citations not surfaced
The LLM has the chunk_ids and could cite, but the response shape doesn't ask for it and the UI doesn't render any. Trust is doing more work than it should be: a "according to PI's editor's note from October" line on every recommendation would lift confidence substantially.

### J. The 5 days I have evidence for show test traffic dominating real readers
20 sessions, 29 queries, including obvious test patterns. Either real traffic isn't reaching `/ask`, or the entry points aren't visible enough on the live site, or both. Worth a deliberate look at funnel and discoverability.

---

## 4. Roadmap, in three horizons

### NOW (next 1 to 2 weeks) — ship the things that compound everything else

**1. Daily usage report (your original ask).** New script `ops/scripts/concierge-usage-report.mjs` reading from `concierge_queries`, plus a workflow that emails / posts a summary every morning. Format:

  ```
  Insider — usage report, 2 May 2026

  Reader queries: 14 (vs 7-day avg of 9)
  Distinct sessions: 11
  Median latency: 11.2s (target <3s)
  Estimated cost: $0.18

  Top queries (clustered):
   - "long lunch / cellar door" — 4 queries
   - "rainy day with kids" — 3 queries
   - "where to stay in Sorrento" — 2 queries

  Notable answers:
   - 1 query landed on "no matching content" (gap detected)
   - 0 explicit refusals
   - 2 anomalously long latencies (>15s)

  Sample queries: …
  ```

  Delivery: Telegram (already wired for cron-jobs.json) and / or email.
  Cost: zero — just reading existing data.

**2. Wire up the missing telemetry fields.** Populate `gap_detected`, `gap_reason`, `cost_approx_aud`, `token_input_approx`, `token_output_approx`, `ttft_ms`. ~half a day of platform-api work; unlocks every downstream report.

**3. Cut latency in half.** Two moves, in order:
   - Front-end at `/ask` calls `/concierge/ask/stream` instead of `/concierge/ask`. Reader sees first token within 2s instead of waiting 12s for the whole answer.
   - In the stream variant, ship "thinking…" + progressive tile rendering: tiles appear as recommendations resolve, not after the full enrichment finishes.

**4. Fix the recommendation tile gap (extend the API enricher).** Make `enrichRecommendations` look up slugs in `places`, `experiences`, `itineraries`, `events`, and `editorial_blocks` tables, with the right hrefs (`/places/sorrento/`, `/escape/sorrento-off-season-weekend/`, etc). Concierge answers immediately render places, itineraries, experiences, events as proper tiles — the UX side of yesterday's corpus expansion finally lands.

**5. Apply the DB migration.** Run `ops/migrations/2026-04-30-concierge-chunks-fingerprint-and-event-date.sql`. Lights up metadata-only diffs and event-date filtering. Trivial. Just hasn't happened yet.

**6. Surface citations / sources in the response.** Have the generator emit a `sources` array (chunk_id list with section heading and slug). Render a small "From PI's notes on …" line under each recommendation tile. Free trust uplift.

### NEXT (next 1 to 2 months) — make it sticky

**7. Save / favourites / trip board.** Reader hits a heart on a tile, it lands in a `/my-trip/` page. Saved across sessions (cookie-based at first, then auth when justified). The strategy doc's Phase 2 hook.

**8. Personalisation: remembered preferences.** Three opt-in toggles on first use (couples / family / dogs · ridge / coast / bay · luxe / mid / value) that pre-filter retrieval. After 2-3 questions, infer and confirm preferences. Returning sessions skip the warm-up.

**9. Eval harness.** A frozen set of ~50 reader-style queries with editor-judged "good answer" rubrics. Run nightly against the live API; track relevance / faithfulness / latency over time. Becomes the regression net before any prompt or chunker change.

**10. Gap detection as a content signal.** When the LLM marks `gap_detected: true`, surface those queries in the daily report and feed them to the editorial backlog as content briefs. The concierge becomes its own content commissioner.

**11. Retrieval quality bumps.**
   - Move embeddings to Voyage 3 (already in env vars, not yet used) — better retrieval for editorial prose
   - Add `last_otto_verified` weighting to ranking (verified content ranks higher)
   - Per-region quotas in the candidate pool (so a "Red Hill" query doesn't return all-Sorrento by accident)

**12. Cost & budget controls.** Surface daily spend in the report, set a soft daily budget alert, switch to GPT-4o-mini for low-confidence intents to keep median cost down.

**13. Production rate limiting.** Move from in-memory to Supabase or Upstash Redis. Survives cold starts. Per-IP fallback for sessions that don't carry a session ID.

### LATER (3 to 6 months) — make it a destination

**14. Trip planner mode.** Reader asks "plan our anniversary weekend, two nights, anchor in Red Hill" and gets a structured itinerary (anchor stay, day-by-day, drive-times, alt picks, booking checklist, what-to-skip). Drag/edit/save/share.

**15. Weather and timing intelligence.** Concierge knows current weather and time-of-day, swaps recommendations accordingly ("the back beach swim you asked about is closed in this swell — try the bay-side option").

**16. PWA installability.** Manifest + service worker. Reader installs PI on their phone, opens it like an app, offline-reads saved trips.

**17. Native push for saved trips.** "Your Saturday Sorrento booking opens this Friday — you haven't booked yet."

**18. Voice input / voice output.** Reader holds the phone up while driving from Melbourne and says "what's near us for lunch." Big trust signal, low engineering cost via Web Speech API.

**19. Embeddable widget for partners.** Cellar doors and stays embed a scoped Insider on their own site ("ask anything about Red Hill"). Drives partner conversion and surfaces PI as the authority layer.

**20. Multi-modal — photo concierge.** Reader sends a photo of a beach or sign, concierge identifies it and recommends nearby. Pulls on Anthropic / OpenAI vision; small surface, big delight.

---

## 5. Recommended next sequence (the way I'd do it)

If we ship the "Now" block in order, the system improves visibly to readers each week:

| Week | Ship | Reader-visible effect |
|---|---|---|
| 1 | Daily usage report + telemetry fields | Operator-visible only; sets up everything else |
| 1 | DB migration applied | None directly; clean compat-mode warnings |
| 1 | Streaming front-end | First token in 1-2s instead of 12s |
| 2 | Enricher extension (places, itineraries, events) | Tiles render for all corpus types; concierge feels "complete" |
| 2 | Citations / sources | Trust uplift on every answer |

That's the foundation. From there, the "Next" horizon adds stickiness (saves, preferences, eval). The "Later" horizon turns a chat surface into a planning destination.

---

## 6. What I'd specifically wire next, given your permissions

If you want me to keep going from here, I'd:

1. Build the daily usage report script + workflow in this repo (the original ask). Half a day.
2. Open a PR in `peninsula-insider-platform` extending the enricher to the new types. Half a day.
3. Switch `/ask`'s front end to the streaming endpoint. Half a day.
4. Land the DB migration when you can paste it into Supabase Studio. Five minutes for you.

Each is independently shippable and each unlocks the next one. Say the word.
