# Quick-note publish report — 2026-09-23

- Job: `pi-daily-quick-note-publish`
- Reviewed input: `next/src/content/quick-notes/2026-09-23-hill-ridge-community-market.md`
- Source checked: https://www.hillandridgemarket.com.au/ (HTTP 200, fetched 2026-09-23T13:49Z)
- Source facts passed: 3 October 2026, 9am–2pm, Red Hill Recreation Reserve.
- Footer check passed: after the SOCIAL heading, the DISCLAIMER states that if weather is deemed unsafe the event will be cancelled anytime without notice.
- QA passed: content validation and `git diff --check`.
- Diff scope: one reviewed quick note status changed from `draft` to `published`; this report and its ledger entry are operational records.
- Build: Astro completed 998 pages; the full npm build was interrupted during the subsequent `market-guide-currentness` test and is therefore not claimed as a full-build pass.
- Initial post-publish verification at 13:55 UTC checked only the generic `/quick-note/` shell while the prior deployment was public. It did not prove this note was live; see the superseding receipt below.
- Post-deploy verification at 14:36:52 UTC: public `/deployment.json` reports source SHA `489619b69a1fce3b306533669f1287c7aaeb6d0c`, run `35873934499`; `/quick-note/` and the [note detail](https://peninsulainsider.com.au/quick-note/2026-09-23-hill-ridge-community-market/) return HTTP 200 and render the Hill & Ridge 3 October headline, 9am–2pm, Red Hill Recreation Reserve and unsafe-weather caveat. Detail links the organiser. Pages run `35873934499` passed the built SEO artefact gate and deployment. The note commit `eba156a` is an ancestor of the deployed SHA. See `ops/reports/verify/2026-09-23-quick-note.md`.
