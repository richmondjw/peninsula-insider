# Eat field corrections: 9 October 2026

Independent reviewer one. Field-level primary-operator research supporting bounded corrections, not a recertification of the entire 52-place catalogue. Existing `last Verified` values are preserved. No prices changed or added. No credentials, submissions, reservations or external writes performed.

## Applied corrections

### Port Phillip Estate Restaurant

Record: `next/src/content/venues/port-phillip-estate-restaurant.json`.

- `phone`: +61 3 5931 0000 replaced with +61 3 5989 4444, matching the operator's published contact.
- Primary source: https://www.portphillipestate.com.au/dining-room/ inspected 9 October 2026. It also supplies useful future comparison signals: bookings essential, lunch Wednesday-Sunday, Saturday dinner, dietary requirements requested at booking. Current hat/award status is not recertified by this source; retain as a separately scoped review item.

### Merricks General Wine Store

Record: `next/src/content/venues/merricks-general-wine-store.json`.

- `editor Note`, `known For`, `if Only One Thing`: remove mistaken Barragunda wine affiliation and unsupported routine wood-fired pizza/Sunday lamb-roast promises. Operator identifies Elgee Park and Baillieu wines. Replace with supported village bistro, breakfast/lunch and seasonal-menu guidance.
- `booking Url`: points directly to operator reservations page.
- Sources: https://merricksstore.com.au/reservations/ supports daily breakfast/lunch, booking by phone/online, fireside/deck tables, Elgee Park/Baillieu wines. https://merricksstore.com.au/bistro-menu/ labels menu indicative/seasonal. https://merricksstore.com.au/whats-on/ explicitly describes Friday dinners continuing in 2026 and marks Il Padrino wood-fired pizza as a past event. A past event is not evidence of an ongoing menu promise.
- `signature` still identifies the broad village store/produce-forward lunch; bakery production details are not independently recertified in this correction.

### Barragunda Dining

Record: `next/src/content/venues/barragunda-dining.json`.

- `address`:165 Boneo Rd replaced with 113 Cape Schanck Rd, Cape Schanck VIC 3939.
- `phone`: +61 3 5988 6766 replaced with +61 3 8644 4050.
- `coordinates`: former -38.4736,144.8791 replaced with operator-map marker -38.46803496820978,144.89851034298496. These were not inferred from a postcode or map centre. Operator contact HTML declares `location` with these exact values and passes it to both map centre and `new google.maps.Marker({position:location,map:map})`. Browser rendered the embedded map and exposed matching map links. This is operator marker evidence, not an independent surveyed entrance position.
- `editor Note`, `why We Go`, `if Only One Thing`, `known For`: remove four-week booking promise, dinner-led positioning, weekly-change claim and entirely-from-farm claim. Replace with seasonal four-course set menu, market-garden setting, local collaborations, current calendar/waitlist guidance.
- `booking Url`: operator dining page.
- Sources: https://www.barragunda.com.au/contact/ supports address, dining phone and embedded marker. https://www.barragunda.com.au/dining/ supports 40 seats, 1000 acres, Simone Watts, four-course format, local producer collaborations and seafood from Wildlife Fisheries. Current posted service is Friday-Monday daytime, later Saturday closing. Spring reservations are released online. An old winter popup remains on the operator page; do not copy it as current availability.
- Contact footer and dining page agree on the address; the old local record was materially inconsistent and could misdirect a visit.

## Continued catalogue assessment and comparison signals

- Commonfolk: https://www.commonfolkcoffee.com.au/pages/locations/mornington supports cafe bookings with many walk-in tables retained, courtyard dogs, children, dietary/allergen options, onsite parking and weekday/weekend hours. Phone and address match source record. `editor Note`, `why We Go`, `if Only One Thing`, `known For` prominently promise a best egg sandwich; current operator facts do not establish that dish or comparative superiority. Recommend supported coffee/brunch/courtyard guidance rather than a specific unverified order. `booking Url` could target the exact Mornington operator page instead of company homepage.
- Crittenden restaurant: record is `stillwater-crittenden.json`, canonical slug is Crittenden Restaurant. https://www.crittendenwines.com.au/pages/restaurant supports booked main restaurant vs walk-in-only Terrace, weather limitation and no pets on Terrace. It differentiates family lawn space from dining-room booking. Existing chef Brunno claim has supporting current operator post https://www.crittendenwines.com.au/blogs/news/new-winter-menu dated 15 May 2026. Do not present Terrace as a guaranteed bookable table. Operator states a November 1 opening-pattern change; any static hours should preserve season scope or link out.
- Tedesca: https://www.tedesca.com.au/osteria-tedesca supports Friday-Monday lunch, long sitting allowance and advance dietary notice. Homepage operator also states bookings online only. Those support a useful planned-meal/advance-booking comparison, but undated historic award quotes do not independently certify 2026 hat status.
- Portsea: record has assertions “almost nobody else” in April/October and “nothing competing within ten minutes”; these are unsupported crowd/competition guarantees. Recommend soften to bay-view pub and current reservation advice when its official site is available. Browser/web fetch failure is not evidence of closure.

## Scope and acceptance

These corrections improve ET 3/ET 4 and visitor task safety; no complete rubric score is awarded from field research alone. Exact changes should pass content/schema validation, preserve canonical slugs, and be verified on the built and deployed venue/detail/map surfaces. A full image-rights, access, complete-menu, current-award and opening-hours audit remains outside this field correction.


## Additional applied Commonfolk correction

`commonfolk-coffee.json`: `signature`, `editor Note`, `why We Go`, `if Only One Thing`, `known For` and `booking Url` now use operator-supported brunch/roastery, retail beans/Brew Room, dog-friendly courtyard and limited-booking/walk-in guidance. Remove unsupported best-egg-sandwich/order-before-ten guarantees. Source: https://www.commonfolkcoffee.com.au/pages/locations/mornington inspected 9 October 2026. The operator establishes family facilities and dietary enquiry, not a universal allergen-safe meal promise. Existing `last Verified` preserved.

## Additional A-M field corrections applied

Scope remains field-level. All existing `lastVerified` values and canonical slugs preserved. No prices added or changed.

| Record | Applied fields | Exact operator source |
|---|---|---|
| barmah-park.json | Current restaurant/cellar-door name and type;945 Moorooduc Hwy; operator website/reservations; remove unsupported Monday/all-day cafe copy and unverified old coordinates | https://www.barmahparkwines.com.au/ |
| flinders-general-store.json |48 Cook St,+61 3 5989 0207; remove unverified coordinates for changed address | https://www.flindersgeneralstore.com.au/ and https://shop.flindersgeneralstore.com.au/pages/about-us |
| green-olive-red-hill.json | Operator locality Main Ridge3928 and+61 409 997 400; remove unverified coordinate record | https://www.greenolive.com.au/contact/ |
| jetty-road-brewery.json |+61 3 5987 2754; exact operator venue booking page; remove unsupported drive-in adjacency in signature | https://www.jettyroad.com.au/dromana |
| main-ridge-dairy.json |+61 3 5989 6622 only; broader menu not recertified | https://www.mainridgedairy.com.au/ |
| martha-s-table.json |5 Waterfront Place,+61 3 9617 5377; marina/Mediterranean restaurant copy and current operator booking page; remove unverified old coordinates | https://www.marthastable.com.au/restaurant |
| mr-vincenzos.json |784 Esplanade,+61 3 4327 9392; seasonal shareable dishes/mostly dinner copy, not Main Street daily long lunch; remove unverified old coordinates | https://mrvincenzos.com/ |
| mornington-peninsula-brewery.json | Current physical venue name Tar Barrel Brewery & Distillery, phone+61 477 378 294 and operator website; distinguish venue from separate Mornington beer brand; remove unsupported Friday-music/old award copy; preserve72 Watt Road address and canonical slug | https://tarbarrel.com.au/ and https://www.mpbrew.com.au/home |
| mornington-peninsula-chocolates.json | Current linked operator name The Chocolateries Mornington Peninsula,45 Cook St,+61 3 5989 0040; supported chocolates/experiences copy; remove unverified old coordinates; canonical slug retained | https://www.mpchoc.com.au/ |
| stillwater-crittenden.json |+61 3 5987 3800 and operator restaurant booking route only; chef/menu/awards outside correction scope | https://www.crittendenwines.com.au/pages/contact and https://www.crittendenwines.com.au/pages/restaurant |
| johnny-ripe.json | Pause cafe recommendation (`status:paused`), remove unverified coordinates, use current brand website and stockist/pop-up guidance; factory not converted to cafe; canonical slug retained | https://johnnyripe.au/ explicitly says navigating away from retail for the time being; https://johnnyripe.au/contact-us gives wholesale factory |

Changed-address records lacking an operator exact marker now have no coordinates, so the map must not retain their previously guessed points. Barragunda is the sole corrected address with a verified operator marker. Johnny Ripe is a paused retail recommendation, not a claim the brand permanently closed. Remaining uncertain operator fetches are not classified closed.

## Operator identity and destination reconciliation

All changes below are field-level; existing lastVerified dates and canonical slugs remain unchanged.

- Dromana Hotel: current operator identifies the venue as Stella’s Hotel Dromana. Replace the parked legacy domain with https://stellasdromanahotel.com.au/ and contact route https://stellasdromanahotel.com.au/contact/. The contact page supplies 151 Point Nepean Rd and +61 3 5987 1922. Update name, address, phone, website, booking enquiry and supported restaurant/bistro/bar copy. Remove old coordinates because no exact operator marker was established.
- Allis: current Ten Minutes by Tractor operator page https://www.tenminutesbytractor.com.au/contact calls its casual shared-plate offering Cellar Door Dining. Use that current destination name and operator contact/booking route, retaining allis-wine-bar as canonical. This is current destination reconciliation, not proof of a formal rebrand date. Existing address and phone are unchanged; do not promise former Allis hours or unchanged branding.
- Georgie Bass: the legacy domain displayed unrelated parked-domain advertising. Remove website and bookingUrl to prevent misdirection. Current hotel https://flindershotel.com.au/eat-drink/ contains no Georgie Bass reference; direct Instagram operator content could not be retrieved. Current operation, farm ownership, cookery classes and hotel affiliation remain unverified. A parked domain alone does not prove closure. This record needs a verification pause rather than recertification.
- Johnny Ripe: retain the operator-confirmed temporary retail pause and canonical route. Required address now reads “Retail visits paused; check current operator locations”; this is visitor guidance, not a claimed street address. Omit empty knownFor rather than violating the optional field’s minimum length. No factory coordinates or cafe visit recommendation are supplied.
