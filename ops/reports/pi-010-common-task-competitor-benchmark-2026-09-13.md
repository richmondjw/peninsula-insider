# PI-010 common-task competitor benchmark

Ticket PI-010, GitHub issue [#371](https://github.com/richmondjw/peninsula-insider/issues/371).
Evidence A20, A21, A30 to A35. Run 13 September 2026.

## 1. What this is, and what it is not

The ticket assigns a common-task competitor benchmark and asks for three prototype entry jobs.
Its acceptance criterion is that representative first-time visitors and returning regulars each
complete predefined tasks without facilitator guidance. That is user testing with real people and
it has not happened.

**So no navigation change is proposed for shipping here, and none is committed.** Shipping one and
closing the ticket would assert a task-success improvement nobody measured.

What this report is: the benchmark the plan specifies, run identically against Peninsula Insider
and three competitors, plus a proposal grounded in what the benchmark actually showed.

**I am one agent reading pages, not five representative humans.** What I can establish is whether a
task is *possible* and what it costs in page loads and dead ends. What I cannot establish is
whether a real visitor would succeed, which is the acceptance criterion. Section 7 states the
limits in full. No conversion target is proposed anywhere in this document.

## 2. Method

| Parameter | Value |
|---|---|
| Run date | Sunday 13 September 2026, from about 22:25 AEST |
| Target weekend for date-bound tasks | Saturday 19 and Sunday 20 September 2026 |
| Device framing | Mobile. iPhone-class Safari user agent on every request, every site |
| Instrument | Server-rendered HTML fetched over HTTP, read as text. No JavaScript executed |
| Step metric | Page loads from the site home page. An opened menu panel is not a page load |
| Timing | Fetch time ranged 0.13 to 1.13 seconds per page load. This is machine time, not human task time, and is not used as a result |
| Interaction | Read only. Nothing submitted anywhere, no form sent, no correction filed, no contact made |

Task wording was fixed before the run and used identically on all four sites:

1. A rainy couples day
2. A family event this weekend
3. A two-night itinerary
4. A change near a regular's chosen town (Sorrento used throughout)
5. A venue correction, measured up to the point of submission

Page count and brand impressions are not used as substitutes for task performance, per the plan.

## 3. The four sites

| Role | Site | Measured |
|---|---|---|
| Subject | Peninsula Insider, `peninsulainsider.com.au` | Yes |
| Official regional tourism site | Visit Mornington Peninsula, `visitmorningtonpeninsula.org` | Yes |
| National city-guide publication's Peninsula coverage | Broadsheet, `broadsheet.com.au/melbourne/mornington-peninsula` | Yes |
| Regional publication and directory | Peninsula Essence, `peninsulaessence.com.au` | Yes |

**One site could not be measured.** Mornington Peninsula Magazine
(`morningtonpeninsulamagazine.com.au`), the register's named regional competitor, returned an
anti-bot interstitial (HTTP 202 redirecting to a captcha path) on every path requested, including
its home page and its public WordPress API. I did not attempt to bypass it. That is a limit of my
instrument and says nothing about the site's usability for a human. Peninsula Essence, also in the
register's source list, is measured in its place and is labelled as such.

## 4. Baseline: what the site already knows, re-verified

The evidence register found the audit had overstated things here. Those findings were disproved
once already, so each was re-checked against production HTML before being repeated.

| Claim | Verdict | Evidence |
|---|---|---|
| Primary navigation has seven sections, not fourteen competing destinations | **Confirmed** | Seven pillar triggers in production: Eat & Drink, Stay, Wine, Explore, Plans, What's On, Journal |
| Eat and Explore drawers are contextually scoped | **Confirmed** | Every mega panel carries 5 to 7 links, all within its own pillar. Eat holds only eat and drink links, Explore only explore links |
| Mobile drawer | 13 flat single-level items plus one call to action. No accordions | Read from production markup |
| For comparison, Visit Mornington Peninsula | About 60 links across its menu system | Read from production markup |

**Peninsula Insider already has the smallest and most disciplined navigation of the four sites
measured.** Navigation size is not the finding of this benchmark and a simplification on size
grounds is not supported by it.

One claim of my own was wrong on first pass and is corrected here, because the same discipline
applies. I initially recorded that PI's filter chips were not URL-addressable. They are.
`/explore/plans/?context=rainy-day` and `/whats-on/?date=next-weekend` are both read and written by
the shipped client scripts and are shareable between browsers. The real finding is narrower and is
in section 6.

Also relevant and already measured: 2,005 impressions and 17 clicks over 28 days, the home page
taking ten of those clicks, every major hub at position 60 to 90. Section 10 returns to what that
means for this ticket.

## 5. Results: five tasks by four sites

Legend: **Done** task completed, **Partial** something useful returned but not the thing asked
for, **Not done** the task cannot be completed on that site.

| Task | Peninsula Insider | Visit Mornington Peninsula | Broadsheet | Peninsula Essence |
|---|---|---|---|---|
| 1. A rainy couples day | **Done**, 1 load | **Partial**, 1 load | **Not done** | **Not done** |
| 2. A family event this weekend | **Done**, 1 load, stale default | **Done**, 1 load | **Not done** | **Not done** |
| 3. A two-night itinerary | **Done**, 1 load | **Partial**, 2 loads | **Partial**, 1 load | **Not done** |
| 4. A change near Sorrento | **Not done** | **Not done** | **Done**, 1 load | **Not done** |
| 5. A venue correction | **Done**, 1 load | **Not done** on served page | **Partial**, email only | **Not done** on served page |

### Task 1: a rainy couples day

**Peninsula Insider. Done, one page load.** Home, What's On panel, "When it rains", to
`/journal/rainy-day-peninsula/`. The front door also routes there by a second path,
`/explore/plans/?context=rainy-day`. The answer is decision-grade: two thermal springs compared
against each other, named indoor anchors with what each is good for, a named Saturday structure
hour by hour, and an honest opening section listing what closes in bad weather.

*Factual problem:* the piece is written in a winter voice throughout ("Winter on the Peninsula",
"this is when to book", "the winter version of the weekend") and is served in spring beneath a
masthead reading Spring '26.

*Reusable:* stable URL, Save and Share controls, venue cards carrying addresses, and a companion
piece for readers with nothing booked.

**Visit Mornington Peninsula. Partial, one page load.** No wet-weather entry exists anywhere in its
60 menu links. The masthead does carry a live weather widget, which read "Possible shower" during
the run, and that is a real strength no other site has. The nearest route is Things To Do, Travel
Type, Romantic Holidays, which returns six itinerary titles, two of them named for winter. Site
search at `/Search?q=rainy%20day` returned a page carrying no results in the served HTML.
Net: the visitor learns it may shower and is handed seasonally wrong couple itineraries.

**Broadsheet. Not done.** No rain, indoor or wet-weather entry on the Peninsula region page. Its
four curated lists are Restaurants, Cafes, Wineries and Accommodation. A couple can pick a
restaurant, which is part of a rainy day, not a rainy day.

**Peninsula Essence. Not done.** Categories are Stories, Arts, Style, Celebrity, Food & Wine,
Sport, Attractions, History, Focus On. No weather-contingent entry of any kind.

### Task 2: a family event this weekend

**Peninsula Insider. Done, one page load, with a stale default.** Home, "Everything on this
weekend", to `/whats-on/`. The served page opens on "This weekend, Fri 11 to Sun 13 September".
Run at 22:25 on Sunday 13 September, that is the weekend that has just ended, and nearly every
listing beneath it is marked "Ended". The correct range is one chip away, "Next weekend, Fri 18 to
Sun 20 September". A Kids & Family category exists and a Family Mystery Picnic is listed. The
curation is the best of the four: three editor picks with a stated rule, then everything on by day.

**Visit Mornington Peninsula. Done, one page load.** A real calendar with month tabs, and events do
exist for the target weekend: Giant Lollipop Making at The Chocolateries runs 16 to 20 September,
Kids Glow Night Adventure runs 18 September. A family can find something.

*Factual problems observed on the page:* the Categories filter panel renders "Sorry, there are no
events to display" in the served HTML; the "Next 7 Days" view at `/Whats-On/view/next-7-days`
returned the same list as All Events, still including an exhibition running to 22 November; one
listing reads "Emmie Li Live at Peninsula Beer Garden, Sunday 18 September 2026" while another on
the same page reads "FRIDAY 18 SEPTEMBER 2026", and 18 September 2026 is a Friday; and "Father's
Day at Jetty Road Brewery, Sunday 6 September" was still promoted under "Unmissable Events" a week
after it happened.

Travel Type, Family Holidays is not an events list: six story links, four tagged Summer or Winter.

**Broadsheet. Not done.** No events calendar for the Peninsula. `/melbourne/event-guide` and
`/melbourne/whats-on` both return 404.

**Peninsula Essence. Not done.** It has the most granular filter of the four (dates, location
radius, categories, tags) but for Saturday 19 and Sunday 20 September the calendar shows nothing
except an ongoing exhibition. Listings jump from a 16 September market to a 23 September market.
The first item shown is a market dated 9 September, already past. Its listing for the McClelland
exhibition spells the venue "McClelland Gallary".

### Task 3: a two-night itinerary

**Peninsula Insider. Done, one page load.** Home, "All plans", to `/explore/plans/`. Twenty-nine
plans, each carrying a duration and a party label in the list, five intent chips across the top
(Family, Couples, Food & wine, Rainy day, Spring) and a season-aware "spring weekend, solved" slot.
Several plans name two nights in the title. This is the clearest two-night answer of the four.

*Weakness:* the duration vocabulary is mixed across the catalogue, "3 days", "Weekend", "2 days",
"One day", so "two nights" is not a single filterable token.

*Reusable:* My Trip carries multi-day structure, a drive estimate, Share link, Print, and can
receive a trip someone else sent.

**Visit Mornington Peninsula. Partial, two page loads.** Places To See, Trips + Itineraries lists
about 24 itineraries as titles only. No duration and no party are shown in the list, so a visitor
cannot tell which are two nights without opening each one. Opening one showed a genuinely good
structure: Distance 120 kms, Stops 11, Duration 4 days, numbered stops with what to do at each.
That itinerary is named for winter and three consecutive stops sit at the same resort.

*Reusable:* Trip Planner adds, reorders, maps, exports a PDF and has a Send to a Friend form. This
is a real strength.

**Broadsheet. Partial, one page load.** No itinerary product. A road-trip guide article exists, is
named for summer, and is published in partnership with a commercial partner. Useful reading, not an
itinerary you can act on.

**Peninsula Essence. Not done.** No itinerary product.

### Task 4: a change near a regular's chosen town

**Broadsheet. Done, one page load, and it wins this outright.** `/melbourne/sorrento` is in effect
a chronological change feed for one town: a closure and its replacement, a reopening under a new
format, a new restaurant inside the new ferry terminal, and a hotel makeover. For a returning
regular asking "what has changed near my town", this is the answer, first time, no filtering.

**Peninsula Insider. Not done.** `/explore/places/sorrento/` is a richer page than anyone else's
town page: a perfect day, eat and drink, stay, explore, escape plans, journal pieces, and a count of
what is mapped there. But it has no change surface. Nothing says what is new, what closed, or when
any of it was last checked. The only freshness signal in the served HTML is the phrase
"Updated 2026." inside a meta description. There is no public corrections log at an obvious URL.

*Discrepancy to check, not a proven error:* PI describes Stringers Sorrento as a wine bar and
small-plate restaurant. Broadsheet's headline says Stringers has reopened as an all-day diner and
deli. One of those is current. I did not verify which, and this report does not assert that PI is
wrong.

**Visit Mornington Peninsula. Not done.** A town page exists under Places To See, Towns + Villages.
No change feed, no new openings, no closure notices.

**Peninsula Essence. Not done.** No town page. Category browsing only.

### Task 5: a venue correction

Nothing was submitted on any site. Each was measured up to the point of submission only.

**Peninsula Insider. Done, one page load, and it wins this by a distance.** `/corrections/` is a
real structured form with a policy dated 13 September 2026. It asks for the four things that make a
correction verifiable (the page it is on, what is wrong, what it should say instead, how you know),
plus an optional source link, a "where you are standing" context selector, an urgency selector, and
optional contact details held apart from the case. A reference is issued on screen at the point of
filing; the client script writes to a corrections store with a generated case reference.

**This supersedes the PI-001 register.** That register recorded item A13 as "a mailto: link, not a
form. No queue, no reference ID, no audit history". That is no longer true as of today's policy
date, and anything still citing A13 in that form should be updated.

**Visit Mornington Peninsula. Not done on the served page.** Contact is in the nav, but the served
`/Contact` page carried no contact form and no contact details, only the newsletter block. A form
may be injected by JavaScript, which I did not run. The Industry Portal and Add event paths are
operator routes, not reader correction routes.

**Broadsheet. Partial.** A feedback address in the footer. No structured form, none of the four
verifying fields prompted, no reference, no stated turnaround.

**Peninsula Essence. Not done on the served page.** `/contacts/` served no contact details or form,
only the newsletter block and footer. The footer reads "Copyright 2017".

## 6. Where Peninsula Insider genuinely wins, and where it genuinely loses

### Wins, stated plainly

1. **Task 1 outright.** No competitor measured has any wet-weather entry at all. PI has a
   decision-grade one, reachable in one load by two different routes.
2. **Task 5 outright, and it is not close.** PI is the only site of the four with a structured
   correction path, a verification contract and a case reference. Broadsheet offers an email
   address. The other two served nothing.
3. **Task 3 on legibility.** PI is the only site that tells you a plan's duration and party in the
   list, which is the difference between choosing and opening 24 pages to find out.
4. **Task 2 on curation.** PI is the only calendar of the four with a stated selection rule and an
   opinion attached. This matches the one beachhead the SEO blueprint observed ranking.
5. **Navigation discipline.** Seven sections, panels capped at 5 to 7 links, a 13-item flat drawer.
   The official tourism site carries roughly 60 menu links.
6. **The trip artefact.** My Trip is link-shareable and can receive a trip. Visit Mornington
   Peninsula's Trip Planner exports a PDF and PI does not, so this is a split rather than a sweep.

### Losses, stated plainly

1. **Task 4 outright, to Broadsheet.** PI has no change surface for a town and no reader-visible
   last-checked date. This is the returning-regular job the ticket names, and it is the job PI is
   worst at. Broadsheet answers it in one page load.
2. **The default range on What's On is stale at exactly the moment it matters.** Run on the evening
   the weekend ended, the page opened on the weekend that ended, with almost every listing marked
   "Ended". The right answer was one chip away.
3. **Filtered state is client-side only.** Both `/explore/plans/?context=` and `/whats-on/?date=`
   are honoured by the shipped scripts and are shareable between browsers. But the server returns
   byte-identical HTML for the filtered and unfiltered URL in both cases, and the chip ships as
   `aria-pressed="false"`. So a crawler, an AI answer engine, a link preview or a reader without
   JavaScript sees the unfiltered default. Given the measured search position this matters more for
   answer surfaces than for people.
4. **Seasonal voice inside evergreen pieces.** The rainy-day guide is written in winter and served
   in spring. Sorrento's page reads "Best season: Autumn". The navigation itself is correct, and
   now reads Spring '26, so this is a content-layer problem, not a navigation one.

## 7. What this measurement cannot tell you

Read this section before quoting anything above.

- **I am one agent fetching pages, not five representative humans.** Possibility and cost in page
  loads are measurable this way. Success is not. The ticket's acceptance criterion is human task
  success without facilitator guidance, and nothing here speaks to it.
- **I cannot distinguish a first-time visitor from a returning regular.** The ticket requires both.
  I ran every task with full prior knowledge of the site's structure, which is the opposite of a
  first-time visitor.
- **Times are machine times.** Fetch times ran 0.13 to 1.13 seconds per page load. They are not
  human task times and are not used as a result anywhere above.
- **No JavaScript was executed.** Everything stated about client-side filtering is read from the
  shipped scripts, not observed running. Rendered layout, keyboard order, touch targets, focus
  behaviour and the mobile menu as an actual menu were not tested.
- **Comprehension was not tested at all.** Whether "Plans" reads as "itineraries" to a newcomer,
  whether "What's On" reads as "events near me", whether anyone notices the chips. That is the real
  question and only people can answer it.
- **One competitor was not measurable.** See section 3.
- **Nothing was submitted anywhere**, so no correction path was tested end to end on any site,
  including PI's.
- **No conversion target is proposed**, here or anywhere in this document.

## 8. Defects found while benchmarking, reported not fixed

None of these are fixed on this branch.

| ID | Defect | Where |
|---|---|---|
| D1 | A React-style handler in an Astro template, `onClick={(e: any) => e.stopPropagation()}`, serialises into the markup as the literal attribute `onClick="(e) => e.stopPropagation()"`. Confirmed live on three cards each on `/explore/places/sorrento/` and `/journal/rainy-day-peninsula/`. Two consequences: the handler never binds, so the intended click isolation on the booking button does not happen; and because the attribute value contains a `>` character, naive HTML parsers terminate the tag early, which affects text extractors and answer engines. Browsers render the page correctly and readers are not shown broken text. | `next/src/components/VenueCard.astro:141` |
| D2 | The Wine mega panel spends two of its five curated slots on the same destination: "Best cellar doors" and "Cellar doors" both point to `/wine/best-cellar-doors/` | `next/src/lib/v5-nav.ts` |
| D3 | The What's On panel's curated link "The weekend edit" points to `/journal/autumn-weekend-edit/` while the masthead correctly reads Spring '26 | `next/src/lib/v5-nav.ts` |
| D4 | The inline "Tell us what to fix" link on articles goes to `/corrections/` carrying no page reference, so the reader must paste the address themselves. The corrections page states that this address "is the thing an emailed correction most often leaves out" | article template and `/corrections/` |
| D5 | No public corrections log, although the corrections policy commits to logging material corrections with date, change and verification method | `/corrections/` |
| D6 | `/explore/places/sorrento/` carries "Best season: Autumn" and no reader-visible last-checked date | place template and content |

D1 is a one-line change and should have its own ticket rather than riding on a navigation ticket.

## 9. Proposal: three entry jobs, grounded in the benchmark

### The reframing the benchmark forces

Peninsula Insider does not lack entry jobs. It has two partial sets that do not agree with
each other, on two different surfaces:

- The home page offers "If today looks different: One day, With kids, Rainy day", linking to
  `/explore/plans/?context=one-day`, `?context=family` and `?context=rainy-day`.
- The Plans hub offers five chips: Family, Couples, Food & wine, Rainy day, Spring.
- The home page also offers "The four ways in": Eat & Drink, Stay, Wine, Explore. That is category
  browsing, not intent.

Three vocabularies, two surfaces, one of them overlapping the other only partly. **The work is
consolidation and promotion, not invention**, and that is a materially smaller and safer piece of
work than the ticket's 3 to 5 day estimate assumed.

### Job 1: find what is on

*Evidence: task 2.* PI has the best-curated calendar of the four measured and the only one with a
stated selection rule. The defect is the default range, not the navigation.

What the job needs: the served default range should follow the clock, so that once a weekend's last
event has passed the page opens on the next weekend rather than the one that ended. And the range
state should be server-rendered, so the shared link, the crawler and the answer engine see what the
reader sees.

### Job 2: choose a usable plan

*Evidence: task 3.* PI already wins on legibility and already has the chips.

What the job needs: one duration vocabulary across all 29 plans so that "two nights" is a real
filter rather than four different tokens; the same intent vocabulary on the home page and the Plans
hub; and server-rendered filtered states, as above.

### Job 3: find a specific place, and what has changed about it

*Evidence: task 4, the one PI loses.* The ticket calls this job "find a specific place". The
benchmark says the interesting half for a returning regular is not finding the place, which PI
already does better than anyone measured, but finding what has changed about it, which PI does not
do at all and Broadsheet does well.

What the job needs: a per-town and per-venue change surface fed by the provenance fields PI-001
confirmed already exist (`status`, `lastVerified`, `verificationStatus`, `lastCheckedDate`); a
reader-visible last-checked date; and the public corrections log the policy already promises. This
is the largest of the three and the only one that is genuinely new work.

### What is retained

Category browsing stays. The four ways in and the seven pillars stay. Nothing in this benchmark
supports removing them, and PI's menu is already the smallest of the four sites measured.

Saved and My Trip stay where they are. The coherence problem is duplication rather than placement:
Saved appears in the drawer, the bottom bar and the account menu, and My Trip in two of the three.
That is a tidy-up, not a redesign.

## 10. What this proposal needs before anything ships

This is a precondition, not a footnote. The ticket's acceptance criterion is that representative
first-time visitors and returning regulars each complete predefined tasks without facilitator
guidance. This benchmark is not a substitute for that and does not claim to be.

1. **Recruit both groups the ticket names.** First-time visitors who have not used the site, and
   returning regulars who have. This benchmark cannot distinguish them at all.
2. **Use these same five tasks**, same wording, same date framing, on mobile, so the tested
   baseline is measured with the same instrument as this report.
3. **Agree the task-success baseline from that session, before any change.** The plan is explicit:
   an agreed task-success baseline, not an invented conversion target. This report proposes no
   conversion target and none should be inferred from it.
4. **Roll out as a reversible component variant before global replacement**, per the ticket.
5. **Do not justify this work on traffic.** The measured baseline is 2,005 impressions and 17
   clicks over 28 days, the home page taking ten of the clicks, every major hub at position 60 to
   90. A navigation change will not move that. The benchmark supports the case that this work is
   about task quality for the people who do arrive. If it is sold on traffic it will fail, and the
   failure will be blamed on the navigation.

## 11. Needs James, noted not blocked on

1. **User testing needs recruits.** Decide whether to recruit externally or to use known first-time
   visitors and known regulars, and who facilitates.
2. **Mornington Peninsula Magazine could not be read by any automated instrument.** If it must be in
   the standing benchmark set it needs a human pass or a different method. Otherwise confirm
   Peninsula Essence as the standing regional comparator, which is what was measured here.
3. **The Stringers Sorrento discrepancy** in section 5, task 4, is worth a venue check either way.
4. **The six defects in section 8.** Decide whether they become one tidy-up ticket or individual
   ones. D1 is a one-line change.
5. **The PI-001 evidence register records A13 as a mailto with no queue and no reference ID.** That
   is now out of date. Confirm who updates the register.
