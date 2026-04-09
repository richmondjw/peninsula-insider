# Peninsula Insider — Image Approval Workflow (Two-Step Gate)

**Prepared for:** James Richmond, Owner / Editor-in-chief
**Prepared by:** Image Sourcing Desk (Remy subagent)
**Date:** 9 April 2026
**Classification:** Operational workflow specification
**Sibling documents:**
- `peninsula-insider-image-sourcing-report-2026-04-09.md`
- `peninsula-insider-generative-image-style-2026-04-09.md`

---

## 1. Purpose

Every image that appears on Peninsula Insider must be editorially defensible. The sourcing layer — humans or agents pulling images from Unsplash, Wikimedia, Visit Victoria and venue media kits — is permitted to propose; only the editor is permitted to dispose. This document specifies the two gates that stand between a proposed image and a published image.

The principles this workflow enforces:

1. **Editor has the last word.** No image lands on V2 without explicit editor approval against the selection rules in the sourcing report §6.
2. **Sourcing agents propose, never publish.** A sourcing agent cannot write to `content/venues/*.json`, cannot place files in `public/images/`, cannot touch the build.
3. **Shortlists, not single candidates.** Every slot is filled from a choice of 3–5 shortlisted candidates, never a single "take it or leave it" pull.
4. **Every approved image carries provenance.** Source URL, photographer, licence, date sourced, date approved, editor who approved, slot filled. Forever.
5. **Rejection is data.** Rejected candidates are logged with a rejection reason from a fixed list. The log becomes the calibration feedback for the sourcing agent.
6. **No side doors.** There is exactly one way to get an image on the site.

---

## 2. Roles

### 2.1 The **Editor** (human — James, by default)
- Owns the final decision on every image.
- Operates in Step 2 of the workflow.
- Can reject an entire Step 1 shortlist and demand a re-pull.
- Can escalate rules updates back into the sourcing report §6.
- Can create override exceptions (with a logged reason) for any rule other than the licence rule (§6 rule 10 — licences are never overridable).

### 2.2 The **Sourcing Agent** (currently Remy subagent; later potentially a dedicated image desk)
- Operates in Step 1 of the workflow.
- Pulls candidate images from the whitelisted sources in the sourcing report §4.
- Applies the §6 rules and submits only candidates that pass every rule.
- Produces a shortlist file per slot (format in §4 below).
- Never downloads an image file during Step 1 — only captures URLs and metadata.
- Never modifies production content files.

### 2.3 The **Implementer** (human or agent, after editor sign-off)
- Operates in the post-approval placement phase.
- Downloads the single editor-approved image per slot.
- Converts to WebP with the site's standard aspect ratios.
- Writes the file into `/next/public/images/sourced/{slug}.webp`.
- Updates the corresponding content JSON file (`/next/src/content/venues/{slug}.json` etc.) to point at the new file and populates `credit`, `license`, `alt`, `caption`.
- Commits with a conventional commit message linking the approval record.

### 2.4 The **Editor-in-chief** (escalation only — James)
- Rules disputes, licence edge cases, and any request to override a §6 rule.
- Never interrupts Step 1 or Step 2 flows unless escalated.

---

## 3. The two-step gate

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   SLOT       │      │   STEP 1     │      │   STEP 2     │      │   PLACEMENT  │
│   BRIEF      │ ───▶ │   SHORTLIST  │ ───▶ │   EDITOR     │ ───▶ │   & COMMIT   │
│ (from §7)    │      │   (agent)    │      │   REVIEW     │      │   (impl.)    │
└──────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
                          3–5 candidates       pick ≤ 1             files written
                          per slot             per slot             JSON updated
```

Each arrow is a signed handoff — a file write plus a short log line. Nothing is implicit.

---

## 4. File formats

All approval records live in:

```
/home/node/.openclaw/workspace/peninsula-insider/ops/image-approvals/
├── briefs/          # slot briefs generated from the priority target list
├── shortlists/      # Step 1 output — candidate images per slot
├── decisions/       # Step 2 output — editor decisions per slot
├── rejected/        # full rejection log (append-only)
└── index.csv        # one row per slot, cumulative state
```

> `ops/image-approvals/` should be created once at project setup. It is git-tracked alongside the content.

### 4.1 Slot brief — `briefs/{slot-id}.md`

Created once per slot by the sourcing agent before Step 1 begins. Short and structured.

```markdown
# Slot: home-cover-01

**Surface:** V2 homepage cover hero
**Target file:** /next/public/images/sourced/home-cover.webp
**Content JSON:** (none — referenced from CoverHero.astro)
**Category (§5):** 1 — Landscape & coastline
**Aspect ratio:** 16:9 (minimum 2400 × 1350)
**Preferred sources (§4):** Wikimedia Commons, Visit Victoria Content Hub
**Editorial brief:** Peninsula-verifiable landscape. Warm, filmic, natural light.
  Should support a cover-story headline about autumn on the Peninsula.
  Strong focal point; human presence permitted only as scale.
**Reject if:** drone shot; HDR; sunset cliché; generic coastline
  that could be anywhere in Victoria.
**Priority tier:** A
**Week:** 1
**Created:** 2026-04-10
**Created by:** remy-sourcing-agent
```

### 4.2 Step 1 shortlist — `shortlists/{slot-id}.json`

Strictly structured JSON, one file per slot. 3–5 candidates per slot. No image files downloaded at this stage.

```json
{
  "slotId": "home-cover-01",
  "createdAt": "2026-04-10T09:00:00Z",
  "createdBy": "remy-sourcing-agent",
  "briefPath": "ops/image-approvals/briefs/home-cover-01.md",
  "candidates": [
    {
      "candidateId": "home-cover-01-a",
      "source": "wikimedia-commons",
      "url": "https://commons.wikimedia.org/wiki/File:Pulpit_Rock_Cape_Schanck.jpg",
      "directUrl": "https://upload.wikimedia.org/.../Pulpit_Rock_Cape_Schanck.jpg",
      "photographer": "J. Smith",
      "license": "CC-BY-4.0",
      "licenseVerified": true,
      "licenseNotes": "Attribution to J. Smith on source page; no share-alike.",
      "category": 1,
      "geoVerified": true,
      "place": "Cape Schanck",
      "rulesChecked": {
        "upgrade": true,
        "geography": true,
        "voice": true,
        "clutter": true,
        "light": true,
        "human": true,
        "season": true,
        "cliche": true,
        "editorialWeight": true,
        "license": true
      },
      "sourcingAgentNote": "Strong single focal point, morning fog across basalt, no other hikers in frame. Sits in the warm palette with minimal grading."
    },
    {
      "candidateId": "home-cover-01-b",
      "source": "visit-victoria-content-hub",
      "url": "contenthub://mornington-peninsula/vineyard-fog-red-hill-0234",
      "photographer": "Visit Victoria commissioned",
      "license": "visit-victoria",
      "licenseVerified": true,
      "licenseNotes": "Standard Visit Victoria attribution required: 'Visit Victoria'.",
      "category": 2,
      "geoVerified": true,
      "place": "Red Hill",
      "rulesChecked": {
        "upgrade": true, "geography": true, "voice": true, "clutter": true,
        "light": true, "human": true, "season": true, "cliche": true,
        "editorialWeight": true, "license": true
      },
      "sourcingAgentNote": "Vine rows in fog, cool-climate editorial look, Peninsula-verifiable. Secondary option if Pulpit Rock feels too edge-of-Peninsula."
    },
    {
      "candidateId": "home-cover-01-c",
      "source": "unsplash",
      "url": "https://unsplash.com/photos/...",
      "photographer": "Alex Doe",
      "license": "unsplash",
      "licenseVerified": true,
      "licenseNotes": "Unsplash License; credit offered editorially.",
      "category": 1,
      "geoVerified": false,
      "place": "Categorical — not site-specific",
      "rulesChecked": {
        "upgrade": true, "geography": true, "voice": true, "clutter": true,
        "light": true, "human": true, "season": true, "cliche": true,
        "editorialWeight": true, "license": true
      },
      "sourcingAgentNote": "Categorical coastline — flagged as non-specific. Fallback only if both geo-verified candidates fail Step 2."
    }
  ]
}
```

### 4.3 Step 2 decision — `decisions/{slot-id}.json`

Written by the editor (or an agent acting on a recorded editor decision). Append-only: once a decision is signed, it is not edited. Superseding decisions create a new file with an incremented version suffix.

```json
{
  "slotId": "home-cover-01",
  "decisionVersion": 1,
  "decidedAt": "2026-04-10T15:12:00Z",
  "decidedBy": "james",
  "shortlistPath": "ops/image-approvals/shortlists/home-cover-01.json",
  "selected": "home-cover-01-a",
  "rejected": [
    { "candidateId": "home-cover-01-b", "reason": "voice-mismatch", "note": "Too Visit-Victoria-prospectus." },
    { "candidateId": "home-cover-01-c", "reason": "not-geo-verified", "note": "Categorical coastline only acceptable as last resort." }
  ],
  "editorOverrides": [],
  "notes": "Approved Pulpit Rock for launch; replace in Phase 2 with commissioned Red Hill landscape.",
  "implementerAction": {
    "downloadTo": "/next/public/images/sourced/home-cover.webp",
    "contentFileUpdates": [],
    "altText": "Morning fog rolling across Pulpit Rock at Cape Schanck",
    "credit": "J. Smith / Wikimedia Commons (CC-BY-4.0)",
    "caption": "Cape Schanck at dawn, April."
  },
  "implementerStatus": "pending"
}
```

### 4.4 Rejection log — `rejected/{date}-rejections.jsonl`

One JSON line per rejected candidate. Append-only. This is the calibration feedback loop for the sourcing agent.

```json
{"slotId":"home-cover-01","candidateId":"home-cover-01-b","reason":"voice-mismatch","rejectedAt":"2026-04-10T15:12:00Z","rejectedBy":"james","briefCategory":1,"source":"visit-victoria-content-hub"}
{"slotId":"home-cover-01","candidateId":"home-cover-01-c","reason":"not-geo-verified","rejectedAt":"2026-04-10T15:12:00Z","rejectedBy":"james","briefCategory":1,"source":"unsplash"}
```

### 4.5 Index — `index.csv`

One row per slot. Cumulative state. Human-readable at a glance.

```csv
slot_id,priority_tier,status,category,preferred_source,actual_source,decision_version,decided_at,selected_candidate,implemented,file_path
home-cover-01,A,approved,1,wikimedia,wikimedia,1,2026-04-10,home-cover-01-a,true,/next/public/images/sourced/home-cover.webp
eat-hub-hero-01,A,shortlisted,3,unsplash,,,,,false,
stay-hub-hero-01,A,briefed,6,unsplash,,,,,false,
```

Statuses: `briefed` → `shortlisted` → `approved` | `rejected-all` → `implemented`.

---

## 5. Rejection reason taxonomy (fixed list)

Every rejection must cite exactly one reason from this fixed list. This is the calibration spine.

| Code | Meaning | Maps to §6 rule |
|---|---|---|
| `no-upgrade` | Not a clear upgrade on the fog placeholder. | 1 |
| `not-geo-verified` | Geography test failed; used in a slot that implies a specific place. | 2 |
| `voice-mismatch` | Reads as tourism board / influencer / brochure, not insider editorial. | 3 |
| `cluttered` | Too many subjects, postcard composition. | 4 |
| `wrong-grade` | HDR, over-saturated, wrong palette, uncorrectable. | 5 |
| `model-forward` | Human is the primary subject; stock-lifestyle shot. | 6 |
| `wrong-season` | Seasonally inappropriate for the slot. | 7 |
| `cliche` | Obvious travel-media cliché. | 8 |
| `weak-as-feature` | Works as thumbnail only, not as a feature image. | 9 |
| `license-ineligible` | Licence not compatible with commercial editorial use. | 10 |
| `ban-list` | Source or content is on the hard-ban list in §6.1. | 6.1 |
| `better-alternative` | Another candidate in the same shortlist is clearly better; not rejected for any rule failure, just not the pick. | — |
| `defer` | Acceptable image but better held for a later slot. | — |

**Rule:** a rejection with reason `better-alternative` or `defer` does **not** ding the sourcing agent's calibration metric. Every other reason counts against the agent's approval rate.

---

## 6. Editor decision protocols

### 6.1 What the editor sees

The editor is shown, per slot, a rendered review page with:

- The slot brief (§4.1 content).
- The shortlisted candidates side-by-side, in a grid, with thumbnails and metadata.
- A one-click "Select" button per candidate.
- A rejection-reason dropdown for each non-selected candidate.
- A "Reject all — re-pull" button for the whole shortlist.
- A notes field.
- A "Sign decision" button that writes the `decisions/{slot-id}.json` file.

### 6.2 Editor rules of engagement

- **Select at most one candidate per slot.** Zero is allowed (if all candidates fail); one is ideal; two or more is prohibited.
- **Every non-selected candidate gets a rejection reason.** No silent rejects.
- **Notes field is encouraged.** Short editorial note on *why* the selected candidate beat the others sharpens the sourcing agent's future pulls.
- **Re-pull is free.** If the shortlist is weak, reject all and force a re-pull. Do not approve under protest.
- **No editor override on licence.** Rule 10 in §6 of the sourcing report is absolute. Any image where the licence cannot be fully verified is rejected regardless of editorial strength.

### 6.3 Editor override exceptions

The editor may override rules 1–9 in §6 of the sourcing report if the override reason is logged in the decision file's `editorOverrides` array. Example:

```json
"editorOverrides": [
  {
    "rule": "wrong-season",
    "reason": "Seasonal slot swap — the autumn feature is running early, re-using the summer cellar door image is acceptable for two weeks, replacement scheduled."
  }
]
```

Override events are rare by design. More than 2 overrides per week across all slots is a signal that the rules themselves need amendment.

### 6.4 Editor delegation

The editor (James) may delegate the Step 2 review for specific slot tiers (e.g. Tier C "remaining experience heroes") to a named delegate. Delegation is logged in `ops/image-approvals/delegations.md` with scope, duration and revocation clause. Delegation **never** extends to homepage, hub heroes, or Tier A slots.

---

## 7. Sourcing agent protocols

### 7.1 What the sourcing agent does, per slot

1. Read the slot brief.
2. Query the whitelisted sources in the order specified by the brief.
3. For each candidate image, run the full §6 10-point check. If the image fails any rule, discard before it reaches the shortlist.
4. When 3–5 candidates have passed all §6 rules, write the shortlist JSON.
5. Mark the brief as `shortlisted` in `index.csv`.
6. Hand off to the editor — stop.

### 7.2 What the sourcing agent does not do

- Download image files.
- Modify anything outside `ops/image-approvals/`.
- Include candidates that fail any §6 rule.
- Bypass the geography rule by "hoping the editor won't notice."
- Exceed 5 candidates per shortlist (clutters the review).
- Submit fewer than 3 candidates per shortlist without flagging the sparsity in the shortlist `sourcingAgentNote`.

### 7.3 Calibration loop

Weekly:

- Read the rejection log for the past week.
- Count rejection reasons by code.
- For any rejection reason that appears more than 20% of the time, re-read the corresponding §6 rule in the sourcing report.
- Log calibration notes in `ops/image-approvals/calibration-{date}.md`.

This is the only mechanism by which the sourcing agent gets better over time. It is as important as the approvals themselves.

---

## 8. Implementer protocols

### 8.1 Trigger

A new or updated `decisions/{slot-id}.json` file with `implementerStatus: "pending"` and a `selected` field set.

### 8.2 Actions

1. Read the decision file.
2. Locate the selected candidate in the shortlist file.
3. Download the image from the shortlist's `directUrl`.
4. Verify the download matches the declared source (hash, byte-size sanity check).
5. Convert to WebP at the target aspect ratio (16:9 hero, 4:5 venue, 1:1 square, 3:2 gallery).
6. Write to `/next/public/images/sourced/{slot-id}.webp`.
7. Update the relevant content JSON file (venue, place, experience, itinerary) with the new `heroImage` block, populated from the decision file's `implementerAction` fields (`altText`, `credit`, `caption`, plus the correct `license` enum value from the schema).
8. Update `ops/image-approvals/index.csv` — status `implemented`, `file_path` set.
9. Set `implementerStatus: "implemented"` in the decision file.
10. Commit. Conventional commit message: `feat(images): slot {slot-id} — {short description} [editor: {editor-id}, source: {source}]`.

### 8.3 Implementer does not

- Second-guess the editor's selection.
- Reach into a candidate the editor did not select.
- Touch any image outside the approved slots.
- Publish if the licence field is empty or the credit field is empty.

---

## 9. Licensing, credit and schema

### 9.1 Schema extensions

The existing Astro schema at `/next/src/content/config.ts` already supports:

```
tmp-unsplash, tmp-wikimedia, tmp-pexels, visit-victoria,
venue-media-kit, original-commissioned, other-licensed
```

This workflow **drops the `tmp-` prefix from permanent images** once they are approved — the prefix was a signal for "bridge-phase temporary." The approved images *are* the bridge phase. Recommendation: add these license enum values:

- `unsplash` (replaces `tmp-unsplash`)
- `pexels` (replaces `tmp-pexels`)
- `wikimedia-cc0`
- `wikimedia-cc-by`
- `flickr-cc0`
- `flickr-cc-by`
- `generative-illustrative` (for the generative direction framework — see sibling doc)

The `tmp-` values can remain in the schema as deprecated but accepted, so existing placeholder references do not break the build.

### 9.2 Credit line format

All images, regardless of whether attribution is legally required, carry a credit in the content JSON:

```
{photographer} / {source} ({license-short})
```

Examples:

- `J. Smith / Wikimedia Commons (CC-BY-4.0)`
- `Alex Doe / Unsplash`
- `Visit Victoria`
- `Jackalope Hotels (press kit)`

The credit line is rendered on venue and article pages as small type in the image caption area, per the strategic review §7.4: *"Photo captions in a smaller Outfit size with a credit line. Every image."*

### 9.3 The licence file on disk

For each approved image, a sidecar `.license.txt` file is written alongside the WebP, containing:

```
Slot: home-cover-01
Source: https://commons.wikimedia.org/wiki/File:Pulpit_Rock_Cape_Schanck.jpg
Photographer: J. Smith
Licence: CC-BY-4.0
Licence terms: https://creativecommons.org/licenses/by/4.0/
Approved by: James Richmond
Approval decision: ops/image-approvals/decisions/home-cover-01.json
Approved on: 2026-04-10
```

This is the permanent, portable record of provenance — survives the CMS, survives the build, survives a future migration.

---

## 10. Failure modes and escape hatches

### 10.1 The shortlist is weak

Editor rejects all candidates with "better-alternative" on every one and a note `re-pull — weak shortlist`. The slot returns to `briefed` state and the sourcing agent re-queries with sharper parameters. After two consecutive re-pulls, the slot is escalated to the editor-in-chief for a brief rewrite.

### 10.2 No Peninsula-verified image exists for a slot that demands one

The slot is downgraded to a categorical slot or deferred to Phase 2 (commissioned photography). Deferral is logged in `index.csv` as `deferred-to-phase-2`. The corresponding V2 surface keeps the CSS fog placeholder — which, per the sourcing report §3.4, is better than the wrong image.

### 10.3 Licence cannot be verified

Hard reject. Logged with reason `license-ineligible`. Non-negotiable.

### 10.4 Editor disputes a sourcing agent's §6 application

Raised as a calibration entry in the weekly calibration note. If the same dispute happens twice, the §6 rule is amended in the sourcing report with a note flagged to the editor-in-chief.

### 10.5 An image is approved and later needs to be removed (licence complaint, venue objection, quality concern)

Removal is logged as a new decision file with `decisionVersion: 2` and `selected: null`. The implementer deletes the image file and reverts the content JSON to its placeholder state. The rejection log captures `reason: retired`.

### 10.6 The sourcing agent breaks the rules

If the sourcing agent ever writes to `public/images/` or modifies a content JSON file, the commit is reverted and the agent's access is suspended until the protocol is reviewed. This is a hard wall — it is the mechanism that guarantees editorial control.

---

## 11. First sprint — workflow dry run

### 11.1 The first slot is a dry run

Tier A Slot 1 (homepage cover) is deliberately the first slot walked through the full workflow. The purpose of the dry run is not to produce a great homepage cover on day 1 — the fog placeholder will remain on homepage until the dry run completes and is reviewed. The purpose is to:

- Shake out any format issues in the shortlist JSON.
- Validate the editor review experience.
- Confirm the implementer flow works end-to-end.
- Surface any unresolvable friction before Tier A Slots 2–18 enter the pipeline.

A dry-run retro is written to `ops/image-approvals/retros/dry-run-2026-04-10.md` and reviewed by the editor before Slot 2 begins.

### 11.2 Batching after the dry run

After the dry run:

- Sourcing agent works in batches of 5 slots per day (Step 1).
- Editor reviews in batches of 5 slots per session (Step 2) — a single session should run ~10–15 minutes once the agent is calibrated.
- Implementer processes decisions in batches of up to 10 per day.

Throughput target: **6–10 approved images per working day across the 3-week sprint.** 60 approvals / 15 working days = 4 per day minimum, 6–10 realistic, 15 stretch.

---

## 12. Tooling stubs

This workflow is deliberately specified as a **file-based** system. No CMS dependency, no database, no new tooling required to start. Every piece of state lives in git-tracked JSON and Markdown files under `ops/image-approvals/`.

Optional tooling that could be built on top, in priority order:

1. **`ops/scripts/image-brief-new.sh {slot-id}`** — scaffold a new brief file from a template, pre-populated from the priority target list.
2. **`ops/scripts/image-shortlist-lint.mjs`** — validate a shortlist JSON against the schema before handing off to the editor.
3. **`ops/scripts/image-review.html`** — a local HTML page that reads `shortlists/{slot-id}.json`, renders the thumbnails side-by-side, and generates the decision JSON. Zero-dependency, runs from `file://`.
4. **`ops/scripts/image-implement.mjs`** — reads a signed decision, downloads + converts + writes files + updates content JSON + updates index CSV + commits.
5. **`ops/scripts/image-calibrate.mjs`** — reads rejection log, produces weekly calibration report.

None of these are required for the workflow to function. They are incremental productivity improvements.

---

## 13. Non-goals (out of scope for this workflow)

- **Commissioned photography** — when Phase 2 kicks in, a separate workflow document governs photographer brief, contract, shot list, delivery review, colour grade standards, and file delivery. This workflow handles sourced/licensed only.
- **Video** — V2 video (the strategic review's recommended 60–90s hero videos) is a separate pipeline.
- **Map cartography** — the custom-styled Mapbox/MapLibre map is a design exercise, not an image-sourcing exercise.
- **User-generated content** — readers submitting photos is out of scope until accounts + community features exist (Phase 3+).
- **AI generative images as documentary stand-ins** — prohibited, full stop. Generative imagery for atmospheric non-specific slots is governed by the generative style direction sibling document, and is clearly marked as illustrative.

---

## Appendix A — The single invariant

```
No image appears on Peninsula Insider V2 unless there is a
signed, version-1-or-higher decision file in
ops/image-approvals/decisions/ that selected it.
```

If this invariant is ever broken, the workflow has failed and needs immediate repair.

---

*Prepared 9 April 2026. For James Richmond. Paired with `peninsula-insider-image-sourcing-report-2026-04-09.md` and `peninsula-insider-generative-image-style-2026-04-09.md`.*
