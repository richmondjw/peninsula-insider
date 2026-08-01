# The Content Factory — operating runbook

One week, one thesis, one Featured Plan, many channels.

Full design rationale: [`docs/peninsula-insider-content-operating-system-2026-07-28.md`](../../docs/peninsula-insider-content-operating-system-2026-07-28.md).
Job registry: [`ops/operating-surface.md`](../operating-surface.md), Tier-0.

---

## The weekly rhythm

| When | What happens | Who |
|---|---|---|
| **Mon 06:00 AEST** | Plans ranked, packet built, brief committed, thesis issue opened | automated |
| **Mon–Wed** | You write the thesis into the brief and sign `APPROVED BY:` | **you** |
| **Thu 05:00 AEST** | Channel copy derived, release ladder queued | automated |
| **Thu–Fri** | You read the review pack, approve the L3 assets | **you** |
| **On demand** | `campaign-schedule --submit` pushes social to Buffer | **you** |

Two decisions a week. Everything else is production.

---

## The five commands

```bash
# 1. Which Plan should this week's campaign be? Ranks, does not choose.
node ops/scripts/score-plan-fitness.mjs

# 2. Package the chosen Plan into a campaign packet + brief.
node ops/scripts/campaign-build.mjs --plan the-peninsula-golf-weekend

# 3. Generate channel copy. Refuses to run without a thesis.
node ops/scripts/campaign-derive.mjs --campaign CMP-2026-W31-the-peninsula-golf-weekend

# 4. Queue the staggered release ladder. Sends nothing live without --submit.
node ops/scripts/campaign-schedule.mjs --campaign CMP-2026-W31-the-peninsula-golf-weekend

# 5. Is anything silently broken? Exit 1 means yes.
node ops/scripts/factory-status.mjs
```

All five need `SUPABASE_SERVICE_KEY` (the PI_Concierge project). `--submit` also needs
`BUFFER_API_KEY`.

---

## The two gates you cannot bypass

**1. The thesis gate.** `campaign-derive.mjs` exits non-zero if `THESIS:` is empty. The thesis
is a JUDGEMENT-zone field: a machine may draft it, it may never finalise it. Leave
`APPROVED BY:` blank and derivatives still generate so you can read them, but every L3 asset
stays `draft` and the campaign parks in `awaiting_editorial_approval`. Sign it and the campaign
moves to `in_production`.

**2. The rights gate.** `pi_media_assets.permitted_channels` must contain the target channel
before an asset can be used there, and `derivative_works_ok` must be true before any crop,
reframe, or image-to-video. Both are enforced by database constraints, so no agent can forget
them. A campaign whose Plan has no cleared photography does not fail: it degrades to brand
graphics and typographic cards, and says so in the run log.

---

## Provenance: why the copy is trustworthy

Derivatives are assembled from **fragments that each carry their own source**, not generated as
prose and fact-checked afterwards:

| Fragment | Source |
|---|---|
| `signal` | a `pi_campaign_signals` assertion |
| `plan` | a human-written itinerary field (`editorNote`, stop `note`, `skipThese`, `dek`) |
| `thesis` | your approved thesis |
| `boilerplate` | fixed brand furniture, no factual content |

A fragment with no source **cannot be assembled at all** — `assemble()` throws. That is the
fabrication defence, moved one layer earlier than a QA gate, where it cannot be argued with.

Each asset records its own `sources` breakdown and a `factual_share`. An asset that is mostly
boilerplate is visible as such in the review pack.

There is currently **no LLM in the generation path**, so a campaign costs nothing to produce
and cannot hallucinate. The voice is Peninsula Insider's because a human wrote every factual
sentence; the factory chooses, orders, and frames them per channel.

---

## The release ladder

Nothing publishes simultaneously.

| Slot | Channel | Why here |
|---|---|---|
| Thu 06:00 | site | everything else links to it |
| Thu 07:00 | email | after the site is verified live |
| Thu 18:00 | IG carousel | ahead of weekend planning |
| Fri 08:00 | Facebook | |
| Sat 09:00 | IG story | while the weekend is actually happening |
| Mon 08:00 | opinion card | extends the tail |

Interlocks: a site failure cancels everything downstream. An email failure does not cancel
social. One social post failing does not cancel its siblings. A publication that submitted but
is not actually live (`verify_failed`) is treated as **louder** than one that failed to submit,
because nobody notices it otherwise.

---

## Where things live

| Thing | Location |
|---|---|
| Briefs and review packs | `ops/campaigns/CMP-*.md` |
| Machine packet | `ops/campaigns/CMP-*.json` |
| Campaign, signals, assets | Supabase `pi_campaigns`, `pi_campaign_signals`, `pi_campaign_assets` |
| Media rights | Supabase `pi_media_assets`, `pi_media_usages` |
| Distribution queue | Supabase `pi_publications` |
| Every stage of every run | Supabase `pi_run_log` |
| Media debt | `ops/reports/media-debt-*.md` |

---

## Known constraints, as at 2026-07-28

- **Media is the binding constraint.** 5 of 121 registered assets are cleared for social video.
  Until first-party photography closes that gap, carousels render typographic slides for most
  stops. This is working as designed, and it is the argument for a camera budget.
- **385 credit/licence mismatches** across the content layer: images credited "Peninsula
  Insider" while licensed as third-party. See the media debt report. These need resolving
  before any paid or derivative use.
- **`pi_search_opportunities` is empty** despite 849 rows of performance data upstream, so
  `search_headroom` scores NEUTRAL for every Plan and contributes nothing to selection.
- **Only 6 of ~23 Plans are structured itineraries.** The rest are prose articles and cannot
  drive a campaign. Promoting 3 to 4 of them is the cheapest way to lengthen the rotation.
