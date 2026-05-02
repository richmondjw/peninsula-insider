# Insider eval — after-perf-pass-1 · 2026-05-02

API: https://peninsula-insider-platform-api.vercel.app

## Summary
- Queries: 30 · errors: 0
- Median latency: **13.77s** · p95: 19.60s
- Median server latency: 14.91s
- Median quality: **4/5** (mean 4.10)
- Quality distribution: 3:9, 4:9, 5:12
- Total cost: $0.3828 AUD

## Diff vs baseline (`baseline-2026-05-02.json`)
- Median latency: 17.09s → 13.77s (3.32s)
- Mean quality: 4.77 → 4.10 (-0.67)
- Total cost: $0.7187 → $0.3828 AUD

## Per-query results
| ID | Query | Latency | Quality | Recs | Issues |
|---|---|---:|:---:|:---:|---|
| long-lunch-red-hill | Best long lunch on the Red Hill ridge for a Saturday | 19.59s | 4/5 | 4 | no expected topic matched (looked for: montalto, ten minutes by tractor, polperro) |
| cellar-door-walk-in | Walk-in cellar door tasting on the Peninsula, no booking | 17.58s | 4/5 | 2 | no expected topic matched (looked for: montalto piazza, foxeys, rare hare) |
| rainy-day-kids-rye | Rainy Sunday with two kids, near Rye | 16.61s | 5/5 | 2 | — |
| sorrento-weekend-couple | Plan a Sorrento weekend for a couple | 18.08s | 5/5 | 2 | — |
| anniversary-dinner-view | Anniversary dinner Friday night, somewhere with a view | 17.95s | 5/5 | 3 | — |
| dog-friendly-cafe | Dog friendly cafe on the Peninsula | 4.00s | 3/5 | 0 | no expected topic matched (looked for: commonfolk, afloat, many little); no expected kind matched (got: none) |
| best-walk-cape-schanck | Best coastal walks near Cape Schanck | 14.53s | 5/5 | 1 | — |
| hatted-restaurants | Hatted restaurants worth booking in advance | 9.84s | 5/5 | 1 | — |
| where-to-stay-red-hill | Where should we stay near Red Hill cellar doors | 1.49s | 3/5 | 0 | no expected topic matched (looked for: jackalope, polperro, lindenderry); no expected kind matched (got: none) |
| one-night-near-sorrento | One night away, couple, near Sorrento | 1.46s | 3/5 | 0 | no expected topic matched (looked for: hotel sorrento, continental, lon retreat); no expected kind matched (got: none) |
| winery-with-kids | Cellar door open Sunday with kids | 13.29s | 4/5 | 1 | no expected topic matched (looked for: montalto, willow creek, red hill estate) |
| winery-tour-day-trip | Winery tour day trip from Melbourne | 2.00s | 3/5 | 0 | no expected topic matched (looked for: montalto, ten minutes, polperro); no expected kind matched (got: none) |
| best-seafood | Where do locals go for seafood on the Peninsula | 21.88s | 4/5 | 3 | no expected topic matched (looked for: pier street, fish bar, morning star) |
| best-bakery | Best bakery for breakfast on the Peninsula | 1.47s | 3/5 | 0 | no expected topic matched (looked for: sorrento bakery, balnarring bakehouse, salt and rye); no expected kind matched (got: none) |
| thermal-springs-quiet | Thermal springs without the crowds | 12.26s | 5/5 | 1 | — |
| long-weekend-three-days | Three day Peninsula trip, April long weekend, food and wine | 1.46s | 3/5 | 0 | no expected topic matched (looked for: red hill, montalto, long lunch); no expected kind matched (got: none) |
| rye-front-beach | What is there to do at Rye front beach | 13.86s | 5/5 | 1 | — |
| winter-weekend-fireplace | Winter weekend with a fireplace and a wine list | 13.67s | 4/5 | 1 | no expected topic matched (looked for: jackalope, polperro, lindenderry) |
| where-to-eat-sorrento | Where to eat in Sorrento on a Saturday night | 1.48s | 3/5 | 0 | no expected topic matched (looked for: bistro elba, the baths, hotel sorrento); no expected kind matched (got: none) |
| flinders-day | How to spend a day in Flinders | 17.22s | 5/5 | 2 | — |
| no-driving-after-lunch | Long lunch without too much driving back | 14.43s | 5/5 | 1 | — |
| afternoon-pinot-tasting | Afternoon pinot tasting with serious producers | 12.87s | 4/5 | 1 | no expected topic matched (looked for: paringa, kooyong, ten minutes) |
| bushrangers-bay | How long is the Bushrangers Bay walk | 14.96s | 4/5 | 3 | no expected kind matched (got: article) |
| wedding-venue-winery | Winery wedding venues on the Peninsula | 16.29s | 5/5 | 2 | — |
| art-gallery | Best art gallery on the Peninsula | 1.46s | 3/5 | 0 | no expected topic matched (looked for: pt leo, sculpture, regional gallery); no expected kind matched (got: none) |
| weekend-this-weekend | What is on this weekend on the Peninsula | 19.60s | 5/5 | 3 | — |
| kids-thing-to-do | Something to do with two kids in school holidays | 15.06s | 4/5 | 2 | no expected topic matched (looked for: moonlit sanctuary, chocolaterie, ashcombe maze) |
| cellar-door-views | Cellar door with the best view | 12.69s | 4/5 | 3 | no expected topic matched (looked for: pt leo, port phillip estate, montalto) |
| balnarring-village | Is Balnarring worth a visit | 14.14s | 5/5 | 1 | — |
| negative-overrated | Is Peninsula Hot Springs overrated | 1.55s | 3/5 | 0 | no expected topic matched (looked for: peninsula hot springs, alba, crowd); no expected kind matched (got: none) |

## Median per-step timings (ms)
- embed_ms: 93ms
- retrieve_and_classify_ms: 1.35s
- rerank_ms: 304ms
- generate_ms: 12.37s
- enrich_ms: 186ms
