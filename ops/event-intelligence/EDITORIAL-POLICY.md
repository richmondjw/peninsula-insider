# Editorial review and publication policy

Version pi-editorial-1.0. This is an evaluation-only component. It changes no existing runner, verifier, approval, exporter, website or publishing gate. An automated evaluation is its own authority; it never signs as James or creates his personal approval. Standard calendar listing eligibility does not authorise homepage prominence, Journal features, recommendations or claims of editorial visits.

## Ten-point rubric
|Category|Points|
|---|---:|
|Registered current official provenance|2|
|Exact Mornington Peninsula Shire location|1.5|
|Dates, bounded recurrence and Melbourne timezone|2|
|Current status and supplied booking URL|1|
|Factual copy and content kind|1|
|Price integrity|1|
|Media rights and accessibility|0.5|
|Duplicates and canonical consistency|0.5|
|Publication quality|0.5|

A publish-eligible decision requires at least9 AND every critical check. Initial proof-only implementation is deliberately stricter: all categories are binary and critical, so eligible records currently achieve10. Nine is a minimum, never permission to overlook unsupported facts. Missing price/image can be omitted: this earns integrity points, without inventing free admission or image rights. Supplied unreviewed imagery holds until explicitly omitted or a future accepted rights adapter is added. Branded graphic/text fallback remains the policy; no automatic graphic generation occurs here.

Critical unknowns hold. Authoritatively established outside-Shire or nonlisting records reject. An expired listing archives only after verified date checks. Cancellation, unknown booking/status, source change, duplicate conflict, unresolved existing hold or moved-session geography remain held for resolution; no fabricated ended/cancelled/sold-out labels. Existing explicit holds require resolution bound to hold ID and candidate revision, genuine James identity and timestamp; evaluation never produces that resolution.

## Evidence contract
Caller supplies trusted registered official sources (sourceId, official authority, exact admitted URL or explicit admittedUrls, allowed HTTPS hosts) and complete canonical catalogue. Candidate assertions of official authority, verification booleans or numeric scores alone do not grant publication. Each machine proof requires exact field value equality at a structured JSON pointer in fresh hash-validated captured source bytes. Historical James quote proofs are not authenticated by candidate-supplied verifiedBy/verified booleans; the initial evaluator holds them until a separately accepted trusted manual-review lineage adapter is supplied. Shire literal proof must include exact same venueName, or official boundary assessment must bind proven coordinates. Border uncertainty holds. Legacy extraction path/value fields do not silently become validated proofs; assessLegacyEditorial preserves all original facts and holds missing checks.

Dates reject impossible civil days/invalid clocks/inverted instant ranges. Series use the existing bounded materialiser; next actual noncancelled session determines freshness. Moved series venues hold until a session-geography adapter is accepted. Freshness is at most24hours for sessions within7days, unknown schedule or already due;72hours for farther dates. Current boundary snapshots are conservatively subject to this same shorter limit in the initial implementation. Price requires the entire label/checkedAt/validUntil object to match source proof; expiry cannot exceed the freshness window and shortens decision expiry. Unrelated stale sources do not invalidate a listing, but stale referenced evidence fails its check.

Decision binds policy version, entire candidate revision, admitted source IDs/URLs, source bytes hashes and retrieval timestamps, checkedAt and earliest expiry. editorialDecisionCurrent RE-EVALUATES with trusted registry and complete catalogue, checks the original evaluation and current eligibility, and fails closed on mutation/expiry/unknown context. A recomputable decisionHash is an integrity fingerprint, not a signature or standalone grant of authority. Consumers must validate this policy receipt with trusted capture/registry context before any future integration.

## Operations and limitations
Proposed regular ingestion/review: next7days every24hours or sooner on changes; farther listings every72hours. Detection of changed source bytes, factual conflicts, expiry or current holds withdraws eligibility until reevaluation. Runtime alerts, publishing/withdrawal orchestration, public automated-actor receipt/schema support, reversible deployment and actual lifecycle acceptance remain separate unimplemented integration gates. No existing James-only publication gate has been weakened.

The private current queue report uses retained canonical source snapshot, not fresh retrieval. It explicitly includes source timestamp/hash, per-listing scores/reasons and counts; no source timestamps or approvals are invented. Missing source adapters may result in all held: a readiness report, not evidence the listings are false or cancelled. This policy does not claim semantic proof of arbitrary prose, available tickets, rights or prominence. Unknown contracts hold instead of guessing.
