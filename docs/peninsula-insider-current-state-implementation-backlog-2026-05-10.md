# Peninsula Insider — Current-State Implementation Backlog
**Date:** 2026-05-10  
**Basis:** Approved current-state operational review  
**Scope:** Current-state fixes only — no future-state redesigns, no speculative replatforming.

---

## Executive recommendation

Run this in **four tranches**:

1. **Control surface clarity** — know exactly what is live, scheduled, mutating, and authoritative
2. **Publish and governance hardening** — make trust, verification, and post-publish integrity enforceable
3. **Content/system drift reduction** — reduce duplication, cadence drift, and staging/live ambiguity
4. **Operational consolidation** — tighten recurring editorial and automation visibility without redesigning the product

**Hard recommendation:** do not add more meaningful mutating automation until tranche 1 and the core of tranche 2 are complete.

---

## Ranked implementation backlog

## P0 — Immediate control and trust hardening

### 1. Canonical live job inventory
**Why first:** PI currently spans GitHub Actions, OpenClaw cron, repo docs, and Mission Control assumptions. Until there is one inventory, nobody has one clean view of truth.

**Deliverable**
- one canonical inventory of all live and intended jobs

**Must capture**
- job name
- system owner
- actual schedule
- source of execution (GitHub / OpenClaw / manual)
- inputs
- outputs
- alert path
- mutation status (`scan-only`, `report-only`, `mutating`)
- current live status (`live`, `planned`, `dormant`, `partial`)

**Success condition**
- one file becomes the operating reference for the real PI control surface

---

### 2. Post-publish verification gate
**Why second:** PI’s trust promise breaks quickly if deploy success is mistaken for publish success.

**Deliverable**
- explicit post-publish verification checklist and runnable verification path

**Minimum checks**
- route resolves externally
- canonical present
- title/meta present
- stylesheet/assets present
- core image render intact
- target copy visible where expected

**Success condition**
- no change is treated as “live” until external verification passes

---

### 3. Published-content governance field audit
**Why now:** the governance doctrine exists; the first job is to measure compliance against it.

**Audit for**
- missing `lastVerified`
- stale verification dates
- missing image `credit`
- missing / weak image `license`
- placeholder or temporary image states
- missing commercial/disclosure markers where required

**Success condition**
- a first exception list exists for all published business-facing content

---

### 4. Live vs staging surface map
**Why now:** current-state ambiguity between live and staging is operational drag.

**Deliverable**
- explicit map of:
  - production surfaces
  - staging/versioned surfaces
  - deprecated but still present surfaces
  - internal-only preview surfaces

**Success condition**
- editors and automation can clearly distinguish live production paths from everything else

---

## P1 — Governance enforcement and drift control

### 5. Governance lint pass in content workflow
**Why here:** once the audit shows the gaps, enforcement should begin at source level.

**Checks to add**
- required frontmatter presence
- valid image-license values
- `lastVerified` required for relevant business-facing content
- disclosure fields required where flagged

**Success condition**
- prevent obvious governance misses from entering publish flow

---

### 6. Central recurring copy source review
**Why here:** the newsletter cadence cleanup proved copy truth is drifting across surfaces.

**Focus areas**
- newsletter cadence wording
- dispatch timing language
- recurring CTA wording
- evergreen trust/disclaimer copy

**Success condition**
- repeated operational claims are controlled from fewer canonical sources

---

### 7. Correction and changelog handling pass
**Why here:** correction CTA is now live; the operating loop behind it needs to be explicit.

**Deliverable**
- simple correction handling workflow
- changelog/logging rule for factual updates
- ownership for inbox triage and turnaround expectation

**Success condition**
- correction intake is not just visible to readers; it is operationally owned internally

---

### 8. Deploy-path dependency and preflight checks
**Why here:** build and publish currently rely on multiple assumptions and secrets.

**Checks should cover**
- required environment variables
- expected build outputs
- fallback stylesheet presence
- critical source/content directories

**Success condition**
- failures happen before unsafe publish, not after

---

## P2 — Structural drift reduction inside current state

### 9. Overlap audit: Journal / evergreen / What’s On / quick-note
**Why here:** this is where duplication is already showing up operationally.

**Goal**
- identify which current surfaces are overlapping in role, not redesign them yet

**Output shape**
- `keep distinct`
- `tighten role`
- `cross-link only`
- `candidate consolidation later`

**Success condition**
- duplication is named clearly enough to guide current-state editorial decisions

---

### 10. Weekly editorial rhythm visibility check
**Why here:** the weekly rhythm is well described but insufficiently visible as a living operational system.

**Deliverable**
- current-state view of what parts of the editorial rhythm are actually being executed, by whom, and where outputs land

**Success condition**
- no ambiguity about which weekly rituals are real versus merely documented

---

### 11. Mission Control / repo / runtime alignment pass
**Why here:** important PI truth is split between repo docs, Mission Control docs, and runtime schedules.

**Goal**
- align titles, owners, statuses, and canonical references across systems

**Success condition**
- PI operational artifacts stop competing with one another as sources of truth

---

## P3 — Consolidation after hardening

### 12. Exception queue for governance and QA issues
**Why here:** once audits exist, exceptions need one operating queue.

**Examples**
- stale verification
- missing license
- unresolved placeholder imagery
- publish QA failure
- routing/asset mismatch

**Success condition**
- governance and QA debt becomes visible, rankable, and reducible

---

### 13. Run-log and reporting standard for PI jobs
**Why here:** recurring jobs should become observable rather than inferred.

**Goal**
- standard job reporting shape across PI operations

**Minimum fields**
- start/end
- status
- affected surfaces
- counts changed/scanned
- alert sent
- link to artifact/report

**Success condition**
- James can inspect PI operations without reconstructing them manually

---

### 14. Current-state operating handbook cleanup
**Why here:** after the above, docs can be tightened to match reality instead of aspiration.

**Goal**
- reduce duplicate operating docs
- retire stale claims
- promote one reference per operating concern

**Success condition**
- PI documentation becomes lighter, sharper, and closer to runtime truth

---

## Recommended execution order

### Tranche 1 — do immediately
1. Canonical live job inventory
2. Post-publish verification gate
3. Published-content governance field audit
4. Live vs staging surface map

### Tranche 2 — do next
5. Governance lint pass
6. Central recurring copy source review
7. Correction/changelog handling pass
8. Deploy-path preflight checks

### Tranche 3 — do after control hardening
9. Overlap audit across Journal / evergreen / What’s On / quick-note
10. Weekly editorial rhythm visibility check
11. Mission Control / repo / runtime alignment pass

### Tranche 4 — consolidate
12. Exception queue
13. Run-log/reporting standard
14. Operating handbook cleanup

---

## What not to do yet

Do **not** prioritise these ahead of the above:
- more mutating cron behaviour
- broader auto-publish logic
- future-state architecture redesign
- major nav or product rebuilds before control cleanup
- cosmetic governance language without enforcement changes

---

## Bottom line

The current-state priority is not “make PI bigger”.

It is:
- make the operating surface legible
- make governance enforceable
- make publish truth verifiable
- reduce current duplication and drift

That is the shortest path from a strong editorial product to a reliable editorial operating system.
