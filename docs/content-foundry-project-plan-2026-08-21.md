# Peninsula Insider Content Foundry

## Execution-first project plan

**Prepared:** 21 August 2026
**Initiative:** DELI-693
**Engineering execution:** GitHub Milestone 1
**Canonical implementation base:** `5f2a53c9b16bad28b400c1897dc2ad9875b89d6b`
**Implementation worktree:** `C:\Users\James\.openclaw\workspace\peninsula-insider-content-foundry`
**Status:** approved direction and implementation plan; this document does not authorise production deployment, external distribution, spend, credentials, or publication

---

## 1. Delivery decision

Build the Content Foundry as the permanent private production module inside the broader Peninsula Insider Editor's Workbench. Optimise the first milestone for one complete, useful loop:

> A source URL becomes an evidence-backed quick-note draft, receives explicit human review, and produces a downloadable schema-valid patch without publishing anything.

This is the fastest route to a functional workbench because it proves every durable seam:

1. intake and immutable source capture;
2. source locators and atomic claims;
3. story-angle selection;
4. versioned artifact generation;
5. visible style, evidence and rights gates;
6. attributable review decisions;
7. publication preparation through a safe draft adapter;
8. linkage to the existing editorial lifecycle and Strategy Brain.

Voice notes, photographs, newsletters, social, explainers, podcasts and short video then attach to those same contracts. They do not require a second workflow engine or a competing content library.

### Recommended delivery targets

These are execution targets, not promises. They assume bounded parallel work, a stable base and timely human decisions at the named gates.

| Outcome | Target from implementation start |
| --- | ---: |
| Fixture-driven functional workbench | 1 to 2 working days |
| Real URL to reviewed quick note | 3 to 5 working days |
| URL, voice note and photographs | End of week 2 |
| Coordinated article, newsletter and social pack | Week 3 |
| First private pilot with draft publication handoff | Week 4 |

---

## 2. North star

Peninsula Insider Workbench becomes the team's trusted content operating system:

> Turn verified local intelligence, first-party observations, rights-cleared media and performance signals into coordinated, reusable, multi-format content while preserving evidence, editorial independence and explicit publication authority.

The product is not a generic AI writer. Its durable advantage is the structured editorial memory it builds:

- sources and immutable revisions;
- places, venues, events and people;
- atomic facts, observations, opinions and expiry;
- rights, releases, attribution and permitted channels;
- story angles and previous treatments;
- generated and human-edited artifact versions;
- published placements, corrections and withdrawal history;
- performance outcomes and reuse history.

The primary optimisation goal is useful content shipped per hour of human review without increasing factual corrections, unsupported claims, rights failures or generic copy. Output volume alone is not success.

---

## 3. Canonical product and editorial authority

This plan is subordinate to the current repository contracts:

- `PRODUCT.md` defines product purpose, brand commitments and public-surface rules.
- `ops/email/INSIDER-NOTE-PROCESS.md` is the specific operating authority for The Insider Note.
- `next/src/content.config.ts` defines public content contracts.
- `docs/Data Architecture CMS.txt` describes the current Sanity and filesystem authority model.
- `engine/strategy_engine.py` owns ranked commissioning and performance learning.
- the existing `pi_work_items` state machine owns editorial lifecycle state.
- the existing publication ledger owns actual publication receipts.

When older architecture documents conflict with these contracts, the current specific contract wins. In particular:

- The Insider Note has an ordered 11-position structure, with honest omission of optional modules. It is not a generic six-module package.
- No em-dashes may reach a Peninsula Insider artifact.
- No prices may reach a Peninsula Insider artifact.
- Newsletter reader replies may never be invented or self-quoted.
- Newsletter images must be cleared specifically for email use.
- James chooses the subject line and retains send authority.
- A target newsletter date is not authority to schedule or send.
- Legacy direct-push, `[skip-review]`, fallback-template and "always commit something" behaviours are not Foundry laws.

`PRODUCT.md` currently summarises a Mon-Thu rhythm while the more specific Insider Note process defines Mon-Wed production and Wednesday review. The specific process is operational authority until James records a replacement decision.

---

## 4. Product principles

1. **Claims before prose.** Generation begins only after source revisions, locators and claim states exist.
2. **One evidence base, many formats.** All derivatives share the chosen angle and approved claim set.
3. **AI recommends; authority is explicit.** Ranking or confidence never implies permission to publish.
4. **Verified over convenient.** Missing evidence produces a blocker or `no_story`, never filler.
5. **Rights are channel-specific.** A website clearance does not imply email or social clearance.
6. **First-party voice is protected.** James or Emma voice, likeness and first-person claims always require human review.
7. **Generated media is illustrative.** It never masquerades as documentary photography or footage.
8. **Failures stay visible.** Jobs do not disappear, silently degrade or substitute cached copy.
9. **Corrections create revisions.** Original sources, approved metadata and published content are not silently overwritten.
10. **The public site remains lightweight.** The private Workbench does not enter the GitHub Pages bundle.
11. **No competing truth.** Foundry processing state, editorial lifecycle, CMS state, publication receipts and performance measurement each have one named authority.
12. **No throwaway prototype.** Development adapters implement the same interfaces and contracts used by later production adapters.

---

## 5. First functional slice

### 5.1 Operator journey

The first functional release supports this complete flow:

1. An authenticated development editor loads a frozen URL fixture.
2. The API creates an intake bundle and immutable source revision.
3. Deterministic preflight produces warnings and an explicit ready, held or failed state.
4. Extraction produces clean content and structured source locators.
5. The workflow creates atomic claims with epistemic origin and verification state.
6. The operator selects or confirms one story angle.
7. The system generates one quick-note draft.
8. Deterministic house-style and evidence checks run independently of drafting.
9. The Workbench displays the job timeline, evidence, claims, draft and blockers.
10. The operator edits, accepts or rejects the artifact.
11. Review state survives reload and detects stale decisions.
12. An approved draft produces a downloadable patch that validates against the existing quick-note contract.

No Git write, CMS mutation, email action, social action, production deployment or public publication occurs.

### 5.2 Frozen fixture

The first fixture must contain:

- one supported place or event claim;
- one supported date or time claim;
- one first-party editorial observation;
- one unsupported claim that must be excluded;
- one attempted price that must be blocked from output;
- one em-dash style violation;
- one ambiguous entity candidate;
- one simulated transient provider failure;
- one permanent source failure;
- a second identical submission for idempotency verification.

### 5.3 Definition of functional

The Workbench is functional when an editor can complete the flow from intake to reviewed patch in one private UI without hidden file movement, database intervention or external publication. A static mock-up, fixture JSON alone or a generated draft without durable review state does not satisfy this milestone.

---

## 6. Source-of-truth map

| Concern | Authority | Foundry responsibility |
| --- | --- | --- |
| Business priority and initiative status | DELI-693 in Asana | Report milestone evidence only |
| Engineering scope, issues, PRs and CI | GitHub Milestone 1 | Link implementation evidence |
| Editorial work-item lifecycle | Existing `pi_work_items` state machine | Link each run to a work-item UUID and request guarded transitions only |
| Human decision mirror | Existing PI Asana mirror | Never move PI cards directly |
| Processing jobs, leases and artifacts | New `pi_foundry` schema | Canonical processing state |
| Asset identity, provenance and rights | New `pi_media` schema | Canonical asset and rights state |
| Public content schemas | Existing Astro and Sanity contracts | Compile approved artifacts into the resolved authority adapter |
| CMS placement | Sanity, filesystem or Supabase overlay by entity authority | Resolve authority before any write adapter runs |
| Publication truth | Git commit, deployment receipt and existing publication ledger | Record draft preparation; reference canonical ledger entry after publication |
| Commissioning and outcome learning | Existing Strategy Brain and GSC loop | Consume ranked opportunities and return action/result linkage |

### 6.1 Workflow ownership law

`pi_foundry.runs` owns processing status only. It must include an optional or required `work_item_id` linking to the existing `pi_work_items` UUID when the run belongs to an editorial work item. It must not recreate editorial stages or mirror them independently.

Foundry review completion may propose a guarded state transition through the existing transition mechanism. It must not write state directly or move an Asana card.

### 6.2 Publication ownership law

Foundry `publication_events` may record internal states such as prepared, validation_failed, patch_created or draft_pr_created. A real publication event must reference the canonical publication-ledger identifier, Git reference and deployment receipt. Foundry does not create a second publication truth.

### 6.3 Media ownership law

`pi_media` owns asset identity, immutable source revisions, rights, releases, renditions, lineage, technical metadata and usage records. The selected CMS adapter owns the content placement reference. One physical image is one asset with many placements, not one duplicated asset per artifact.

---

## 7. Target architecture

### 7.1 Deployment boundary

Keep the public Astro application static under `next/`. Build the private application under:

```text
studio-peninsula-insider/
  src/                 # React/Vite intake, jobs, review and library UI
  server/              # Express API, auth, jobs, workers and adapters
  shared/              # versioned Zod and JSON contracts
  migrations/          # added with the gated PostgreSQL adapter
  fixtures/            # frozen deterministic source and expected packs
  tests/               # focused unit, integration, security and end-to-end tests
```

Recommended technologies:

- Node 22;
- TypeScript;
- React and Vite;
- Express;
- an atomic single-process file store for fixture/dev work, then PostgreSQL 16 behind the same store interface;
- Zod contracts with generated JSON Schema where useful;
- Vitest and Supertest;
- Playwright when the review flow is stable;
- existing Python Strategy Brain through a narrow process or service adapter.

The private Studio must be independently deployable and independently disableable. No private route, credential or application bundle may enter `next/dist`.

### 7.2 Permanent development adapters

To avoid blocking useful work on production choices:

- **Auth:** development-only local editor identity, rejected outside development; Supabase JWT adapter for approved environments.
- **Database:** an atomic, root-contained, schema-versioned file adapter for deterministic fixture, test and local single-process use. It is rejected at production startup. PostgreSQL 16 is the next adapter once its owner is approved.
- **Storage:** root-contained private fixture storage behind the same object-store interface used by a later Supabase Storage or other approved adapter.
- **Publication:** downloadable patch first, optional draft GitHub PR second.
- **Providers:** deterministic fixture adapters first, paid model adapters only after model and cost approval.

These adapters are configuration variants, not prototype replacements. The file adapter is intentionally permanent for fixtures and tests; it is not claimed to provide PostgreSQL concurrency or lease semantics.

### 7.3 Durable workflow laws

- idempotency key per intake, run and task;
- atomic snapshot persistence and attributable audit events in the v0.1 single-process adapter;
- PostgreSQL-backed jobs, tasks, append-only events and leases once concurrent workers are introduced;
- bounded attempts classified by retryable and permanent failures;
- lease token, heartbeat and expiry recovery;
- hard run and stage deadlines;
- provider circuit breakers;
- independently retryable derivatives;
- user-safe error plus redacted technical detail;
- no raw provider request or response object stored in job state;
- finalization only after mandatory prerequisites succeed;
- cancellation that prevents new work without corrupting completed artifacts;
- restart and replay without duplicate artifacts.

Redis is not required in the initial design. Once the PostgreSQL adapter is introduced, row locking and `SKIP LOCKED` are sufficient until observed workload proves otherwise.

---

## 8. Corrected domain contracts

### 8.1 Intake bundle

Replace singular `source_kind` with a bundle containing typed source items:

```text
IntakeBundle
  id
  schema_version
  submitted_by
  captured_at
  recipe
  entity_hints[]
  source_items[]
  status
  warnings[]

SourceItem
  id
  kind: url | image | audio | document | text | question | data_feed
  revision_id
  source_url or asset_id
  content_hash
  captured_at
  preflight_state
  rights_declaration_id
```

One run may therefore combine a URL, voice note and photographs without pretending the whole intake has one source kind.

### 8.2 Evidence locator

Evidence references must be normalized records, not opaque strings:

```text
EvidenceLocator
  id
  source_revision_id
  locator_type: css | text_range | page | paragraph | timecode | image_region | record_field
  locator_value
  excerpt_hash
  captured_at
  extraction_method
```

The UI may show an excerpt for review, but lineage relies on the immutable source revision and locator.

### 8.3 Claim

Separate what a claim is from whether it is verified:

```text
Claim
  id
  run_id
  text
  claim_type
  origin: external_fact | first_party_observation | opinion | inference
  verification_state: supported | conflicted | stale | unsupported | approved
  evidence_locator_ids[]
  source_count
  checked_at
  expires_at
  requires_human
  sensitivity_flags[]
```

Drafting may use supported external facts, attributed first-party observations and explicitly approved opinions. Unsupported or materially conflicted claims are blockers.

### 8.4 Rights declaration

`rights_status` and `credit` alone are insufficient. Record:

```text
RightsDeclaration
  asset_id
  owner_name or owner_reference
  evidence_reference and evidence_hash
  status: unknown | pending | cleared | restricted | revoked | expired
  permitted_surfaces[]
  territory
  starts_at
  expires_at
  attribution_text
  derivative_permission
  commercial_permission
  recognisable_person_release_state
  property_release_state
  generated_or_synthetic
  illustrative_disclosure
  reviewed_by
  reviewed_at
  revocation_reason
```

Clearance is evaluated per placement. Website clearance does not imply email, social, podcast or video clearance.

### 8.5 Story angle

An angle contains evidence references, novelty/duplication results, target audience and a recommendation. Recommendation is upstream ranking only. More than one materially different interpretation, low novelty confidence or unresolved sensitive claims requires human angle selection.

All parallel derivatives read one selected angle version and one approved claim-set version.

### 8.6 Artifact

Every artifact version records:

- artifact ID, version and content hash;
- source, claim and angle lineage;
- type and target surface;
- structured content payload;
- media placement proposals;
- provider, exact model, prompt version and input/output hashes;
- style, evidence and rights verdicts;
- recommendation and risk metadata;
- human edits and decision history;
- publication preparation state;
- canonical publication reference when one exists.

Initial artifact types:

- `quick_note`;
- `article_draft`;
- `newsletter_module`;
- `instagram_caption`;
- `linkedin_post`;
- `ask_answer`;
- `image_alt_proposal`;
- `image_caption_proposal`.

### 8.7 Insider Note contract

Newsletter modules use stable position identifiers for the current 11-position order. Generation may propose content only for applicable variable positions, such as Intro, Lead, Secondary Picks, Also This Week or Booking Note.

Controls:

- optional modules are omitted rather than padded;
- Masthead, Reply Prompt, Sign-off and Footer remain locked;
- From the Replies requires an actual supplied reader reply;
- Poll remains a native Beehiiv/editorial decision;
- Lead has exactly one verb CTA;
- one CTA maximum per module;
- all factual statements carry evidence;
- every image is cleared specifically for email and has descriptive alt text;
- every link receives the required Insider Note UTM scheme;
- zero prices and zero em-dashes are deterministic blockers.

Price may be retained as restricted internal source evidence only where required for verification. It must never be exposed to a PI artifact, prompt context that does not require it, preview, patch or publication package.

---

## 9. Database model

### 9.1 `pi_foundry`

| Table | Purpose |
| --- | --- |
| `intake_bundles` | One submitted collection of heterogeneous source items |
| `source_items` | URL, image, audio, document, text, question or feed item |
| `source_revisions` | Immutable fetched or uploaded revision and manifest |
| `evidence_locators` | Normalized source positions |
| `claims` | Atomic factual, observational, opinion or inferred statements |
| `claim_evidence` | Many-to-many claim and locator lineage |
| `source_entities` | Links to existing PI entity identifiers |
| `runs` | Recipe, lifecycle and optional `pi_work_items` link |
| `run_tasks` | Durable leased tasks, attempts and deadlines |
| `run_events` | Append-only operational timeline |
| `story_angles` | Candidate and selected angle versions |
| `claim_sets` | Versioned approved claim collections for drafting |
| `artifacts` | Versioned generated and edited outputs |
| `artifact_claims` | Artifact claim lineage |
| `artifact_assets` | Proposed and approved media placements |
| `review_decisions` | Attributable accept, edit, reject and hold history |
| `publication_targets` | Proposed destination and resolved adapter authority |
| `publication_events` | Internal draft preparation and canonical ledger references |
| `provider_state` | Provider health and circuit-breaker state |

### 9.2 `pi_media`

| Table | Purpose |
| --- | --- |
| `assets` | Canonical logical asset |
| `asset_revisions` | Immutable files and content hashes |
| `asset_rights` | Channel-specific rights and releases |
| `asset_metadata` | Technical and approved editorial metadata |
| `placements` | Proposed or approved use on a content surface |
| `asset_relations` | Original, crop, rendition, exact and near-duplicate lineage |
| `usages` | Published and historical uses |
| `collections` | Editorial groupings and saved views |
| `collection_items` | Membership without physical duplication |
| `enrichment_runs` | Versioned machine proposals |
| `placement_evaluations` | Relevance, repetition, rights and suitability verdicts |
| `review_decisions` | Attributable enrichment and placement decisions |

All migrations are idempotent. Historical imports are insert-only and never move or delete source files. Production schema ownership remains a Gate 1 decision, but local migrations can proceed immediately.

---

## 10. Workflow stage graph

```text
INTAKE
  -> source_preflight
  -> source_extract
  -> entity_resolve
  -> claim_build
  -> claim_verify
  -> freshness_and_contradiction
  -> angle_rank
  -> human_angle_choice when required
  -> claim_set_lock
  -> parallel derivatives
       -> draft_quick_note or article
       -> draft_newsletter_modules
       -> draft_instagram
       -> draft_linkedin
       -> draft_ask
       -> propose_media_metadata
  -> deterministic_style_gate
  -> independent_verify_gate
  -> rights_gate
  -> compose_pack
  -> review
  -> publication_prepare
  -> explicit approval outside workflow automation
  -> canonical publication adapter
  -> publication ledger
  -> Strategy Brain measurement
```

Parallel work begins only after the angle and claim-set versions are stable. Derivative failure is isolated: one failed social artifact must not erase a valid article or newsletter artifact.

Minimum failure codes:

- `SOURCE_UNSUPPORTED`
- `SOURCE_FETCH_FAILED`
- `SOURCE_RIGHTS_REQUIRED`
- `EXTRACTION_EMPTY`
- `ENTITY_AMBIGUOUS`
- `CLAIM_CONFLICT`
- `CLAIM_UNSUPPORTED`
- `NO_STORY`
- `MODEL_RATE_LIMITED`
- `MODEL_OUTPUT_INVALID`
- `STYLE_GATE_FAILED`
- `VERIFY_GATE_FAILED`
- `RIGHTS_GATE_FAILED`
- `MEDIA_NOT_DELIVERABLE`
- `PUBLICATION_CONTRACT_INVALID`
- `PUBLICATION_FAILED`
- `WORKER_LEASE_EXPIRED`
- `JOB_DEADLINE_EXCEEDED`
- `CANCELLED`

Each failure has a redacted technical detail, safe operator summary, retry policy and suggested remedy.

---

## 11. Workstreams and team model

### James

Publisher and Product Principal. Retains scope, architecture, production deployment, spend, credentials, personal-data policy, subject-line, send and publication authority.

### Emma

Human authority for her first-party observations, voice, likeness and contributed photography, and an editorial/community reviewer where assigned.

### Remy

Portfolio orchestrator. Owns DELI-693 priority and James-facing synthesis. Does not decompose GitHub tasks or approve specialist outputs.

### Engineering Lead

Owns GitHub Milestone 1, issue contracts, sequencing, dependencies, WIP limits, architecture readiness, integration evidence and release recommendations. Does not implement production code or approve its own delegated implementation.

### Forge

Implements scoped code and tests in isolated worktrees. Opens PRs with execution evidence. Does not broaden architecture, change production or merge directly to main.

### Pixel

Provides the formal Workbench design handoff under the Impeccable standard. Owns information hierarchy, responsive behaviour, accessibility and visual consistency. Forge implements the approved handoff.

### Margot

Within restricted Foundation Mode, supplies editorial rubrics, fixture expectations, newsletter contract interpretation and draft quality critique. Has no publication, external communication, credential or production authority.

### Tyler

Within restricted Foundation Mode, reviews operational flow, job-card usefulness, failure remedies and publication handoff clarity. Has no publication, approval, external communication or production authority.

### Warden or independent QA reviewer

Performs auth, security, rights, privacy, migration and rollback review and gives an independent verdict. The implementer cannot be the final judge.

### Machine collaboration law

Agents and model stages exchange versioned structured records through the database and GitHub, not ephemeral chat. Drafting and verification are separate stages. No stage may approve its own consequential output. All actions are attributable to an editor or narrowly scoped worker identity.

---

## 12. PR and milestone roadmap

All engineering work belongs to GitHub Milestone 1. DELI-693 receives milestone evidence rather than a duplicate card per engineering task.

### PR 0: reproducible foundation

Deliver:

- baseline manifest for canonical commit `5f2a53c9b16bad28b400c1897dc2ad9875b89d6b`;
- selected 776BC reference checksums and licence notices;
- architecture decisions and source-of-truth map;
- Studio scaffold and lockfile;
- CI workflow;
- local run instructions;
- no feature behaviour, production credentials or deployment.

Exit:

- a clean checkout reproduces the scaffold;
- public build inputs remain unchanged;
- CI commands are defined and independently runnable.

### PR 1: fixture-driven functional workbench

Deliver:

- corrected source, evidence, claim, angle, artifact and rights contracts;
- an atomic, schema-versioned, root-contained file-store adapter with production fail-closed behaviour;
- durable fixture runs and attributable review events;
- deterministic fixture adapters;
- job card, evidence ledger and quick-note review;
- edit, accept and reject history;
- downloadable patch;
- restart, idempotency, concurrent in-process mutation and visible-failure tests.

Exit:

- the first functional slice passes its acceptance suite;
- no external network, Git, CMS or publication mutation is required.

### PR 2: real URL to quick note

Deliver:

- SSRF-safe URL fetch and redirect policy;
- immutable URL revision capture;
- extraction with structured locators;
- entity candidates against current PI identifiers;
- claim ledger and `no_story` result;
- angle selection;
- provider-backed quick-note draft behind explicit cost configuration;
- deterministic style and evidence gates;
- current quick-note schema validation.

Exit:

- one approved pilot URL reaches review with complete claim lineage;
- blocked URLs and ambiguous entities fail safely.

### PR 3: audio and photography

Deliver:

- resumable upload;
- audio transcription adapter;
- image technical extraction and SHA-256 deduplication;
- complete rights declaration;
- signed or root-contained private preview delivery;
- image-intelligence proposals held for review;
- privacy and retention controls.

Exit:

- URL, voice note and five-image fixture reaches review;
- duplicate images remain one asset with multiple placements;
- unclear rights block placement.

### PR 4: coordinated editorial pack

Deliver:

- Field Note, Venue Update and Event recipes;
- article or quick note;
- current Insider Note position candidates;
- Instagram and LinkedIn drafts;
- Ask answer;
- bounded parallel derivative execution;
- strict pack composer;
- Fast, Guided and Full Control review modes.

Exit:

- all derivatives share one angle and claim-set version;
- failed derivatives remain individually retryable;
- personal voice and all publication decisions remain human-only.

### PR 5: draft publication and private pilot

Deliver:

- Astro quick-note/article/event compilation adapters;
- downloadable patch hardened for normal use;
- optional draft PR adapter after approval;
- content and build verification receipt;
- existing publication-ledger linkage;
- Strategy Brain action/result linkage;
- review-time and correction metrics.

Exit:

- three internal source pilots complete without public publication;
- invalid content cannot be marked ready;
- every preparation receipt contains a rollback reference.

---

## 13. Milestone gates

| Gate | Required decision | Blocks | Does not block |
| --- | --- | --- | --- |
| Gate 0 | Confirm canonical base and selected reference snapshot | Implementation against an ambiguous tree | Read-only inspection and plan work |
| Gate 1 | Approve production database owner, auth verifier and storage adapter | Production environment integration | Local fixture and file-adapter work |
| Gate 2 | Approve retention, privacy erasure and rights-withdrawal policy | Real personal audio/image storage | Synthetic or explicitly cleared fixtures |
| Gate 3 | Approve providers, model comparison result and cost cap | Paid provider calls | Deterministic provider adapters |
| Gate 4 | Approve private deployment target and environment credentials | Staging/private production deployment | Local application work |
| Gate 5 | Approve patch versus draft PR canary mode | GitHub draft creation | Downloadable patch |
| Gate 6 | Approve each publication | Merge, publish or site mutation | Review and validation |
| Gate 7 | Approve each external channel adapter | Scheduling, sending or posting | Draft asset packages |

No gate authorises publication, spend or production by implication. Gate evidence must identify the decision, actor, time and exact scope.

---

## 14. Acceptance suite

### 14.1 Functional workbench

- A frozen fixture creates one intake bundle and one run.
- A repeated identical submission does not duplicate tasks or artifacts.
- Restart and replay preserve completed work.
- A simulated worker crash recovers after lease expiry.
- A permanent error becomes a readable failed job card.
- Every supported factual claim has a structured evidence locator.
- Unsupported and materially conflicted claims cannot enter the draft.
- Price and em-dash checks fail closed.
- Review decisions and edits survive reload.
- Optimistic version conflict is visible and non-destructive.
- A stale decision is invalidated when artifact content changes.
- The approved draft produces a schema-valid quick-note patch.
- No Git, CMS, email, social or public-site mutation occurs.
- Every mutation has actor, time and append-only audit event.
- The private Studio is absent from `next/dist`.

### 14.2 URL intake

- Loopback, private, link-local and cloud metadata addresses are blocked.
- Redirect targets are revalidated and redirect count is bounded.
- DNS rebinding protections are covered.
- Fetched text is treated as untrusted data, never instructions.
- Unsupported content types fail with a safe code.
- Empty evidence produces `NO_STORY`, not filler.
- Ambiguous named entities enter human hold.
- The immutable revision can reproduce every evidence locator.

### 14.3 Media and rights

- File content is sniffed independently of extension.
- Upload size, type and chunk count are bounded.
- Path traversal and arbitrary file delivery are impossible.
- Duplicate upload resolves to one canonical asset.
- Legitimate crops remain related revisions, not collapsed files.
- Unclear, expired or revoked rights block placement.
- Website clearance does not satisfy email or social placement automatically.
- Recognisable people require release state.
- Alt proposals describe visible content and do not identify people or places from visual inference alone.
- Generated media is marked illustrative and cannot fill documentary slots automatically.

### 14.4 Insider Note

- Module artifacts target a valid current position.
- Optional modules can be omitted without padding.
- Reader replies require an actual supplied reply.
- Locked Masthead, Reply Prompt, Sign-off and Footer are unchanged.
- Lead has one verb CTA and no generic "Read more" CTA.
- Each module has at most one CTA.
- Venue names match the current site record.
- Every image is specifically email-cleared and has alt text.
- All links use `utm_source=email&utm_medium=newsletter&utm_campaign=insider-note-<nn>`.
- Subject and preview candidates are distinct.
- Zero prices and zero em-dashes pass before review-ready state.
- No API action schedules or sends the newsletter.

### 14.5 Workflow and partial failure

- Failure classification controls retry eligibility.
- Attempts and elapsed time are bounded.
- Provider circuit breaker opens and recovers deterministically.
- One failed derivative does not delete or hide successful derivatives.
- Cancellation prevents new work while preserving audit history.
- ETA derives from observed stage history and reports a range.
- Model output that fails schema validation cannot become an artifact.
- Independent verification can veto a draft recommendation.

### 14.6 Publication preparation

- Artifact compiles to the current target schema.
- Event imported facts and human editorial overlay remain separately owned.
- The adapter resolves Sanity versus filesystem authority before proposing a write.
- Invalid schemas cannot produce a ready publication package.
- Patch or draft PR includes human-readable diff and verification receipt.
- No direct push to main is available in pilot mode.
- Actual publication can reference source, run, artifact, claims, assets, approval, Git commit, deployment receipt and rollback reference.

---

## 15. CI and release controls

Required checks for Foundry PRs:

- formatting and lint;
- TypeScript type check;
- unit tests;
- Zod and JSON contract tests;
- PostgreSQL 16 integration and repeat-migration tests when that adapter lands;
- API authentication and authorization tests;
- SSRF, redirect, path traversal and upload tests;
- lease, retry, deadline, cancellation and replay tests;
- evidence, rights, price and house-style policy tests;
- Insider Note contract tests;
- secret scanning;
- dependency and vulnerability scanning;
- focused existing `python engine/test_strategy_engine.py` check when the adapter boundary changes;
- production-equivalent Astro content/build checks before publication-adapter changes;
- assertion that private Studio and admin output are excluded from the public bundle.

Release controls:

- pull request required;
- no direct agent commit to main;
- implementer cannot supply final independent QA verdict;
- CI evidence accompanies every test claim;
- migration, rollback and observability notes required;
- James approval required before production deployment or publication;
- live verification and deployment provenance required before any release is called complete.

---

## 16. Security, privacy and governance controls

1. Browser clients never receive service-role credentials.
2. Editor and worker identities are separate and least-privilege.
3. Every write records an actor and audit event.
4. Source pages and documents are untrusted data.
5. URL intake blocks SSRF, unsafe redirects and private networks.
6. Storage keys are opaque identifiers, never client-supplied filesystem paths.
7. Uploads are size-limited, type-sniffed and validated before processing.
8. Preview delivery is signed or root-contained and expires where supported.
9. Secrets, raw provider payloads and unnecessary personal data are redacted from logs and errors.
10. Provider calls have hard deadlines, per-run cost caps and circuit breakers.
11. Exact provider, model, prompt version, hashes, latency and cost estimate are retained.
12. Drafting and verification are independent stages.
13. Deterministic date, link, schema, price, style and rights checks remain authoritative.
14. Named people are never identified from images.
15. Child-likely, sensitive, trademark or private-property imagery requires review.
16. Generated place imagery cannot masquerade as a real venue or event.
17. Commercial consideration cannot purchase an editorial verdict or undisclosed recommendation.
18. Public publication and external distribution remain explicit human actions.

---

## 17. Retention and governed deletion

Original source revisions are immutable during normal operation, but immutability must not defeat privacy, rights or legal obligations.

Before real personal uploads enter production, Gate 2 must define:

- retention by source class;
- raw voice-note retention and transcript retention;
- abandoned and rejected run expiry;
- published-source retention;
- rights expiry and withdrawal handling;
- privacy erasure procedure;
- mistaken-upload purge;
- legal takedown procedure;
- audited tombstone versus physical blob purge;
- derived artifact and embedding deletion;
- backup and replica expiry behaviour;
- who can request, approve and independently verify deletion.

Recommended operating pattern:

- normal correction creates a new revision;
- rights withdrawal immediately quarantines future use;
- privacy or legal deletion can purge original bytes and derived data;
- the audit trail retains the minimum non-sensitive tombstone necessary to show that a governed deletion occurred;
- deleted content is removed from search, embeddings, previews, caches and future training/evaluation fixtures.

Until the policy is approved, use synthetic fixtures or inputs specifically cleared for the pilot.

---

## 18. Rollout and rollback

### 18.1 Rollout sequence

1. Local deterministic fixture mode
2. Local real URL with external calls disabled by default
3. Private development environment
4. Staging with production-equivalent auth and synthetic fixtures
5. Three manually selected real-source pilots
6. Downloadable patch publication handoff
7. Draft PR creation after a separate approval
8. Private production Workbench
9. One external channel adapter at a time

Feature controls:

- `FOUNDRY_ENABLED`
- provider-specific enable flags
- real upload enable flag
- publication mode: `disabled | patch | draft_pr`
- channel distribution disabled independently per channel
- worker pause and intake pause controls

### 18.2 Rollback

- Disable intake and pause workers without affecting the public Astro site.
- Revoke worker and provider credentials.
- Preserve jobs and safe audit events for diagnosis.
- Mark interrupted tasks and prevent new leases.
- Quarantine generated assets and publication drafts.
- Use forward-fix migrations rather than destructive down migrations.
- Revert any published Git change through its recorded commit or PR.
- verify the live deployment provenance after a public rollback;
- write `rolled-back` to the existing publication ledger when an actual publication was reverted.

The Studio deployment boundary must guarantee that completely disabling it leaves the public site operational.

---

## 19. Ultimate content-machine roadmap

### Phase A: written editorial

- quick notes;
- articles and evergreen refreshes;
- venue and event proposals;
- Ask answers;
- internal-link and SEO metadata proposals;
- corrections and freshness receipts.

### Phase B: newsletter and social

- Insider Note position-aware contributions;
- subject and preview candidates;
- Instagram and LinkedIn packages;
- carousel and quote-card briefs;
- channel-specific crops, captions, alt and UTMs;
- draft-only channel handoff.

### Phase C: explainers

- evidence-backed explainers and FAQs;
- carousel narratives;
- map and itinerary scripts;
- simple data visualisations;
- voiceover scripts;
- scene and illustration briefs;
- web, email and social derivatives from one canonical explainer.

### Phase D: podcasts

- episode angle and evidence pack;
- research brief and interview guide;
- script or run sheet;
- chapter markers, show notes and transcript;
- rights-cleared music and asset manifest;
- short audio extracts and social packages;
- explicit approval for synthetic speech or voice cloning;
- separately gated distribution adapter.

### Phase E: short video

- script, hook and shot list;
- storyboard and scene manifest;
- rights-cleared source footage;
- generated illustrative scenes with disclosure;
- subtitles, chapters and factual overlays;
- 9:16, 4:5, 1:1 and landscape derivatives;
- thumbnail and caption variants;
- no generated venue or event imagery presented as documentary reality.

### Phase F: team-scale intelligence

- shared Editorial Library and saved views;
- assignment and review queues;
- reuse, repetition and staleness warnings;
- editorial calendar and recipe templates;
- performance feedback by artifact, angle and channel;
- cost and latency optimisation;
- controlled batch generation;
- partner and commercial disclosure workflow;
- cross-channel correction and withdrawal propagation.

---

## 20. Metrics

Track from the first fixture and preserve the baseline:

### Flow

- intake effort;
- intake-to-review time;
- active processing time;
- stage time and ETA accuracy;
- human review time;
- publication lead time.

### Quality and trust

- source and claim provenance coverage;
- unsupported and conflicted claim count;
- accepted, edited and rejected artifacts;
- correction rate after publication;
- angle recommendation disagreement;
- duplicate-content warnings;
- rights holds and rights failures;
- image suggestion acceptance;
- generated-media disclosure compliance.

### Reuse and reach

- derivatives per approved source;
- asset and claim reuse rate;
- article, newsletter and social acceptance by recipe;
- GSC impressions, clicks, CTR and position after publication;
- newsletter and social engagement where connected and approved.

### Reliability and cost

- failed, stalled and retried runs;
- lease recovery success;
- provider circuit-breaker events;
- cost and latency by stage and model;
- cost per accepted artifact;
- human rescues outside defined gates.

Initial product targets:

- less than three minutes of operator intake effort for the mixed-media slice;
- typical review in 15 minutes or less;
- 100 percent lineage for accepted factual claims;
- 100 percent explicit rights state for selected media;
- zero unauthorised publication or external distribution;
- no increase in factual correction rate versus the pre-Foundry baseline.

---

## 21. Primary risks and controls

| Risk | Control |
| --- | --- |
| Unreproducible baseline | Canonical commit, checksum manifest and isolated worktree |
| Scope explosion | Quick-note vertical slice before mixed media or extra channels |
| Competing workflow truths | Explicit `pi_work_items` and `pi_foundry` ownership split |
| Hybrid CMS corruption | Entity-authority resolver and adapter-specific contract tests |
| Rights failure | Channel-level clearance, proof receipt and fail-closed placement |
| Hallucinated local facts | Claims before prose, locators and independent veto |
| Legacy autonomous publishing | No Foundry access to direct-push or `[skip-review]` paths |
| Prompt injection and SSRF | Untrusted-source boundary and adversarial network tests |
| Personal-data over-retention | Gate 2 policy and governed deletion exceptions |
| Generic brand voice | Margot rubric, first-party fixtures and edit/reject measurement |
| Provider cost or outage | Adapter interfaces, cost caps, deadlines and circuit breakers |
| Review burden | One chosen angle, shared claim set and 15-minute review target |
| Generated media harms trust | Illustrative-only placement and persistent disclosure |
| Agent self-approval | Independent QA and explicit human authority gates |

---

## 22. Immediate kickoff order

Run bounded work in parallel through GitHub Milestone 1 with isolated worktrees and non-overlapping ownership:

1. **Baseline and ADR lane:** source manifest, reference checksums and authority decisions.
2. **Contracts and durable-store lane:** shared schemas, migrations, leases, events and deterministic adapters.
3. **Review UI lane:** intake, job card, evidence ledger, artifact editor and blocker presentation against frozen contracts.
4. **CI and security lane:** PostgreSQL harness, contract tests, failure fixtures, auth and SSRF tests.

Integration order is contracts, backend, UI, then independent QA. The first checkpoint is the fixture-driven functional Workbench, not a broad media library or a set of disconnected generated examples.

The larger article, newsletter, social, explainer, podcast and short-video vision remains the architectural destination, but no later format is allowed to delay the first complete source-to-review-to-patch loop.
