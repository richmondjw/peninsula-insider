# The Insider Note No. VII — brand build QA

**Status:** draft for James's review. Not imported to Beehiiv, not scheduled, not sent.
**Files:** `ops/email/insider-note-2026-08-05.html` (send version), `-preview.png` / `-preview-mobile.png` (renders).
**Supersedes:** `weekly-picks-2026-08-05-whats-on.html` (off-brand first pass).

## Brand compliance

Every token pulled from the live site, not invented.

| Element | Value | Source |
| --- | --- | --- |
| Display type | Sora 600/700, `-0.02em` tracking | `v6-tokens.css` `--font-display` |
| Body type | Figtree 400/500/600 | `v6-tokens.css` `--font-ui` |
| Dark ground | `#0B2E4A` | `--harbour-deep` |
| Primary blue / links | `#10527E` | `--harbour` |
| CTA and dark-ground accent | `#F5C177` | `--sand` |
| Eyebrows on light | `#8A5620` / `#1D6491` | `--sand-text`, `--tide-text` (both AA-safe) |
| Warm paper sections | `#F2EFEA` | `--bg-alt` |
| Body ink / metadata | `#14202A` / `#4B5862` | `--text`, `--soft` |
| Hairlines | `#D3D5CF`, `#E4E1DB` | `--border` family |

Wordmark matches the site masthead lockup (Peninsula in white, Insider in `--tide`). Sand button, uppercase 0.12em label, square corners — the same treatment as "See this weekend" on the homepage hero.

## Photography

Five images, all from the site's own licensed library (`next/public/images/sourced/`), re-exported to progressive JPEG because Outlook's Word engine does not decode WebP. Total payload 322 kB.

| Slot | Source | Output |
| --- | --- | --- |
| Cover band | `explore-sorrento-ocean-baths-01.webp` (1400×788 source, 50%/55% crop) | `note-band-winterbeach.jpg` 1200×420, 66 kB |
| Lead — Stonier | `venue-avani-wines-01.jpg` | `note-lead-stonier.jpg` 1200×760, 57 kB |
| Thursday — Hastings | `category-market-02.webp` (that event's own hero) | `note-thu-hastings.jpg` 600×440, 68 kB |
| Friday — Bass & Flinders | `category-brewery-01.webp` (that event's own hero) | `note-fri-gin.jpg` 600×440, 53 kB |
| Editorial — MPRG | `explore-mprg-01.webp` | `note-editorial-mprg.jpg` 1080×600, 102 kB |

All exported at 2× display width. Hosted at `peninsulainsider.com.au/images/email/` — committed and pushed in `796772bf6a`, cover band replaced in `5442863ff4` and again in the commit that carries this line. Unlinked directory; it publishes no page.

The cover band is Wikimedia Commons, CC-BY-SA-4.0, *Portsea beaches* by Simone Kealy, filed in the library under the wrong name (`explore-sorrento-ocean-baths-01`) — the licence record says Portsea in winter and the photograph agrees, so the alt text credits Portsea, not Sorrento. Chosen by James over Cape Schanck at dawn and an Arthurs Seat storm cloud. Its muted greys and greens leave the sand CTA as the only warm element in the email. Exported baseline JPEG, not progressive — the earlier four images are progressive; the encoder available here writes baseline only.

Note on the library, which needs a real audit pass:

- Only 23 of the 130+ files in `images/sourced/` have a record in `LICENSES.md`. Several strong cover candidates (`home-cover-sunset-bay-01`, `home-hero-winter-weekend`) have no provenance and were excluded on that basis.
- `venue-portsea-hotel-01.webp` is not the Portsea Hotel (it is an interior with a Christmas tree); `article-long-lunch-01.webp` is a vine close-up, not a lunch. Neither was used.
- Duplicate files under different names: `home-cover-sorrento-pier-01` = `home-cover-flinders-pier-steps-01`; `place-flinders-01` = `article-flinders-weekend-01`.
- `explore-sorrento-ocean-baths-01.webp` is a Portsea winter beach by its own licence record, not the Sorrento baths.

## Subject line and preview text

Built on AIDA. The subject does the attention work with one concrete, sensory promise rather than a category label; the preview text extends it instead of repeating it, and carries the interest and desire load by naming the other three days; the desire and action work then sits in the body, where the Stonier card is the only sand CTA in the email.

| Field | Copy | Length |
| --- | --- | --- |
| Subject | Stonier lights the fires on Sunday | 34 chars — survives iOS Mail truncation at ~35 |
| Preview | Plus a market on Thursday, gin on Friday and a gallery worth the drive. One good move a day, Thursday to Tuesday. | 112 chars |

Grounded in the Stonier listing copy: food over coals, fires lit through the property. Not embellished.

Alternates, if the lead event changes week to week:

- *One good move a day, Thursday to Tuesday* — leads on the format promise rather than the event. Best when no single event is strong enough to anchor.
- *Five reasons to leave the house this week* — highest-curiosity, lowest-specificity. Use sparingly; it wears out with repetition.

Both fields are recorded in an HTML comment at the top of the send file so whoever imports to Beehiiv sets them correctly.

## Editorial selection — unchanged from the approved shape

| Slot | Selection | Date |
| --- | --- | --- |
| Lead | Stonier Fire & Wine Winter Lunch | Sunday 9 August |
| Thursday | Hastings Thursday Street Market | Thursday 6 August |
| Friday | Bass & Flinders Gin Masterclass | Friday 7 August |
| Editorial (rotating) | MPRG winter program, Saturday-or-Tuesday call | Through 23 August |
| Calendar rail | Portsea Hotel, Peppers Moonah Links, Family Mystery Picnic | Fri–Sun |

House rules checked: no em-dashes, no pricing, no tourism-board adjectives.

## Email engineering

- 600px table layout, `role="presentation"`, no flex or grid.
- Inline styles throughout; `<style>` block only for media queries and font-family shorthands.
- VML `roundrect` fallback on the primary CTA for Outlook; MSO conditional forces Arial so Word does not drop to Times.
- Hidden preheader, `x-apple-disable-message-reformatting`, forced light `color-scheme`.
- Mobile breakpoint at 620px: two-up cards stack full-width, display sizes step down.
- Alt text on all five images; the email is readable with images blocked.
- Verified renders at 600px desktop and 390px mobile.

## Before send

1. Re-verify every event's time and availability on Wednesday morning.
2. Replace the `[ Beehiiv poll block ]` placeholder with a native poll.
3. Swap `{{unsubscribe_url}}` / `{{web_url}}` for Beehiiv's merge tags on import.
4. Click-test the five UTM links.
5. James picks the subject line and approves the send.

**Subject:** Your Peninsula week: market, gin, gallery, Stonier
**Preview:** A forward view from Thursday to Tuesday, with one good move each day.
