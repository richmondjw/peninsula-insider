# Peninsula Insider Cron Activation Checklist

## 2026-04-14 update — Daily accuracy layer approved

Add and activate two new upstream jobs in the Peninsula schedule:
- `pi-daily-accuracy-scan` — daily 20:20 UTC
- `pi-daily-accuracy-autofix` — daily 20:35 UTC

Purpose:
- detect homepage / What’s On / dispatch drift every Melbourne morning
- auto-fix low-risk factual issues
- post approval summaries to the Peninsula Insider Telegram thread for anything consequential
- save both reports to repo + Mission Control Docs


## Goal
Move Peninsula Insider from a paper cron plan to a real operating system.

## Ready now
- job definitions exist in `ops/editorial-jobs.json`
- operating model exists in `docs/editorial-ops-system-2026-04-09.md`
- output/report conventions already exist under `reports/`
- preview and live surfaces now exist to receive updates

## Next activation steps

### 1. Wire each job to an actual runner
For each job, define:
- trigger
- command or agent prompt
- expected report output
- Mission Control logging behavior

### 2. Create the recurring parent task in Mission Control
Suggested parent workflow:
- **Peninsula Insider Editorial Engine**

Child loops:
- Daily freshness loop
- Weekly editorial loop
- Weekly evergreen expansion loop

### 3. Enforce output discipline
Every run should produce one of:
- report filed to `reports/`
- repo diff / draft change
- explicit no-change summary
- blocker note

### 4. Add approval gates
Use a tiered approval model rather than a single blanket rule.

**Tier 1 — low-risk operational**
Can auto-publish, bulk-publish, or system-publish when changes do not materially affect editorial positioning, recommendations, trust, or factual interpretation.

Examples:
- event rollovers
- expired event removals
- date corrections
- broken link fixes
- metadata/taxonomy corrections
- minor governed refreshes

**Tier 2 — medium-risk**
Require light editorial review.

Examples:
- homepage/module reshuffles with meaningful emphasis change
- recommendation-adjacent utility updates
- notable inclusions/exclusions on service surfaces
- meaningful evergreen copy reframing

**Tier 3 — high-risk editorial/strategic**
Require founder-led editorial approval.

Examples:
- new lead story
- Journal pieces
- Peninsula This Weekend final editorial recommendation product
- homepage structural change
- major section rewrite
- commercial / affiliate framing changes
- strategic positioning changes

Every publish job must declare its default tier, approver path, notification path, and ledger-write behaviour.

Initial repo implementation:
- JSONL log: `ops/publication-ledger/entries/YYYY-MM.jsonl`
- readable index: `ops/publication-ledger/index.csv`
- append/validate script: `ops/scripts/publication-ledger.py`

### 5. Connect the preview workflow
Publishing logic should support:
- preview-only updates to `/preview/`
- later live cutover when approved

## Recommended weekly editorial minimums
- 2 new Journal/story ideas
- 1 new or expanded place hub
- 1 new list or service update in Eat/Stay/Explore/Wine/Escape
- 1 homepage freshness pass

## Definition of operational
Peninsula Insider cron support is truly operational when:
- the daily loop runs without manual prompting
- reports are generated consistently
- Mission Control shows the workflow state
- low-risk freshness updates can move through QA and publish autonomously
- medium- and high-risk work stops at the correct review gate
- every live change is captured in one publication ledger
- weekly writing output compounds the authority layer
