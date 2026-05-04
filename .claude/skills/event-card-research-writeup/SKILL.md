---
name: event-card-research-writeup
description: Research an event from at least three independent sources and produce editorial copy in Peninsula Insider voice. Used for events with thin spreadsheet imports that need a real write-up before they hit the hub. Run manually for one event, or via cron in batches.
---

# Event card research and write-up

A repeatable pattern for turning thin event-card data into a fully-fleshed editorial entry that matches Peninsula Insider's voice. Used today as a manual workflow; designed so it can be wired to a cron job for autonomous batched runs once we have a Claude/OpenAI API harness in place.

## When to invoke

Trigger conditions (any one of):
- An event with `visitorAppealScore >= 3` lacks `editorVerdict`
- An event has been included on a section hub event strip but has no editorial overlay
- An event is being considered for a featured slot in the dispatch newsletter

## Inputs

- **Required:** event slug (e.g. `tall-poppy-melbourne-design-week-exhibition`)
- **Optional:** priority hint (drives source-search depth)

## Process

### Step 1 — Read the existing event JSON

Path: `next/src/content/events/{slug}.json`

Capture:
- title, summary, description (the spreadsheet baseline)
- venueName, suburb, dates, organiser block
- existing `primarySourceUrl` and `secondarySourceUrl`
- visitorAppealScore (drives effort budget)

### Step 2 — Research from at least four sources, ranked

Source priority (higher = more editorial weight):
1. **Tier 1 — Official program / organiser primary source.** For MDW events, that is `designweek.melbourne`. For council events, `mornpen.vic.gov.au`. For organiser-run events, the organiser's own site.
2. **Tier 2 — Independent industry coverage.** Australian Design Review, Broadsheet, Time Out Melbourne, Indesign, ArchitectureAU, Architecture & Design.
3. **Tier 3 — Local Peninsula publications.** Peninsula Essence, MP News, Visit Mornington Peninsula, The Ninch.
4. **Tier 4 — Venue context.** The host venue's own website + tenant directories where the venue is part of a larger precinct.

For each source captured, record:
- URL (for citation)
- One-line credibility note
- 1-3 facts extracted that go beyond the spreadsheet

**Halt condition:** if fewer than three substantive sources resolve, write a `needs-editorial-touch` flag at `ops/reports/events/needs-research/{slug}.md` and stop. Do not write thin editorial. Better to surface the gap than fill it with marketing-board prose.

### Step 3 — Capture findings in a research note

Path: `ops/reports/events/research/{slug}.md`

Format:
```markdown
# Research note: {Event title}
**Researched:** YYYY-MM-DD
**Event slug:** {slug}

## Summary of findings
{2-3 paragraphs of synthesis}

## Key facts (verified)
- {fact} ({source short-name})

## Sources
1. **{Source name}** — {URL}
   - {credibility note}
   - {extracted facts}

## Editorial angle suggestions
{2-3 sentences on what makes this worth Peninsula Insider's space, vs a generic listing}

## Open questions / verification gaps
{things we couldn't confirm}

## Spreadsheet corrections needed (if any)
{machine-field corrections the editor should make to the source spreadsheet
before the next import, so they don't get reverted}
```

### Step 4 — Write the editorial fields in Peninsula Insider voice

Voice constraints (non-negotiable):
- AU spelling
- No em-dashes (use commas, colons, periods, parentheses)
- No exclamation marks
- No emojis
- First person plural for editorial register ("We would not drive ninety minutes...")
- Declarative, opinionated, not promotional ("join us for an exciting day" is forbidden)
- Cormorant register (slower, measured) for `editorVerdict`
- Outfit register (direct, practical) for `editorNote` body

Editorial fields to populate:

| Field | Length | Purpose |
|---|---|---|
| `whyWeCare` | One line, 12-25 words | The single reason a reader pays attention. Surfaces in cards and chip pages. |
| `editorVerdict` | 30-80 words | 2-3 sentence Cormorant paragraph. "What this is actually like." Surfaces on the event detail page and in editorial cards. |
| `editorNote` | 250-400 words | Multi-paragraph practical note. Format, atmosphere, booking advice, who it's for, what to pair with. |
| `pairingProse` | One sentence | "Lunch at X, this in afternoon, dinner at Y." Surfaces in the EventStrip card. |
| `kidsGrade` | A / B / C / not-for-kids | Editor's grade. Overrides auto-derived `kidsGradeAuto`. |
| `kidsGradeNote` | 1-2 sentences | Why this grade. The honest signal. |
| `worthTheDrive` | boolean | Editor-set flag. True only if the show alone justifies the ninety-minute return from Melbourne. |
| `editorVisited` | boolean | True only if a Peninsula Insider editor has personally attended. False for write-ups based on research. |
| `lens` | array | Refined lens tags. Auto-derived ones are a starting point; editor adjusts based on actual character. |
| `lastVerified` | ISO date | Today's date when the research was completed. |

### Step 5 — Apply via the helper script

```bash
python next/scripts/apply-event-editorial.py --slug {slug} --research ops/reports/events/research/{slug}.md
```

The script:
- Reads the research note for editorial-fields YAML block at the bottom (or accepts fields via --editorial flag)
- Writes the editorial fields to the event JSON
- Validates voice constraints (em-dashes, exclamations, word counts)
- Preserves all machine-imported fields
- Reports what it changed

### Step 6 — Open PR

Branch: `auto/event-research/{slug}-{YYYY-MM-DD}`

PR contains:
- Updated event JSON
- Research note
- Spreadsheet corrections file (if any)

PR description includes the research note inline so the reviewer sees the sources at a glance. **No auto-merge.** Editor reviews, accepts/edits/rejects.

## Cron schedule (when wired up)

Daily 04:00 AEST — runs after the daily content-hygiene cron stack settles.

Picks up to **3 events per run** (cost containment, ~$0.10-0.30/day):
- Filter: `editorVerdict` empty AND `visitorAppealScore >= 3` AND `status == 'published'`
- Sort: visitorAppealScore desc, then publishedAt asc (oldest first)
- Skip: events where `last_research_attempt` was within the last 14 days (prevents loop)

## What the skill does NOT do

- Generate `editorVerdict` text without grounded research. If sources are thin, halt.
- Auto-merge. Every editorial output is editor-reviewed via PR.
- Touch machine-owned fields (venue, address, dates, etc.) from research findings. Surface those as a separate "spreadsheet corrections needed" section so the editor updates the source-of-truth, not the JSON directly.
- Set `editorVisited: true`. Only an editor who has personally attended sets this.

## Files this skill touches

- **Reads:** `next/src/content/events/{slug}.json`
- **Writes:** `next/src/content/events/{slug}.json` (editorial fields only), `ops/reports/events/research/{slug}.md`
- **Optionally writes:** `ops/reports/events/spreadsheet-corrections/{slug}.md` if research surfaces machine-field errors in the source spreadsheet

## v2 (deferred)

Today this skill is a manual workflow with a Python helper that applies hand-curated research. The next iteration adds an autonomous research step:
1. Python script calls Claude API with web search enabled
2. Returns a structured research note in the format above
3. Calls Claude API again to draft editorial fields under voice constraints
4. Self-validates the draft against the voice rules
5. Outputs both for the apply step

That brings the cycle time from ~30 min/event (manual) to ~3 min/event (API), at the cost of LLM tokens. The editor-review gate stays.
