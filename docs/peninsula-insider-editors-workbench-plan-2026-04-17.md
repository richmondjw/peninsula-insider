# Peninsula Insider — Editor’s Workbench Plan

**Prepared for:** James Richmond  
**Prepared by:** Remy  
**Date:** 17 April 2026  
**Status:** Approved execution brief  
**Purpose:** Define the product, architecture, operating role, and phased implementation plan for a live editorial command centre for Peninsula Insider.

---

## 1. Core recommendation

Yes, we should build this.

Peninsula Insider now has enough moving parts that docs, cron jobs, and ad hoc chat fixes are no longer sufficient as the main operating surface.

What is needed is a live editorial operating environment:

# **Peninsula Insider Editor’s Workbench**

A command centre for running the publication as a product.

Not just a CMS.
Not just an admin page.
Not just a queue.

A real operational surface that helps you:
- see what matters now
- know what is stale or broken
- know what is ready to publish
- track active verticals and content hubs
- control the publication without hunting through files, reports, and chat history

---

## 2. Why it matters now

Peninsula Insider already has:
- a live site
- recurring editorial cron jobs
- research/build/QA/publish flows
- image relevance work
- accuracy scans
- broken-link audits
- multiple verticals (golf, dogs, events, places, journal)

That means the system is now strong enough to justify a **Workbench layer**.

Without it, the operating pattern becomes:
- issue detected in chat
- search docs/files/reports
- guess state
- patch it manually
- lose visibility again

With the Workbench, the operating pattern becomes:
- open one surface
- see truth
- take action
- track outcome

---

## 3. Product definition

### Working name
**Editor’s Workbench**

### Alternative names
- Peninsula Desk
- Peninsula Command Centre
- Editorial Operations Console

### Recommendation
Use **Editor’s Workbench**.
It is strong, clear, and product-feeling without sounding corporate or overbuilt.

---

## 4. What the Workbench should do

## A. Surface live editorial state
The Workbench should show:
- what is live
- what is being drafted
- what is queued
- what is blocked
- what is stale
- what is missing verification

## B. Surface site health
It should pull together:
- stale-date issues
- broken links
- image mismatches
- duplicate-image collisions
- missing metadata / OG images / schema
- old event references still present in copy

## C. Surface content-hub completeness
Each major vertical should have a visible completeness state.
For example:
- Golf
- Dog-Friendly Peninsula
- What’s On
- Places
- Eat
- Stay
- Wine

The Workbench should show:
- number of live pages
- missing sections
- verification gaps
- image gaps
- metadata gaps
- internal link gaps

## D. Surface approvals and intervention points
This is where James should see:
- what needs approval
- what can auto-fix
- what is blocked waiting for better source material

## E. Surface publish readiness
For any page or package, it should answer:
- is it ready to publish?
- what is missing?
- what is weak?
- what still needs verifying?

---

## 5. Core modules

## 1. Editorial Queue
Shows:
- researching
- drafting
- verifying
- SEO review
- QA gate
- ready to publish
- published recently

## 2. Site Health
Shows:
- accuracy alerts
- stale event alerts
- broken-link alerts
- image relevance alerts
- duplicate-image alerts
- metadata/schema/OG gaps

## 3. What’s On Control Panel
Shows:
- current live weekend window
- next weekend window
- active homepage event anchors
- active What’s On event anchors
- expired events still referenced
- dispatch status

## 4. Hub Tracker
For each content hub / vertical:
- page count
- completion score
- missing pages
- verification coverage
- image coverage
- metadata coverage
- SEO readiness

## 5. SEO & Metadata Panel
Shows:
- missing meta descriptions
- missing OG images
- missing schema
- duplicate or weak titles
- focus phrase coverage
- canonical issues

## 6. Publisher Console
Shows:
- recommended actions today
- safe auto-fixes available
- manual fixes required
- publish candidates
- recently deployed changes

---

## 6. Dog hub inside the Workbench

The Dog-Friendly Peninsula hub should become one of the first tracked verticals.

### Dog hub fields to track
- core hub page live?
- beaches page live?
- venues page live?
- accommodation page live?
- walks page live?
- daycare/boarding page live?
- emergency vet page live?
- rainy-day page live?
- best towns page live?

### Additional tracking
- image quality score
- metadata completeness
- dog-policy verification coverage
- internal links from relevant places/stays/venues
- dog-friendly data flag backfill progress

This gives the hub a real operating state instead of becoming another doc that quietly drifts.

---

## 7. Architecture recommendation

## Phase 1 implementation surface
Use the existing Mission Control / internal app stack rather than inventing a separate dashboard from scratch.

Recommended stack:
- existing Mission Control front-end or adjacent internal app surface
- Supabase tables/views for health, queue, and hub status
- file-derived or report-derived ingestion where needed initially
- lightweight APIs/jobs to sync current system truth into the Workbench

### Why
Fastest route to usefulness.
No need to design an entirely separate ops app if Mission Control can host or absorb the first version.

---

## 8. Data model ideas

### Workbench entities
- `content_items`
- `content_hubs`
- `qa_issues`
- `publish_runs`
- `approval_items`
- `hub_checkpoints`

### Important concept
Not everything needs a new database table immediately.
The first version can be powered partly by:
- report ingestion
- cron status
- repo-derived checks
- lightweight sync jobs

Build usefulness first, then formalise data structures later.

---

## 9. Phase plan

## Phase 1 — Operational truth panel
Build first:
- Editorial Queue
- Site Health
- What’s On Control Panel
- Publisher Console

Goal:
One place to see what is happening and what is broken.

## Phase 2 — Hub completeness tracking
Add:
- hub tracker
- dog hub completeness
- golf hub completeness
- metadata/image/link coverage by vertical

Goal:
Track whether verticals are actually being institutionalised.

## Phase 3 — Page-level readiness and action layer
Add:
- page readiness checklist
- direct approval actions
- more granular editorial workflow controls
- richer drill-down by page/hub/problem type

Goal:
Turn the Workbench from a dashboard into an actual operating surface.

---

## 10. First practical implementation scope

### Recommended initial release
Build a **Phase 1 MVP** with these cards/panels:

1. **Today’s publishing priorities**
2. **Live site health**
3. **What’s On weekend state**
4. **Content hubs status**
5. **Approvals waiting**
6. **Recent deploys and fixes**

This would already be massively useful.

---

## 11. Operating philosophy

The Workbench should help the publication feel:
- alive
- controlled
- current
- fixable
- legible

It should reduce:
- hidden drift
- manual hunting
- duplicated effort
- surprise breakages
- reliance on memory

---

## 12. Final recommendation

Build the Editor’s Workbench.

Peninsula Insider has crossed the threshold where it needs an internal control surface.

The Workbench should become:
- the live truth layer
- the editorial operating surface
- the place where hubs, jobs, QA, and publish readiness meet

Recommended next move:
- define the MVP data surface and UI panels
- build Phase 1 inside or adjacent to Mission Control
- use Dog-Friendly Peninsula as one of the first tracked hub modules
