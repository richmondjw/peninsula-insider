# The Insider — Tech Stack Review & Enhancement Roadmap

Date: 2026-06-10
Scope: Full-stack review of The Insider concierge (PI tool) — frontend, API, retrieval, models, data pipeline, and observability — triggered by reader-perceived latency (5+ second pause before the answer starts appearing) and the ambition to make The Insider a world-class, central product surface for Peninsula Insider.

---

## 1. Executive summary

**The single most important finding is not architectural — it's configuration.** Live telemetry in the concierge database shows the production generation model was switched to `gpt-5-nano` at some point before June 2. The two most recent real queries took **34s and 46s end-to-end, with time-to-first-token of 45 seconds**. `gpt-5-nano` is a reasoning model: on the June 2 query it emitted ~6,200 output tokens (mostly hidden reasoning) before the visible answer began. This is the dominant cause of the "long pause before anything appears" experience and should be reverted immediately.

Beneath that, the architecture is fundamentally sound — hybrid retrieval (pgvector + BM25 + RRF + rerank), a clean daily corpus pipeline, SSE streaming to the frontend, per-step telemetry — but it is **deployed in the wrong place and tuned for the wrong model**. The API runs in Vercel US East (`iad1`) while the database, the readers, and the content are all in Sydney. Every query pays multiple cross-Pacific round trips before the model even starts.

With the fixes in Phase 0 (mostly config, ~1–2 days of work) the tool should go from a 5–45s pause to **first words on screen in 1–2 seconds and complete answers in 3–6 seconds**. Phases 1–2 then turn it from a Q&A widget into the central, sticky product surface: instant answers for common questions, multi-turn memory, saved trips, and personalisation.

### Live latency evidence (from `concierge_queries`, all-time)

| Generation model | Queries | Median latency | Worst | Median TTFT |
|---|---:|---:|---:|---:|
| `gpt-4o-mini` (early stub, no retrieval) | 13 | 0.8s | 2.1s | — |
| `claude-sonnet-4-6` | 13 | 12.0s | 16.6s | — |
| `claude-sonnet-4-5` | 6 | 17.0s | 20.7s | 12.1s |
| `gpt-4o` | 1 | 9.2s | — | — |
| **`gpt-5-nano` (current, June 2)** | 2 | **40.2s** | **46.3s** | **45.4s** |

The model has been changed at least five times without an eval gate or a changelog entry. That alone justifies the eval-harness and config-governance recommendations below.

---

## 2. Current stack — what exists today

### Frontend
- Static Astro site on GitHub Pages (`peninsularinsider.com.au`). Constraint per HANDOVER-CLAUDE.md: stay static, no SSR.
- The Insider is implemented twice as inline vanilla JS: the site-wide drawer (in the base layout, ~640 lines in `index.html`) and the full-page `/ask` experience (~400 lines).
- Calls `POST https://peninsula-insider-platform-api.vercel.app/concierge/ask/stream` with `{query}` + `X-Session-Id`, consumes SSE (`text` deltas, `meta` recommendations/follow-ons, `done`, `error`), renders progressively. 60s abort timeout, no retry, no pre-warm.
- Conversation history lives only in `sessionStorage` for replay; **each turn is stateless to the backend** — the model never sees prior turns.

### API (peninsula-insider-platform repo, Vercel serverless, region `iad1` — US East)
Per query: parallel intent classification (Claude Haiku) + query embedding (OpenAI `text-embedding-3-small`, 1024d) → hybrid retrieval against Supabase (25 vector + 25 BM25, RRF-merged to 15) → Cohere rerank to top 5 → generation (structured tool output: prose + recommendation slugs + follow-ons, `max_tokens` 900, cached system prompt) → enrichment (slug → image/price/signature lookups) → fire-and-forget transcript log.

Typical step timings from the May perf pass: intent+embed ~1.3s, retrieve ~0.2s, rerank ~0.3s, **generate ~13s (≈80%)**, enrich ~0.25s.

### Data layer
- Two Supabase projects in `ap-southeast-2` (Sydney): auth/CMS/search, and the concierge vector store (`concierge_chunks`, 1,635 chunks across 460 source entities; HNSW + GIN + compound btree indexes).
- Daily corpus refresh (`ops/scripts/refresh-corpus.mjs`, GitHub Actions, 21:00 Melbourne) with SHA-256 diffing, delta embedding, 7-day prune grace, daily reports. Running cleanly for 40+ days. A metadata-fingerprint migration is written but **not yet applied** to production.

### Observability
- `concierge_queries` table logs every transcript with latency; `ttft_ms`, `gap_*`, cost and token fields exist in the schema but are only intermittently populated.
- Daily usage report script exists with Telegram delivery; the June 3 40s+ latency regression was visible in the data but nothing alerted on it.

### Why the reader sees a 5+ second blank pause (even before the gpt-5-nano regression)
Stacked ahead of the first visible token: Vercel cold start (0.5–3s on a low-traffic Hobby/Pro function in iad1) → intent+embed (~1.3s, calls to Anthropic + OpenAI from US East) → retrieve (~0.2s **plus** ~0.3s round trip iad1↔Sydney) → rerank (~0.3s) → model TTFT (~0.5–2s for Sonnet). That is **3–6 seconds of pre-token work in the best case** — and 45 seconds with a reasoning model that thinks before it speaks.

---

## 3. Recommendations

### Phase 0 — Stop the bleeding (1–2 days, mostly configuration)

**P0.1 — Revert the generation model now.** Remove `gpt-5-nano`. Set generation to `claude-haiku-4-5` (fastest, $1/$5 per MTok) as the latency-first candidate and `claude-sonnet-4-6` ($3/$15 per MTok — note: 4-6, the current Sonnet, not the 4-5 the docs still reference) as the quality-first candidate. Run both through the 50-query eval set; ship whichever holds ≥4.4/5 mean quality. At ~3,000 input / ~700 output tokens per query this is **$0.01–0.02 AUD per query** — cost is a rounding error at any plausible volume; latency and quality are the only criteria. Going forward, treat the model ID as a governed config value: changes require an eval run and a changelog entry. (The June 2 switch appears in no doc in this repo.)

**P0.2 — Move the Vercel function region to Sydney** (`regions: ["syd1"]`). The DB, the readers, and the audience are all in `ap-southeast-2`; the API is in Virginia. This removes ~0.3s per DB round trip and ~0.2–0.3s of reader↔API RTT — worth ~0.5–1s of TTFT on its own. One line of `vercel.json`, requires Vercel Pro.

**P0.3 — Cut the pre-generation pipeline down.**
- Drop or inline the separate intent-classification call. A fast model with a good system prompt can classify intent as part of generation; alternatively run it but never block on it (use it only for logging/routing). Saves ~1s of TTFT.
- Make the Cohere rerank conditional: skip it when RRF top-15 scores are well-separated, keep it for ambiguous queries. Saves ~0.3s on most queries.
- Verify the Anthropic system-prompt cache is actually hitting (check `cache_read_input_tokens` in responses; a timestamp or per-request value interpolated into the prompt silently kills it).

**P0.4 — Apply the pending DB migration and the perf indexes** (metadata fingerprint + event_date; 5 minutes in Supabase Studio, already written).

**P0.5 — Eliminate cold starts.** Add a 5-minute scheduled keep-alive ping to the API (GitHub Actions cron or Vercel cron hitting a `/health` route that also touches Supabase). At current traffic, nearly every real query is a cold start.

**P0.6 — Populate the telemetry you already designed and alert on it.** Write `ttft_ms`, `token_*`, `cost_approx_aud`, `gap_*` on every request (the columns exist). Add a threshold alert to the daily report path: median TTFT > 3s or any query > 15s pings Telegram immediately, not in tomorrow's report. The June 3 regression sat unnoticed for a week.

**Expected outcome of Phase 0:** TTFT ~1–2s, full answer 3–6s, with no architecture change and no quality loss (gated by the eval set).

### Phase 1 — World-class responsiveness and trust (2–6 weeks)

**P1.1 — Semantic answer cache.** The query log already shows repeats ("best free things to do", "dog-friendly beaches", "best cafes in Mornington"). Cache final answers keyed by embedding similarity (≥0.95 cosine against recent answers, TTL 24h, invalidated by the nightly corpus refresh). Cache hits return a complete, streaming-replayed answer in **<500ms** and cost nothing. For a destination-guide domain, a large fraction of traffic is cacheable.

**P1.2 — Multi-turn conversation.** Send the last N turns (already in `sessionStorage`) with each request and include them in the prompt after the cached system prefix. "What about somewhere cheaper?" currently fails silently — this is the single biggest *capability* gap for a concierge. Pairs with Anthropic prompt caching: cache breakpoint after system prompt, history appended after it, so repeated turns in a session get ~90% input-token discount and faster prefill.

**P1.3 — Speculative pre-work on the client.** On drawer open, fire the keep-alive ping (warms function + DB connection). On first keystroke pause, optionally pre-embed the draft query. Cheap, shaves the perceived wait further.

**P1.4 — Citations + full tile coverage.** Surface "from our notes on …" source links (chunk → page slug mapping already exists) and extend the enricher so places, itineraries, events and experiences render as tiles, not plain text. Both are trust/UX multipliers already specced in the May roadmap.

**P1.5 — Eval harness in CI + durable rate limiting.** Freeze the 50-query set, score on every prompt/model/chunker change, block deploys on regression. Replace in-memory rate limiting with Upstash Redis (survives cold starts). Both are prerequisites for iterating fast without breaking quality.

**P1.6 — (Optional, bigger) Co-locate compute with data.** If after P0.2 the Vercel hop is still the long pole, move the concierge API into a Supabase Edge Function or Cloudflare Worker in Sydney. This is a meaningful port (streaming, secrets, Cohere/OpenAI/Anthropic clients) — only do it with telemetry justifying it. The static-site constraint is unaffected either way.

### Phase 2 — The Insider as the centre of the product (1–3 months, sequenced by usage data)

1. **Saved places / trip board** — "save this" on every recommendation tile, persisted via the existing Supabase auth project. First real retention hook.
2. **Personalisation** — 2–3 opt-in toggles (dog owner, kids, accessibility) plus light inference from session history, injected as a short profile block in the prompt.
3. **Trip-planner mode** — structured multi-day itinerary output (the `itinerary` meta event already exists in the SSE protocol; the corpus has itinerary chunks).
4. **Time-awareness** — inject "today is Saturday, it's June (winter)" plus the events index so "what's on this weekend" works; the `event_date` column lands with P0.4.
5. **Gap detection → editorial pipeline** — `gap_detected` queries become a ranked content backlog; the concierge starts commissioning the content it's missing. This is the flywheel that makes the tool central to the whole operation.
6. **Embeddable partner widget** — a scoped Insider for venue partners' own sites; same API, per-partner key and corpus filter. New surface, potential revenue line.

### Discovery (parallel, non-engineering)
Real usage is currently ~0.3 queries/day — almost all historical traffic is testing. Before investing in Phase 2, make the tool findable: persistent entry point in the mobile nav, "Ask The Insider about this" prompts on venue/town pages (pre-filled queries), and a homepage placement test. The latency fix and the discovery push should land together — the current experience would squander any traffic sent to it.

---

## 4. Suggested sequencing

| When | Items | Outcome |
|---|---|---|
| This week | P0.1–P0.6 | Pause drops from 5–45s to 1–2s; regressions alert within minutes |
| Weeks 2–4 | P1.1, P1.2, P1.5 | Repeat questions instant; follow-ups work; changes are regression-gated |
| Weeks 4–8 | P1.3, P1.4, discovery push | Trust signals + traffic to a now-fast tool |
| Months 2–3+ | Phase 2, ordered by what usage data shows | Insider becomes the product's centre of gravity |

---

## 5. Notes and caveats

- The API code lives in the separate `peninsula-insider-platform` repo (Vercel), which is outside this session's repo scope — P0 items touching it (model env, region, pipeline changes) need to be applied there.
- All latency numbers above come from live `concierge_queries` telemetry and the May 2026 perf-pass doc (`docs/insider-concierge-perf-pass-2026-05-02.md`); per-model medians were computed from the production table on 2026-06-10.
- Nothing in this plan conflicts with the standing constraints: the site stays static Astro, no SSR, Beehiiv stays the newsletter stack.
