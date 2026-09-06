# Content Foundry retention and takedown boundary

Date: 2026-08-21
Status: accepted for fixture v0.1; real-source retention periods require James's approval
Tracks: DELI-693 and GitHub issue #321

## Current v0.1 decision

The v0.1 Workbench accepts only a synthetic, frozen fixture. It stores run state, evidence locators, edits, review decisions and audit events in the local `foundry-data` Docker volume or `.foundry-data/` development directory.

- No personal audio, photographs, credentials, provider payloads or fetched third-party source bytes are stored.
- State remains private to the host and is not copied into the repository, public build, publication ledger or an external service.
- `docker compose down` stops the service without erasing review state.
- Erasing the local volume is an explicit destructive operator action and is never performed by the Workbench UI or automatically by CI.
- Because the application cannot publish, a v0.1 takedown means rejecting the artifact and removing the local fixture state if the operator explicitly authorises deletion.
- Audit events are attributable, but they are local development evidence rather than a production compliance record.

## Future real-source gate

Real URL, image, audio and participant data must not be enabled in a production environment until James approves:

- retention periods for raw captures, extracted text, uploaded media, renditions and audit metadata;
- privacy erasure handling and which minimal audit facts may survive redaction;
- rights-withdrawal propagation across placements and derivatives;
- legal hold behaviour;
- backup and object-store deletion guarantees;
- the owner and response time for a takedown request.

A rights or takedown request must immediately block new placement, generation, patch export and publication for the affected source or asset. Previously published material requires a separate human-authorised rollback or removal action with a publication-ledger outcome. No automated external takedown is authorised.

## Required implementation before real media

The durable model must record source revision, asset, rights declaration, placement, derivative lineage, retention class and withdrawal state. Deletion jobs must be idempotent, attributable and independently verifiable. A failed deletion remains visibly blocked and cannot be reported as complete.
