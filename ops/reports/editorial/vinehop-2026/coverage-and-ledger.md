# VineHop venue coverage: review candidate

Checked 16 November 2026 UTC. Reporting lane: researched venue entries, not visited reviews. Rubric: PI Editorial Journalist v1.0, frozen before revision. Base: `1ba073325177ee40652761164b31fc076762e867`. Branch: `content/vinehop-venue-coverage-20261117`.

## Reconciliation

| Article name | Existing canonical coverage | Action in this candidate |
|---|---|---|
| Festival Hub at The Briars | No permanent venue/experience record found; several separate event records | Draft permanent Briars coverage, held. Do not create a permanent festival-hub venue. |
| Devilbend Farm Beer | No venue record or matching CMS entity | Draft Devilbend Farm Beer Co entry, held. |
| Phaedrus Estate | `venues/phaedrus-estate.json`, `/wine/phaedrus-estate/`; separate journal draft | Link existing venue. Moorooduc address is already correct. Preserve operating review marker and images. |
| Stumpy Gully | `venues/stumpy-gully-vineyard.json`, `/wine/stumpy-gully-vineyard/`; separate journal draft | Link existing venue and correct family, phone and unsupported experiential/varietal copy from official source. |
| Hickinbotham of Dromana | Existing `articles/hickinbotham-of-dromana.md`, status draft; no venue JSON | Supply replacement researched entry copy, held; retain original article and its history, do not create a second journal slug. |
| Mock Red Hill | No matching venue record or CMS entity | Draft farmgate/cider-lounge entry, held. |
| Pig and Whistle Tavern | Event mentions only, no permanent venue record | Draft The Pig & Whistle entry, held. Existing old journal mentions have contradictory addresses; do not reuse them as evidence. |
| Tallarida | No matching host record | No new venue. Organiser lists Tallarida under bars at Pig and Whistle. |

Searched all file-based venue and experience records, draft articles, content data/aliases and live CMS registry/text/image tables. Live `pi.content_registry` records relevant to this task were refreshed in October 2026, so it is corroboration rather than proof of present publication. Registry contains Phaedrus and Stumpy venue routes plus draft journal entries and Briars events. Matching CMS text query returned no rows. Published CMS images exist for Phaedrus (`hero`, `heroImage`) and Stumpy (`heroImage`); they are preserved, not certified as rights-cleared. No CMS writes performed. No paused alternative venue found in these sources.

## Dated claim ledger

All URLs below read on 16 November 2026 UTC; page publication dates are unspecified unless noted. Operator statements establish services, not quality. No first-hand notes supplied.

| ID | Claim / location | Type and source pinpoint | Status / limitation |
|---|---|---|---|
| E1 | Seven 2026 hosts; Tallarida bar rather than eighth host | Organiser: https://vinehopfestival.com.au/the-venues/ , 2026 banner, host headings and Pig and Whistle bars | Verified programme scope. Festival hours are not ordinary hours. |
| E2 | Festival and normal visits differ | https://vinehopfestival.com.au/faqs/ , ticket inclusion and validity sections | Verified distinction. Article-wide verification remains 25 August; ticket/refund/pickup claims not recertified. FAQ contains an old 2025 ticket link, so retain existing booking URLs. |
| P1 | Phaedrus is already at 220 Mornington-Tyabb Road, Moorooduc | https://www.phaedrus.com.au/ and E1 | Verified identity; no relocation edit needed. |
| S1 | Stumpy family is Zantvoort; Frank/Wendy founders, Michael winemaker | https://stumpygully.com.au/ , introduction | Attributed operator fact; replaces incorrect Zuber claim. |
| S2 | Seated tastings, groups of six require bookings, Blak Salt Asian-fusion restaurant | Same source, Cellar Door and Restaurant sections | Verified operator services. No food/taste/service verdict. |
| S3 | Stumpy address and phone | Same source, Visit/footer | Verified 1247 Stumpy Gully Road, Moorooduc; 1800 788 679. No global lastVerified bump. |
| D1 | Devilbend working farm, brewery, taproom, own barley/hops and ten taps | https://devilbend.beer/ , introduction and Welcome section | Attributed operator facts; no uniqueness or quality claim repeated. |
| D2 | Devilbend address/table booking | Same source, Visit/footer | Verified 990 Stumpy Gully Road, Tuerong; website has table booking. No inventory assertion. |
| H1 | Hickinbotham wine grown/made/bottled onsite; Hix brewery; restaurant | https://www.hickinbotham.biz/ , Our Wines and booking/menu links | Operator facts; no awards repeated. |
| H2 | Hickinbotham address/table reservations | Same source, Contact Us | Verified 194 Nepean Highway, Dromana. Table reservations use booking tab, not enquiry form. |
| M1 | Mock family orchard, cider lounge/farmgate in converted 1945 cool store; fruit/juice/cider | https://www.mockredhill.com.au/ , About Us and Our Venue | Operator facts; omit certification/health superiority claims. |
| M2 | Mock address | Same source, footer | Verified 1103 Mornington-Flinders Road, Red Hill. |
| W1 | Pig & Whistle British dishes/pub classics, garden, playground, Shed Theatre | https://www.thepigandwhistle.com.au/ , main proposition, Functions, Entertainment | Operator facts; no service-quality claim. |
| W2 | Pig address and separate bookings/entertainment links | Same source, footer/navigation | Verified 365 Purves Road, Main Ridge. Ordinary family suitability does not apply to 18+ VineHop. |
| B1 | Briars sanctuary, picnic areas, visitor centre; address | https://www.mornpen.vic.gov.au/Things-to-do/The-Briars/About-The-Briars , introduction and Contact | Council source. Permanent precinct, not festival infrastructure. |
| B2 | Heritage Homestead and Balcombe Estuary boardwalk closed; weather/fire closures | Same source, Updates and Please note | Current council notices; retain distinction from other wetland trails. National Trust search result says currently closed, which must not be generalized to whole precinct. |

## Implementation and hold decisions

This candidate adds explicit `hostVenues` references and reuses `ClusterLinks` with canonical `venueHref` URLs and `isListableVenue` filtering. Only the two established venue destinations are linked. It preserves organiser, evidence, booking links, event dates and August verification fields. It clarifies Tallarida's role and corrects the existing Stumpy record.

Five proposed permanent entries are in `held-venue-drafts.md`, outside published collections. No licensed venue image has been established for them. Venue schema also mandates a price band; inventing one would be inappropriate. Before admission: establish suitable media or verify the exact permitted image-free treatment for each destination, resolve required fields truthfully, confirm no new CMS/canonical record has appeared, then add records and link them in the same reviewed change. Hickinbotham's existing journal draft uses a temporary Wikimedia licence and unsupported visit expectations; keep it unpublished. Briars belongs in Explore coverage and needs its canonical collection/route settled before admission.

Phaedrus/Stumpy existing CMS image rights, unrelated retained metadata and legacy article-wide ticket/transport claims have not been certified by this limited task. No new images, sponsorship, visits or rights claims made. No commercial relationship is assumed from silence.

## Coordination and release

Isolated worktree; original dirty checkout untouched. Plan-spacing task handoff reports blocked before edits, with the same base SHA. Ask PI task is concurrent; this candidate does not change its API/data pipeline. Parent must coordinate final merge order and recheck latest main/CMS at exact release head. No release, merge, deployment, or successful CI is claimed. Independent review and exact-head rendered desktop/mobile, rights/facts and CI remain gates before release.

The original checkout was also inspected read-only. It has the same two venue files and three journal drafts, with no additional matching permanent record. Its Phaedrus data predates main's Moorooduc correction; both venue files also differ in image/sitemap-exclusion fields. Those local differences remain untouched. Do not copy this branch over that checkout or assume its dirty state is disposable. The review candidate is based on origin/main, not those older local values.

Review-driven changes also scope the driver prohibition to independently arranged private buses (E2), distinguish smaller-host closing time (E1–E2), and remove repeated recommendations. None advances the event's overall verification date. The independent scorecard preserves original and revised assessments; it is a copy review rather than exact-commit release approval.
