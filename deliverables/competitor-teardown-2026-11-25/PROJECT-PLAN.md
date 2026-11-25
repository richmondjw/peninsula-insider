# Project plan: closing the gap on Visit Mornington Peninsula

This plan turns the 22 moves in [00-teardown-and-strategy.md](00-teardown-and-strategy.md) into trackable work. It is the single place to see what is done, what is in progress, and what is waiting on a person.

- **Started:** 25 November 2026
- **Branch:** `claude/eager-ramanujan-s96j1z`
- **How to read status:** `Done` means built, passing the build gate and pushed. `In progress` means being worked now. `Next` means queued and able to be done in the repository. `Needs owner` means it cannot be done from the repository: it needs an account, a decision, a person or a visit. `Not started` means queued behind other work.
- **Rule for every item:** nothing ships unless `npm run build` in `next/` passes, the house rules hold (no em-dashes, no prices outside verified events, no invented venues) and the change is checked in a real browser at phone and desktop widths where it affects a page.

## Measures of success

These are the numbers the plan exists to move. Baselines are from 25 November 2026.

| Measure | Baseline | Target | How to check |
| --- | --- | --- | --- |
| Google average position (Search Console, 14 days) | 72 | Under 30 | Search Console |
| Clicks from search (14 days) | 13 | 500 | Search Console |
| Appearances in the 40-query search sample | 0 of 40 | 15 of 40 | Re-run `data/search-sample-40-queries.json` queries |
| Upcoming events that cite the competitor as source | 44 of 79 | Under 10% | Count `sourceUrl` in `next/src/content/events` |
| Pages naming a human author | 0 of 687 | Every journal article and flagship page | Structured data audit |
| Pages using only library photography | 332 of 687 | Under 150 | Photo credit audit |
| Beaches and walks covered | 19 | 90 | Experiences collection |
| Restaurants, cafes, pubs and bakeries | 35 | 70 | Venues collection |
| Titles over 60 characters | 323 | Under 40 | `scripts/audit.py` on the live sitemap |
| Public pages showing a CMS prompt | 3 found | 0 | Browser check on place hubs |

## Workstream A: defects on our own site (tier 1 move 8)

Small, certain fixes. Done first because they are cheap and visible.

| ID | Item | Owner | Status | Done when |
| --- | --- | --- | --- | --- |
| A1 | Remove the "Add photo" CMS label from public venue and event cards | Agent | Done | Readers see a neutral plate where a card has no photograph. The prompt shows only in edit mode. Checked in a browser on Sorrento, Red Hill, Mornington and a venue page at phone and desktop widths |
| A2 | Correct the founding date in structured data | Needs owner | Needs owner | The site's structured data says founded 2024. The advertising kit says launched early 2026. Not changed, because the repository cannot show which is true. See decisions below |
| A3 | Remove layout shift on Search and Ask | Agent | Next | Lab layout shift under 0.1 at desktop and phone widths |
| A4 | Stop the hidden full-size image loading on venue pages | Agent | Next | No image is fetched and shown at zero size on a venue page |
| A5 | Optimise images supplied through the CMS | Agent | Next | CMS images on cards are served resized, not as full originals |
| A6 | Bring titles under 60 characters and descriptions under 160 | Agent | In progress | A central rule now drops the brand suffix from any title it pushes past 60 characters and trims a long description to its last whole sentence. Long titles fell from 323 to 142 and long descriptions from 313 to 191 in the local build. The rest are editorial headlines that each need a hand-written short title |
| A7 | One page per town: merge the six journal area guides into their place hubs | Needs owner | Needs owner | The area guides are full articles, so merging them is an editorial decision. See decisions below |
| A8 | Make the four trust addresses real redirects or real pages | Needs owner | Needs owner | The site is on static hosting, which cannot send a real redirect. The four rows are now in `ops/cloudflare-redirects.csv`. Importing that list at Cloudflare makes them real |

## Workstream B: measurement and indexing (tier 1 move 1)

| ID | Item | Owner | Status | Done when |
| --- | --- | --- | --- | --- |
| B1 | Staleness guard on the daily strategy file | Agent | Done | Search data older than 14 days is labelled with its age, drops the loop to warning, and is held out of the work queue so nothing is rewritten automatically on old numbers. Events that have run or been withdrawn can no longer be queued |
| B2 | Restore a live Search Console feed to the strategy job | Needs owner | Needs owner | Credentials added as repository secrets per `ops/gsc-auth/README.md`. The agent can wire the job once they exist |
| B3 | Bing Webmaster Tools: verify the site and submit the sitemap | Needs owner | Needs owner | Site verified. The agent can add the verification tag once the code is supplied |
| B4 | Confirm AI crawlers are not blocked at Cloudflare | Needs owner | Needs owner | Security settings checked for bot blocking, result noted here |
| B5 | Re-run the 40-query sample monthly, including by hand in ChatGPT, Perplexity and Copilot | Shared | Not started | A dated results file is added to this folder each month |
| B6 | Restart the index monitor | Agent | Next | A current `reports/index-monitor-*.md` exists and the job runs on schedule |

## Workstream C: events we source ourselves (tier 1 move 2, tier 2 move 3)

| ID | Item | Owner | Status | Done when |
| --- | --- | --- | --- | --- |
| C1 | Gate out private, members-only and alumni events | Agent | Done | The event safeguard now fails the build on closed-group wording. The one such event, a school alumni golf day, is withdrawn |
| C2 | Replace organiser marketing lines with our own wording | Agent | Done | 14 summaries rewritten from the facts in each record. The safeguard reports promotional summaries on every build, currently none |
| C3 | Record each event's primary source as the organiser, not the competitor | Agent | Next | Every upcoming event has an organiser or venue source. The competitor is a secondary source at most |
| C4 | Source-mix report in the build | Agent | In progress | The build prints how many live events cite the competitor as their source: 42 of 71 today. The warning above 25% is still to add |
| C5 | Add organiser and venue calendars to the event intake list | Agent | Not started | The intake configuration lists council, gallery, racecourse, ticketing and venue calendars |
| C6 | Simple public event submission form | Agent | Not started | An organiser can submit an event in under two minutes from What's On |

## Workstream D: pages for time and occasion (tier 1 move 5)

| ID | Item | Owner | Status | Done when |
| --- | --- | --- | --- | --- |
| D1 | Month pages for What's On | Agent | Done | Pages live at `/whats-on/month/<month>-<year>/`, linked from What's On and in the sitemap. A month gets a page only when it holds three or more dated events, so thin far-off months are not published. Today that is November, December, January, February and April. The two months just gone stay as unindexed pages that hand readers on |
| D2 | Four season hubs | Agent | Not started | One hub per season pulling events, plans, places and journal pieces for that season |
| D3 | Occasion pages: romantic, first visit, accessible | Agent | Not started | Each page is built from existing verified content and linked from the relevant hubs |

## Workstream E: venue and place pages (tier 1 move 7, tier 2 moves 2 and 5, tier 3 moves 3 and 5)

| ID | Item | Owner | Status | Done when |
| --- | --- | --- | --- | --- |
| E1 | Action row on every venue page: book, call, website, directions | Agent | Done | The four actions sit together under the title. Checked on phone and desktop |
| E2 | Checked date on every venue page | Agent | In progress | The checked date now shows under the action row and links to how a check works. It appears only where the record holds a real check. 93 open venues have none and are listed in `data/venues-without-recorded-check.md` for editorial |
| E3 | Place hubs open with what is on and a map | Agent | Done | "What's on in" the town is now the first section after the introduction on every place hub. The map stays lower down, because moving it up would load the mapping library before the reader needs it |
| E4 | Contents bar that stays in view on long pages | Agent | Not started | Place hubs and venue pages have a sticky section menu on phone and desktop |
| E5 | "Not for you if" on venue pages | Agent | Not started | Venue pages show the line where the record holds one. Records without one are listed for editorial |

## Workstream F: flagship answers (tier 2 moves 1 and 7, tier 3 moves 1 and 2)

| ID | Item | Owner | Status | Done when |
| --- | --- | --- | --- | --- |
| F1 | Answer-first opening on the flagship pages | Agent | Not started | Best restaurants, best cellar doors, hatted restaurants, day trips, where to base yourself and the hot springs comparison each open with a two-sentence answer and a checked date |
| F2 | The complete hatted list | Shared | Needs owner | Our hatted page cites the 2025 Good Food Guide. The 2027 edition is out and names Barragunda Dining as Regional Restaurant of the Year. The full 2027 list sits behind the publisher's own site, so the page needs someone with access to check it before it is rewritten |
| F3 | The complete cellar door list | Shared | Not started | Every cellar door open to the public is listed with booking status. Needs research and verification beyond the current 38 |
| F4 | Comparison pages with stated criteria | Agent | Not started | Hot springs, Sorrento or Portsea, and three wineries in a day each state their criteria |
| F5 | Town things-to-do answers | Agent | Not started | Sorrento, Red Hill, Flinders and Portsea hubs each open with a short ranked answer |

## Workstream G: search on our own site (tier 2 move 6)

| ID | Item | Owner | Status | Done when |
| --- | --- | --- | --- | --- |
| G1 | Venues before hub pages for venue-like queries | Agent | Not started | "winery lunch" returns named venues in the first five results |
| G2 | A distinct image for each result | Agent | Not started | No photograph repeats within the first ten results |

## Workstream H: coverage (tier 1 moves 4 and 6, tier 2 move 4)

Each new page must meet the verification rules in `docs/EAT-CATALOGUE-VERIFICATION-RULES.md` and the content gates. This is the largest block of work.

| ID | Item | Owner | Status | Done when |
| --- | --- | --- | --- | --- |
| H1 | Beaches: every named beach, with parking, dogs, toilets, access and when to go | Shared | Not started | 50 or more beach pages, each fact traced to the managing authority |
| H2 | Walks: the 30 best-known, with distance, grade, time and conditions | Shared | Not started | 30 walk pages, each traced to Parks Victoria or the council |
| H3 | Everyday eating in the six largest towns | Shared | Not started | 35 further venues, each checked against the operator's own pages |
| H4 | Fifteen further stays | Shared | Not started | 15 further stay records, each checked against the operator |

## Workstream I: proof and authority (tier 1 move 3, tier 3 moves 4, 5 and 6)

Mostly outside the repository.

| ID | Item | Owner | Status | Done when |
| --- | --- | --- | --- | --- |
| I1 | Named editors with bios | Needs owner | Needs owner | Names, short bios and consent supplied. The agent can then add author pages and structured data |
| I2 | Visit dates and our own photographs on the top 50 pages | Needs owner | Needs owner | A visit log and photographs exist for each page |
| I3 | Align PRODUCT.md with the public method | Needs owner | Needs owner | PRODUCT.md either matches "a source check is not a visit" or the visits are evidenced |
| I4 | Venue link-back programme | Needs owner | Needs owner | Each listed venue has been asked to link to its page. The agent can prepare the outreach list and badge |
| I5 | Press and partnerships outreach | Needs owner | Needs owner | A pitch list and a first round sent |
| I6 | Promote the corrections log | Agent | Not started | The decisions log has its own address and is linked from venue pages |
| I7 | Referral reporting for venues | Agent | Not started | Outbound booking and website clicks are counted per venue and can be exported |

## Decisions waiting on the owner

| Decision | Why it matters | Default if no answer |
| --- | --- | --- |
| The founding year in structured data: 2024 or 2026 | Search engines and AI systems read it as fact | No change |
| Whether to show dated, sourced "from" prices for the most-asked attractions | Changes a house rule. Price queries currently go to other sites | No change. The rule stands |
| Which page survives for the six duplicated towns | Affects existing links and rankings | The place hub survives. The journal area guide redirects to it |
| Who the named editors are | Needed for author pages | Pages continue to credit the publication |
| Whether "we live here, real visits" stays as the positioning | It must match what the site can show | The public method page is treated as the truth |

## Log

| Date | Change |
| --- | --- |
| 25 Nov 2026 | Teardown, evidence and this plan committed |
| 25 Nov 2026 | A1, B1, C1, C2, D1, E1, E3 done. A6, C4, E2 part done. A2, A7, A8 and F2 moved to the owner with reasons. Full build gate passed, pages checked in a browser at phone and desktop widths |
