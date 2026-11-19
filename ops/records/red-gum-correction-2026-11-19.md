# Red Gum BBQ Red Hill: field correction, 19 November 2026

Scope: two guide opening-hours passages; central visitor address, public phone, hours note and map coordinates. Researched correction, not a visit. Existing imagery, rights, unrelated prose and whole-record verification dates remain unchanged.

| Field | Evidence checked 2026-11-19 | Decision |
| --- | --- | --- |
| Red Hill opening hours | https://redgumbbq.com.au/ and https://redgumbbq.com.au/red-gum-bbq-red-hill-2/ : Red Gum BBQ Hours section | Wednesday–Thursday 11 am–8 pm; Friday–Saturday 11 am–9 pm; Sunday 11 am–4 pm. These are opening hours, not exact kitchen-service cut-offs. Holiday checks retained. |
| Sunday and Wednesday–Saturday dinner | Operator reply body, received November 2026 | Supports day-level correction. A conflicting email signature is not used as a public hours/contact source; current public location pages control the published fields. No private correspondence reproduced. |
| Address and phone | Same two public operator pages, Red Hill block (distinct from Seaford) | 87 Arthurs Seat Road, Red Hill VIC 3937; +61 3 5989 3156. Do not use the Seaford block. |
| Map coordinates | Operator homepage and Red Hill page, Red Hill Get Directions link to Google Maps | Business pin encoded as !3d-38.3734864!4d145.0221385 (not an inferred town centre). Replace the old -38.3849,145.0357 pin with -38.3734864,145.0221385. |

Directions source: https://www.google.com/maps/place/Red+Gum+BBQ/@-38.3734864,145.0221385,17z/data=!3m1!4b1!4m6!3m5!1s0x6ad5c69e0eaf7955:0x8e98ce570fe2f70c!8m2!3d-38.3734864!4d145.0221385!16s%2Fg%2F11c3806hn6?entry=ttu

Read-only CMS check: no matching text overrides across statuses for the venue or either guide, and no text values mentioning Red Gum. Two venue image slots (hero, heroImage) remain draft, with null metadata and last update 2026-09-29. No CMS record changed.

Derived surfaces: venue detail and its telephone/PostalAddress/GeoCoordinates schema use the central record; VenueCard uses its address for the family guide and Red Hill place page; /map/ reads its coordinates. No parallel hardcoded contact or coordinate record was found. Historical root HTML is retired and is not a deployment source.

Release hold: draft PR only. Independent exact-head source/render review and required CI remain necessary. After coordinator-authorised deployment, verify deployment.json, both guide passages, detail telephone/directions/hours and JSON-LD, family and Red Hill cards, and map pin at mobile/desktop widths. No emails or Asana changes authorised here.
