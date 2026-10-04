# Peninsula Insider event intelligence

Status: the verified website improvements were published on 4 October through PR #572. Comprehensive event intelligence remains in progress. This is a full implementation project, not a pilot.

## Human requirements
Mornington Peninsula Shire only. Events, experiences and offers must be labelled. Prices require current verification. James approves each new listing. Use original PI metadata graphics, then text-only, when licensed imagery is unavailable. Every major stage must pass 9/10; critical failures veto the score.

## Working commands
From repository root, Node 22 or later:

- `node --test ops/event-intelligence/*.test.mjs next/src/lib/event-publication.test.mjs next/src/lib/event-occurrence.test.mjs`
- `node ops/event-intelligence/collect.mjs [private-evidence-directory] [--force]`
- `node ops/event-intelligence/details.mjs [private-evidence-directory]`
- `node ops/event-intelligence/cli.mjs packet [private-evidence-directory]`
- `node ops/event-intelligence/cli.mjs coverage [private-evidence-directory]`
- `node ops/event-intelligence/cli.mjs health [private-evidence-directory]`
- `node ops/event-intelligence/cli.mjs review packet.json review.html`
- `node ops/event-intelligence/cli.mjs verify packet.json`
- `node ops/event-intelligence/cli.mjs export-drafts approved-packet.json [output-directory]`
- `node ops/event-intelligence/grade.mjs ops/event-intelligence/baseline-grade.json ops/event-intelligence/data-grade.json ops/event-intelligence/verification-grade.json ops/event-intelligence/visuals-grade.json ops/event-intelligence/editorial-grade.json`

Collection never publishes. Export emits review-only records. No script automatically sets published status, commits, pushes, creates editorial claims, contacts organisers or accepts licences.

## Evidence and approval
A candidate has kind, stable identity, fields, field proofs, geographic proof, series/exception metadata, assets, category and original summary. Extracted facts are candidate values only. Essential proofs need an official captured source, a located quote, a matching interpreted value, and explicit human verification. Human interpretation is recorded; extraction success is never a fact-check.

James's approval must name the current candidate revision. Changing title, dates, description, prices, audience assessment or assets changes the revision and requires renewed approval. The verifier independently checks evidence freshness and unresolved conflicts. Approval by name is an audit receipt for trusted local operators, not a substitute for CMS authentication; actual public approval continues through the existing authenticated PI publishing workflow.

External text is data, not instructions. Registry hosts are allowlisted; credentials, redirects, private addresses and oversized bodies are refused. New external organiser/ticketing links require registry review. Browser/PDF adapters are review tasks until permitted retrieval is established.

## Current honest limits
Source-specific HTML discovery works; JSON-LD extraction is a common contract, not a claim of comprehensive HTML extraction. Sources with no structured events produce a review warning. PDFs, pagination and dynamic programmes need additional adapters. The initial source register must expand through geography/category coverage review. Do not treat its current rows as complete regional coverage.

Undated experiences remain candidates and must use the existing experiences content model; the event exporter refuses to invent a date. Explicit bounded series now export review drafts with exact sessions; full experiences/offer export remains incomplete. Retained source evidence lives in ignored private directories and must not be committed or included in the static site.

The legacy spreadsheet importer and historical source-health scripts remain unchanged. This branch adds a controlled path and does not claim legacy ingestion is repaired. Live agency containers currently use Hermes; historical OpenClaw cron state is not assumed to be the active scheduler.

## Stage grading loop
Each stage has explicit checks in rubrics.json. A check passes only with a documented receipt. A normalised score of at least 9/10 is necessary; every critical check must also pass. Missing receipts remain pending. After a failure, fix the cause, rerun affected tests/live checks, update the evidence and regrade before accepting the stage. Component scores do not certify production operation. Release needs independent deploy and live receipts.

## Publication and rollback
Draft export is idempotent for an unchanged canonical revision. Changed exports retain previous generated records in history. The local promotion adapter refuses changed existing records without their exact reviewed hash, retains additional relationships, records previous bytes and supports rollback only when the current bytes still match its receipt. It has not been connected to automated publication. Preview, guarded approval, build, deploy receipt, public detail/feed checks and search/registry synchronisation are separate boundaries. A build alone is never a live-publication receipt.

Operational health reports flag stale/failed/unobserved sources and urgent cancellation, conflict and expiry reviews. The admitted-source Docker daemon and both chosen alert channels (private dashboard and Codex) passed independent 10/10 operations acceptance on 4 October 2026 after observed scheduled cycles, actual notification delivery and recovery drills. Comprehensive source coverage and new-listing approvals remain separate open gates.

Independent grading audit reopened the data, verification, visuals and editorial major-stage gates. Earlier component-only 9/10 receipts were insufficient. Rubric version 2 makes comprehensive retrieval/series coverage, a manually verified sample, real asset discovery/inspection and complete editorial pathways/capacity hard requirements. Subsequent integration work is preparatory, not acceptance or permission to release.

PDF retrieval now supports explicitly admitted sources with public-host, DNS, size and PDF-signature checks. pdf_review.py validates the raw snapshot hash and extracts bounded, page-linked text (50 pages / 200k characters). Text remains unverified; render and inspect relevant pages before interpreting layout or artwork. The official Western Port Writes programme has been captured and its cover inspected privately. Pagination and automatic session extraction remain incomplete.

Bounded weekly/monthly materialisation now creates stable per-occurrence identities and applies explicit cancellation, reschedule and venue exceptions. Unsupported cadence, off-series exceptions and capacity overflow fail to review. Closing dates, supplied times/organiser/accessibility and series contracts require their own official proofs. Approved explicit series now carry exact sessions through calendar, detail, homepage and feeds. Reschedules and changed venue/time details use the same resolver; unsupported contracts remain held for review. Full build and browser acceptance are recorded separately.

Official library and gallery HTML adapters now preserve source selectors and explicit machine dates without guessing prose. Seven normally paginated library pages yielded 68 distinct detail URLs. The merged register yielded 102 admitted HTML detail pages retrieved or reused from fresh captures, with 782 quarantined candidate occurrences. These include historical occurrences and unverified locations; they are not approved listings or evidence of regional completeness. Details advance in bounded fair batches, reuse fresh evidence, back off failures and retain an explicit remaining queue. Packet refresh preserves human edits and proofs; changed or missing extractions require a new source review before approval. Private review hides historical occurrences initially and exposes captured evidence and verification failures.

Geographic research now uses the current official Vicmap Admin WFS advertised in the DataVic LGA/locality catalogs. Captured Shire polygon identity is Mornington Peninsula Shire, ABS code 25340; source bodies and hashes stay private. geography.mjs rejects altered, stale, wrong-CRS and wrong-jurisdiction boundaries, evaluates holes and islands, and holds points within an operational 20-metre border buffer for review. This buffer is a conservative workflow setting, not a claim of map accuracy. Existing CMS coordinates are advisory only and do not inherit verification. Supplied canonical coordinates need field proof; when a boundary snapshot is nominated, an outside/border/invalid assessment vetoes approval.

The private locality assessment found 40 substantial polygon intersections plus two tiny border overlaps requiring review. The operational 1 percent overlap threshold uses approximate planar degree areas, is explicitly a heuristic, and does not declare legal locality membership. Pearcedale and every venue still require exact coordinates and human confirmation. The catalog covers bounded localities, not every neighbourhood. Run geography_review.py with Shapely 2.1.2 installed in an isolated environment to regenerate topology review; no boundary correction is made silently.

Source expansion now inspects the 104 unique website hosts seeded from existing venues in bounded batches, preserves actual same-host calendar/workshop/offer navigation, and records failed or redirected sources for review. These website captures remain unverified sources pending identity, geography and access assessment. Root pages without Event structured data do not establish absence of events. No source inspection approves or publishes a listing.

The grader supports requireHashedEvidence rubrics: every passing check must then reference readable workspace evidence with a matching SHA-256. Changed, missing or outside-workspace references fail the check. Existing v2 score receipts remain manually assessed and do not yet claim cryptographically bound acceptance. Hash integrity proves the referenced artifact has not changed; it does not prove the assessor's conclusion is correct.

Current continuation checkpoint: 914 quarantined candidates and 146 retained evidence snapshots. The cleaned admitted detail queue contains 122 URLs and has completed retrieval/cache re-extraction. Captured failures and removed malformed leads remain private historical evidence. Shire extraction uses explicit machine dates and leaves every value unverified. Generic discovery now parses actual anchors, excludes script/template text, fragments, assets and shortcode placeholders. Registered official navigation captures must match their retained body hash before source-specific discovery. Source/navigation research never grants factual or geographic approval.

Series and exception checks now pass on positive tests of actual website functions. Data retrieval remains below acceptance because comprehensive source retrieval and geographic coverage are unresolved; the major-stage gate must not advance.
