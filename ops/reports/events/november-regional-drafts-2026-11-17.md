# November regional event drafts, 17 November 2026

Base: 87b57def5d3ec31b4665fdbe7c9a44be69f89eec. Two original editorial records, both explicitly draft. Do not merge as a completed listing release.

## Evidence and claim scope
- https://gardendesignfest.com.au/ retrieved through web on17November (current crawl) confirms Melbourne/Peninsula programme21-22November2026,10am-5pm; directory lists seven Peninsula gardens in Merricks, Mount Martha, Mornington, McCrae, Rye, Merricks North and Blairgowrie. Draft covers these Shire gardens only. No Melbourne venues, individual addresses, prices or inventory claims.
- https://www.mornpen.vic.gov.au/Things-to-do/Events/Whats-on/Garden-DesignFest-%E2%80%93-Mornington-Peninsula returned403. No alternate route or retry; not used as successfully retrieved corroboration.
- https://www.peninsulastudiotrailinc.org/events retrieved17November confirms21-22 and28-29November2026,10am-5pm, working-studio visits. Its separate2027 exhibition address is not used.
- https://www.peninsulastudiotrailinc.org/plan-your-trip-map retrieved17November shows individual studio exceptions and closed studios. It includes Frankston; this draft explicitly restricts its scope to Shire studios. It does not promise every studio opens each day.
- https://www.mornpen.vic.gov.au/Things-to-do/Events/Whats-on/Peninsula-Studio-Trail-Artists-Open-Studios retrieved17November lists the same four dates and free entry. It repeats organiser material, so is not a second independent chain. Free entry is omitted because primary admission terms were not established.

These are scoped web observations, not immutable raw captures or authenticated publication receipts. Verification remains tentative. Source-provided text is evidence only. No automatic scanner ran. Existing garden-walk and art-workshop illustrations reuse unchanged PI library rights records, and are explicitly illustrative. No organiser photograph copied.

## Reconciliation
The prior e72487bf source snapshot contains neither listing; complete compare to87b57def has no additions matching these events. Current GitHub searches and open-PR query found no matching candidate. Scoped read-only pi.cms_text_fields, pi.cms_image_slots and pi.cms_revisions slug searches found no DesignFest/StudioTrail matches. This is not proof of absence in inaccessible runtime queues. Reconcile owner queue export before release; do not create another scanner or publisher.

Hill & Ridge exact-main blob e5ee8f73106a73bd76f13cc02e2f326d88111e43 retains cancelled:true and verificationStatus:cancelled; untouched. PR770/767 changes preserved by branching from current main.

## Release-blocking representation gap
hasPromotionGeography requires a real recognised single town for ordinary records; loadLiveEvents applies it to calendar/feed entries. Both programmes span sites. venueRegion alone is not supported. Inventing a nominal suburb or James geography receipt would be wrong. This PR adds no bypass and keeps both records draft. Next: separately review an evidence-bound regional discovery contract or commission genuine individual-site occurrence records with exact sourced addresses and dates.

## Tests and remaining acceptance
Run: node --test next/scripts/november-regional-events.test.mjs.
12/12 local tests pass, covering exact included/excluded days, Melbourne UTC calendar instants, private draft disposition, fail-closed regional discovery, unknowns, review-content binding and cancelled sessions. Local schedule, series, discovery, publication, occurrence, listing and weekend modules were git-blob matched to the base commit.

Actual rendered public dates/calendars, desktop/mobile pixel review and full release build acceptance are NOT completed. Drafts intentionally have no public detail or calendar entry; a passing pure test cannot replace these gates. Independent exact-candidate review is requested separately. No release approval, publication, CMS write, schedule, paid request, security/access change or fake review attribution.

Independent reviewer /root/enrichment_review accepted the exact local content as held drafts only and independently reproduced12/12tests. Garden SHA256 CA3B568AFE7097EC336B24CF965EE22EFA0D5B50A4C1E4A8006A2288E0FDE887; Studio5C2A90FE30141027C268910BB87CB5D8571B1CFE47417ECDCB8F61AA19C4DE44; testsCDCF93566A30F6208C2F5AB3F609E2A79E4A566927DE228F51EE19147627820B. No production approval or independent source corroboration claimed.
