# Insider eval — after-perf-pass-2 · 2026-05-02

API: https://peninsula-insider-platform-api.vercel.app

## Summary
- Queries: 30 · errors: 0
- Median latency: **14.38s** · p95: 18.71s
- Median server latency: 15.34s
- Median quality: **4/5** (mean 4.13)
- Quality distribution: 3:8, 4:10, 5:12
- Total cost: $0.4334 AUD

## Diff vs baseline (`baseline-2026-05-02.json`)
- Median latency: 17.09s → 14.38s (2.71s)
- Mean quality: 4.77 → 4.13 (-0.63)
- Total cost: $0.7187 → $0.4334 AUD

## Per-query results
| ID | Query | Latency | Quality | Recs | Issues |
|---|---|---:|:---:|:---:|---|
| long-lunch-red-hill | Best long lunch on the Red Hill ridge for a Saturday | 15.80s | 4/5 | 2 | no expected topic matched (looked for: montalto, ten minutes by tractor, polperro) |
| cellar-door-walk-in | Walk-in cellar door tasting on the Peninsula, no booking | 2.13s | 3/5 | 0 | no expected topic matched (looked for: montalto piazza, foxeys, rare hare); no expected kind matched (got: none) |
| rainy-day-kids-rye | Rainy Sunday with two kids, near Rye | 1.96s | 3/5 | 0 | no expected topic matched (looked for: alba, peninsula hot springs, rye hotel); no expected kind matched (got: none) |
| sorrento-weekend-couple | Plan a Sorrento weekend for a couple | 16.93s | 5/5 | 2 | — |
| anniversary-dinner-view | Anniversary dinner Friday night, somewhere with a view | 17.58s | 4/5 | 3 | no expected topic matched (looked for: pt leo, polperro, port phillip estate) |
| dog-friendly-cafe | Dog friendly cafe on the Peninsula | 1.45s | 3/5 | 0 | no expected topic matched (looked for: commonfolk, afloat, many little); no expected kind matched (got: none) |
| best-walk-cape-schanck | Best coastal walks near Cape Schanck | 14.32s | 5/5 | 1 | — |
| hatted-restaurants | Hatted restaurants worth booking in advance | 12.83s | 5/5 | 1 | — |
| where-to-stay-red-hill | Where should we stay near Red Hill cellar doors | 1.44s | 3/5 | 0 | no expected topic matched (looked for: jackalope, polperro, lindenderry); no expected kind matched (got: none) |
| one-night-near-sorrento | One night away, couple, near Sorrento | 1.62s | 3/5 | 0 | no expected topic matched (looked for: hotel sorrento, continental, lon retreat); no expected kind matched (got: none) |
| winery-with-kids | Cellar door open Sunday with kids | 10.66s | 4/5 | 1 | no expected topic matched (looked for: montalto, willow creek, red hill estate) |
| winery-tour-day-trip | Winery tour day trip from Melbourne | 1.44s | 3/5 | 0 | no expected topic matched (looked for: montalto, ten minutes, polperro); no expected kind matched (got: none) |
| best-seafood | Where do locals go for seafood on the Peninsula | 17.60s | 4/5 | 2 | no expected topic matched (looked for: pier street, fish bar, morning star) |
| best-bakery | Best bakery for breakfast on the Peninsula | 1.46s | 3/5 | 0 | no expected topic matched (looked for: sorrento bakery, balnarring bakehouse, salt and rye); no expected kind matched (got: none) |
| thermal-springs-quiet | Thermal springs without the crowds | 11.28s | 5/5 | 1 | — |
| long-weekend-three-days | Three day Peninsula trip, April long weekend, food and wine | 1.51s | 3/5 | 0 | no expected topic matched (looked for: red hill, montalto, long lunch); no expected kind matched (got: none) |
| rye-front-beach | What is there to do at Rye front beach | 14.24s | 5/5 | 1 | — |
| winter-weekend-fireplace | Winter weekend with a fireplace and a wine list | 14.07s | 4/5 | 1 | no expected topic matched (looked for: jackalope, polperro, lindenderry) |
| where-to-eat-sorrento | Where to eat in Sorrento on a Saturday night | 14.71s | 5/5 | 2 | — |
| flinders-day | How to spend a day in Flinders | 12.55s | 5/5 | 2 | — |
| no-driving-after-lunch | Long lunch without too much driving back | 18.71s | 4/5 | 4 | no expected topic matched (looked for: foxeys, many little, polperro) |
| afternoon-pinot-tasting | Afternoon pinot tasting with serious producers | 16.75s | 5/5 | 4 | — |
| bushrangers-bay | How long is the Bushrangers Bay walk | 16.36s | 4/5 | 3 | no expected kind matched (got: article) |
| wedding-venue-winery | Winery wedding venues on the Peninsula | 15.82s | 4/5 | 2 | no expected topic matched (looked for: polperro, lindenderry, montalto) |
| art-gallery | Best art gallery on the Peninsula | 17.73s | 5/5 | 1 | — |
| weekend-this-weekend | What is on this weekend on the Peninsula | 17.84s | 5/5 | 3 | — |
| kids-thing-to-do | Something to do with two kids in school holidays | 14.95s | 4/5 | 2 | no expected topic matched (looked for: moonlit sanctuary, chocolaterie, ashcombe maze) |
| cellar-door-views | Cellar door with the best view | 15.86s | 4/5 | 3 | no expected topic matched (looked for: pt leo, port phillip estate, montalto) |
| balnarring-village | Is Balnarring worth a visit | 22.21s | 5/5 | 2 | — |
| negative-overrated | Is Peninsula Hot Springs overrated | 14.43s | 5/5 | 2 | — |

## Median per-step timings (ms)
- embed_ms: 90ms
- retrieve_and_classify_ms: 1.36s
- rerank_ms: 283ms
- generate_ms: 12.61s
- enrich_ms: 187ms
- intent_and_embed_ms: 1.38s
- retrieve_ms: 193ms
