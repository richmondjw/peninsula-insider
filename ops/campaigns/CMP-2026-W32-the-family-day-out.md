# Campaign brief: The Peninsula Family Day Out

**Key:** `CMP-2026-W32-the-family-day-out`
**Week:** 2026-W32 (winter)
**State:** `brief_ready` · risk `amber`
**Campaign id:** `2cbc3fde-d243-4547-86ea-3584dc0bad5e`
**UTM:** `pi-2026-w32-day-out`

---

## 1. The thesis (JUDGEMENT — you write this)

> _Two or three sentences. Name a place, name a window, name an action._
> _This is the only thing the whole campaign inherits, so it is the only thing worth getting exactly right._

```
THESIS:

CORE PROMISE:

WHY THIS ANGLE OVER THE RUNNERS-UP:

APPROVED BY:
```

Nothing generates until `THESIS` is filled in.

`APPROVED BY` is the signature line and **only a human may fill it**. Leave it blank and the derivatives still generate so you can read them, but every L3 asset stays a draft and the campaign parks in `awaiting_editorial_approval`. Sign it and the campaign moves to `in_production`.

## 2. The Plan

**The Peninsula Family Day Out**

A single day built around one anchor (the gondola), one lunch that works with children (the brewery), and one beach that forgives everything. No drives longer than twenty minutes, no bookings that punish a melt-down.

0 night(s) · 4 stops · 60 min driving · best for family

| Day | Time | Stop | Editorial note |
|---|---|---|---|
| 1 | morning | Arthurs Seat Eagle | Start high. The Arthurs Seat Eagle gondola is the anchor of the day  -  twenty minutes of gently dangling flig |
| 1 | midday | Red Hill Brewery | The right family lunch room: grass, picnic tables, a wood-fired pizza oven, and a tasting flight for the adult |
| 1 | afternoon | Mount Martha Beach | The default family swim. Shallow, pale, gentle, with bathing boxes at the northern end. Park at the main lot,  |
| 1 | afternoon | Commonfolk Coffee | The right way to close the day. Serious coffee for the adults, a babyccino and pastry for a tired child, and a |

### Schema fields still empty on this Plan

Filling these is worth more than any derivative. They are what turn a good page into the definitive answer.

- `editorialFrame`
- `anchorStay`
- `bookingChecklist`
- `variations`
- `skipThese`
- `faq`
- `costBreakdown`
- `walkingIntensity`
- `drivingDistanceKm`

## 3. Fact base

Every proposition in every derivative must trace to a row here. Anything a derivative asserts that is not below is a fabrication and the QA pass will strip it.

| Role | Verification | Assertion |
|---|---|---|
| context | single_source (T2) | A Peninsula day with kids works when you have one anchor for the children (the gondola) and one anchor for the adults (the lunch). Four moves, ninety  |
| support | single_source (T2) | Arthurs Seat Eagle: Start high. The Arthurs Seat Eagle gondola is the anchor of the day  -  twenty minutes of gently dangling flight and the best orie |
| commercial | single_source (T1) | Arthurs Seat Eagle takes direct bookings. |
| support | single_source (T2) | Red Hill Brewery: The right family lunch room: grass, picnic tables, a wood-fired pizza oven, and a tasting flight for the adults. Do not try to upgra |
| commercial | single_source (T1) | Red Hill Brewery takes direct bookings. |
| support | single_source (T2) | Mount Martha Beach: The default family swim. Shallow, pale, gentle, with bathing boxes at the northern end. Park at the main lot, walk south if it is  |
| support | single_source (T2) | Commonfolk Coffee: The right way to close the day. Serious coffee for the adults, a babyccino and pastry for a tired child, and an easy freeway exit a |
| commercial | single_source (T1) | Commonfolk Coffee takes direct bookings. |
| timing | verified (T1) | Published for 2026-W32, winter on the Mornington Peninsula. |
| risk | verified (T1) | No social-cleared photography for: arthurs-seat-lookout, red-hill-brewery, mount-martha-beach, commonfolk-coffee. Derivatives for these stops must use |

**To verify before publication:** every `single_source` row above is PI asserting its own prior copy. That is fine for context, but any of it that reaches a hook or a timing claim must be re-confirmed against a first-party source this week.

## 4. Media position

Readiness: **0%** (0 of 4 stops have a social-cleared asset).

Stops with no channel-permitted photography:

- `arthurs-seat-lookout`
- `red-hill-brewery`
- `mount-martha-beach`
- `commonfolk-coffee`

The derivative engine will fall back to brand graphics and typographic cards for these. That is a legitimate outcome, not a failure. It is also the argument for commissioning first-party photography.

## 5. Channel plan

| Channel | Approval | Lifespan | Purpose |
|---|---|---:|---|
| `site_plan` | L3 | 365d | Complete the schema, add a seasonal variation, refresh lastVerified |
| `site_article` | L3 | 270d | The story-world piece. Why this Plan, why now |
| `email` | L3 | 3d | Lead with the thesis, carry the Picks |
| `ig_carousel` (4:5) | L2 | 60d | Persuade: the shape of the weekend, one slide per stop |
| `opinion_card` | L2 | 120d | Prove: one verdict, typeset. No photography needed |
| `facebook` (1.91:1) | L1 | 5d | Remind: one practical detail, conversational |
| `ig_story` (9:16) | L1 | 1d | Enable: booking order, link sticker |
| `site_links` | L0 | 3650d | Cross-link every stop entity back to the Plan; ItemList JSON-LD |

L3 = you approve, always. L2 = agent drafts, you audit a sample. L1 = auto-publish, spot check. L0 = mechanical.

## 6. Approval

- [ ] Thesis written and it names a place, a window, and an action
- [ ] Fact base checked: no hook or timing claim rests on unverified material
- [ ] Media position accepted (or photography supplied)
- [ ] Ready to generate derivatives
