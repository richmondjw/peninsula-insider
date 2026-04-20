# Peninsula Insider — Peninsula This Weekend Operating System

**Prepared for:** James Richmond  
**Prepared by:** Remy  
**Date:** 20 April 2026  
**Status:** Operating system / recurring publishing model  
**Purpose:** Turn *Peninsula This Weekend* from an ad hoc weekly article into a flagship recurring editorial product with a locked-in workflow, dated archive structure, QA rules, and recurring cron-backed publishing rhythm.

---

## 1. Product Definition

**Peninsula This Weekend** is not just another Journal article.

It is a flagship recurring Peninsula Insider product.

Its job is to give readers one clear, trusted place to understand:
- what kind of weekend this is
- what is worth doing
- what is overhyped or stale
- how to shape the strongest Peninsula day or weekend
- what to do if weather, energy, kids, or logistics change the plan

This makes it:
- a trust product
- a repeat-visit habit product
- a newsletter-supporting product
- a front-door editorial product
- a differentiator against generic event lists and tourism feeds

---

## 2. Editorial Standard

Each weekly dispatch should feel:
- curated
- current
- useful
- confident
- Peninsula-specific
- structured like a good recommendation from someone who knows the region

It should not feel like:
- a generic event list
- a tourism-board bulletin
- a thin SEO roundup
- a listicle made from copying other calendars

The dispatch should always answer:
- what is the actual best move this weekend?
- what is the strongest alternative?
- what shape should the weekend take?
- what is the useful fallback if conditions change?
- what should readers skip?

---

## 3. Required Recurring Structure

Every edition should follow this core structure.

### 3.1 What kind of weekend this is
Open with the editorial read on the weekend itself.
Examples:
- reflective weekend
- big cultural weekend
- family-heavy weekend
- weather-fragile weekend
- slow luxury weekend
- event-led weekend

### 3.2 The anchor pick
The clearest top recommendation.
This is the one thing the reader should do if they only do one thing.

### 3.3 The strongest alternative
Usually the cultural or style-shift alternative.
Not just “another event”, but the best second lane.

### 3.4 The best day shape
Explain how to turn the weekend into a coherent Peninsula day.
This is where itinerary logic matters.

### 3.5 The fallback
What to do if:
- weather turns
- kids are involved
- the household energy drops
- the best booking is gone

### 3.6 One local edge
The under-published thing, local angle, or strategic insight readers are less likely to get elsewhere.

### 3.7 Skip this
One clear thing to avoid, overcomplication to resist, or weak temptation to ignore.

### 3.8 Peninsula Insider verdict
A short, confident closing frame that gives the weekend its final shape.

---

## 4. URL and Archive Discipline

This product should use a clean recurring archive model.

### 4.1 Every dispatch gets its own dated URL
Recommended slug model:
- `/journal/peninsula-this-weekend-YYYY-MM-DD/`

Example:
- `/journal/peninsula-this-weekend-2026-04-24/`

### 4.2 Old weekends remain live as archives
Do not overwrite old weekend dispatches on stale slugs.

### 4.3 Future stable current-week surface
Later, create:
- `/this-weekend/`

This stable surface should point to or mirror the latest active dispatch.

### 4.4 Archive value
Archived weekend dispatches provide:
- editorial memory
- event pattern learning
- internal retrieval value
- SEO archive value
- repeatable reference for future weekends and recurring events

---

## 5. Weekly Workflow

### Sunday evening — research scan
Goal:
Build the candidate pool.

Must include:
- events calendar scan
- recurring event scan
- cultural opportunities
- weather-proof options
- family-safe options
- slower luxury options
- local under-published angle

If the first scan is thin, run a broader second scan.

### Sunday evening — shortlist and weekend shape
Goal:
Decide what kind of weekend this is.

Output:
- anchor pick
- strongest alternative
- best day shape
- fallback
- local edge
- skip note

### Sunday night — draft generation
Goal:
Write the full dispatch in the recurring structure.

### Sunday night — editorial review
Goal:
Strengthen tone, tighten hierarchy, and remove weak filler.

Checks:
- stale items removed
- links accurate
- recommendations genuinely worth doing
- fallback useful, not token
- verdict strong

### Monday morning — publish and verify
Goal:
Build, publish, verify live.

Checks:
- homepage reflects current dispatch
- current weekend page is live
- old dispatches remain archived
- no stale date mismatch

---

## 6. Delegation Model

This product should not depend on one thread or one brain.

### Lane 1 — Research
Find the strongest credible options.

### Lane 2 — Structure
Determine the weekend shape and editorial hierarchy.

### Lane 3 — Copy
Write the strongest edition.

### Lane 4 — Publisher
Merge, build, publish, and verify.

This is the preferred operating pattern for future editions.

---

## 7. QA Gate

No dispatch should publish if any of the following are unresolved:
- stale event date
- weak or generic lead
- unclear weekend shape
- poor fallback
- wrong URL date
- weak internal linking
- recommendations that feel copied rather than curated
- homepage / article mismatch
- live route not externally verified

---

## 8. Recommended Cron Jobs

These should be added to the Peninsula ops system.

### pi-weekly-dispatch-research-scan
**Cadence:** Sunday 08:30 UTC  
**Purpose:** Build the broad candidate pool for the coming weekend

### pi-weekly-dispatch-shape-and-shortlist
**Cadence:** Sunday 09:15 UTC  
**Purpose:** Decide the editorial weekend shape, lead, alternatives, fallback, local edge, and skip

### pi-weekly-dispatch-draft
**Cadence:** Sunday 10:00 UTC  
**Purpose:** Generate the first full dispatch draft in the recurring structure

### pi-weekly-dispatch-review-and-tighten
**Cadence:** Sunday 10:45 UTC  
**Purpose:** Editorial polish, stale check, and recommendation tightening

### pi-weekly-dispatch-publish
**Cadence:** Monday 07:00 UTC  
**Purpose:** Build, publish, verify, and update current-week surfaces

### pi-weekly-dispatch-social-production
**Cadence:** Immediately after successful `pi-weekly-dispatch-publish` (fallback window: Monday 07:10 UTC)  
**Purpose:** Run the full social production workflow only after the live weekly dispatch URL is confirmed

**Actions:**
- invoke `peninsula-social-production`
- use the final live dispatch URL as the canonical flagship social destination
- generate or refresh weekly social copy, creative, review board, publishing pack, and PNG posting assets
- ensure every post includes a destination URL and platform-appropriate hashtag treatment
- prepare the publishing-ready handoff pack for Instagram, Facebook, and LinkedIn

### pi-weekly-dispatch-archive-rollover
**Cadence:** Monday 07:20 UTC  
**Purpose:** Confirm the new dispatch is current, archive previous dispatch cleanly, and maintain dated URL integrity

---

## 9. Success Standard

A successful weekly dispatch should feel like:
- the smartest 3–5 minutes a reader spends deciding what to do this weekend
- a better recommendation product than generic listings sites
- one reason to return to Peninsula Insider every week

If done well, this becomes one of the most important recurring editorial products in the publication.

---

## 10. Final Recommendation

**Peninsula This Weekend** should now be institutionalised as:
- a recurring flagship editorial product
- a dated archive system
- a Sunday-night to Monday-morning workflow
- a cron-backed weekly operating system
- a delegated research → structure → copy → publish product line

This is the right model for trust, consistency, and scale.
