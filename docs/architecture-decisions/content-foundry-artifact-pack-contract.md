# Content Foundry artifact-pack contract

Date: 2026-08-21

Status: implemented locally for review

Issue: #326

## Decision

The Foundry run contract is versioned as `pi.foundry-run.v2`. A run now locks one `RecipeDefinition`, immutable `ClaimSetVersion`, selected angle version and `ArtifactPack`.

An artifact pack records completed, failed and omitted derivatives independently. A required derivative failure blocks the run. An optional derivative failure makes the pack partial but does not invalidate completed artifacts.

Each completed artifact is a discriminated `ArtifactVersion`. It records a payload hash, claim usage by factual segment, claim-set and angle dependencies, direct artifact dependencies, any media-rights snapshot and typed gate results.

Reviews are per artifact and grant `draft_handoff_only` authority. Freshness is derived again on every read and export from the current claim-set, angle, transitive artifact and exact media-rights snapshots. Editing an artifact stales its own current review and all transitive dependent reviews, while unrelated derivatives remain current. Run-level `accepted` remains only as a compatibility projection for the single quick-note artifact and never means publication approval.

Non-quick artifact edits replace the payload, factual segment list and claim-usage map atomically. Each locator must resolve against the edited payload and its stored segment hash must match. Article paragraphs use explicit `$.body::paragraph[n]` locators, so appended, removed or changed paragraphs cannot inherit obsolete lineage.

## Article and Ask mapping

The deterministic `url_article_v1` recipe creates:

- an article body draft;
- article metadata;
- an Ask response using `answer`, `recommendations`, `follow_on` and `provenance_footer`;
- optional internal-link and SEO metadata proposals.

Article metadata mirrors the current Astro article fields, including optional cluster links. Because Astro requires a hero image, a text-only pack remains reviewable with `astroPatchReady=false`. Readiness is server-derived: changing a hero invalidates the previous media-rights snapshot and a client cannot assert clearance. Patch export becomes available only when the exact hero placement matches a separately rights-cleared snapshot and both the body and metadata have current accepted draft-handoff reviews.

Ask recommendations cannot carry `price_band`. The public payload gates reject dollar pricing, price language and em dashes. Unsupported, expired, unevidenced and restricted claims cannot pass the supported-claims gate.

## Compatibility

The v0.1 quick-note fields remain as API projections. The file adapter recognises persisted v0.1 run snapshots and deterministically migrates them in memory to the v2 pack contract on every restart. No network, provider, Git apply, CMS, publication or distribution authority is introduced.
