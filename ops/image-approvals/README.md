# Peninsula Insider — Image Approvals Ops

This directory is the operational substrate for the Peninsula Insider V2 image approval workflow. Every image that lands on the V2 build passes through this directory first.

## Governing documents

- **Sourcing report:** `docs/reports/peninsula-insider-image-sourcing-report-2026-04-09.md`
- **Approval workflow:** `docs/reports/peninsula-insider-image-approval-workflow-2026-04-09.md`
- **Generative style direction:** `docs/reports/peninsula-insider-generative-image-style-2026-04-09.md`
- **Tier A 50-slot plan:** `docs/reports/peninsula-insider-tier-a-image-plan-2026-04-09.md`

**Read those first.** This README is the "how the directory works," not the editorial rules.

## Directory layout

```
ops/image-approvals/
├── README.md             ← this file
├── index.csv             ← one row per slot, cumulative state
├── briefs/               ← per-slot editorial briefs (one .md per slot)
├── shortlists/           ← Step 1 outputs: candidate images per slot (.json)
├── decisions/            ← Step 2 outputs: editor decisions per slot (.json)
├── rejected/             ← append-only rejection log (.jsonl)
├── retros/               ← dry-run retros, weekly retros (.md)
├── calibration/          ← weekly calibration notes (.md)
├── templates/            ← Leonardo prompts, brief templates
└── generative-log/       ← per-slot generative variant archive (.jsonl)
```

## The workflow, in one glance

```
brief ───▶ shortlist ───▶ decision ───▶ placement
 (agent)   (agent)        (editor)     (implementer)
```

Every arrow is a file write. Every file is git-tracked. Every state transition is visible in `index.csv`.

## Quick commands

- **List all slots in `briefed` state:**
  `awk -F, '$3=="briefed"' index.csv`
- **List all slots awaiting editor review:**
  `awk -F, '$3=="shortlisted"' index.csv`
- **List all slots awaiting implementation:**
  `awk -F, '$3=="approved" && $10!="true"' index.csv`

## Current sprint

- **Sprint:** Tier A, 50 slots, weeks 1–3 of April 2026.
- **Status:** Scaffolded. Awaiting editor approval of the Tier A plan.
- **First slot:** `home-cover-01` (dry run, per approval workflow §11.1).

## State transitions

| From | To | Who | Trigger |
|---|---|---|---|
| — | `briefed` | Sourcing agent | Writes `briefs/{slot-id}.md` |
| `briefed` | `shortlisted` | Sourcing agent | Writes `shortlists/{slot-id}.json` |
| `shortlisted` | `approved` OR `rejected-all` | Editor | Writes `decisions/{slot-id}.json` |
| `rejected-all` | `briefed` | Sourcing agent | Re-pull after feedback |
| `approved` | `implemented` | Implementer | Writes image file + updates content JSON + sets `implementerStatus: implemented` |
| any | `deferred-to-phase-2` | Editor | After 2 consecutive weak shortlists, per workflow §10.2 |

## The single invariant

**No image appears on Peninsula Insider V2 unless there is a signed, version-1-or-higher decision file in `decisions/` that selected it.**

If this invariant is ever broken, the workflow has failed and needs immediate repair.
