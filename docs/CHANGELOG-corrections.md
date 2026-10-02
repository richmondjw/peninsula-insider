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
