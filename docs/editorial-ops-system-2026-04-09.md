# Peninsula Insider Editorial Ops System

Date: 2026-04-09
Status: active operating design
Scope: research, writing, refresh, QA, and publish support for Peninsula Insider

## Objective
Turn Peninsula Insider from a static tourism site into a living media platform with repeatable editorial inputs.

## Approval and publishing model

Peninsula Insider now operates on a **tiered approval model** based on editorial and operational risk.

### Tier 1 — Low-risk operational changes
These may be **auto-approved, bulk-approved, or system-approved** when they do not materially affect editorial positioning, recommendations, trust, or factual interpretation.

Typical examples:
- expired event removals
- date/time corrections
- broken link fixes
- metadata and taxonomy corrections
- low-risk factual maintenance
- routine structured refreshes already governed by existing rules

**Default publish mode:** autonomous publish  
**Human role:** notified after publish  
**Record requirement:** mandatory publish ledger entry + verification log

### Tier 2 — Medium-risk updates
These require **light editorial review** before publish.

Typical examples:
- homepage or module reshuffles that materially change emphasis
- new inclusions or exclusions on utility surfaces
- recommendation-adjacent copy changes
- meaningful reframing of evergreen/service surfaces without becoming full opinion or Journal work

**Default publish mode:** hold for light editorial review  
**Human role:** approve/reject/tighten  
**Record requirement:** mandatory proposed-change record + publish ledger entry + verification log

### Tier 3 — High-risk editorial and strategic content
These always require **founder-led editorial approval**.

Typical examples:
- Journal pieces
- Peninsula This Weekend final editorial recommendation product
- opinion and perspective-led writing
- major recommendation changes
- new editorial products
- strategic positioning changes

**Default publish mode:** approval-required  
**Human role:** founder/editorial sign-off before publish  
**Record requirement:** mandatory approval record + publish ledger entry + verification log

## Publication ledger requirement

All publish-capable workflows, whether autonomous or approval-gated, must write to one **canonical publication ledger** at `ops/publication-ledger/`.

Minimum fields:
- timestamp
- job name
- agent/owner
- content type
- canonical URL or file path
- change summary
- risk tier
- approval mode
- approved by (if applicable)
- publish result
- post-publish verification result
- rollback reference (if applicable)

This ledger is the single source of truth for what changed, when it changed, why it changed, and under which approval rule it moved.

## Operating loops

### 1. Daily events desk
**Purpose:** keep What's On, homepage event modules, and event-sensitive itinerary references current.

**Cadence:** daily

**Outputs:**
- `reports/peninsula-events-brief-YYYY-MM-DD.md`
- updates to `reports/peninsula-whats-on.json`
- publish recommendations for `whats-on.html`, homepage, and itinerary surfaces

**Core checks:**
- new events worth adding
- expired events to remove/demote
- date/time/location verification
- featured event candidates for homepage

### 2. Daily venue health desk
**Purpose:** detect closures, broken links, booking drift, and obvious stale venue facts.

**Cadence:** daily for key listings, weekly for broader surface area

**Outputs:**
- `reports/peninsula-venue-health-YYYY-MM-DD.md`
- flagged venues for manual correction
- confidence notes on booking links and closure risk

### 3. Daily seasonality and local relevance desk
**Purpose:** keep recommendations season-aware, weather-aware, and month-aware.

**Cadence:** daily

**Outputs:**
- `reports/peninsula-insider-daily-YYYY-MM-DD.md`
- recommended swaps for seasonal cards, market picks, rainy-day ideas, shoulder-season advice

### 4. Daily build-draft desk
**Purpose:** convert research into low-risk editorial recommendations and draft updates.

**Cadence:** daily

**Outputs:**
- `reports/peninsula-build-draft-YYYY-MM-DD.md`
- target file list
- recommended additions/removals/refreshes

### 5. Daily QA and publish desk
**Purpose:** gate changes before they go live.

**Cadence:** daily when edits exist

**Outputs:**
- `reports/peninsula-qa-publish-YYYY-MM-DD.md`
- deploy confirmation
- rollback notes if needed

### 6. Weekly editorial commissioning loop
**Purpose:** keep the platform feeling alive with fresh service journalism and destination pieces.

**Cadence:** weekly

**Outputs:**
- at least 2 new Journal/article concepts
- 1 fresh place/area guide enhancement
- 1 fresh list/story package for Eat, Stay, Explore, Wine, or Escape
- `reports/peninsula-weekly-editorial-YYYY-MM-DD.md`

## Active recurring jobs

### Research / refresh jobs
1. `pi-daily-accuracy-scan`
2. `pi-daily-accuracy-autofix`
3. `pi-daily-events-scan`
4. `pi-daily-venue-healthcheck`
5. `pi-daily-seasonality-refresh`
6. `pi-daily-build-draft`
7. `pi-daily-qa-and-publish`
8. `pi-weekly-editorial-commissioning`
9. `pi-weekly-evergreen-expansion`

### Publishing philosophy
- Daily loop updates service surfaces and short-horizon freshness.
- Weekly loop expands evergreen authority and Journal depth.
- Nothing meaningful stays trapped in reports forever, it must either become:
  - a site update
  - a queued editorial task
  - or an explicit reject/defer decision

## Recommended ownership model
- **Remy:** orchestration, publish priorities, QA, task routing
- **Events desk:** what's on and dated freshness
- **Venue verifier:** drift detection, opening/booking/closure checks
- **Seasonality desk:** local timing, weather, shoulder-season logic
- **Editorial desk:** article briefs, list ideas, refresh recommendations
- **Publisher:** repo changes, preview builds, deploy checks

## Mission Control requirements
Every meaningful recurring run should:
- update or attach to a Peninsula Insider parent workflow task
- log meaningful activity events
- file produced reports as documents
- surface blockers clearly
- write or update the canonical publication ledger when a publish-capable workflow changes live state

## Operational enforcement rules
- No publish-capable job should invent its own approval standard; it must inherit one of the three approval tiers.
- Autonomous publishing is allowed only for Tier 1 changes.
- Tier 2 changes must stop at light editorial review.
- Tier 3 changes must stop at founder-led editorial approval.
- Notification is not a substitute for logging; every live mutation must leave a durable record.
- Verification is mandatory for every live publish, regardless of approval tier.

## Minimum viable operating rhythm
### Daily
- accuracy scan
- low-risk accuracy autofix
- events scan
- venue drift scan
- seasonality refresh
- draft build recommendations
- QA/publish if changes are ready

### Weekly
- editorial commissioning
- evergreen guide expansion
- homepage and nav curation review
- top-20 venue confidence review

## Success criteria
This system is working when:
- homepage and What's On never feel stale
- broken venue links are caught quickly
- Journal gains new pieces every week
- seasonality advice changes with reality
- every live publish is traceable in one ledger
- approval effort is concentrated on medium- and high-risk work
- Peninsula Insider feels alive, not frozen
