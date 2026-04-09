# Peninsula Insider Cron Activation Checklist

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
Publishing jobs should only auto-publish low-risk updates:
- event rollovers
- expired event removals
- date corrections
- minor copy refreshes

Require explicit review for:
- new lead story
- homepage structural change
- major section rewrite
- commercial / affiliate framing changes

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
- low-risk freshness updates can move through QA and publish
- weekly writing output compounds the authority layer
