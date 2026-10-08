# Eat catalogue fact audit: N–Z, 9 October 2026

Independent reviewer two. Baseline source242d442. Scope is name-alphabetical N–Z, including names beginning The, from `eat/index.astro`: `eatTypes` excludes markets/wineries, `isListableVenue` excludes closed/permanently_closed/paused. Baseline52 total includes25 rows in this allocation after excluding Port Phillip Estate Restaurant (assigned to root). Ouest France Bistro, Red Hill Market and Rye Foreshore Market are not active Eat rows and are excluded. No other grader scores consulted.

Evidence states: **supported** means the specified facts found in primary operator text, not whole-record certification; **partial** leaves identified details unsupported; **unavailable** means retrieval/identity verification failed, not closed. No prices copied. Broad `lastVerified` stamps were preserved and no new whole-record checked date added. Changes below are field-scoped.

## Critical outcomes and bounded corrections

1. **Mornington Hotel:** [operator contact](https://www.morningtonhotel.com.au/contact) locates the hotel at917NepeanHighway, phone03 88552284. Former signature/address MainStreet/1MainSt and phone were contradicted. Corrected name/address/phone, website/booking homepage, signature/editorNote/whyWeGo/ifOnlyOneThing/knownFor; removed wrong unverified coordinates. Pub/townMornington remain supported. No dishes/hours copied.
2. **Hotel Sorrento:** [operator](https://hotelsorrento.com.au/) identifies HotelSorrento,5–15HothamRoad, operating since1872, restaurants/bars abovePortPhillipBay. Former OceanBeachRoad pub narrative contradicted actual address and repeated unsupported parma assertions. Corrected name and related copy/knownFor; retained already-correct address/phone and canonical slug. Type pub remains existing broad grouping, not a certification of menu.
3. **Point Leo Wine Terrace:** [operator dining page](https://www.ptleoestate.com.au/dine/wine-terrace/) identifies casual vineyard/SculpturePark setting, Friday–Sunday lunch, walk-ins and group reservation options, indoor reservations. Removed all-day generic promise and unsupported fixed dish list from signature and visitor copy. Existing Merricks/restaurant/name retained. Current menus can vary; no precise price copied.
4. **Peninsula Fresh Organics:** [farmer homepage](https://www.peninsulafresh.com/) expressly separates farming business at6HendersonRoad,Baxter from affiliated independent retail PeninsulaOrganicFarmgate at94Baxter-TooradinRoad,Baxter. Former170Baxter-Tooradin address, Mornington town, farm/retail blending and visitor itinerary unsupported. No Baxter place record exists. Set `status:paused`, `sourceStatus:unsourced`, `operatingStatus:verify-open`, clear mixed-entity explanation; removed bad address/coordinates. Preserved slug/name and farmer URL. This is a verification pause, not closure. Existing template `isUnverifiedPaused` suppresses visitor directions/actions; root must verify rendered branch. No invented place guide or coordinates.
5. **Via Boffe:** no primary page supports MainRidge restaurant/200MainRidgeRoad. [Square operator URL](https://via-boffe.square.site/) returns no inspectable text, [Instagram](https://www.instagram.com/viaboffecafe/) unavailable, [Facebook](https://www.facebook.com/viaboffecafe/) blocked. Independent [AGFG](https://www.agfg.com.au/restaurant/via-boffe-130095) and [mirrored operator posts](https://www.findglocal.com/AU/Mornington/900622359949529/Via-Boffe-Cafe) point toMornington cafe59MainStreet, but these are corroboration, not primary confirmation. Following root authorization, verification-paused as above, removed unsupported address/phone/coordinates and authority claim; retained canonical slug and explanatory copy. Do not declare closed or silently convert record to a new entity from secondary evidence.
6. **Red Hill Brewery:** [operator hop page](https://www.redhillbrewery.com.au/red-hill-brewery-hops/) supports own on-site hopyard; [operator visit information](https://www.redhillbrewery.com.au/whats-on/) gives88ShorehamRoad,RedHillSouth and deck/beer garden. Updated town to existingRedHillSouth, www operator URL, narrow signature/whyWeGo. Removed signature claim “only estate hop farm inVictoria”; primary text does not establish exclusivity. Other detailed claims remain unaudited.
7. **St Andrews Beach Brewery:** [operator Fingal page](https://standrewsbeachbrewery.com.au/fingal-brewery/) supports former racehorse stables and brewery/taproom/dining. Replaced signature’s unsupported “Sunday roasts all year round” with bounded seasonal-menu/dining description; updated canonical operator URL withoutwww. Operator page has internally conflicting day/hour blocks; no hours copied. Beer is not gluten-free according to its FAQ; do not add a general GF beer claim.

These pauses reduce the active catalogue count. Root owns dynamic count assertions and full-build/live verification. All eight changed records existed in original active52 selection; six remain listable, two now intentionally excluded. Nothing is marked permanently closed.

## Coverage ledger: all25 allocated active baseline records

The baseline signature is the exact text in source242d442; only its first sentence within25words is rendered by directory `verdictLine`, while full detail-page copy can repeat extra claims. This ledger assesses field/claim scope, not a blanket refreshed date.

| Venue / town / type | Primary source read or attempted | Finding and remaining limitation |
|---|---|---|
| The Heritage Balnarring / Balnarring / pub | [operator](https://www.theheritagebalnarring.com.au/) | Page mostly images. Name/domain exists;1930s house/two-acre/open-fire/deck/beer-garden signature not established from extract. Partial. |
| The Epicurean / Red Hill South / restaurant | [operator](https://www.theepicurean.com.au/) | Historic coolstore/packing-shed restaurant reservation identity supported. Long-table aesthetic is editorial; detail menu/time claims not checked. |
| The Mornington Hotel / Mornington / pub | [contact](https://www.morningtonhotel.com.au/contact) | Confirmed location/contact contradiction; corrected as above. |
| Peninsula Fresh Organics / formerly Mornington / providore | [operator](https://www.peninsulafresh.com/) | Certified organic farming supported; independent affiliated retail distinction/address contradiction confirmed; paused. |
| Pier Street Fresh Seafood / Dromana / providore | Exact-name search and no operatorURL in record | Only PI's own record reliably surfaced. Fishmonger/takeaway/address34PierStreet and contact not independently supported. [PierStreetKitchen](https://www.pierstreetkitchen.com.au/) is a different named business at19PierStreet; cannot substitute. No closure inference. |
| Point Leo Wine Terrace / Merricks / restaurant | [operator](https://www.ptleoestate.com.au/dine/wine-terrace/) | Name/town/casual setting supported, service-days issue corrected. |
| Portsea Hotel / Portsea / pub | [record operatorURL](https://www.portseahotel.com.au/) | Retrieval unavailable. Waterfront setting may be plausible but not independently confirmed here; “cleanest long lunch” is editorial superlative unsupported as comparison. No change/closure inference. |
| Rare Hare at Willow Creek / Merricks North / restaurant | [operator venue](https://rarehare.com.au/about/) | Lunch venue and166BalnarringRoad,MerricksNorth supported. Woodfire/vineyard/shared-plate signature not fully established on this extract. Partial. |
| Red Gum BBQ / Red Hill / restaurant | [operator](https://redgumbbq.com.au/) | RedHill restaurant, slow-smoked brisket/ribs/pulledpork, families and bookings/walk-in caveat supported. Current smoked-chicken dish and historic award claims unverified. |
| The Red Hill Baker / Balnarring / bakery | [operator](https://www.redhillbaker.com.au/) | Sole current Balnarring shop explicit; bread/pies/bakery supported. Existing corrected town/signature supported. |
| Red Hill Brewery / now Red Hill South / brewery | [hop page](https://www.redhillbrewery.com.au/red-hill-brewery-hops/), [visit](https://www.redhillbrewery.com.au/whats-on/) | Own hopyard and actual town supported; exclusivity narrowed. Operator text times differ between body/footer; no hours certified. |
| Red Hill Cheese / Red Hill / providore | [record domain](https://redhillcheese.com.au/) | Domain currently generic restaurant-advice blog, not visitor cheese operation. Historical product page `/mm.html` is stale and does not prove operating tasting-room. Active venue/tasting-room/sheep-milk/washed-rind claims unsupported; investigate current operator before recommending. No confirmed closure. |
| Rye Hotel / Rye / pub | [operator dining](https://www.ryehotel.com.au/dining) | Pub dining, terrace bistro, water-view bar and2415PointNepeanRoad supported. Family/deck focus in signature not wholly checked, no menus/hours refreshed. |
| Small Stone Pantry / Dromana / cafe | Exact-name search, no operatorURL | Returned PI mentions/circular stories, not current primary business evidence.180PointNepeanRoad, menu and producer-retail claims unresolved. Do not infer closure from search absence. |
| Somers General / Somers / cafe | [operator](https://www.thesomersgeneral.com.au/) | Cafe+store, Somers location, dine-in/takeaway and local provisions supported. Specific sourdough/pastry/cheese/wine list not established; source offers menu links for next check. |
| The Sorrento Hotel / Sorrento / pub | [operator](https://hotelsorrento.com.au/) | Correct HotelSorrento/HothamRoad identity and copy, as above. |
| Sourdough Kitchen / Mornington / bakery | Exact-name search, no operatorURL | Primary Mornington entity not found. Search returns different Seddon/Ashburton businesses.231MainStreet and phone/bakery production claims unverified; “best bread” unsupported. No closure inference. |
| St Andrews Beach Brewery / Fingal / brewery | [operator](https://standrewsbeachbrewery.com.au/fingal-brewery/) | Stables/venue/dining supported; year-round roast promise removed. Service-day conflicts and seasonal picnic details require confirmation. |
| Stringers Sorrento / Sorrento / restaurant | [record domain](https://stringerssorrento.com.au/), `/menu/` | Homepage exposes directory index, direct menu retrieval failed; primary search index has a summer breakfast menu, not enough to establish cured-kingfish/rawbar/naturalwine claims. Do not follow exposed configuration links. Current visitor offering unresolved. |
| Tedesca Osteria / Red Hill / restaurant | [official booking](https://www.tedesca.com.au/book-tedesca), [official Osteria](https://www.tedesca.com.au/osteria-tedesca) | BrigitteHafner, fixed-menu farm produce, oven/grill, RedHill supported. Current booking page and other official page conflict on price; omitted. Source hats2 tied to historical2024 award; not marked current without dated award evidence. |
| The Baths Sorrento / Sorrento / restaurant | [operator](https://www.thebaths.com.au/), [about](https://www.thebaths.com.au/about), [contact](https://www.thebaths.com.au/contact) | Waterfront venue/decks/Sorrento and contact supported. Seafood-first menu and “most enduring” ranking not established. |
| The Bay Hotel Mornington / Mornington / pub | [operator](https://www.thebayhotelmornington.com.au/), [functions](https://www.thebayhotelmornington.com.au/functions) | Former bank heritage building/MainStreet, upstairsbandroom, privateVault supported. Operator pages differ on historic bankidentity; current source simply says formerbank, safe. “most characterful” is opinion. |
| The Rocks Mornington / Mornington / restaurant | [www operator](https://www.therocksmornington.com.au/) | Restaurant/cocktailbar at1SchnapperPointDrive supported. “end of MorningtonPier” overstates exact location; seafood specifics unverified on extract. Corrected signature to bounded SchnapperPointDrive seaside wording; no seafood claim copied. |
| Two Bays Brewing Co / Dromana / brewery | [operator](https://www.twobays.beer/) | Dedicated gluten-free brewery/Dromana explicitly supported, operator itself states Australia'sfirst. Unexpectedlygood/smallunfussy is opinion; do not translate beer assertion into all food allergy safety. |
| Via Boffe / formerly Main Ridge / restaurant | Square/social primary attempts unavailable; secondary corroboration above | MainRidge entity not supported; paused pending primary identity reconciliation. |

## Remaining decisions and safeguards

Root should decide whether unsupported SmallStone/PierStreet/Sourdough/RedHillCheese recommendations should enter the same clearly labelled verification pause after further current contact attempts. This audit alone does not prove closure. Source fetch failure is not enough to mark a business closed. Distinguish original operator text, indexed snapshots and third-party corroboration. If an operator contradicts itself, retain only common stable facts and a link to its latest visitor information.

Field check date is9October2026. It applies only to named corrected fields; other menu, booking, images, map coordinates, prices, awards, access and detail assertions remain separately unverified unless explicitly stated. Root runs sourceURL probes, schema/build, paused recovery and deployed acceptance. No external contacts sent, no booking transactions, no deployment.

## Exact baseline signature and visible directory coverage

Recorded from immutable242d442, not later edited files. Full signature is quoted from our own source. Rendered first sentence is shown or explicitly absent due to the25word budget.

- **Peninsula Fresh Organics** (`peninsula-fresh-organics`; mornington; providore): A working certified-organic market garden with a farm-gate shop, straight-out-of-the-ground vegetables and the best salad of your week.
  - Directory verdict: A working certified-organic market garden with a farm-gate shop, straight-out-of-the-ground vegetables and the best salad of your week.
- **Pier Street Fresh Seafood** (`pier-street-seafood`; dromana; providore): A proper old-school fishmonger and takeaway on the Dromana foreshore, point, pay, and walk the parcel across to the sand.
  - Directory verdict: A proper old-school fishmonger and takeaway on the Dromana foreshore, point, pay, and walk the parcel across to the sand.
- **Point Leo Wine Terrace** (`point-leo-wine-terrace`; merricks; restaurant): The all-day casual option at Point Leo Estate, wood-fired flatbreads, estate wines, and a terrace facing the bay and the sculpture park.
  - Directory verdict: The all-day casual option at Point Leo Estate, wood-fired flatbreads, estate wines, and a terrace facing the bay and the sculpture park.
- **Portsea Hotel** (`portsea-hotel`; portsea; pub): The front-row pub on Port Phillip, still the cleanest long lunch at the tip of the Peninsula.
  - Directory verdict: The front-row pub on Port Phillip, still the cleanest long lunch at the tip of the Peninsula.
- **Rare Hare at Willow Creek** (`rare-hare`; merricks-north; restaurant): Jackalope's relaxed lunch room, wood fire, vineyard views, and plates built for sharing over most of an afternoon.
  - Directory verdict: Jackalope's relaxed lunch room, wood fire, vineyard views, and plates built for sharing over most of an afternoon.
- **Red Gum BBQ** (`red-gum-bbq`; red-hill; restaurant): Airy warehouse, picnic tables, and low-and-slow American barbecue, pulled pork, brisket, smoked chicken, the family-friendly antidote to the winery-restaurant circuit.
  - Directory verdict: Airy warehouse, picnic tables, and low-and-slow American barbecue, pulled pork, brisket, smoked chicken, the family-friendly antidote to the winery-restaurant circuit.
- **Red Hill Brewery** (`red-hill-brewery`; red-hill; brewery): The Peninsula's original craft brewery, Belgian-style ales from the only estate hop farm in Victoria.
  - Directory verdict: The Peninsula's original craft brewery, Belgian-style ales from the only estate hop farm in Victoria.
- **Red Hill Cheese** (`red-hill-cheese`; red-hill; providore): Small-batch cheesemaker with a tasting room, hard sheep's milk styles, washed rinds, and a rotating seasonal list.
  - Directory verdict: Small-batch cheesemaker with a tasting room, hard sheep's milk styles, washed rinds, and a rotating seasonal list.
- **Rye Hotel** (`rye-hotel`; rye; pub): An enormous foreshore pub a short walk from Rye's front beach, family-friendly, deck-oriented, and the right answer on a warm afternoon.
  - Directory verdict: An enormous foreshore pub a short walk from Rye's front beach, family-friendly, deck-oriented, and the right answer on a warm afternoon.
- **Small Stone Pantry** (`small-stone-pantry`; dromana; cafe): A wholefood-leaning pantry and café on the Point Nepean Road, grain bowls, good eggs, and a retail shelf stocked with Peninsula producers.
  - Directory verdict: A wholefood-leaning pantry and café on the Point Nepean Road, grain bowls, good eggs, and a retail shelf stocked with Peninsula producers.
- **Somers General** (`somers-general`; somers; cafe): A tiny, perfectly curated general store and café in sleepy Somers, sourdough, pastries, cheese, Peninsula wines, and a weekend brunch menu.
  - Directory verdict: A tiny, perfectly curated general store and café in sleepy Somers, sourdough, pastries, cheese, Peninsula wines, and a weekend brunch menu.
- **Sourdough Kitchen** (`sourdough-kitchen`; mornington; bakery): A small-batch sourdough baker at the top of Mornington's Main Street, long-fermented loaves, a tight pastry line, and the best bread in town.
  - Directory verdict: A small-batch sourdough baker at the top of Mornington's Main Street, long-fermented loaves, a tight pastry line, and the best bread in town.
- **St Andrews Beach Brewery** (`st-andrews-beach-brewery`; fingal; brewery): Former horse-training stables turned sprawling brewery destination, wood-fired kitchen, acres of lawn, and Sunday roasts all year round.
  - Directory verdict: Former horse-training stables turned sprawling brewery destination, wood-fired kitchen, acres of lawn, and Sunday roasts all year round.
- **Stringers Sorrento** (`stringers-sorrento`; sorrento; restaurant): A wine bar and small-plate restaurant in Sorrento, cured kingfish, raw bar selections, and a natural-wine list built to match the food.
  - Directory verdict: A wine bar and small-plate restaurant in Sorrento, cured kingfish, raw bar selections, and a natural-wine list built to match the food.
- **Tedesca Osteria** (`tedesca-osteria`; red-hill; restaurant): Brigitte Hafner's single-set-menu osteria inside a restored Red Hill farmhouse with the wood oven running all service.
  - Directory verdict: Brigitte Hafner's single-set-menu osteria inside a restored Red Hill farmhouse with the wood oven running all service.
- **The Baths Sorrento** (`the-baths-sorrento`; sorrento; restaurant): Sorrento's most enduring waterfront dining room, perched on the sand with Port Phillip Bay at your feet and a seafood-first menu.
  - Directory verdict: Sorrento's most enduring waterfront dining room, perched on the sand with Port Phillip Bay at your feet and a seafood-first menu.
- **The Bay Hotel Mornington** (`the-bay-hotel-mornington`; mornington; pub): A heritage-listed former bank on Mornington's main street, main bar, upstairs bandroom, and the Peninsula's most characterful private dining room in the old vault.
  - Directory verdict: A heritage-listed former bank on Mornington's main street, main bar, upstairs bandroom, and the Peninsula's most characterful private dining room in the old vault.
- **The Epicurean** (`epicurean-red-hill`; red-hill-south; restaurant): A long table in Red Hill’s historic coolstore and packing shed.
  - Directory verdict: A long table in Red Hill’s historic coolstore and packing shed.
- **The Heritage Balnarring** (`balnarring-pub`; balnarring; pub): Balnarring's village pub, in a 1930s heritage home on a two-acre block, with open fires, a sunny deck and a large beer garden.
  - Directory verdict: Balnarring's village pub, in a 1930s heritage home on a two-acre block, with open fires, a sunny deck and a large beer garden.
- **The Mornington Hotel** (`mornington-hotel`; mornington; pub): The big Main Street corner pub, reliable bistro, lively bar, and the default unfussy meeting point in the middle of Mornington.
  - Directory verdict: The big Main Street corner pub, reliable bistro, lively bar, and the default unfussy meeting point in the middle of Mornington.
- **The Red Hill Baker** (`red-hill-bakery`; balnarring; bakery): Artisan bread, pies and pastries from the bakery's sole current shop in Balnarring.
  - Directory verdict: Artisan bread, pies and pastries from the bakery's sole current shop in Balnarring.
- **The Rocks Mornington** (`the-rocks-mornington`; mornington; restaurant): Seafood and bay views at the end of Mornington Pier, well suited to a sunset dinner.
  - Directory verdict: Seafood and bay views at the end of Mornington Pier, well suited to a sunset dinner.
- **The Sorrento Hotel** (`sorrento-hotel`; sorrento; pub): The centre-of-the-village trading post on Ocean Beach Road, reliable parmas, a big dining room, and the default Sorrento pub for a reason.
  - Directory verdict: The centre-of-the-village trading post on Ocean Beach Road, reliable parmas, a big dining room, and the default Sorrento pub for a reason.
- **Two Bays Brewing Co** (`two-bays-brewing`; dromana; brewery): Australia's first dedicated gluten-free brewery, unexpectedly good beer, a small unfussy taproom, and worth the drive to Dromana.
  - Directory verdict: Australia's first dedicated gluten-free brewery, unexpectedly good beer, a small unfussy taproom, and worth the drive to Dromana.
- **Via Boffe** (`via-boffe`; main-ridge; restaurant): A small, warm Italian room tucked into the hinterland, handmade pasta, a hand-written weekly menu, and the Peninsula's best neighbourhood trattoria.
  - Directory verdict: A small, warm Italian room tucked into the hinterland, handmade pasta, a hand-written weekly menu, and the Peninsula's best neighbourhood trattoria.


Schema follow-up: required address strings on both paused records are now 'Visitor address under review', withheld by the unsourced-paused template rather than offered as directions. Optional knownFor omitted; bestFor/pairWith cleared to avoid obsolete actionable suggestions. Full Astro check first stopped on another allocation's johnny-ripe knownFor minimum, so no full-schema pass is claimed at this point.


## Implementation-owner resolution of unsupported recommendations

Following this independent source audit, the implementation owner verification-paused Small Stone Pantry, Pier Street Fresh Seafood, Sourdough Kitchen and Red Hill Cheese on 9 October2026. Available historical/secondary/circular mentions do not establish the current visitor location and offering sufficiently to recommend a journey. This does not assert that a business is closed. Canonical recovery pages remain, explicit unsourced/verify-open markers are recorded, visitor contact/directions/booking promises are withheld, and current recommendation surfaces exclude them. Restoring a recommendation requires primary identity/location/offering evidence and rendered acceptance; searching successfully for a similarly named business is insufficient.
