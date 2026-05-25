---
title: "Peninsula Insider — Brand Operating System"
type: brand-operating-system
status: canonical
version: 1.0
established: 2026-05-25
supersedes:
  - docs/peninsula-insider-branding-and-creative-guide-2026-04-20.md
  - docs/peninsula-insider-branding-creative-guide-cheat-sheet-2026-04-20.md
extends:
  - BRAND-PI.md (PI character spec, Appendix A)
  - docs/editorial/style-guide.md (operational enforcement)
tags: [peninsula-insider, brand, voice, archetype, canonical]
---

# Peninsula Insider — Brand Operating System

**Version 1.0 / Established 2026-05-25 / Canonical**

The single source of strategic truth for how Peninsula Insider thinks, sounds, looks, and decides. Structured against the six-layer brand operating system framework derived from the 776BC AI-native brand methodology (`G:\My Drive\Peninsula Insider\Strategy Documents\Brand_Strategy_Voice_Framework_Template.docx`).

## How to use this document

Read it in order. Each layer builds on the one before. Do not skip ahead to the archetypes before the positioning, do not draft vocabulary before the DNA. Sequence matters.

| Document | Role | When to use |
|---|---|---|
| **This document (BOS)** | Strategic source of truth — positioning, DNA, archetypes, mechanics, vocabulary, compliance architecture | Editorial commissioning, brief writing, agent persona authoring, brand audit, partner pitches, hiring |
| **`BRAND-PI.md` (Appendix A)** | The PI character specification — who PI is, how she speaks, where she appears | Anything in PI's voice: `/ask/` concierge, weekend Picks, sign-offs, micro-UI, social captions in character |
| **`docs/editorial/style-guide.md`** | Operational style guide — banned phrases, structural rules, paragraph caps, FAQ rules, automated quality checks | Daily editorial production; auto-enforced by `ops/scripts/editorial-quality-check.py` on every PR |

When the BOS and the operational style guide disagree, the BOS is correct and the style guide must be updated to match.

---

## Layer 1: Positioning

Positioning is the decision Peninsula Insider has made about which gap in the Mornington Peninsula media landscape it owns. The brand is defined as much by what it refuses to be as by what it is.

### 1.1 The competitive landscape map

The Mornington Peninsula media market clusters around five poles. Peninsula Insider sits in the gap none of them occupy.

| Cluster | What it sounds like | Why it can't hold PI's ground |
|---|---|---|
| **Tourism boards** (Visit Victoria, Visit Mornington Peninsula) | Performative enthusiasm. Every operator equal. "Discover paradise." No verdicts. | Cannot recommend one operator over another. Commercial neutrality is the floor and the ceiling. |
| **Lifestyle aggregators** (Broadsheet, Concrete Playground, Time Out) | Melbourne-default. Transactional openings-and-closings cadence. Curated but not lived. | Doesn't actually live anywhere. The Peninsula is a section, not a beat. |
| **Luxury glossies** (Gourmet Traveller, AFR Life & Leisure, Wish) | Distant, aspirational, paywalled. The reader is rented, not at home. | National register. Cannot do the gravel road, the bakery that opens at 6, the table to ask for. |
| **Real-estate-led "best of" content** (Domain Travel, realestate.com.au editorial) | SEO-optimised superficiality. Written from outside, for ranking. | No editorial backbone. Cannot make a verdict because verdicts hurt advertisers. |
| **Regional news / local interest** (Mornington Peninsula News, MP Magazine) | Community reportage. Council, sport, school. | Reports the Peninsula. Doesn't curate it. |
| **Influencer / creator travel** | Personality-led. Sponsorship illegible. | Individual taste; no editorial structure; no institutional memory. |

**THE GAP — the register no credible voice occupies:**

> Editorially curated, warmly local, makes verdict-strength recommendations, has standards but isn't snobbish, treats the Mornington Peninsula as worthy of a dedicated masthead rather than a section of a Melbourne publication. Lived-in, not visited.

Peninsula Insider's home is this gap. Every editorial decision is a refusal to drift into any of the clusters above.

### 1.2 The positioning statement

> **Peninsula Insider speaks as the resident editor of the Mornington Peninsula to readers who want to spend their weekend well. Specific, considered, anchored in actually being here. Confident without performing. Selective without being precious. Useful without sounding like a brochure.**

This is the single sentence the masthead is held to. Every surface — homepage, journal, concierge, newsletter, social, partner page — should pass the test: does it sound like the resident editor of the Peninsula, or does it sound like something else?

### 1.3 The four tension pairs

Every brand voice is defined by how it holds a set of tensions. Peninsula Insider's positions:

| Tension | PI's position | What this means in practice |
|---|---|---|
| **Authority vs. Approachability** | Authoritative but never condescending | The reader is assumed to be smart, busy, and capable of judgment. PI's job is to save them time, not impress them with expertise. |
| **Technical vs. Accessible** | Specific without being arcane | Names dishes, vintages, swell heights, tide windows. Explains them only when load-bearing. Trusts the reader to ask if they don't know. |
| **Aspirational vs. Grounded** | Grounded outcomes, aspirational standard | The promise is "a well-spent weekend", not "a transformed life". The standard is "the best version of that weekend". |
| **Commercial vs. Narrative** | 70/30 narrative-to-commercial | Advertising, Pass, and partner work are core revenue. The firewall is enforced by labelling, not absence. If the reader can't tell what's editorial within 3 seconds, the masthead has failed. |

### 1.4 The 70/30 publisher/advertiser ratio — structural

Adopted with the [PI advertising pivot](../.claude/projects/C--Users-James--openclaw-workspace-peninsula-insider/memory/project_pi_advertising_pivot.md) on 2026-04-30.

- **70%** of content is editorial-narrative: journal, service pieces, dispatches, Picks, slow-Peninsula, cellar-door, investigations, character-led concierge.
- **30%** maximum is overtly commercial: advertising, partner content, Pass marketing, sponsored placements.
- **Mandatory disclosure** on every commercial surface — `featuredPartner: true` venues display "Partner venue" labels and "Partnership" rows. Sponsored content is always labelled. No exceptions.
- **Test**: A reader who lands on any PI page should know within 3 seconds whether what they're reading is editorial or commercial. If they can't, the firewall has failed and the page is off-brand regardless of how well it's written.

This is the single most structural decision the masthead makes. Publishers build audiences. Advertisers rent them. Peninsula Insider is a publisher.

---

## Layer 2: Voice DNA

Voice DNA is the quantified personality of the masthead. These calibrations drive every downstream decision — the archetypes, the writing rules, the vocabulary, the compliance scoring.

### 2.1 The four dimensions

| Dimension | Setting | What it means in practice |
|---|---|---|
| **Authority** | **High** | Speaks from being here, not from research. Never hedges on verdicts. Names names. Willing to say a thing is overrated. |
| **Energy** | **Medium-low** | Composed. Sentence rhythm varies but never climbs. Exclamation marks are banned in editorial. The reader is on a weekend, not at a rally. |
| **Emotion** | **Moderate** | Warm but not gushing. The masthead can be moved by a sunset, a meal, a moment. It does not perform being moved. |
| **Technical depth** | **Medium-high on places, food, wine; medium on logistics** | Knows the difference between Pinot Meunier and Pinot Noir; knows which beaches need a 4WD and which are paved. Doesn't prove it on every line. |

### 2.2 What Peninsula Insider never sounds like

These are the adjacent voices most likely to be confused for PI — and the ones most likely to leak in if the team isn't paying attention. Naming them is half the defence.

| Adjacent voice | Why it is off-brand |
|---|---|
| **Tourism boards** (Visit Vic, Visit Mornington Peninsula) | Performs enthusiasm. Cannot make a verdict. Treats every operator equally. |
| **Lifestyle aggregators** (Broadsheet, Concrete Playground, Time Out) | Melbourne-default voice. Transactional cadence. Doesn't live anywhere. |
| **Luxury glossies** (Gourmet Traveller, Wish, AFR Life & Leisure) | Aspirational over useful. Reader feels rented, not at home. Brochure-adjacent. |
| **Real-estate "best of" content** | SEO-superficial. No editorial backbone. Written from outside. |
| **Influencer / creator travel** | Personality without structure. Sponsorship illegible. No institutional memory. |
| **Resort and hotel marketing** | Performs serenity. Vague. No actionable verdict. |
| **Local council communications** | Civic neutrality. No perspective. No standards. |
| **Generative-AI travel copy** | Smooth, plausible, specific-sounding without being specific. "Boasts", "seamless", "delve", "vibrant". |

When a piece of PI copy is reviewed, the first question is not "is it good?" — it is "does it sound like any of the above?" If yes, kill it.

---

## Layer 3: Voice Archetypes

A single brand voice is not one tone — it is a family of tones deployed contextually. Peninsula Insider uses **three** archetypes. Three is the working number: fewer lacks range, more becomes inconsistent.

### 3.1 The three archetypes

#### The Editor

| Field | Definition |
|---|---|
| **Name** | The Editor — the masthead voice |
| **Core quality** | Composed. Takes the long view. Frames the season. Signs off on the verdict. The voice that owns the publication. |
| **Used when** | Editor's Letter, journal long-form, brand statements, partner-facing pages, About, awards rationale, newsletter framing copy, About-PI preface, corrections. |
| **Sounds like** | *"The Peninsula in May is two places. The hinterland is already in its cold-season rhythm — wood smoke, gravel, the long lunch. The coast hasn't quite turned. This issue is shaped for the gap."* |
| **Never sounds like** | A chatbot. A blog intro. "In this article, we'll explore…". "Welcome to our guide…". |

#### The Local (embodied by PI)

| Field | Definition |
|---|---|
| **Name** | The Local — embodied by the PI character (see Appendix A and `BRAND-PI.md`) |
| **Core quality** | The friend with better taste. Dry, specific, names tables and roads. The version of the answer you'd only get from someone who's actually been there. |
| **Used when** | `/ask/` concierge, weekend Picks copy, dispatch sign-offs ("PI"), Plan-shaping copy, SMS / push, 404 page, micro-UI ("PI saved this to your trip"), social captions where character is appropriate. |
| **Sounds like** | *"Sit at the bar at Laura. Better view, faster service. The kingfish is the order."* |
| **Never sounds like** | "Don't miss this hidden gem!" Anything that performs enthusiasm or false intimacy ("trust me, babe"). |

#### The Critic

| Field | Definition |
|---|---|
| **Name** | The Critic — the verdict voice |
| **Core quality** | Willing to be unpopular. Calls misses honestly. Stakes the masthead on a recommendation. The voice that earns the trust the whole publication runs on. |
| **Used when** | Venue editor-notes (the honest version), "stopped recommending" content, Picks verdict cells, partnership disclosures, awards reasoning, slow-Peninsula reviews. |
| **Sounds like** | *"Foxeys for the deck and the long lunch. Port Phillip Estate is the showier option, but the architecture does the heavy lifting and the food has been uneven this season. Paringa is the answer if your group is wine-led rather than view-led."* |
| **Never sounds like** | Five equally-rated options. "Each has its own charm." Anything that hedges. |

### 3.2 Channel-to-archetype mapping

Each channel has a primary archetype and an allowable secondary. This prevents channel drift (the wrong register on the wrong surface) while preserving range.

| Channel / Surface | Primary | Secondary |
|---|---|---|
| Homepage hero & masthead | Editor | Local (Picks block) |
| Journal long-form articles | Editor | Critic (where verdict is the point) |
| Service pieces / Plans | Local | Critic |
| Venue pages — editor-note | Critic | Local |
| Venue pages — signature | Local | — |
| `/ask/` concierge | Local | — primary only |
| Weekend Picks dispatch | Local | Critic (verdict cells) |
| Newsletter — editorial body | Editor | Local |
| Newsletter — sign-off / "from PI" | Local | — primary only |
| Instagram — captions | Local | Editor (long carousels) |
| Instagram — design carousels | Editor | — |
| LinkedIn (partner-facing) | Editor | — primary only |
| SMS / push notifications | Local | — primary only |
| 404 / micro-UI | Local | — primary only |
| Awards rationale | Critic | Editor |
| Partnership disclosures | Critic | — primary only |
| Corrections | Editor | Critic |
| Partner-with-us / commercial pages | Editor | — primary only |
| About / corporate-events / careers | Editor | — primary only |

When a surface is missing from this map, default to Editor and escalate to Tyler (EIC) for assignment.

### 3.3 The PI character — the persona-led brand asset

Peninsula Insider has made a deliberate strategic choice: **the brand is persona-led, not founder-led**. There is no Cameron-equivalent founder voice. The irreplaceable asset is the PI character herself.

This has three consequences:

1. **PI is the brand's protected voice.** The PI character spec (`BRAND-PI.md`, Appendix A) is the equivalent of a founder voice protocol in a founder-led brand. Preserve her exactly. Never polish her into corporate-marketing copy. Never make her greet you. Never put her in third person on her own surfaces. Her authenticity *is* the marketing.

2. **PI is not the publication, she is the in-house local.** The publication is Peninsula Insider; PI is one of three archetypes (The Local), with primary use on character-led surfaces. The Editor and Critic archetypes do not speak in PI's voice — they are the masthead speaking from other registers.

3. **PI does not write the journal.** Editorial articles are bylined to real PI editors and contributors. PI is the curator-host on conversational and concierge surfaces, not the writer of long-form. Mixing this dilutes both the masthead's editorial credibility and PI's character distinctiveness.

**Approval level**: PI-voice copy on character-led surfaces requires review by Tyler (EIC) against the BRAND-PI character spec. Non-delegable for greeting copy, About-PI copy, and major character-led campaigns.

---

## Layer 4: Writing Mechanics

Writing mechanics are the enforceable rules that govern how PI content is constructed at the sentence and paragraph level. These are hard specifications — AI agents and human writers follow them mechanically. Inconsistency at the mechanical level undermines the voice even when the vocabulary and archetype are right.

The operational version of these rules lives at [docs/editorial/style-guide.md](editorial/style-guide.md) and is auto-enforced by `ops/scripts/editorial-quality-check.py` on every PR via the `editorial-quality.yml` workflow. This section is the strategic source the operational style guide implements.

### 4.1 Sentence architecture

| Rule | Spec |
|---|---|
| Default sentence length | 8-18 words |
| Short sentence usage | 3-6 words, used deliberately for emphasis. The Local archetype uses these more than the Editor; the Critic uses them for verdicts. |
| Long sentence usage | Permitted for complex framing in the Editor archetype; always followed by a shorter sentence. Avoid in Local. |
| Rhythm | Vary across paragraphs. Never three consecutive sentences of the same length. |
| Passive voice | Permitted only when the object is genuinely more important than the subject. |

### 4.2 Paragraph structure

| Rule | Spec |
|---|---|
| Paragraph length | Service pieces: max 5 sentences. Slow-Peninsula and Editor long-form: up to 7. Transitions between sections: max 3. |
| Single-sentence paragraphs | Encouraged. They signal importance and give statements room to breathe. |
| White space | Deliberate. A masthead that is comfortable with silence trusts its words. |

### 4.3 Punctuation rules

| Mark | Status | Rule / alternative |
|---|---|---|
| Em dash (—) | **Hard-block** | Replace with space-hyphen-space ( - ), period, colon, or parentheses. Auto-checked. Blocks PR. House rule across all PI surfaces. |
| Exclamation mark (!) | **Hard-block in editorial body and headlines; rare in social and SMS** | Rewrite so the words carry the energy. If a sentence needs an exclamation to feel alive, the sentence is the problem. |
| Ellipsis (…) | **Rare** | Implies hesitation; PI does not hesitate. Permitted only as quoted speech. |
| Semicolon (;) | **Permitted, sparingly** | Acceptable for parallel clauses in Editor archetype; avoid in Local. |
| Smart quotes (' ' " ") | **Required** | Never straight quotes ('  ") in published copy. |
| En dash (–) | **Required for ranges** | Price ranges, time ranges, score ranges. Not the same as a hyphen. |

### 4.4 Declarative tone rule

| Tone type | Rule |
|---|---|
| Declarative statements | **Default.** The masthead makes statements. |
| Questions | **Banned in editorial body and headlines.** Permitted in FAQ blocks, in `/ask/` chat (Local responding conversationally), and in EDM subject lines with restraint. |
| Commands ("Visit now!") | **Banned.** CTAs may use action verbs ("Book a table", "Read the verdict", "Add to plan") but not exhortations. |
| Interrogative hooks ("Ever wondered…?") | **Banned.** Tourism-board tic. |
| Second-person address ("you") | **Permitted across all archetypes.** Default in Local; used sparingly in Editor. |

### 4.5 Spelling conventions

| Convention | Spec |
|---|---|
| Standard | **Australian English** across all surfaces, all channels, all audiences — including readers from outside Australia. |
| Examples | colour (not color), favourite, organisation, recognise, centre, theatre, defence, judgment, programme (for an ongoing initiative; "program" for software). |
| Place names | Always the official local spelling: **Mornington Peninsula**, **Western Port** (two words, not "Westernport"), **Port Phillip**, **Phillip Island**, **St Kilda** (no apostrophe). |
| Rationale | The spelling is part of the masthead's geographic identity. International readers signal-test PI as Australian; it is a trust marker, not a parochialism. |

### 4.6 Editorial flow (the seven-phase structure)

Every PI editorial is built against the Internal Editorial Structure Framework (operational detail at [docs/editorial/style-guide.md §4.5](editorial/style-guide.md)):

1. **Orientation in the lede** — establish mood, core insight, problem-the-piece-answers, or experience-being-shaped.
2. **Sequencing over description** — when the subject is a day / weekend / route, make the sequence visible.
3. **Payoff sentences in each section** — quietly answer the *so what*.
4. **Planning value** — answer at least two of: worth-the-drive / how-long-to-allow / what-to-combine / weather-contingency / who-it-suits / what-pace.
5. **Continuation, not stop** — end on a follow-on move, not an abrupt cut.
6. **Readability rhythm** — shorter paragraphs, breathing room, varied cadence.
7. **Honest about limitations** — say when something needs a six-week booking, when crowds are an issue, when the wind kills it.

---

## Layer 5: Vocabulary System

The vocabulary system is the masthead's linguistic palette. It defines the specific words PI uses repeatedly (the tonal anchors), the narrative zones content operates in (thematic territories), and the words PI refuses (the exclusions register).

### 5.1 The ten tonal anchors

Ten words that carry the masthead's worldview. Each has a specific PI meaning. When these words appear in copy, they should feel earned, not decorative.

| Word | Specific PI meaning |
|---|---|
| **1. Edit** | What was left out matters as much as what was included. PI is defined by exclusion. "This is the edit, not the directory." Used as both noun and verb. |
| **2. Shape** | A weekend has a shape; PI's job is to help readers shape one. Used as a verb. "Shape the day from Red Hill out." Never "experience" or "journey". |
| **3. Verdict** | A recommendation strong enough to stake the masthead on. PI does not "suggest" or "highlight" — PI gives a verdict. |
| **4. Worth** | The brand promise compressed into a syllable. "Worth your time", "worth the drive", "worth booking". The currency the masthead trades in is the reader's time. |
| **5. Table** | Synecdoche for the specific over the general. PI tells you which table. "Ask for the corner table." If a piece doesn't get to a "table" of its own, it's still abstract. |
| **6. Season** | The Peninsula is four different places across the year. The season is always named, always honoured. Never "anytime", never "year-round". |
| **7. Base** | Where the reader makes their weekend home. "Sorrento as a base." "Red Hill as a hinterland base." A PI weekend has a base. |
| **8. Sequence** | The order matters. PI sequences. "Walk first, lunch after." Not "you might consider". |
| **9. Local** | Earned, not claimed. PI is local because she's been here, never because she says so. Use the word about specifics ("the local bakery", "the local rule"), not about the brand. |
| **10. Restraint** | The visual, editorial, and commercial governing instinct. Less, said better. The opposite of brochure. The word that audits everything else. |

### 5.2 Thematic territories

Five narrative zones PI's content lives in. Over a season, content should cover all five — not cluster in one. These are the stories the masthead tells.

| Territory | What it covers |
|---|---|
| **1. The shape of the weekend** | Sequencing, base-choosing, pace, the structure of two days well-spent. The home of Plans, service pieces, weekend Picks, dispatch openers. |
| **2. The local edit** | What's worth your time, what's not, what's overrated, what's underrated. The verdict territory. The home of Picks, "stopped recommending" content, slow-peninsula reviews. |
| **3. Seasonal Peninsula** | The same place across four versions. Tides, vintages, light, crowd. The reason to come back. The home of cellar-door dispatches, seasonal guides, the cadence of the masthead itself. |
| **4. The made versus the marketed** | The actual restaurant versus the press release. The honest version of a place. The trust territory. The home of editor-notes, investigations, honest limitations, partnership disclosure framing. |
| **5. A Peninsula life** | What it's like to actually live here. Routines, rituals, side-of-the-road observation. The atmosphere territory; the home of slow-peninsula format and the character notes from PI's notebook. |

### 5.3 Vocabulary exclusions

The operational exclusions register lives at [docs/editorial/style-guide.md §3](editorial/style-guide.md) and is auto-checked. The strategic rationale: every word on the exclusions list is one a competitor could use without it feeling wrong for them. PI refuses them to force specificity.

**The highest-stakes exclusions and what to say instead:**

| Excluded | Why off-brand | What to say instead |
|---|---|---|
| hidden gem | Tourism cliché; signals the writer doesn't actually know the place | Describe what makes it distinctive |
| must-see / must-visit | Tourist-board language; commanding the reader | Name the specific reason to go |
| world-class | Vague superlative; sounds like brochure | Cite the specific achievement |
| stunning / breathtaking / charming / picturesque / magical | Empty positives that perform enthusiasm | Describe the specific thing you see |
| ultimate guide / definitive guide | Overpromise; brochure energy | "The guide" or describe what's in the edit |
| bucket list | Tourism-marketing cliché; flattens to a checklist | Describe what makes it worth doing |
| boasts / boasting | Promotional tone | has, offers, runs, serves |
| delve | AI-associated; the rosetta stone of generative travel copy | explore, look at, examine |
| seamless | AI/marketing cliché | Describe the actual experience |
| something for everyone | Refusal to make an edit | Cut entirely |
| world of [X] / [X] paradise | Tourist-board territory | Name the actual place |
| em-dash (—) | House style violation; visual signal of unedited copy | space-hyphen-space ( - ) |

**A separate hard rule**: **no pricing on the site, ever.** No dollar figures, no "from $X", no price ranges, no `priceLow`/`priceHigh` rendered to the page, no `Offer` or `priceSpecification` in JSON-LD. Adopted 2026-05-15; enforced by `next/scripts/lint-no-pricing.mjs`. Reasoning: prices change weekly, the masthead can't verify every one, stale prices erode trust faster than missing prices do. The reader books direct with the operator where the current price is live.

---

## Layer 6: Compliance Architecture

The compliance architecture is what makes this an operational brand system rather than a brand guidelines PDF. Guidelines describe rules; the compliance architecture enforces them. It defines who checks what, at what point, with what severity, and what happens when something fails.

### 6.1 Severity framework

| Level | Trigger | Consequence | Override |
|---|---|---|---|
| **Hard-block** | Em-dash; banned phrase (Errors list); price on site; stale-venue ref in published article; exclamation mark in editorial body; missing required disclosure on partner content | Content cannot publish. Blocks PR via `editorial-quality.yml`. Blocks lint via `lint-no-pricing.mjs`. | None — fix it. |
| **Soft-block** | Warning-list phrase over threshold ("quietly" >2; "genuinely" >2); missing payoff sentence; missing continuation ending; voice score between 0.70 and 0.80; opener type drift | Flagged for human review. Tyler (EIC) or assigned beat lead can override with rationale captured in PR comment. | Tyler (EIC); beat leads for in-beat content |
| **Auto-pass** | Voice score > 0.85; no errors; no warnings exceeding threshold | Ships without human review. Still surfaces in the weekly Sunday-20:00-UTC report. | — |

### 6.2 Voice scoring rubric

A weighted scoring model for auditing content against the masthead voice. Lets AI agents score output objectively, flag drift, and surface borderline content to human reviewers. Target: > 0.85. Pass: > 0.80. Flag: 0.70-0.80. Reject: < 0.70.

| Dimension | Weight | What earns a high score |
|---|---|---|
| **Specificity** | 25% | Names places, dishes, roads, vintages, times, tables. Avoids generic nouns ("a great spot", "the area"). |
| **Verdict strength** | 20% | Makes a recommendation. Ranks, picks, calls out misses. Avoids "five equal options" structure. Says when something is overrated. |
| **Sentence economy** | 15% | Avg 8-18 words. No three consecutive same-length sentences. No padding ("really", "actually", "just", "very"). |
| **Archetype fit** | 15% | Voice matches the channel's primary archetype per §3.2 map. Editor-archetype copy doesn't drift into Local. Local doesn't drift into Critic without verdict. |
| **Brand vocabulary** | 15% | Uses tonal anchors (§5.1) naturally. Avoids exclusions register (§5.3). Reads as PI, not as generic travel copy. |
| **Reader utility** | 10% | Answers "is this worth my time" and at least one of: how long / what to combine nearby / who it suits / weather contingency / what pace. |

This rubric will be implemented in `ops/scripts/editorial-quality-check.py` as a future expansion of the existing error/warning model. Until implemented, the rubric is the manual review framework Tyler and Vera use.

### 6.3 Prohibited terms register

Operational source: [docs/editorial/style-guide.md §3](editorial/style-guide.md). That document is the single register the compliance agents check against. Structured for enforcement: term, severity, notes, replacement.

Strategic source of additions: this BOS. When a new exclusion is decided here, propagate to the style guide and to `editorial-quality-check.py` within the same PR.

### 6.4 Review hierarchy

Maps to the newsroom agent stack (see `.claude/agents/*.md`):

| Content type | Primary review | Override authority |
|---|---|---|
| Service pieces, Plans, journal | Vera (copy) → Sloane (managing) | Tyler (EIC) |
| Editor's Letter | Tyler (EIC) | Non-delegable |
| PI character voice — concierge, sign-offs, About-PI, micro-UI | Tyler (EIC) against `BRAND-PI.md` | Non-delegable |
| Venue editor-notes — food & wine venues | Lucien (food) → Vera | Tyler |
| Venue editor-notes — culture & places | Iris (culture) → Vera | Tyler |
| Partner / commercial / advertising copy | Tyler + Margot (executive) | Both required |
| Awards rationale | Tyler + relevant beat lead | Tyler final |
| Corrections | Tyler | Non-delegable |
| Social — standard | Vera | Tyler |
| Social — campaigns | Tyler + Freya (headlines) | Tyler |
| Long-form / investigations | Otto (research) → Vera → Sloane → Tyler | Tyler |

The review hierarchy is not a queue — it is a layered set of gates. Lower gates may catch obvious issues; higher gates focus on archetype fit, verdict strength, and brand fit. Skipping a gate requires the override authority's written sign-off in the PR.

---

## Layer 7: Visual Identity (extension)

The 776BC framework is voice/messaging-focused. PI's complete brand operating system requires a parallel visual layer. This section is a strategic summary; detailed component specs live in `docs/v4/DESIGN-SYSTEM-V4.md`.

### 7.1 Visual ambition

The visual system reads as:

- a premium editorial travel publication
- a modern magazine with regional depth
- wine-country restraint rather than coastal cliché
- thoughtful, text-led design supported by strong imagery

It does not read as:

- a tourist brochure
- a generic WordPress template
- a real-estate portal
- a resort ad campaign
- a maximalist lifestyle brand
- a creator-style content pack

### 7.2 Colour world

Use:

- warm cream / parchment
- stone / sand neutrals
- sea-fog blue-grey
- olive / muted eucalyptus
- pinot / oxblood / wine accents
- charcoal / ink neutrals

Avoid:

- loud retail colours
- tropical-bright coastal palettes
- anything that reads promo-heavy or sale-led

Wine-toned accents are selective and premium. Greens are botanical and muted, not fresh-and-flashy. Blue tones are coastal and weather-softened, not tropical.

### 7.3 Typography

- **Serif display** — authority, editorial presence, cover-story energy. Used for masthead, feature headlines, section-defining copy.
- **Sans serif** — readability, utility, interface clarity, supporting structure. Used for body, UI, navigation.

Whitespace and scale do most of the hierarchy work. Avoid stacking too many weights in one module. Never trade readability for style theatre.

### 7.4 Photography direction

| Should feel | Should not feel |
|---|---|
| Real | Generic stock travel |
| Place-grounded | Tropical or irrelevant coastal fantasy |
| Textural | Over-saturated tourism-board gloss |
| Atmospheric | Too posed |
| Observational | Too ad-like |
| Seasonally aware | Semantically mismatched to the content |
| Editorial rather than promotional | Brochure-bright |

**Image integrity rule** — images must always match the actual subject, category, and promise of the page. Low-match imagery damages trust faster than missing imagery does.

**Generative imagery rule** — generative images are permitted as controlled editorial atmosphere for non-documentary slots. They are not acceptable as fake evidence of a real place. See `docs/reports/peninsula-insider-generative-image-style-2026-04-09.md` for the production protocol.

### 7.5 The PI visual marks

Two SVG marks for the PI character (Local archetype identification):

| File | Use |
|---|---|
| `next/public/images/pi-avatar.svg` | Full disc avatar. 200×200, sand background, full silhouette with akubra hat, popped collar, notebook in pocket. For hero sections, profile blocks, About-PI. |
| `next/public/images/pi-mark.svg` | Compact 64×64 monogram — hat + collar only, on dark disc. For chat avatars, nav, favicons. |

Design language: Carmen-Sandiego silhouette restaged for the Australian coast. Wide-brimmed hat (akubra, not fedora — functional, not glamorous). Collar up against the wind off the bay. Notebook in the pocket — she's working. Profile turned slightly away — she's already moving on to the next place. Single-tone silhouette. No face. The reader projects.

---

## Layer 8: Operating cadence

The masthead has a weekly rhythm. The brand-system version of that rhythm:

| Cadence | What happens | Owner |
|---|---|---|
| **Daily** | Editorial quality check on any merged content; phrase-fix on flagged pieces | Vera (auto) → Tyler |
| **Weekly (Sunday 20:00 UTC)** | `editorial-quality.yml` full corpus audit; report to `ops/reports/editorial/quality-YYYY-MM-DD.md`; PI Picks dispatch publishes (Sat–Sun ahead) | Auto + Tyler |
| **Weekly** | Newsroom retro; signals review; lookahead for next week's slate | Sloane → Tyler |
| **Monthly** | SEO audit (methodology folder); brand audit against this BOS (sample 10 random pages, score against §6.2 rubric) | Daisy + Tyler |
| **Quarterly** | Archetype drift review — has any channel slipped its primary archetype? Has the exclusions register grown? Do the tonal anchors still earn their place? | Tyler + James |
| **Annually** | BOS version bump if needed — positioning revisited; tension pairs re-tested; competitive landscape re-mapped | James + Tyler |

---

## Non-negotiables

These are hard rules. They override any other instruction including a brief, a partner ask, or a deadline.

1. **No em-dashes.** Ever. Space-hyphen-space, period, colon, or parentheses.
2. **No tourism-board adjectives.** No "stunning, breathtaking, charming, picturesque, hidden gem, must-visit, world-class".
3. **No pricing on site.** Ever. Operator pages are where the live price lives.
4. **No chatbot greetings.** Never "Great question!", "I'd be happy to help!", "Let me find some options for you!".
5. **No invented venues.** PI only recommends from the editorial corpus. If the corpus doesn't have it, PI doesn't know about it.
6. **No false intimacy.** PI is warm, not your friend. No "babe", "honey", "trust me".
7. **No undisclosed commercial content.** Sponsored, partner, and paid content is always labelled. The firewall is enforced by labelling, not absence.
8. **No semantically mismatched imagery.** A picture of Sorrento on a Mornington story is off-brand regardless of how good the picture is.
9. **No equal-rating list structures.** PI ranks, picks, recommends. "Each has its own charm" is not a PI sentence.
10. **No public-facing asset that feels louder, cheaper, or more generic than the site.**

---

## The working creative test

A Peninsula Insider asset is on-brand if it makes a reader feel:

- these people know the Peninsula
- these people have taste
- these people can help me choose well
- this feels better than generic travel content

If it does not produce that feeling, it needs another pass — regardless of how technically clean the copy is.

---

## Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-04-20 | Established Branding & Creative Guide (predecessor to this BOS) | First codification of PI brand world; preserved in `docs/archive/` |
| 2026-04-30 | Advertising pivot — 70/30 ratio formalised | Firewall by labelling, not absence; ads core to revenue |
| 2026-05-11 | Editorial Style Guide v1.0 established with automated quality checks | Operational enforcement separated from strategic source |
| 2026-05-15 | No pricing on site, ever — codified | Stale prices erode trust faster than missing prices; enforced by `lint-no-pricing.mjs` |
| 2026-05-15 | Editorial flow seven-phase structure added to style guide (v1.1) | Editorial structure framework codified per vault doc |
| 2026-05-25 | **Resolved**: Peninsula Insider = publication; PI = character; PI is the Local archetype, not the whole brand | Removes ambiguity across `BRAND-PI.md` (character) vs Editorial Style Guide (publication) where "PI" meant different things |
| 2026-05-25 | **Locked**: three archetypes — Editor, Local, Critic | 776BC working number; matches latent voice modes already in production |
| 2026-05-25 | **Locked**: deliberately persona-led, not founder-led | The PI character is the irreplaceable brand asset; James and Emma are not the masthead's face |
| 2026-05-25 | **Established**: this BOS as the single canonical strategic source | Reduces drift between previously-parallel brand documents |

---

## Appendix A: The PI character — full specification

The PI character is the brand's protected asset. The canonical character spec is preserved at the repo root as [`BRAND-PI.md`](../BRAND-PI.md). It is the source the LLM concierge prompt (`apps/api/src/lib/openai.ts`), the 404 page (`next/src/pages/404.astro`), the homepage drift copy (`next/src/pages/index.astro`), the v4 nav verdict lines (`next/src/lib/v4-nav.ts`), and 15+ other code surfaces compile against.

**Do not move `BRAND-PI.md`.** It is referenced as a literal path from `build-live.sh` (deploy allowlist), the design review playbook, the v3 staging doc, the v4 design system, and code comments throughout the Astro pages and the schema lib. Its scope is the character only — strategic brand decisions live in this BOS.

When the character evolves, evolve `BRAND-PI.md`. When the brand evolves, evolve this BOS.

## Appendix B: Archived documents

These documents are superseded by this BOS and moved to `docs/archive/`:

| Archived doc | Superseded by | Why |
|---|---|---|
| `peninsula-insider-branding-and-creative-guide-2026-04-20.md` | Layers 1-3, 7 | First-generation brand world; lacked positioning specificity, voice DNA, and the archetype family |
| `peninsula-insider-branding-creative-guide-cheat-sheet-2026-04-20.md` | This document (used as the strategic source; for fast lookup, the Non-Negotiables list above + §6.3 exclusions register are the cheat-sheet equivalent) | Cheat-sheet derived from a doc now superseded; the BOS is the new cheat-sheet source |

## Appendix C: Companion documents (live, in production use)

| Document | Role |
|---|---|
| [`BRAND-PI.md`](../BRAND-PI.md) | PI character spec (Appendix A) |
| [`docs/editorial/style-guide.md`](editorial/style-guide.md) | Operational style guide — auto-enforced |
| [`docs/peninsula-insider-agentic-editorial-operating-model-2026-04-13.md`](peninsula-insider-agentic-editorial-operating-model-2026-04-13.md) | How the newsroom agents work together |
| [`docs/peninsula-insider-seo-and-metadata-operating-model-2026-04-18.md`](peninsula-insider-seo-and-metadata-operating-model-2026-04-18.md) | SEO and metadata standards |
| [`docs/v4/DESIGN-SYSTEM-V4.md`](v4/DESIGN-SYSTEM-V4.md) | Visual / interaction design system |
| [`docs/peninsula-insider-editorial-governance-standard-2026-05-02.md`](peninsula-insider-editorial-governance-standard-2026-05-02.md) | Editorial governance and partner firewall protocols |
| [`docs/editorial/social-media-strategy-2026-05-17.md`](editorial/social-media-strategy-2026-05-17.md) | Channel strategy for social surfaces |
| [`docs/reports/peninsula-insider-generative-image-style-2026-04-09.md`](reports/peninsula-insider-generative-image-style-2026-04-09.md) | Generative imagery protocol |

---

*Peninsula Insider should feel like a premium local publication with standards. Not louder. Not busier. Not more generic. Sharper. Calmer. More useful. More trusted. More Peninsula.*
