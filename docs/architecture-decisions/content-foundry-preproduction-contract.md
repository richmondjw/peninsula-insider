# Content Foundry pre-production contract

Date: 2026-08-21

Status: implemented locally for review

Issue: #328

## Decision

Add three deterministic, fixture-only recipe families on the existing `pi.foundry-run.v2` and `pi.artifact-pack.v1` contracts:

- `explainer_preproduction_v1` for the explainer core, FAQ, carousel, voiceover and visualisation brief;
- `podcast_preproduction_v1` for the evidence dossier, angle, run sheet, interview guide, host script, provisional show notes and provisional chapters;
- `short_video_preproduction_v1` for hooks, separate 30-second and 60-second scripts, shot list, scene manifest, overlays, subtitles, thumbnail copy and platform captions.

Each pre-production artifact has a discriminated payload kind, immutable payload hash, exact claim-set and angle dependencies, and exact upstream artifact versions. Every user-visible factual or fact-implying question, label, title, prompt, section, scene, overlay, caption and spoken segment has a locator, content hash and one or more claim IDs. Derivatives cannot become independent truth sources.

## Production boundary

All fixture payloads remain at `text_preproduction`. Unassigned media is a valid nonblocking state for reviewing text. It never implies readiness to record or render.

Media readiness passes only when every required placement has a unique assignment binding the exact asset version and hash, placement path, surface, rights record and releases to a matching server-held cleared-rights dependency. Unassigned shots, missing placements, unrelated rights records and changed assets fail closed. Recognisable people also require assignment-bound release identifiers. Human voice clearance requires an assignment-bound release identifier. Illustrative generation requires a separately recorded approval identifier and persistent disclosure.

Simulated contributor dialogue, cloned voice, synthetic voice and generated documentary treatment are blocking policy failures. This V1 exposes no provider, model, recording, rendering, scheduling, sending or publishing endpoint.

## Timing and review

Voiceover, podcast and video durations use integer milliseconds. Run sheets and scenes are ordered and contiguous. Overlays, subtitles and chapters are ordered, non-overlapping and bounded by the declared duration. A timing mismatch is a blocking gate.

Reviews remain independent per artifact and grant `draft_handoff_only` authority. Read and export paths reconcile claim-set, angle, rights and transitive artifact dependencies. Editing an upstream artifact stales every dependent review while leaving unrelated branches current.

## Compatibility

The quick-note and Article plus Ask recipes, legacy restart migration, local file adapter and reviewed Astro patch flow remain unchanged. Pre-production packs cannot produce a patch because they have no publication adapter.
