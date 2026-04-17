# Peninsula Insider — Daily Accuracy Scan & Autofix Spec

**Prepared for:** James Richmond  
**Prepared by:** Remy  
**Date:** 14 April 2026  
**Status:** Approved implementation spec  
**Purpose:** Define the daily Peninsula Insider accuracy scan, low-risk autofix policy, approval reporting workflow, and cron orchestration model.

---

## 1. Decision

Peninsula Insider will run a **daily morning accuracy sweep**.

The system will:
1. scan for live accuracy issues
2. classify each issue by risk and confidence
3. auto-fix low-risk factual drift
4. hold consequential changes for approval
5. post a short morning summary into the Peninsula Insider Telegram thread
6. save the full report in both:
   - the repo
   - Mission Control Docs

This is now a standing operational rule.

---

## 2. Why this exists

Peninsula Insider's main quality risk is no longer lack of content.
It is **drift**.

Typical failure modes:
- expired events still surfacing live
- wrong dates on homepage cards
- dispatch copy recommending things that no longer line up with the actual calendar
- stale seasonal framing
- featured event slots showing already-past items
- internal mismatches between structured event data and written editorial copy
- old weekend dispatches remaining the de facto front-door event logic

These are not catastrophic individually.
But together they erode trust.

A daily accuracy engine prevents that decay.

---

## 3. Workflow overview

### New daily sequence

1. **`pi-daily-accuracy-scan`**
   - checks the live and source-state surfaces for accuracy issues
   - creates a structured report
   - classifies each issue
   - posts a short channel summary

2. **`pi-daily-accuracy-autofix`**
   - only acts on items marked **safe auto-fix**
   - applies low-risk factual corrections
   - rebuilds and republishes if changes are made
   - logs what changed
   - posts a second summary only when actions were taken or approval is needed

3. **existing editorial jobs continue**
   - events scan
   - venue healthcheck
   - seasonality refresh
   - build draft
   - QA and publish

The accuracy layer becomes an upstream hygiene pass rather than a replacement for editorial work.

---

## 4. What the accuracy scan checks

### A. Event freshness drift
- event end dates in the past still surfacing on homepage / What’s On / related modules
- weekend anchor events that have already finished
- dispatch references to expired or wrong-date events

### B. Homepage and What’s On alignment
- homepage featured events inconsistent with live event data
- What’s On editor's picks not aligned to the next live weekend window
- stale event cards dominating front-door surfaces

### C. Dispatch drift
- `Peninsula This Weekend` copy pointing to events that do not occur on the named dates
- fallback/backup recommendations with invalid event timing
- “coming up next weekend” sections that are no longer current

### D. Structured vs editorial mismatch
- article says one thing, structured event record says another
- venue or event dates inconsistent across source files
- bookability / recurrence wording mismatched with source metadata

### E. Link and route integrity
- dead internal links
- obvious broken outbound booking links where detectable
- route references to moved / deleted pages

### F. Seasonal and context drift
- summer-coded copy still on front-door surfaces in winter shoulder period
- school-holiday framing after the holiday window ends
- event/event-category framing that no longer matches the calendar

---

## 5. Classification model

Every issue found must be put into one of three buckets.

## Bucket 1 — Safe auto-fix
Criteria:
- factual, low-risk, high-confidence
- does not materially alter editorial judgement
- can be resolved from already-trusted structured data

Examples:
- remove or de-prioritise expired event cards
- update date strings on homepage cards
- remove past-tense event promos from active surfaces
- correct internal route references
- realign next-weekend modules to the correct date window
- swap stale event cards for still-valid ones using existing event metadata

Action:
- auto-fix immediately in `pi-daily-accuracy-autofix`

## Bucket 2 — Needs approval
Criteria:
- changes the editorial framing, recommendation hierarchy, or featured emphasis in a meaningful way
- high confidence that something is wrong, but correction changes the story rather than just the data

Examples:
- replacing the lead event recommendation for the weekend
- changing homepage editorial framing
- removing a featured piece because it is no longer defensible
- materially changing event ranking or “worth the drive” emphasis

Action:
- do not auto-publish
- report here for approval

## Bucket 3 — Needs verification
Criteria:
- source confidence is weak
- the correct answer is not obvious from existing trusted data
- external checking is needed

Examples:
- unclear booking availability
- ambiguous reschedule / cancellation
- conflicting event date information across sources
- weak confidence in partner / venue status

Action:
- flag for human or verifier review
- no auto-fix

---

## 6. Reporting model

### Repo output
Create:
- `reports/peninsula-accuracy-scan-YYYY-MM-DD.md`
- `reports/peninsula-accuracy-autofix-YYYY-MM-DD.md` when fixes are applied

### Mission Control Docs
Every report must also be filed to Mission Control Docs.
This follows the standing rule that all created docs must exist in both places.

### Telegram summary to this channel
Every morning run should send a concise thread summary.

### Summary format

Example:

- Accuracy scan complete
- 4 issues found
- 2 auto-fixed
- 1 needs approval
- 1 needs verification

Approval required for:
- replacing homepage lead event from X to Y

Auto-fixed:
- removed expired event card
- corrected stale date on What’s On module

This keeps James informed without flooding the channel.

---

## 7. Cron design

## Job 1 — `pi-daily-accuracy-scan`
### Recommended schedule
- **20:20 UTC daily**
- this lands in the Melbourne morning window
- runs before the rest of the Peninsula editorial jobs

### Responsibilities
- inspect live and source-state Peninsula surfaces
- identify drift
- classify issues
- write report to repo
- file report to Mission Control Docs
- send short Telegram thread summary

### Deliverable
- no edits by default
- this is the detection and classification layer

## Job 2 — `pi-daily-accuracy-autofix`
### Recommended schedule
- **20:35 UTC daily**
- shortly after the scan

### Responsibilities
- read the scan report
- apply only `safe auto-fix` changes
- rebuild and republish if changes were made
- write autofix report to repo
- file autofix report to Mission Control Docs
- send summary to the Peninsula Insider Telegram thread
- if an approval issue exists, surface it clearly in the message

### Deliverable
- low-risk live corrections without waiting
- approval items held out of the patch

---

## 8. Interaction with the current editorial pipeline

This new layer does **not** replace:
- events scan
- venue healthcheck
- build draft
- QA/publish

Instead it improves them by preventing obvious drift from accumulating between bigger editorial passes.

Recommended daily order:
1. `pi-daily-accuracy-scan`
2. `pi-daily-accuracy-autofix`
3. `pi-daily-events-scan`
4. `pi-daily-venue-healthcheck`
5. `pi-daily-seasonality-refresh`
6. `pi-daily-build-draft`
7. `pi-daily-qa-and-publish`

This gives the pipeline a cleaner starting state every morning.

---

## 9. Messaging posture

### Approval philosophy
Peninsula Insider should move fast.
That means:
- factual low-risk corrections should not wait
- editorially meaningful changes should be surfaced here for approval
- ambiguous source issues should be flagged honestly, not guessed

### Standing behavioural rule
If the scan finds only low-risk issues:
- fix them
- publish
- report after action

If the scan finds approval-level issues:
- hold those specific changes
- message this thread with the exact recommendation
- continue auto-fixing the safe subset

---

## 10. Minimum issue checklist for the scan agent

The scan must check at least these surfaces every day:
- homepage
- What’s On hub
- current weekend dispatch
- next upcoming event anchors
- live featured event slots
- event files in `next/src/content/events`
- relevant dispatch/article files in `next/src/content/articles`

And it must check for at least these issue types:
- expired end date still live
- event not occurring in named date window
- homepage/event-hub inconsistency
- stale “coming up” section
- incorrect fallback or backup recommendation
- weak internal link reference
- drift between event structured record and dispatch copy

---

## 11. Success criteria

This system is working if:
- already-past events stop appearing prominently on live surfaces
- weekend dispatches remain aligned with the real calendar
- homepage and What’s On stay synchronised
- James gets a quick daily thread summary instead of discovering errors manually
- low-risk fixes ship automatically without waiting for human intervention
- approval-worthy editorial changes are surfaced clearly and quickly

---

## 12. Final recommendation

Implement this immediately.

This is the right kind of automation:
- high leverage
- low romance
- directly trust-protective
- exactly the sort of operating layer a live editorial product needs

The publication does not just need more content.
It needs a **daily truth-maintenance loop**.

This accuracy scan is that loop.
