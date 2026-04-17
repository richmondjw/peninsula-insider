# Peninsula Insider — Daily Link Audit Spec

**Prepared for:** James Richmond  
**Prepared by:** Remy  
**Date:** 16 April 2026  
**Status:** Approved implementation spec  
**Purpose:** Define the daily broken-link audit, safe internal rewire policy, reporting workflow, and cron orchestration for Peninsula Insider.

---

## 1. Decision

Peninsula Insider will run a **daily internal link audit** as part of the morning maintenance stack.

The system will:
1. scan built and source surfaces for broken internal links
2. classify each broken link by confidence and risk
3. auto-fix obvious internal rewires where the target is clear
4. hold ambiguous changes for approval or verification
5. post a short summary into the Peninsula Insider Telegram thread
6. save the full report in both:
   - the repo
   - Mission Control Docs

---

## 2. Why this exists

Broken links weaken trust in exactly the same way that stale dates and image mismatches do.

Typical failure patterns:
- old place slugs after content restructuring
- route moved from `/eat/` to `/stay/` or `/wine/`
- renamed journal or experience pages
- internal cards linking to undefined or deleted paths
- older editorial pieces pointing to routes that no longer exist

These are often easy to fix, but only if they are checked systematically.

---

## 3. Workflow overview

### New daily sequence contribution

1. **`pi-daily-link-audit`**
   - scans internal links across the built and source surfaces
   - identifies broken routes
   - classifies them by confidence level
   - writes a report
   - optionally applies safe rewires if enabled by policy
   - posts a summary into the Peninsula Insider Telegram thread

This job complements:
- accuracy scan
- image relevance scan
- events scan
- venue healthcheck

---

## 4. What the link audit checks

### A. Built internal route integrity
- homepage links
- What’s On links
- journal card links
- inline editorial links
- nav/footer links

### B. Source-to-live route alignment
- source links in Astro pages/articles
- whether the target route exists in live output

### C. Known failure classes
- wrong section prefix (`/eat/`, `/stay/`, `/wine/`, `/places/`, `/explore/`)
- renamed place slugs
- old article references
- undefined journal targets
- category paths pointing at the wrong content type

---

## 5. Classification model

## Bucket 1 — Safe rewire
Criteria:
- high-confidence internal fix
- target clearly exists
- changing the link does not materially change editorial meaning

Examples:
- `/places/red-hill-south` → `/places/red-hill`
- `/eat/flinders-hotel` → `/stay/flinders-hotel`
- `/wine/ten-minutes-by-tractor` → `/eat/ten-minutes-by-tractor`

Action:
- auto-fix permitted

## Bucket 2 — Needs approval
Criteria:
- more than one plausible replacement target
- changing the link might shift the meaning or recommendation materially

Examples:
- deleted venue with several alternative options
- general guide link where the original specific target no longer exists

Action:
- report in thread, do not auto-fix

## Bucket 3 — Needs verification
Criteria:
- no clear target exists
- destination content may be missing entirely
- uncertainty whether the linked resource should still exist

Action:
- flag for manual review

---

## 6. Reporting model

### Repo output
Create:
- `reports/peninsula-link-audit-YYYY-MM-DD.md`

### Mission Control Docs
Every report must also be filed to Mission Control Docs.

### Telegram summary to this thread
Daily concise summary:
- broken links found
- safe rewires applied
- approval items held
- verification items still open

Example:
- Link audit complete
- 7 broken links found
- 5 auto-rewired
- 1 needs approval
- 1 needs verification

---

## 7. Cron design

## Job — `pi-daily-link-audit`
### Recommended schedule
- **21:20 UTC daily**
- Melbourne morning / late-morning maintenance window

### Responsibilities
- inspect internal links across built and source surfaces
- identify missing routes
- classify by confidence
- apply safe rewires where obvious
- rebuild and publish if changes were made
- write report to repo
- file report to Mission Control Docs
- send short Telegram summary

---

## 8. Position in the daily stack

Recommended order:
1. `pi-daily-accuracy-scan`
2. `pi-daily-accuracy-autofix`
3. `pi-daily-image-relevance-scan`
4. `pi-daily-image-relevance-autofix`
5. `pi-daily-link-audit`
6. `pi-daily-events-scan`
7. `pi-daily-venue-healthcheck`
8. `pi-daily-seasonality-refresh`
9. `pi-daily-build-draft`
10. `pi-daily-qa-and-publish`

---

## 9. Success criteria

This system is working if:
- obvious internal broken links stop persisting on live surfaces
- route-refactor drift is corrected daily
- the homepage / What’s On / Journal front door remain internally coherent
- James gets a short summary without needing to manually discover link rot

---

## 10. Final recommendation

Implement this as a standard trust-maintenance layer.

Peninsula Insider is now a live editorial product. Broken links are not housekeeping, they are product defects.

A daily link audit is the correct operating response.
