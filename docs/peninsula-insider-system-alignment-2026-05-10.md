# Peninsula Insider — Mission Control / Repo / Runtime Alignment Pass
**Date:** 2026-05-10
**Scope:** Where PI operational truth lives, where the same fact appears in more than one place, and which one is canonical when they conflict.

## TL;DR

PI truth is currently spread across **five surfaces**:

1. **Repo docs** (`peninsula-insider/docs/*.md`)
2. **Repo ops config** (`peninsula-insider/ops/editorial-jobs.json`)
3. **Repo workflows** (`peninsula-insider/.github/workflows/*.yml`)
4. **OpenClaw cron registry** (`~/.openclaw/cron/jobs.json`)
5. **Mission Control** (Supabase: `cron_job_runs`, `memory_entries`, task board)

The same operational fact can be expressed in 2 or 3 of these. **There is no shared rule about which wins when they disagree.** This file proposes one.

## Current sources of truth, by domain

### Editorial cadence
| Surface | What it claims | Authority |
|---|---|---|
| `docs/editorial-ops-system-2026-04-09.md` | Documented narrative cadence | Doc — descriptive |
| `ops/editorial-jobs.json` | Structured job definitions, cadences, approvals | Repo config — semi-canonical |
| `~/.openclaw/cron/jobs.json` | Scheduled cron triggers | Runtime — operationally canonical (what actually fires) |
| `ops/operating-surface.md` (new today) | Synthesis of all three | New canonical reference |

**Proposed rule:** when these conflict, **`ops/operating-surface.md` wins** as the operational summary, **`~/.openclaw/cron/jobs.json` wins** as the runtime authority, **`ops/editorial-jobs.json` wins** as the editorial intent. Docs are descriptive — they should be updated when the others change.

### Build / deploy
| Surface | What it claims | Authority |
|---|---|---|
| `docs/site-system-documentation.md` | Build/deploy narrative | Doc — descriptive |
| `.github/workflows/deploy.yml` | Actual build/deploy pipeline | Runtime — canonical |
| `next/package.json` | Build commands | Source — canonical for what `npm run build` does |
| `build-live.sh`, `build-v2.sh` | Legacy manual build paths | Likely retired (see surface-map.md) |

**Proposed rule:** `.github/workflows/deploy.yml` is the canonical build process. `build-live.sh` and `build-v2.sh` should be reviewed for retirement (and excluded from deploy — see preflight check).

### Approval model + risk tiers
| Surface | What it claims | Authority |
|---|---|---|
| `ops/editorial-jobs.json` `approvalModel` block (added 2026-05-10) | Tiered approval policy | Repo config — canonical |
| Various docs (governance rollout, agentic operating model) | Narrative descriptions of approvals | Doc — descriptive |
| OpenClaw runtime exec-approvals | Per-tool / per-action approval | Runtime — canonical for tool-level approvals |

**Proposed rule:** for editorial decisions, `ops/editorial-jobs.json` `approvalModel` is canonical. For tool-level execution approvals (which shell command can fire without prompt), runtime exec-approvals are canonical. Docs describe both.

### Publication ledger
| Surface | What it claims | Authority |
|---|---|---|
| `ops/publication-ledger/README.md` | Ledger purpose + format | Repo doc — canonical for the spec |
| `ops/publication-ledger/publication-ledger.schema.json` | Required fields | Repo schema — canonical for validation |
| `ops/publication-ledger/entries/YYYY-MM.jsonl` | The actual events | Runtime — canonical record |
| `ops/publication-ledger/index.csv` | Spreadsheet index | Derivative |
| Mission Control `cron_job_runs` table | Cron run record | Runtime — canonical for cron-level runs |

**Proposed rule:** the publication ledger and Mission Control's `cron_job_runs` are **complementary, not duplicative**. The ledger is the *publish-event* record (what changed live, what approval allowed it). `cron_job_runs` is the *cron-execution* record (which cron fired, when, with what result). They reference each other but neither replaces the other.

### Memory / continuity
| Surface | What it claims | Authority |
|---|---|---|
| `workspace/memory/YYYY-MM-DD.md` | Daily session log (Remy / agents) | Local — canonical at write time |
| `workspace/MEMORY.md` | Curated long-term memory | Local — canonical |
| Mission Control `memory_entries` table | Synced copy of memory logs | Runtime — derivative (synced hourly) |

**Proposed rule:** local memory files are canonical. Mission Control is a derivative for cross-session/cross-machine visibility. The hourly sync is one-way.

### Task / backlog state
| Surface | What it claims | Authority |
|---|---|---|
| `peninsula-insider/docs/peninsula-insider-current-state-implementation-backlog-2026-05-10.md` | Today's backlog | Repo doc — canonical for this point in time |
| Mission Control task board | Live task state | Runtime — canonical for in-flight task tracking |
| GitHub Issues / PRs | PR-level state | Runtime — canonical for code-level work tracking |

**Proposed rule:** for the *backlog*, repo docs are canonical (because they version with the code). For *in-flight task state*, Mission Control. For *PR-level state*, GitHub. **Backlog docs should be archived (not deleted) once their items are reflected in operational artifacts.**

## Conflict instances observed today

These are real conflicts found during this audit. They demonstrate why an explicit rule is needed.

### Conflict 1: editorial-jobs.json vs cron registry
- `editorial-jobs.json` defines `pi-weekly-seo-authority-audit` Tuesday 07:45.
- `~/.openclaw/cron/jobs.json` has no corresponding entry.
- Result: documented but not running. Weekly rhythm visibility check (item 10) flagged this.
- Resolution under proposed rule: **runtime wins** — either register it, or remove from editorial-jobs.json.

### Conflict 2: editorial-jobs.json `dispatchCadence` vs document narrative
- `editorial-jobs.json` `dispatchCadence` block locks publish day Sunday, weekend covered = publish + 6/+7 days.
- Some prior docs and dispatch articles describe a different (older) convention where the weekend covered was the immediate one.
- Resolution under proposed rule: **`editorial-jobs.json` wins** (locked 2026-04-27). Older docs are descriptive and should be brought into line.

### Conflict 3: ops directory vs main checkout uncommitted changes
- The publication ledger and approval model exist in the *main checkout* of PI as **uncommitted local changes** (status doc described them as "live", but they are unpushed).
- This worktree branch did not have them.
- Resolution under proposed rule: **canonical = what is committed and pushed**. Uncommitted local work is not yet authoritative regardless of how mature it looks.

### Conflict 4: surface map vs live tree
- `ops/surface-map.md` (added today) declares `/preview-*`, `/v2-staging/*` as not-production.
- The live tree at peninsulainsider.com.au contains those paths.
- Resolution under proposed rule: **declared surface map wins as policy**. The live tree containing them is technical debt that should be retired or formally re-promoted.

## Recommendations

1. **Adopt the proposed rules above** as PI operating policy. They mostly codify what is already implicit, but making them explicit prevents drift.

2. **Cross-reference, don't duplicate.** Each operational fact should have *one* authoritative surface. Other surfaces should reference it, not restate it. (Example: `peninsula-insider-status-2026-05-10.md` referenced `ops/editorial-jobs.json` for the approval model rather than restating it. Good pattern.)

3. **Archive backlog docs after delivery.** When a backlog doc's items have all been delivered (or formally cancelled), move the doc to `docs/archive/` with a one-line "delivered in PRs X, Y, Z" note. Don't leave delivered backlogs in the live `docs/` directory — they look like aspirational work.

4. **Status docs decay fast.** A status doc dated today is canonical today and stale in two weeks. Either reissue weekly or treat as historical after that.

5. **Make the runtime canonical surfaces machine-readable wherever possible.**
   - `ops/editorial-jobs.json` ✓ (already JSON)
   - `~/.openclaw/cron/jobs.json` ✓ (already JSON)
   - `ops/publication-ledger/entries/*.jsonl` ✓ (already JSON)
   - `ops/operating-surface.md` ✗ (currently markdown — could derive from a single JSON)

   Nice-to-have: a single `ops/registry.json` that both `editorial-jobs.json` job entries and `~/.openclaw/cron/jobs.json` cron entries derive from, so they cannot drift. **Out of scope for this Tranche.**

6. **Do not solve this with a Mission Control-first rewrite.** The temptation when truth is split is to make Mission Control the single source. Resist it. Mission Control is good for *runtime state* but bad for *intent and policy* — those belong in the repo, where they version with the code.

## What this audit deliberately does not do

- It does not propose collapsing surfaces. Each surface (docs, ops config, workflows, cron registry, Mission Control) has a real and distinct role.
- It does not propose a new cross-system data model.
- It does not propose changing Mission Control schema.

The proposal here is purely **clarifying which surface wins on which question**, plus the rule for cross-references.

## How this lands

This file should be linked from:
- `ops/operating-surface.md` (as the upstream rule for what surface wins)
- `docs/site-system-documentation.md` (as the canonical alignment policy)
- The next status update or governance rollout doc James/Emma write

If anyone later asks "where does the truth about X live?", this file is where they look.
