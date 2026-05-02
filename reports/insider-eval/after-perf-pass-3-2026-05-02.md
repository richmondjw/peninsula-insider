# Insider eval — after-perf-pass-3 · 2026-05-02

API: https://peninsula-insider-platform-api.vercel.app

## Summary
- Queries: 30 · errors: 0
- Median latency: **16.66s** · p95: 19.92s
- Median server latency: 16.42s
- Median quality: **5/5** (mean 4.60)
- Quality distribution: 4:12, 5:18
- Total cost: $0.6697 AUD

## Diff vs baseline (`baseline-2026-05-02.json`)
- Median latency: 17.09s → 16.66s (424ms)
- Mean quality: 4.77 → 4.60 (-0.17)
- Total cost: $0.7187 → $0.6697 AUD

## Per-query results
| ID | Query | Latency | Quality | Recs | Issues |
|---|---|---:|:---:|:---:|---|
| long-lunch-red-hill | Best long lunch on the Red Hill ridge for a Saturday | 17.79s | 4/5 | 4 | no expected topic matched (looked for: montalto, ten minutes by tractor, polperro) |
| cellar-door-walk-in | Walk-in cellar door tasting on the Peninsula, no booking | 18.61s | 4/5 | 2 | no expected topic matched (looked for: montalto piazza, foxeys, rare hare) |
| rainy-day-kids-rye | Rainy Sunday with two kids, near Rye | 17.27s | 5/5 | 1 | — |
| sorrento-weekend-couple | Plan a Sorrento weekend for a couple | 14.72s | 5/5 | 1 | — |
| anniversary-dinner-view | Anniversary dinner Friday night, somewhere with a view | 14.93s | 5/5 | 2 | — |
| dog-friendly-cafe | Dog friendly cafe on the Peninsula | 15.73s | 4/5 | 3 | no expected topic matched (looked for: commonfolk, afloat, many little) |
| best-walk-cape-schanck | Best coastal walks near Cape Schanck | 15.55s | 4/5 | 1 | no expected topic matched (looked for: bushrangers bay, cape schanck boardwalk, two bays) |
| hatted-restaurants | Hatted restaurants worth booking in advance | 12.51s | 5/5 | 2 | — |
| where-to-stay-red-hill | Where should we stay near Red Hill cellar doors | 19.58s | 5/5 | 4 | — |
| one-night-near-sorrento | One night away, couple, near Sorrento | 17.88s | 5/5 | 3 | — |
| winery-with-kids | Cellar door open Sunday with kids | 16.88s | 4/5 | 3 | no expected topic matched (looked for: montalto, willow creek, red hill estate) |
| winery-tour-day-trip | Winery tour day trip from Melbourne | 20.16s | 4/5 | 3 | no expected topic matched (looked for: montalto, ten minutes, polperro) |
| best-seafood | Where do locals go for seafood on the Peninsula | 15.35s | 5/5 | 2 | — |
| best-bakery | Best bakery for breakfast on the Peninsula | 13.57s | 5/5 | 3 | — |
| thermal-springs-quiet | Thermal springs without the crowds | 16.43s | 5/5 | 2 | — |
| long-weekend-three-days | Three day Peninsula trip, April long weekend, food and wine | 18.26s | 4/5 | 4 | no expected kind matched (got: venue) |
| rye-front-beach | What is there to do at Rye front beach | 16.01s | 5/5 | 2 | — |
| winter-weekend-fireplace | Winter weekend with a fireplace and a wine list | 18.03s | 5/5 | 4 | — |
| where-to-eat-sorrento | Where to eat in Sorrento on a Saturday night | 16.50s | 5/5 | 2 | — |
| flinders-day | How to spend a day in Flinders | 12.70s | 5/5 | 2 | — |
| no-driving-after-lunch | Long lunch without too much driving back | 17.76s | 4/5 | 4 | no expected topic matched (looked for: foxeys, many little, polperro) |
| afternoon-pinot-tasting | Afternoon pinot tasting with serious producers | 19.92s | 5/5 | 3 | — |
| bushrangers-bay | How long is the Bushrangers Bay walk | 16.83s | 4/5 | 3 | no expected kind matched (got: article) |
| wedding-venue-winery | Winery wedding venues on the Peninsula | 19.84s | 5/5 | 3 | — |
| art-gallery | Best art gallery on the Peninsula | 12.14s | 4/5 | 0 | no expected kind matched (got: none) |
| weekend-this-weekend | What is on this weekend on the Peninsula | 17.45s | 5/5 | 3 | — |
| kids-thing-to-do | Something to do with two kids in school holidays | 15.18s | 4/5 | 2 | no expected topic matched (looked for: moonlit sanctuary, chocolaterie, ashcombe maze) |
| cellar-door-views | Cellar door with the best view | 15.15s | 4/5 | 3 | no expected topic matched (looked for: pt leo, port phillip estate, montalto) |
| balnarring-village | Is Balnarring worth a visit | 14.63s | 5/5 | 2 | — |
| negative-overrated | Is Peninsula Hot Springs overrated | 18.07s | 5/5 | 3 | — |

## Median per-step timings (ms)
- intent_and_embed_ms: 1.36s
- retrieve_ms: 193ms
- rerank_ms: 288ms
- generate_ms: 13.83s
- enrich_ms: 189ms
