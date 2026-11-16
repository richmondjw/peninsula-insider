# Peninsula Insider — Corrections Changelog

Durable record of corrections applied to live PI content in response to reader / operator notifications. See `ops/correction-handling.md` for the operating loop behind this log.

## Format

```
## YYYY-MM-DD — <surface>
- **Surface:** <URL or content path>
- **Class:** factual | stale | framing-revised | framing-kept | off-scope
- **Change:** <one sentence>
- **Source:** <how the new claim was verified>
- **Applied by:** <name>
- **Ledger ref:** <publication-ledger entry id, if applicable>
```

Newest entries on top. Do not edit historical entries — append corrections to corrections as new entries.

---

## 2026-10-03 — Publication verification for the page-quality corrections
- **Surface:** Portsea Pier, Bayplay tour and operator, Doot Doot Doot, and Eat hub.
- **Class:** factual
- **Change:** No further copy change. The corrections above reached the public site and passed page, image and 390px browser checks.
- **Source:** Public `/deployment.json` reported source SHA `e361572cf6f947a66cc0a34af5c57248b7c2ff71`, run `37030080618`; public URLs returned HTTP 200 on 3 October 2026.
- **Applied by:** Codex under James's approved page-quality programme
- **Ledger ref:** `pi-page-quality-portsea-20261003-e361572`, `pi-page-quality-bayplay-20261003-e361572`, `pi-page-quality-doot-20261003-e361572`, `pi-page-quality-eat-20261003-e361572`

## 2026-10-03 — Portsea Pier access
- **Surface:** https://peninsulainsider.com.au/fishing/locations/portsea-pier/ and linked fishing guides
- **Class:** stale
- **Change:** Replaced active pier-fishing directions with a dated closure notice, authority link and open-location alternatives; corrected linked squid, kingfish and Rye guidance.
- **Source:** Parks Victoria, https://www.parks.vic.gov.au/places-to-see/sites/portsea-pier (checked 3 October 2026).
- **Applied by:** Codex under James's approved page-quality programme
- **Ledger ref:** pending post-publish verification

## 2026-10-03 — Bayplay sea-dragon snorkel
- **Surface:** https://peninsulainsider.com.au/tour/bayplay-sea-dragon-snorkel-tour/ and https://peninsulainsider.com.au/tour/operators/bayplay/
- **Class:** factual
- **Change:** Corrected the minimum age, approximate duration and beach-entry description; removed unsupported group and price labels; replaced an unverified operator image with credited, clearly illustrative Portsea context.
- **Source:** Bayplay, https://bayplay.com.au/snorkel-with-dragons/ ; Parks Victoria, https://www.parks.vic.gov.au/places-to-see/sites/portsea-pier (checked 3 October 2026).
- **Applied by:** Codex under James's approved page-quality programme
- **Ledger ref:** pending post-publish verification

## 2026-10-03 — Doot Doot Doot attribution and image
- **Surface:** https://peninsulainsider.com.au/eat/doot-doot-doot/ and July 2026 Insider Picks article
- **Class:** factual
- **Change:** Updated the current dining attribution and corrected the archive note; quarantined a wrongly branded CMS hero and displayed a licensed, labelled Jackalope context photo.
- **Source:** Jackalope dining, https://jackalopehotels.com/drink-dine/ ; Visit Victoria image record vv-26070118 (checked 3 October 2026).
- **Applied by:** Codex under James's approved page-quality programme
- **Ledger ref:** pending post-publish verification

## 2026-05-10 — bootstrap entry
- **Surface:** _(none — this file's creation)_
- **Class:** _(meta)_
- **Change:** Established this changelog as the durable record for PI corrections.
- **Source:** Tranche 2 of the current-state implementation backlog (item 7).
- **Applied by:** Remy
- **Ledger ref:** _(n/a — bootstrap)_

## 2026-10-24 - Family Day Out: Oktoberfest and beach planning
- **Surface:** https://peninsulainsider.com.au/explore/plans/the-family-day-out/
- **Class:** factual / date-specific clarification
- **Change:** Added an explicitly dated 24 October 2026 Oktoberfest lunch disclosure (11 am–7 pm), with seating and family suitability unconfirmed. Made the beach stop shore-based unless a suitable flagged swimming area is operating; recorded the November regular patrol season and absence of a confirmed 24 October patrol. Retained three main anchors, optional coffee deadline, Eagle timing/operation caveats and all image rights records.
- **Sources (read 24 October 2026):** https://www.redhillbrewery.com.au/celebrate-oktoberfest-german-beer-specials-2/ ; https://www.redhillbrewery.com.au/whats-on/ ; https://mmlsc.com.au/lifesaving/ ; https://www.police.vic.gov.au/beach-and-waterways-safety ; https://aseagle.com.au/faq/ ; https://www.commonfolkcoffee.com.au/pages/locations/mornington
- **Lifecycle:** Dated historical wording ("advertised", full date and year), not a recurring or current-event promise. Retained as a dated planning record after the event; no undated promotion, invented recurrence or unattended expiry dependency. The itinerary schema has no temporary advisory field.
- **Applied by:** Codex under James's explicit publication authorisation.
- **Ledger ref:** pi-family-day-out-correction-20261024; PR #688, source 8fcdad839ac0d614253487de7ebf35a07e94ff66, successful run 40045942386 and exact live verification on 24 October 2026.
