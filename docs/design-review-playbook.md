# Peninsula Insider — Weekly Design Review Playbook

**Audience:** the agent assigned to the `pi-weekly-design-review` cron job (Sunday 22:00 UTC). Read this end-to-end before doing any audit work.

**Goal:** one actionable design improvement per week, with the exact change ready to implement. Quality over coverage.

**Scope (what this job IS):** UI/front-end design audit of the Peninsula Insider Astro site at `next/src/`. CSS architecture, component reuse, typography, hierarchy, hover/focus states, dead style debt, responsive integrity.

**Scope (what this job is NOT):**
- Not a content audit (separate jobs handle accuracy, image relevance, link checking)
- Not an accessibility deep audit (separate)
- Not an SEO audit (separate)
- Not auto-publishing — output is a memo only; humans approve & implement

---

## Inputs to load before auditing

1. **`/home/node/.openclaw/skills/peninsula-insider/SKILL.md`** — editorial constitution (voice rules apply to any copy you draft in the memo)
2. **`/home/node/.openclaw/workspace/peninsula-insider/BRAND-PI.md`** — brand guide (visual rules of the road)
3. **`/home/node/.openclaw/workspace/peninsula-insider/design-reviews/INDEX.md`** — every prior weekly memo. **Do not re-recommend something already in flight or already shipped.** Cross-check before proposing.
4. **`git log --since='7 days ago' --pretty=format:'%h %s' -- next/src/`** — what changed this week. Audit the changes for regressions before broadening.

---

## Audit dimensions (run all five, in order)

### 1. Token consistency
Hardcoded values that should be CSS custom properties. Run these greps and assess:

```bash
cd /home/node/.openclaw/workspace/peninsula-insider/next
grep -hEo 'border-radius:\s*[^;]+;' src/styles/global.css | sort -u
grep -hEo 'box-shadow:\s*[^;]+;' src/styles/global.css | sort -u
grep -hEo '#[0-9a-fA-F]{3,8}' src/styles/global.css | sort -u | head -40
grep -hEo 'font-size:\s*[^;]+;' src/styles/global.css | sort -u
```

Flag if: more than ~5 distinct radii or shadow values; raw hex colors used outside `:root` token block; font-sizes not on a clear modular scale.

### 2. Component reuse / duplication
Look in `src/components/` for near-duplicates and cross-check usage.

```bash
ls src/components/*.astro | wc -l
for f in src/components/*.astro; do echo "$(grep -rl "$(basename "$f" .astro)" src/pages src/components src/layouts | wc -l) $(basename "$f")"; done | sort -n | head -10
```

Flag any component with `0` usages (dead) or any pair where two components do the same job (e.g. `VenueCard` + `PlaceCard` — already on the radar; check if they've converged).

### 3. Editorial polish
For pages changed this week (and one randomly chosen evergreen page if nothing new):
- Are `:hover` and `:focus-visible` defined on every interactive element?
- Are transitions consistent (cubic-bezier and duration)?
- Is the heading hierarchy clean (single h1, proper h2/h3 cascade)?
- Are clickable cards using a stretched-link pattern (set by `.venue-card--editorial` as of 2026-04-30) — or do they still use redundant CTA buttons?

### 4. Dead style debt
```bash
grep -rEo '\.[a-zA-Z][a-zA-Z0-9_-]*' src/styles/global.css | sort -u | head -200 \
  | while read cls; do name="${cls#.}"; \
    used=$(grep -rl "$name" src/pages src/components src/layouts 2>/dev/null | wc -l); \
    [ "$used" = "0" ] && echo "UNUSED: $cls"; \
  done | head -20
```

(Heuristic — false positives possible; use judgement before recommending deletion.)

### 5. Responsive integrity (lightweight)
Look at the most recent component changes. Check that any new `flex` / `grid` rules have appropriate `@media` queries. The site's breakpoints (per `global.css`): inspect for consistency.

---

## Output discipline — produce ONE memo, file at:

**Path:** `/home/node/.openclaw/workspace/peninsula-insider/design-reviews/YYYY-WWW.md`
where `YYYY` is the year and `WWW` is ISO week number, e.g. `2026-W18.md`.

**Generate the filename with:** `date -u +%Y-W%V`

### Memo structure (follow exactly)

```markdown
# PI Design Review — Week of YYYY-MM-DD

**Reviewer:** <agent name>
**Generated:** YYYY-MM-DDTHH:MM:SSZ
**Branch audited:** main @ <commit-sha>

## Recommendation of the week
**Title:** <one short sentence — the change, not the symptom>

**Why it matters:** <2-3 sentences — reader impact OR maintainability impact. Concrete, no vagueness.>

**Files to change:**
- `path/to/file.css:Lstart-Lend`
- `path/to/component.astro`

**Proposed change:** <pseudo-diff or precise prose. The closer to a diff the better. Include the exact CSS or component change.>

**Estimated effort:** <S / M / L>
**Risk:** <one line — what could break>

## Backlog observed (one-liners — pick from these in future weeks)
- <issue 1 — file path :: short description>
- <issue 2>
- <issue 3>

## What changed this week (sanity check)
<bullet list of files in next/src/ touched in last 7 days, with one-line read on whether each is design-clean>

## Audit traces (compact)
- Token check: <pass/flag — one line>
- Component reuse: <pass/flag>
- Polish: <pass/flag>
- Dead style debt: <pass/flag>
- Responsive: <pass/flag>
```

### After writing the memo

Append a single-line entry to `/home/node/.openclaw/workspace/peninsula-insider/design-reviews/INDEX.md`:

```
- [YYYY-WWW](YYYY-WWW.md) — <one-line title of the recommendation>
```

(prepend, so newest is at top of the list under the heading)

---

## Quality bar

- The memo MUST contain a recommendation specific enough that a human can act on it in under 30 minutes. "Improve consistency" is not a recommendation. "Replace `border-radius: 1.5rem` and `border-radius: 12px` with a single `--radius-card` token at `:root` line 12, then replace all 7 occurrences" is a recommendation.
- If you can't find one issue worth a memo this week, write a memo that says so explicitly with the audit traces showing what you checked. Do not pad. A clean week is a valid output.
- Voice: match the BRAND-PI guide. No em-dashes. No overclaiming. Plain English.

## Hard nos
- Do not edit any code in `next/src/` from this job. Memo only.
- Do not open PRs. Memo only.
- Do not audit content (other jobs handle that).
- Do not call external services beyond Mission Control reporting (start/end run records).
