# Insider eval — after-perf-pass-4 · 2026-05-02

API: https://peninsula-insider-platform-api.vercel.app

## Summary
- Queries: 30 · errors: 0
- Median latency: **17.88s** · p95: 22.53s
- Median server latency: 17.83s
- Median quality: **5/5** (mean 4.63)
- Quality distribution: 4:11, 5:19
- Total cost: $0.7257 AUD

## Diff vs baseline (`baseline-2026-05-02.json`)
- Median latency: 17.09s → 17.88s (+791ms)
- Mean quality: 4.77 → 4.63 (-0.13)
- Total cost: $0.7187 → $0.7257 AUD

## Per-query results
| ID | Query | Latency | Quality | Recs | Issues |
|---|---|---:|:---:|:---:|---|
| long-lunch-red-hill | Best long lunch on the Red Hill ridge for a Saturday | 22.53s | 4/5 | 4 | no expected topic matched (looked for: montalto, ten minutes by tractor, polperro) |
| cellar-door-walk-in | Walk-in cellar door tasting on the Peninsula, no booking | 24.43s | 4/5 | 3 | no expected topic matched (looked for: montalto piazza, foxeys, rare hare) |
| rainy-day-kids-rye | Rainy Sunday with two kids, near Rye | 19.32s | 5/5 | 2 | — |
| sorrento-weekend-couple | Plan a Sorrento weekend for a couple | 17.23s | 5/5 | 2 | — |
| anniversary-dinner-view | Anniversary dinner Friday night, somewhere with a view | 16.45s | 5/5 | 3 | — |
| dog-friendly-cafe | Dog friendly cafe on the Peninsula | 16.33s | 4/5 | 3 | no expected topic matched (looked for: commonfolk, afloat, many little) |
| best-walk-cape-schanck | Best coastal walks near Cape Schanck | 16.47s | 5/5 | 1 | — |
| hatted-restaurants | Hatted restaurants worth booking in advance | 17.80s | 5/5 | 3 | — |
| where-to-stay-red-hill | Where should we stay near Red Hill cellar doors | 20.02s | 5/5 | 4 | — |
| one-night-near-sorrento | One night away, couple, near Sorrento | 18.95s | 5/5 | 3 | — |
| winery-with-kids | Cellar door open Sunday with kids | 18.42s | 4/5 | 3 | no expected topic matched (looked for: montalto, willow creek, red hill estate) |
| winery-tour-day-trip | Winery tour day trip from Melbourne | 20.66s | 4/5 | 3 | no expected topic matched (looked for: montalto, ten minutes, polperro) |
| best-seafood | Where do locals go for seafood on the Peninsula | 14.34s | 5/5 | 2 | — |
| best-bakery | Best bakery for breakfast on the Peninsula | 15.59s | 5/5 | 3 | — |
| thermal-springs-quiet | Thermal springs without the crowds | 18.58s | 5/5 | 2 | — |
| long-weekend-three-days | Three day Peninsula trip, April long weekend, food and wine | 20.37s | 4/5 | 4 | no expected kind matched (got: venue) |
| rye-front-beach | What is there to do at Rye front beach | 14.75s | 5/5 | 2 | — |
| winter-weekend-fireplace | Winter weekend with a fireplace and a wine list | 18.44s | 5/5 | 4 | — |
| where-to-eat-sorrento | Where to eat in Sorrento on a Saturday night | 15.76s | 5/5 | 2 | — |
| flinders-day | How to spend a day in Flinders | 17.07s | 5/5 | 2 | — |
| no-driving-after-lunch | Long lunch without too much driving back | 19.14s | 4/5 | 4 | no expected topic matched (looked for: foxeys, many little, polperro) |
| afternoon-pinot-tasting | Afternoon pinot tasting with serious producers | 18.14s | 5/5 | 4 | — |
| bushrangers-bay | How long is the Bushrangers Bay walk | 15.44s | 5/5 | 3 | — |
| wedding-venue-winery | Winery wedding venues on the Peninsula | 17.80s | 4/5 | 3 | no expected topic matched (looked for: polperro, lindenderry, montalto) |
| art-gallery | Best art gallery on the Peninsula | 13.99s | 4/5 | 0 | no expected kind matched (got: none) |
| weekend-this-weekend | What is on this weekend on the Peninsula | 18.48s | 5/5 | 3 | — |
| kids-thing-to-do | Something to do with two kids in school holidays | 19.02s | 4/5 | 3 | no expected topic matched (looked for: moonlit sanctuary, chocolaterie, ashcombe maze) |
| cellar-door-views | Cellar door with the best view | 15.90s | 4/5 | 3 | no expected topic matched (looked for: pt leo, port phillip estate, montalto) |
| balnarring-village | Is Balnarring worth a visit | 14.54s | 5/5 | 2 | — |
| negative-overrated | Is Peninsula Hot Springs overrated | 17.95s | 5/5 | 3 | — |

## Median per-step timings (ms)
- intent_and_embed_ms: 1.39s
- retrieve_ms: 197ms
- rerank_ms: 287ms
- generate_ms: 15.43s
- enrich_ms: 188ms
