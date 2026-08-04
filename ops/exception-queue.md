# Peninsula Insider — Exception Queue
**Last updated:** 2026-05-10
**Owner:** PI ops (Remy + James + Emma)
**Authority:** Single operating queue for governance, QA, publish-failure, and routing exceptions across PI surfaces.

## Purpose

Once audits exist (which they now do — see the Tranche 1 + Tranche 2 deliverables), exceptions need **one operating queue** instead of being scattered across reports, commits, and memory.

This file is that queue. Every active exception has an entry here. Resolved entries move to the **Resolved** section at the bottom (don't delete them — they are the audit trail).

## Severity / risk-tier mapping

Severities here align with the tiered approval model in `ops/editorial-jobs.json`:

| Severity | Mapped to | Means |
|---|---|---|
| **P0 (red)** | high-risk-editorial | Blocks live trust. Must be addressed before next publish-cycle of the affected surface. |
| **P1 (amber)** | medium-risk-update | Needs editorial action within the week. |
| **P2 (yellow)** | low-risk-operational | Operational debt; address opportunistically. |
| **P3 (info)** | informational | Observed pattern, not yet actionable. |

## How to add an entry

Append to the **Active** section in this format:

```markdown
### EXC-YYYY-MM-DD-### — short title
- **Severity:** P0 / P1 / P2 / P3
- **Source:** governance-audit | post-publish-verify | accuracy-scan | manual | other
- **Surface:** <URL or content path>
- **Detail:** one or two sentences
- **First seen:** YYYY-MM-DD
- **Owner:** <name or desk>
- **Target resolution:** YYYY-MM-DD
- **Linked artifact:** <path to report or PR>
```

Resolution rule: when fixed, **move** the entry to the Resolved section, prepend the resolution date, and add a one-line note describing the fix.

---

## Active

### EXC-2026-08-04-012 — Tuesday quick-note deployment not externally resolvable
- **Severity:** P1
- **Source:** post-publish-verify
- **Surface:** `https://peninsulainsider.com.au/quick-note/2026-08-05-{weather,editor-note,hot-springs}-tuesday/`
- **Detail:** All three freshly pushed quick-note URLs returned HTTP 404 at 2026-08-04T20:38Z, before the deployed revision was externally available. Live notification is blocked pending deployment and a passing verification rerun.
- **First seen:** 2026-08-04
- **Owner:** PI publisher + deployment operator
- **Target resolution:** next GitHub Pages deployment
- **Linked artifact:** `ops/reports/verify/2026-08-04-quick-note.md`

### EXC-2026-05-10-001 — 144 articles use placeholder hero licenses (`tmp-wikimedia` / `tmp-unsplash`)
- **Severity:** P1
- **Source:** governance-audit
- **Surface:** `next/src/content/articles/*` (144 files)
- **Detail:** Hero images use temporary licenses pending permanent licensing or commissioned imagery. Currently passes governance lint as WARN, not ERROR. Editorial trust risk if a `tmp-*` rights claim is contested.
- **First seen:** 2026-05-10 (full corpus audit)
- **Owner:** PI editorial-desk (image-intake)
- **Target resolution:** rolling — 10 articles per week off `tmp-*`, prioritised by traffic
- **Linked artifact:** `ops/reports/governance/exceptions-2026-05-10.md`

### EXC-2026-05-10-002 — 36 venue heroes on placeholder licenses
- **Severity:** P1
- **Source:** governance-audit
- **Surface:** `next/src/content/venues/*` (36 files)
- **Detail:** Same class as EXC-001 but on the venue corpus. Higher risk than article placeholders because venues are the canonical entity surface and are linked from operator-claim flows.
- **First seen:** 2026-05-10
- **Owner:** PI editorial-desk + venue-verifier
- **Target resolution:** rolling
- **Linked artifact:** `ops/reports/governance/exceptions-2026-05-10.md`

### EXC-2026-05-10-003 — 10 experiences and 7 places on placeholder licenses
- **Severity:** P2
- **Source:** governance-audit
- **Surface:** `next/src/content/experiences/*`, `next/src/content/places/*`
- **Detail:** Same class. Lower count, lower urgency.
- **First seen:** 2026-05-10
- **Owner:** PI editorial-desk
- **Linked artifact:** `ops/reports/governance/exceptions-2026-05-10.md`

### EXC-2026-05-10-004 — Repo-root files leak into production deploy
- **Severity:** P2
- **Source:** deploy-preflight
- **Surface:** `peninsulainsider.com.au/HANDOVER-CLAUDE.md`, `/build-live.sh`, `/build-v2.sh`
- **Detail:** Internal repo artifacts deploy to public site root. No data leakage observed but they are not production surfaces. Should be excluded in `deploy.yml`.
- **First seen:** 2026-05-10
- **Owner:** PI infra (James)
- **Target resolution:** next deploy.yml review

### EXC-2026-05-10-005 — Four SEO sub-audits documented but not registered
- **Severity:** P2
- **Source:** weekly-rhythm-state audit (Tranche 3 item 10)
- **Surface:** `~/.openclaw/cron/jobs.json`, `ops/editorial-jobs.json`
- **Detail:** `pi-weekly-seo-authority-audit`, `-opportunity-scan`, `-metadata-schema-audit`, `-internal-linking-audit` defined in editorial-jobs.json with explicit Tue/Thu/Fri/Sat 07:45 schedules. No corresponding cron registrations. Either register them or document them as descriptive sub-phases of the Weekly SEO Digest.
- **First seen:** 2026-05-10
- **Owner:** PI seo-desk + Remy
- **Target resolution:** decide + reconcile within the week
- **Linked artifact:** `docs/peninsula-insider-weekly-rhythm-state-2026-05-10.md`

### EXC-2026-05-10-006 — Sunday dispatch chain has no per-phase observability
- **Severity:** P1
- **Source:** weekly-rhythm-state audit
- **Surface:** `~/.openclaw/cron/jobs.json` (`PI: Sunday Editor Letter`)
- **Detail:** The seven-phase Sunday dispatch chain runs as one composite cron. Failures surface as "Sunday cron failed" with no per-phase attribution. Resolves once `ops/run-log-standard.md` (item 13) is implemented and the dispatch chain emits per-phase entries.
- **First seen:** 2026-05-10
- **Owner:** PI ops (Remy)
- **Target resolution:** wired alongside ledger integration
- **Linked artifact:** `docs/peninsula-insider-weekly-rhythm-state-2026-05-10.md`

### EXC-2026-05-10-007 — Tier-1 mutating jobs have silent alert paths
- **Severity:** P0
- **Source:** operating-surface inventory
- **Surface:** 9 of 10 Tier-1 mutating-live jobs (see `ops/operating-surface.md`)
- **Detail:** Failure detection is by inspection, not notification. The single highest-impact observability gap surfaced in Tranche 1.
- **First seen:** 2026-05-10
- **Owner:** PI ops (Remy + James)
- **Target resolution:** implement run-log standard alerting (item 13) + wire to a notification channel
- **Linked artifact:** `ops/operating-surface.md`

### EXC-2026-05-10-008 — Disclosure adoption gap (post-advertising-pivot)
- **Severity:** P1
- **Source:** recurring-copy audit
- **Surface:** entity pages, sponsored placements (when present)
- **Detail:** Following the 2026-04-30 advertising pivot, disclosure copy is the trust-firewall mechanism. Canonical disclosure strings exist in `ops/copy/canonical.md` but adoption across the corpus is sparse. Featured-partner pages and any future sponsored editorial need explicit disclosure rendering.
- **First seen:** 2026-05-10
- **Owner:** PI editorial-desk + James
- **Target resolution:** all `featuredPartner: true` pages within the week; sponsored copy gets disclosure as a publish requirement
- **Linked artifact:** `ops/reports/copy/recurring-copy-audit-2026-05-10.md`

### EXC-2026-05-10-009 — Cadence wording drift in Masthead and CoverHero
- **Severity:** P2
- **Source:** recurring-copy audit
- **Surface:** `next/src/components/Masthead.astro`, `next/src/components/CoverHero.astro`, v2/v3/v4 component variants
- **Detail:** At least 8 distinct phrasings of the "weekly Sunday dispatch" claim across components. Off-spec phrases include "arrives weekly", "Updated weekly", and ultra-compact variants that drop the "Sunday" signal.
- **First seen:** 2026-05-10
- **Owner:** PI editorial-desk
- **Target resolution:** single PR to bring components into line with `ops/copy/canonical.md`
- **Linked artifact:** `ops/reports/copy/recurring-copy-audit-2026-05-10.md`

### EXC-2026-05-10-010 — Three corrections-loop dependencies not yet verified
- **Severity:** P1
- **Source:** correction-handling.md drafting
- **Surface:** `corrections@`, `partners@`, `hello@`, `editorial@peninsulainsider.com.au`
- **Detail:** The correction handling loop assumes four mailboxes are monitored. Mailbox availability and triage ownership not yet confirmed for `partners@`, `hello@`, `editorial@`.
- **First seen:** 2026-05-10
- **Owner:** Emma + James
- **Target resolution:** confirm + update `ops/correction-handling.md` accordingly

### EXC-2026-05-10-011 — Memory hygiene gap
- **Severity:** P1
- **Source:** session-continuity audit
- **Surface:** `workspace/memory/`
- **Detail:** Memory logs missing for 2026-05-08, 2026-05-09, 2026-05-10. Multi-day gap; suggests the Telegram session that produced the implementation backlog also failed to write daily memory.
- **First seen:** 2026-05-10
- **Owner:** Remy + the agent operating each session
- **Target resolution:** backfill the three missing logs from session context + git log; revisit memory-write hooks

---

## Resolved

_(none yet — exceptions resolve in this file by being moved here with the resolution date and a one-line note)_

## Anti-patterns / what NOT to do with this queue

- **Do not let the queue exceed ~30 active entries.** If it does, severities are not being enforced — bring P0/P1 down to size first.
- **Do not delete entries when fixed.** Move them to Resolved. The historical record is the audit value.
- **Do not over-decompose.** A 144-file pattern is *one* exception (EXC-001), not 144. Roll up by class.
- **Do not let entries sit at "active" past their target resolution date without a status update.** If something slips, edit the entry to record the slip explicitly. Silent-stale is the failure mode.

## Audit cadence

Recommend Emma reviews this file weekly (Friday Performance Council fits naturally). The script `node ops/scripts/governance-audit.mjs` should run before each review so the queue can be reconciled against fresh audit output.
