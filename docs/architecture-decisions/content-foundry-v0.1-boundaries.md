# Content Foundry v0.1 boundary decisions

Date: 2026-08-21
Status: accepted for the fixture-driven v0.1 slice
Tracks: DELI-693, GitHub issues #319, #320 and #321

## Decision

Build the first Workbench as an independently runnable private React/Vite and Express application under `studio-peninsula-insider/`. The public Astro application remains unchanged and receives only a human-reviewed downloadable patch.

The v0.1 workflow is:

```text
frozen URL fixture -> evidence ledger -> selected angle -> quick-note draft -> human decision -> downloadable patch
```

Use an atomic, schema-versioned, root-contained file adapter for deterministic fixtures, tests and local single-process use. Serialize mutations in-process, preserve attributable audit events and reject this adapter at production startup. PostgreSQL remains the next store adapter and is required before concurrent workers or production use.

Use fixture identity only in development and test. Bind the API to loopback. Make no provider, CMS, email, social, publication-ledger or Git mutation from the application.

## Authority laws

- Base all implementation on commit `5f2a53c9b16bad28b400c1897dc2ad9875b89d6b`.
- `PRODUCT.md` and current code contracts outrank review-stage handover text.
- `ops/email/INSIDER-NOTE-PROCESS.md` is the newsletter authority and its 11-position order supersedes the handover's older six-module description.
- PI public copy contains no prices and no em dashes.
- An unsupported or restricted claim remains visible in the ledger but cannot enter an artifact.
- Workbench approval is not source verification and is not publication.
- The publication ledger changes only after an actual publication outcome.
- Dirty 776BC and image-intelligence working bytes are reference snapshots, not current runtime proof or code to copy wholesale.

## Consequences

This slice is usable immediately for deterministic acceptance and review-flow development without credentials, model spend or public-site risk. It does not establish multi-process concurrency, real URL safety, production authentication, private deployment, rights-managed media storage or publication authority; those remain explicit later gates.
