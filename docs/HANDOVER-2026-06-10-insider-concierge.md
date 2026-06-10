# Handover — The Insider Concierge Performance Project

Date: 2026-06-10
Session: PI tool performance review + Phase 0 implementation
Branch / PR: `claude/pi-tool-performance-review-f3dsmn` → [PR #236](https://github.com/richmondjw/peninsula-insider/pull/236) (draft, mergeable-clean, no review comments yet)
Primary reference: `docs/insider-tech-stack-review-2026-06-10.md` (the full review + phased roadmap)

---

## 1. Why this project exists

James reported The Insider chat taking 5+ seconds (often much more) before an answer starts appearing. Investigation against live production telemetry (`concierge_queries` table, Supabase concierge project `mvdtkgsfuhmkioygxgge`) found:

- **The generation model drifted to `gpt-5-nano`** (a reasoning model) sometime before June 2. The two most recent real queries: **34s and 46s total latency, 45s time-to-first-token** (~6,200 output tokens, mostly hidden reasoning, before visible text).
- Prior baseline on Claude Sonnet was 12–17s median — still far too slow, caused by: Vercel API in US East (`iad1`) vs everything else in Sydney, cold starts on nearly every query at current traffic (~0.3 queries/day), and a blocking intent-classification + rerank pipeline ahead of generation.
- The model has been changed at least 5 times (gpt-4o-mini → sonnet-4-6 → gpt-4o → sonnet-4-5 → gpt-5-nano) with no eval gate and no changelog entry.

Per-model medians from production (all-time): sonnet-4-6 12.0s (n=13), sonnet-4-5 17.0s (n=6), gpt-5-nano 40.2s (n=2).

## 2. What is DONE (on the PR branch, awaiting review/merge)

| Item | Where | Status |
|---|---|---|
| Tech-stack review + Phase 0/1/2 roadmap | `docs/insider-tech-stack-review-2026-06-10.md` | ✅ committed |
| **DB migrations applied to LIVE concierge Supabase** — `metadata_fingerprint` + `event_date` columns, HNSW embedding index (old IVFFlat dropped), filter/chunk-purpose/extracted-at btrees, `ANALYZE` | applied via MCP as migration `concierge_chunks_fingerprint_event_date_and_perf_indexes`; repo SQL files annotated | ✅ live + verified |
| Keep-alive workflow (warms Vercel fn every 10 min, Melbourne waking hours) | `.github/workflows/insider-keepalive.yml` | ✅ committed — **runs only after merge** (schedule triggers run from default branch) |
| Hourly latency alert → Telegram (any query >15s, median >10s, median TTFT >3s) | `.github/workflows/insider-latency-alert.yml` + `ops/scripts/insider-latency-alert.mjs` | ✅ committed — same merge caveat; supports `workflow_dispatch --dry` |
| Client-side API warm-up on drawer open + `/ask` page load | `next/src/components/ConciergeDrawer.astro`, `next/src/pages/ask.astro` | ✅ committed; full Astro build verified twice (1,485 pages) |
| CHANGELOG entry; merge conflict with main's design entries resolved (kept both) | `CHANGELOG.md` | ✅ |

Note: CHANGELOG.md had mixed CRLF/LF endings that got normalised on the branch — the PR diff for that file looks much larger than the real change.

## 3. What is NOT done — the critical path (needs Vercel / platform repo)

**This session could not reach Vercel**: the Vercel MCP connector was added mid-session and never attached (connectors bind at session start), and the sandbox network policy blocks `api.vercel.com`. A **new session with the Vercel connector** (or with the `peninsula-insider-platform` repo mounted) must do:

1. **P0.1 — CRITICAL: revert the generation model off `gpt-5-nano`** in the `peninsula-insider-platform` Vercel project (env var sets the concierge generation model). Candidates: `claude-sonnet-4-6` (quality-first, matches prior 12s baseline) or `claude-haiku-4-5` (latency-first, needs eval ≥4.4/5 on the 50-query set — `ops/scripts/insider-eval-runner.mjs`). After P0.2/P0.3 either should land TTFT well under 3s.
2. **P0.2 — pin the function region to `syd1`** (`vercel.json` `regions` or project settings; requires Vercel Pro). DB/readers are in Sydney; the function is in Virginia today.
3. **P0.3 — pipeline trims**: stop blocking on the intent-classification call, make Cohere rerank conditional, verify Anthropic prompt-cache hits (`cache_read_input_tokens` > 0; a timestamp interpolated into the system prompt silently kills it).
4. Add a **native Vercel Cron keep-alive** (free) and then delete `.github/workflows/insider-keepalive.yml` from this repo.
5. Verify end-to-end: ask a real question on the live site; expect first words in 1–2s.

Suggested kickoff prompt for that session:

> Using the Vercel connector, open the `peninsula-insider-platform` project: (1) find the env var setting the concierge generation model (currently `gpt-5-nano`) and revert it to `claude-sonnet-4-6`; (2) pin the function region to `syd1`; (3) redeploy and confirm via a live query that time-to-first-token < 3s. Then apply P0.3 from `docs/insider-tech-stack-review-2026-06-10.md` in richmondjw/peninsula-insider PR #236.

## 4. After merge of PR #236 — verification checklist

- [ ] `insider-latency-alert` runs at :12 past each hour (Actions tab); do a `workflow_dispatch` with `dry=true` first to exercise secrets.
- [ ] `insider-keepalive` runs every 10 min between 06:00–24:00 Melbourne.
- [ ] Site deploy picks up the drawer//ask warm-up (check built HTML for `pi-drawer-warmed-at`).
- [ ] Watch `reports/insider-usage/` dailies for the TTFT trend once the model is reverted.

## 5. Phase 1 / Phase 2 backlog (sequenced in the review doc)

Phase 1: semantic answer cache (<500ms repeats), multi-turn conversation (backend is stateless per turn today — biggest capability gap), citations, recommendation tiles for all entity types, eval harness in CI, Upstash rate limiting. Phase 2: saved trips, personalisation, trip-planner mode, time/events awareness, gap-detection → editorial flywheel, partner widget. Parallel non-engineering: discovery push (~0.3 real queries/day today).

## 6. Operational notes

- Supabase projects: concierge/vector = `mvdtkgsfuhmkioygxgge`, auth/CMS = `tjjhpvslpysfklwpqmgz` (both `ap-southeast-2`).
- The applied-migration deviations are documented in headers of `ops/migrations/2026-05-03-concierge-chunks-perf-indexes.sql`.
- Standing constraints (HANDOVER-CLAUDE.md): site stays static Astro (no SSR/Vercel for the site itself), Beehiiv for newsletter, log structural changes in CHANGELOG.md.
- Actions secrets already configured: `SUPABASE_SERVICE_KEY`, `TELEGRAM_BOT_TOKEN`; vars: `SUPABASE_URL`, `TELEGRAM_CHAT_ID`, `TELEGRAM_TOPIC_ID`.
