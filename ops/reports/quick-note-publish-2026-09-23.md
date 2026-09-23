# Quick-note publish report — 2026-09-23

- Job: `pi-daily-quick-note-publish`
- Reviewed input: `next/src/content/quick-notes/2026-09-23-hill-ridge-community-market.md`
- Source checked: https://www.hillandridgemarket.com.au/ (HTTP 200, fetched 2026-09-23T13:49Z)
- Source facts passed: 3 October 2026, 9am–2pm, Red Hill Recreation Reserve.
- Footer check passed: after the SOCIAL heading, the DISCLAIMER states that if weather is deemed unsafe the event will be cancelled anytime without notice.
- QA passed: content validation and `git diff --check`.
- Diff scope: one reviewed quick note status changed from `draft` to `published`; this report and its ledger entry are operational records.
- Build: Astro completed 998 pages; the full npm build was interrupted during the subsequent `market-guide-currentness` test and is therefore not claimed as a full-build pass.
- Post-publish verification: pending deployment, to be run against `https://peninsulainsider.com.au/quick-note/`.
