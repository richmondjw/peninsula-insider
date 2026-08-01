# Peninsula Insider image intelligence pilot runbook

The pilot is registry-first and review-gated. It never edits `heroImage`, `cms_image_slots`, rights records, source images or reader-facing search. The migration creates only the separate `pi_image` schema and must be reviewed before it is applied.

## Dry run

```bash
cd next
npm run image-intelligence:pilot
npm run test:image-intelligence
```

Outputs are written to `.pi-image-intelligence/` (ignored runtime detail), `reports/image-intelligence/pilot-qa.json`, `reports/image-intelligence/review-checklist.md`, the admin review-queue JSON and the approved-only image search index. The baseline dry run makes zero vision-provider calls. It estimates the worst-case per-image cost against the hard AUD $30 cap and deduplicates by canonical asset before estimating calls.

## Controlled apply sequence

1. Review `ops/migrations/2026-08-01-pi-image-intelligence-pilot.sql` and take a schema backup.
2. Apply the migration in a non-production Supabase branch first; verify all eight tables, append-only decisions, immutable approved metadata and editor-only RLS. Add `pi_image` to the API's exposed schemas only if the authenticated review surface will be enabled.
3. Run `npm run image-intelligence:pilot -- --apply`. This writes registry artefacts only; it still performs no public metadata write-back.
4. Import registry rows with a service-role-only deployment job. Do not expose the service key to Astro/browser code.
5. Open `/admin/image-intelligence/`; accept/edit/reject proposals. Decisions append to `review_decisions`.
6. Only approved metadata may be exported into `image-intelligence-search-index.json`. Public CMS/content propagation requires a separate reviewed change.

To run a configured provider after approval, set `PI_IMAGE_VISION_ENDPOINT`, `PI_IMAGE_SITE_BASE_URL`, optional `PI_IMAGE_VISION_TOKEN` and `PI_IMAGE_MODEL_ID`, then use `npm run image-intelligence:pilot -- --apply --provider`. The worker remains sequential and resumable by canonical asset, stops before the estimated AUD $30 cap, validates every response, and records provider failures in the dead-letter list.

## Verification and rollback

- Verify active-placement resolution, structured-output validity, spend, queue size, low-match placements and `publicWrites: 0` in the QA report.
- Confirm existing image files, content frontmatter and `cms_image_slots` are unchanged.
- Roll back application code by reverting this commit. Before the schema carries relied-upon decisions, the migration footer contains the explicit `drop schema pi_image cascade` rollback. Once decisions exist, export them and use a forward migration instead.

## Provider contract

A provider adapter must return only the strict proposal contract tested in `pilot-core.test.mjs`: controlled taxonomy IDs, per-field confidence, `observed` versus `contextual` evidence, factual alt-text proposal, and flags. Invalid JSON, uncontrolled IDs, confidence below 0.60, named entity claims, people/children, OCR and rights/safety flags must be held or reviewed. Provider/model/prompt/input hash, cost and latency belong in `enrichment_runs`; the AUD $30 circuit breaker is mandatory.
