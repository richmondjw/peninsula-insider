# The Insider Note No. VII — Pre-Send QA Report
**Issue:** No. VII · 3–9 Aug 2026  
**Prepared:** 2026-08-03  
**Campaign:** insider-note-07  
**Target send:** Wednesday 5 August 2026

---

## Subject / Preview pairs (3 options — James selects one)

| # | Subject | Preview |
|---|---|---|
| A | Two Bays Brewing, Flinders, and Sunday's sellout lunch | Inside on the drizzly Wednesday, outdoors when it clears. Book Stonier before Sunday. |
| B | Wednesday on the Peninsula: the case for going anyway | Two Bays Brewing today, Cape Schanck when it clears, Stonier's Fire & Wine this Sunday. |
| C | Inside on a wet Wednesday, outdoors by the weekend | Australia's first gluten-free brewery, a winter cliff path, and one lunch to book now. |

Recommendation: **A** — most concrete and most scannable in a crowded inbox. Preview completes the sentence the subject starts.

---

## QA Checklist

### Copy rules
- [x] Zero em-dashes — searched: none found
- [x] Zero prices — no "$" in body copy; "booking required" and "ticketed" used where applicable
- [x] Venue names match site spelling exactly: "Two Bays Brewing" (site: `two-bays-brewing` venue slug), "Red Hill Truffles" (event slug: `red-hill-truffles-winter-truffle-hunt-season`), "Stonier Wines" (venue slug: `stonier-wines`), Cape Schanck sourced from `insider-picks-2026-08-01`
- [x] Lead CTA is a verb: "Head to the taproom" (uppercase in button)
- [x] One CTA per module — confirmed

### UTM links
- [x] All links carry `utm_source=email&utm_medium=newsletter&utm_campaign=insider-note-07`
- Links in canonical HTML:
  - Lead CTA: `https://twobaysbrewingco.com.au` + UTM
  - Pick A: `https://peninsulainsider.com.au/journal/insider-picks-2026-08-01/` + UTM
  - Pick B: `https://peninsulainsider.com.au/journal/insider-picks-2026-08-02/` + UTM
  - Also this week: `https://redhilltruffles.com/hunts` + UTM
  - Booking note: `https://www.stonier.com.au/visit` + UTM
  - Poll options: `/poll/insider-note-07/?vote=…` + UTM (×4)
  - Footer nav: all three footer links + UTM + unsubscribe

### Links to verify before send (designer action required)
- [ ] `https://twobaysbrewingco.com.au` — click to confirm live, no redirect
- [ ] `https://peninsulainsider.com.au/journal/insider-picks-2026-08-01/` — confirm live page (published 2026-08-01)
- [ ] `https://peninsulainsider.com.au/journal/insider-picks-2026-08-02/` — confirm live page (published 2026-08-02)
- [ ] `https://redhilltruffles.com/hunts` — confirm live + bookings open for August
- [ ] `https://www.stonier.com.au/visit` — confirm live + Fire & Wine information present
- [ ] Footer nav: /whats-on/this-weekend/, /whats-on/, /journal/ — all live

### Images
- [x] No images used — typographic/text-card treatment throughout per brief §3
- [x] No email-cleared image list was received from editorial for this issue; per standing process, text cards are the correct treatment (first-class, not fallback)
- [ ] **ACTION REQUIRED before future issues:** request cleared image list from editorial to enable image picks in secondary slots

### Categories
- [x] Lead: Drink — correct (Two Bays Brewing Co, taproom/brewery)
- [x] Pick A: Explore — correct (Cape Schanck / Bushrangers Bay coastal walk)
- [x] Pick B: Explore — correct (Flinders cliff path walk)
- [x] Also this week: Nature — correct (Red Hill Truffles, truffle hunt)
- [x] Booking note: Food & Wine event — Stonier Wines winery event

### Dates
- [x] Date range in masthead: "3 AUG–9 AUG 2026" — correct for this week
- [x] Issue number: No. VII — sequential after No. VI (27 Jul–2 Aug 2026)
- [x] Weather strip: "Wed 5 Aug" — matches intended send date
- [x] Pick A day-stamp: "Sat 1 Aug" — matches insider-picks-2026-08-01 publication date
- [x] Pick B day-stamp: "Sun 2 Aug" — matches insider-picks-2026-08-02 publication date
- [x] Booking note: "Sunday, 9 August" — matches Stonier event record MP-EVT-0063 `startDate`
- [x] No Saturday missing without editorial sign-off note

### Weather
- [x] Sourced from Open-Meteo API (Main Ridge, -38.40/145.00), retrieved 2026-08-03T15:25Z
- [x] Wed 5 Aug forecast: weather code 51 (light drizzle), max 12.9°C, sunset 17:34 local
- [x] Displayed as: "Wed 5 Aug · 13°, light drizzle · Sunset 5:34pm" — correct

### Dark mode
- [x] navy blocks (#0B2E4A): legible in dark mode — dark mode override sets body to #06182A, which maintains contrast
- [x] cream text (#FDFCFA) on navy: passes in both light and dark
- [x] paper bg (#F2EFEA) inverts to #0F2438 in dark mode — no cream inversion risk
- [x] poll links: navy border on paper — in dark mode both shift; verify in email client preview

### Mobile (375px check)
- [x] `.stack` class applies `display:block; width:100%` to 2-column picks at ≤620px — picks will stack vertically
- [x] `.stack-pad` adds bottom spacing when picks stack on mobile
- [x] `.px-gutter` reduces horizontal padding to 22px on mobile — body copy remains readable
- [x] `.lead-band` reduces to 22px padding on mobile — lead module fits

### Subject / Preview
- [x] Subject ≠ preview text for all 3 pairs (confirmed above)
- [x] Three pairs delivered — James to select

### Test send
- [ ] **REQUIRED BEFORE SCHEDULING:** test send to editorial (emma@peninsula.com.au) and James (james@peninsula.com.au) for final confirmation

---

## Editorial notes / flags for James

### 1. Send date: Wednesday vs Thursday
The standing weekly rhythm sends on **Thursday morning**. This issue is built for **Wednesday 5 August** per James's explicit instruction. Flag: if James intended Tuesday 4 August ("tomorrow" as of Monday 3 Aug AEST), the weather strip and send-date references need updating. Call to confirm if any ambiguity.

### 2. Content basis
No new picks articles have been published for Mon–Wed (3–5 Aug) as of 2026-08-03T15:25Z. The lead, secondary picks, and bookings are sourced from:
- Published articles: `insider-picks-2026-08-01`, `insider-picks-2026-08-02` (both live on site, not yet featured in a newsletter)
- Published event record: MP-EVT-0063 (Stonier Fire & Wine) + MP-EVT-0038 (Red Hill Truffles)
All claims trace to published, verified PI content. No fabricated picks.

### 3. Images
No email-cleared image list received. Text card / typographic card treatment used throughout — per the standing brief, this is a first-class treatment. To enable image-based picks in future issues, editorial should supply the cleared list on Monday per the standing rhythm.

### 4. Reader reply module
Omitted — no usable reader reply on file. Reinstate in No. VIII when editorial has one.

### 5. Poll URL
`/poll/insider-note-07/` does not exist yet on the live site. Either:
- Create the poll page before send, or
- Replace the static poll HTML with a native beehiiv Poll block (recommended — actual taps get recorded in beehiiv analytics)

### 6. Stonier Fire & Wine availability
Stonier event record (`MP-EVT-0063`) notes "sells out fast" and lists booking as "Yes, phone Cellar Door." Designer should verify availability is still open before the issue sends. If sold out, omit the booking note module.

---

## Source audit

| Module | Claim | Source | Verified |
|---|---|---|---|
| Lead | Two Bays open daily from 11am | insider-picks-2026-08-01 | Yes |
| Lead | No booking required, walk-in | insider-picks-2026-08-01 | Yes |
| Lead | 4/3 Collins Road, Dromana | insider-picks-2026-08-01 | Yes |
| Lead | Session IPA verdict | insider-picks-2026-08-01 | Yes |
| Pick A | Low-tide rock platform, basalt columns | insider-picks-2026-08-01 | Yes |
| Pick A | 90 minutes return from Cape Schanck car park | insider-picks-2026-08-01 | Yes |
| Pick B | Flinders Pier car park start, 45 min to lookout | insider-picks-2026-08-02 | Yes |
| Also TW | Red Hill Truffles season May 30–Sep 30; Aug = peak Périgord | event record MP-EVT-0038 | Yes |
| Also TW | Hunt plus lunch bundles available | event record MP-EVT-0038 | Yes |
| Booking | Stonier Fire & Wine: Sun 9 Aug | event record MP-EVT-0063 | Yes |
| Booking | Food over coals, new release wines, fires, live music | event record MP-EVT-0063 editorNote | Yes |
| Booking | Sells out fast / book via Cellar Door | event record MP-EVT-0063 | Yes |
| Weather | Wed 5 Aug: 13°, light drizzle, sunset 5:34pm | Open-Meteo API 2026-08-03T15:25Z | Yes |
