# Set 6 public release receipt

**Project:** Peninsula Insider\
**Owner:** Peninsula Insider site and editorial team\
**Release reviewed:** 1 October 2026\
**Decision:** Adopt the corrected Stay pages. Investigate the embedding credential failure. Continue the independent visitor and booking checks before claiming a 99/100 outcome.

## Public release

The exact source commit is 79bf4b25ef153e02421c6529dd727dad4a9c8bc2. The [Build and Deploy action](https://github.com/richmondjw/peninsula-insider/actions/runs/36781848388), [Content Gate](https://github.com/richmondjw/peninsula-insider/actions/runs/36781848326) and [Live Agent Readiness](https://github.com/richmondjw/peninsula-insider/actions/runs/36783185045) completed successfully. The public deployment manifest at https://peninsulainsider.com.au/deployment.json returned that same source SHA and deployment run ID 36781848388 on 1 October.

Fresh public requests returned HTTP 200 for /stay/glamping/, /stay/best-accommodation/, /stay/peninsula-hot-springs-eco-lodges/, /stay/yurt-hideaway/ and /stay/. Both checked Visit Victoria image URLs returned HTTP 200 and image/webp. The preserved Yurt detail returned noindex and Pagefind ignore markup. The first three guide/detail pages remained indexable. These are publication and endpoint receipts, not a real-user usability or booking completion test.

## Search data refresh

The [PI Data Refresh action](https://github.com/richmondjw/peninsula-insider/actions/runs/36783535770) completed content-registry Phase A and entity-index Phase B. Phase B reported 441 entity rows and 1,721 attribute rows upserted and two paused, unsourced venues removed. After refresh, a fresh public pi.search RPC query for “Yurt Hideaway” returned zero results, while “Eco Lodges” returned two relevant venue results including the Eco Lodges. The public static search page uses Pagefind, and the Yurt detail is excluded from that index.

The action as a whole is **failed**: Phase C needed 271 embedding updates but its first OpenAI request returned HTTP 401 invalid_api_key. Existing lexical results and the completed Phase B removal are observed; new vector embeddings are **not verified**. The site credential owner must replace the invalid GitHub Actions secret and rerun the existing workflow. No secret value was recorded in this report.

## Quality and remaining limits

The independent Set 6 local 23-lens review scored best-accommodation 92.48, glamping 91.43, Eco Lodges 90.43 and the paused Yurt detail 90.26. These are provisional expert judgments, below the requested 99. They were not repeated as field visitor scores after release. The next check is public mobile comprehension, assistive technology and the exact operator booking journey by 8 October 2026. If the live release introduces a material factual or navigation regression, roll back the scoped release commit and reapply corrected content after review.
