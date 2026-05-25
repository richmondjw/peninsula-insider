# Peninsula Insider Editorial Style Guide
**Version:** 1.2  
**Established:** 2026-05-11 (v1.0); structural-flow rules added 2026-05-15 (v1.1); reparented under BOS 2026-05-25 (v1.2)  
**Owner:** Peninsula Insider Editorial  
**Enforced by:** `ops/scripts/editorial-quality-check.py` (weekly CRON + PR gate)  
**Parent document:** [`docs/peninsula-insider-brand-operating-system.md`](../peninsula-insider-brand-operating-system.md) (strategic source of truth)

---

## What This Document Is

This is the canonical **operational** style guide for Peninsula Insider editorial. It is the auto-enforced implementation of the strategic decisions in the [Brand Operating System](../peninsula-insider-brand-operating-system.md). Use the BOS when commissioning, briefing, or auditing brand fit. Use this style guide when writing, reviewing, or shipping copy.

**The automated quality checker (`editorial-quality-check.py`) enforces this document mechanically. When a check fails, this document is why. When this document and the BOS disagree, the BOS is correct and this document must be updated to match.**

---

## 1. The PI Voice

### What it is

Peninsula Insider writes as someone who actually lives on the Peninsula and is telling a friend the honest version — not the brochure version, not the tourism board version, and not the version the restaurants pay for.

The voice is:
- **Specific over general.** Name the thing, describe what makes it distinctive.
- **Honest about limitations.** A restaurant that needs a 6-week booking advance should say so. A beach with dangerous rips should name them.
- **Direct, not deferential.** Do not hedge. Do not qualify good writing into weakness.
- **Warm but not gushing.** Enthusiasm is earned by description, not claimed by adjectives.
- **Locally intelligent.** The reader should feel they are getting the version that someone who has been there dozens of times knows — not the version Google returns.

### What it is not

- Tourist brochure copy
- SEO keyword stuffing  
- Promotional content dressed as editorial
- AI-sounding filler (see Banned Phrases below)
- Generic travel writing clichés

---

## 2. House Style Rules

### 2.1 Dash style

**PI uses a space-hyphen-space ` - ` for all prose dashes. Em-dashes `—` are banned.**

Every em-dash in the corpus is an error. The automated checker flags them; the phrase-fix script replaces them.

Correct: `The market is the anchor  -  not an addition.`  
Wrong: `The market is the anchor — not an addition.`

### 2.2 Capitalisation

- **Publication names in full on first mention:** "Good Food Guide" (not GFG), "Australian Good Food Guide" (not AGFG). Abbreviate on repeat reference.
- **"Peninsula"** is capitalised as a proper noun when referring to the Mornington Peninsula.
- **Format names** (service, slow-peninsula, cellar-door-dispatch) are lower-case when appearing in body text.
- **Article titles:** sentence case (capitalise first word and proper nouns only).

### 2.3 Numerals

- Numbers one through nine spelled out in body text; 10 and above as numerals.
- Exception: times and prices are always numerals (`8:30am`, `$125pp`).
- Percentages: always numerals (`5%`).

### 2.4 Times

Use 12-hour format: `8:00am`, `12:30pm`, `6:30pm`. No leading zero on hours below 10: `8am` not `08am`.

### 2.5 Prices

Format: `$X per person`, `$X–$Y per person`. Use an en-dash `–` not a hyphen for ranges.

---

## 3. Banned Phrases

These phrases are automatically flagged by the quality checker. Errors must be fixed; warnings are tracked.

### 3.1 Errors (must fix before publishing)

| Phrase | Why | Replace with |
|--------|-----|-------------|
| `hidden gem` | Travel cliché | Describe what makes the place distinctive |
| `must-see` | Tourist-board language | Name the specific reason to go |
| `world-class` | Vague superlative | Cite the specific achievement |
| `second to none` | Meaningless | Cut or replace with a concrete comparison |
| `something for everyone` | Filler | Cut |
| `truly special/unique/amazing/incredible` | Cliché intensifier | Describe what is special/unique/amazing/incredible |
| `delve` | AI-associated word | Use: explore, look at, examine |
| `seamless` | AI/marketing cliché | Describe the specific experience |
| `boast`/`boasts` | Promotional tone | Use: has, offers, runs, serves |
| Em-dash `—` | PI house style violation | Replace with ` - ` (space-hyphen-space) |
| Meta-announcement sentences | Redundant filler | Cut entirely (see Section 4.2) |

### 3.2 Warnings (review and reduce)

| Phrase | Issue | Guidance |
|--------|-------|----------|
| `quietly` | Overused PI modifier | Maximum 2 per article. Audit each use — keep only where it adds meaning (e.g. "quietly miffed", "quietly prize"). Replace reflexive uses with the actual claim. |
| `actually` | Hollow intensifier | Remove unless it is doing genuine contrastive work |
| `genuinely` | Overused PI intensifier | Maximum 2 per article |
| `really` / `very` | Weak intensifiers | Replace with a stronger adjective |
| `just` | Filler | Usually removable |
| `curated` | Overused in category | PI should show curation, not claim it |
| `picturesque` | Generic landscape word | Describe what you actually see |
| `stunning` / `charming` / `magical` / `wonderful` / `incredible` / `amazing` | Vague positives | Describe the specific quality |
| `tailored` / `leverage` / `foster` | Corporate/AI language | Use plain verbs |
| `the most [X] on the Peninsula` | Overused superlative | Reserve for uncontested cases; otherwise describe without ranking |

---

## 4. Structural Rules

### 4.1 Opening sentences

The PI opener should place the reader immediately in a specific situation, tension, or observation. Effective opening types:

- **Tension/problem frame:** "Sorrento has two problems, and they are the same problem at different volumes."
- **Honest contrast:** "Here is what nobody tells you about the Mornington Peninsula before your first visit."
- **Declarative observation:** "There is a quiet rule on the Peninsula that nobody prints on a brochure."

**Avoid:** Generic invitations ("Welcome to..."), questions that answer themselves, season-greeting openings ("As summer arrives...").

**Avoid: the repetitive contrarian hook.** The pattern {majority of people get X wrong / here is the correct version} is the PI default opener and has become a tic. Rotate the opener type across articles.

### 4.2 Meta-announcement sentences

**Banned in all PI copy.** These sentences announce that the article is about to deliver what it already promised. They add no information.

**Examples of banned sentences:**
- "Here is how to plan for it."
- "This is that guide."
- "Here is that version."
- "Here is the drive."
- "This is that list."

Cut them every time. The content immediately follows; the announcement is redundant.

### 4.3 Section headers

Headers in service pieces should **tell the reader what to do**, not describe what the section contains.

Weak: "The weekend structure that works"  
Strong: "Friday: arrive late, walk early, eat once"

Weak: "Indoor alternatives"  
Strong: "The gallery, the distillery, the pub  -  in that order"

### 4.4 FAQ rules

- Maximum **4 sentences** per FAQ answer.
- Anything longer belongs in the article body.
- FAQ answers should answer the specific question — not restate it.
- No FAQ answer should duplicate content already in the article body.

### 4.5 Editorial flow — the seven-phase structure

Every PI editorial is built against the Internal Editorial Structure Framework (vault: `peninsula-insider-vault/03-editorial/editorial-structure-framework.md`). The framework is the load-bearing flow from open to close. The four mechanical rules below are the parts the auto-checker enforces.

**4.5.1 Orientation in the lede.** The opening paragraph must establish at least one of: mood / core insight, the problem or question the piece answers, why this place or experience matters, or the kind of experience the piece is helping shape. Generic tourism openings, broad scene-setting, and unnecessary history are flagged.

**4.5.2 Sequencing over description.** Where a piece is about a day, weekend, walk, route, or trip, the body should make the sequence visible — what comes first, what matters most, what works together. Pieces that stack descriptive paragraphs without progression are flagged.

**4.5.3 Payoff sentences in each section.** Each H2 section should quietly answer the *so what* — *Why does this matter? Who is this best for? Why is this worth doing?* Example payoffs:

- "This is what makes the drive worthwhile."
- "This works best in colder weather."
- "The best version of this stop is slower than people expect."
- "This is where the Peninsula starts to feel properly coastal."

Sections without a payoff sentence are surfaced as a warning.

**4.5.4 Planning value.** Strong PI pieces answer at least two of: *Is this worth the drive? How long should I allow? What should I combine nearby? What works in bad weather? Who does it suit? What pace suits this experience?* The auto-checker scores planning value per piece and flags those that read as pure description.

**4.5.5 Continuation, not stop.** Pieces should end on a continuation move — recap the experience type, name who it suits, suggest the nearby or follow-on. Acceptable endings include "Best paired with…", "Worth extending into an overnight stay.", "Works best as part of a slower Peninsula weekend.", "If the weather turns, continue toward…". Pieces that end abruptly without one of these moves are flagged.

**4.5.6 Readability rhythm.** Inherits from §4.6 below. Prioritise shorter paragraphs, breathing room between ideas, stronger section rhythm, and cleaner transitions. Avoid dense text walls, repeated sentence cadence, overly literary phrasing, excessive editorial commentary, and over-explaining.

### 4.6 Paragraph length

- Service pieces: maximum 5 sentences per paragraph in body sections.
- Slow-peninsula format: up to 7 sentences is acceptable.
- Transitional paragraphs (between sections): maximum 3 sentences.

---

## 5. Venue Copy Rules

### 5.1 Editor notes

Every live, non-staging venue should have either:
- A **signature** (one sentence: what it is and why it matters), OR
- A **editorNote** (3–10 sentences: the honest version of what the venue is)

Ideally both. Venues with neither are flagged by the quality checker.

The editor note should be honest — including limitations. If a restaurant needs a 6-week advance booking, say so. If the hot springs gets crowded on weekends, say so. This honesty is the primary trust-building mechanism of the PI venue database.

### 5.2 Stale venue references

Articles must not reference venues with `status: "closed"` in their `relatedVenues` array. Closed venues in relatedVenues are flagged as **errors** by the quality checker.

Articles referencing venues with `sitemapExclude: true` (staging/parked) are flagged as **warnings**.

### 5.3 Featured partner disclosure

Venues with `featuredPartner: true` display a "Partner venue" label on VenueCard tiles and a "Partnership" row in the VenueDetail info table. This is mandatory. Never remove these UI elements.

The editorial integrity of PI depends on this disclosure being visible. As the partnership programme scales, the firewall between commercial and editorial must remain transparent to readers.

---

## 6. Content Architecture Rules

### 6.1 Section assignment

Articles have a `section` field: `journal` or `plans`.

- **journal:** editorial content (dispatches, slow-peninsula, cellar-door, investigations, guides)
- **plans:** occasion-based itineraries, sequenced day plans, occasion-planning guides

When in doubt: if the article answers "what should I do for [occasion/trip type]" in a sequenced way, it's Plans. If it is atmospheric, observational, or a reference guide, it's Journal.

### 6.2 Format field

Every article must have a `format` field. Valid formats:

| Format | Description |
|--------|-------------|
| `service` | Practical guides, planning pieces |
| `slow-peninsula` | Atmospheric, editorial, destination essays |
| `cellar-door-dispatch` | Wine producer editorial |
| `weekend-picker` | Peninsula This Weekend dispatches |
| `stay-notes` | Accommodation editorial |
| `insider-edit` | Shortlists with a point of view |
| `long-lunch-list` | Restaurant/dining lists |
| `editors-letter` | Editorial framing pieces |
| `interview` | Long-form conversations |
| `investigation` | Reported pieces |

### 6.3 Duplicate intent

Articles covering the same user intent should be differentiated and cross-linked, not silently competing. If two articles cover the same broad topic:
- The primary article should briefly acknowledge the companion ("For the unbooked version, see...")
- The companion should link back to the primary
- Both should be structurally differentiated so they serve different searches

**Current cross-linked pairs:**
- `rainy-day-peninsula` (planned version) + `the-rainy-day-peninsula-without-a-booking` (same-day backup)

### 6.4 Word count guidelines

| Format | Minimum | Maximum (flag for review) |
|--------|---------|--------------------------|
| service | 600 | 3,000 |
| slow-peninsula | 500 | 2,500 |
| cellar-door-dispatch | 400 | 1,800 |
| weekend-picker | 200 | 800 |
| stay-notes | 300 | 1,500 |
| insider-edit | 300 | — |

---

## 7. Publishing Checklist

Before any article is set to `status: "published"`:

- [ ] `title` and `dek` set (dek is required)
- [ ] `format` is a valid enum value
- [ ] `section` is set (`journal` or `plans`)
- [ ] `publishedAt` date is correct
- [ ] `lastVerified` date is set
- [ ] `heroImage` has `src`, `alt`, and `credit` populated
- [ ] `relatedVenues` does not reference any `status: "closed"` venues
- [ ] No banned phrases (em-dashes, "hidden gem", "delve", meta-announcement sentences)
- [ ] `quietly` appears 2 times or fewer
- [ ] FAQ answers are 4 sentences or fewer
- [ ] `sitemapExclude` is explicitly set (`true` for staging, `false` for live)

---

## 8. The Automated Quality System

### Scripts

| Script | Purpose | Run |
|--------|---------|-----|
| `ops/scripts/editorial-quality-check.py` | Full audit — errors + warnings report | Weekly CRON + manual |
| `ops/scripts/editorial-phrase-audit.py --report` | Find phrase violations | On-demand |
| `ops/scripts/editorial-phrase-audit.py --fix` | Auto-fix safe phrase violations | Before publish |
| `ops/scripts/content-export.py` | Generate CSV export for review | On-demand |

### CRON schedule

| Job | Schedule | Output |
|-----|---------|--------|
| Editorial quality check | Weekly, Sunday 20:00 UTC | `ops/reports/editorial/quality-YYYY-MM-DD.md` |

### CI gate (GitHub Actions)

The `editorial-quality.yml` workflow runs on every PR that modifies content. Errors (em-dashes, banned phrases, stale venue refs) block the PR. Warnings are surfaced in the PR summary but do not block.

---

## 9. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-05-11 | Initial version — derived from full corpus editorial review |
| 1.1 | 2026-05-15 | Added §4.5 *Editorial flow — the seven-phase structure*: orientation in the lede, sequencing over description, payoff sentences per section, planning value, continuation endings, readability rhythm. References the Internal Editorial Structure Framework in the vault. Linter checks for orientation / payoff / continuation will land in a follow-on PR (start as warnings). |

---

_This document is the canonical editorial standard. Automated checks enforce it. When a rule needs changing, update this document first, then update the check script._
