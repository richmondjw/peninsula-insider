# Visit Victoria Content Hub: licence record and house rules

This directory is the evidence for every image on Peninsula Insider that carries
`license: 'visit-victoria'`. The licence is a grant made to this publication; it
cannot be inferred from a file, a host or a credit string (see
`next/scripts/media-rights/licences.mjs`). A `visit-victoria` licence is valid only
for an asset whose Visit Victoria asset id appears in a catalogue record here.

## Records

| File | What it is | Written by / when |
|---|---|---|
| `content-hub-terms-2026-09-21.md` | Verbatim Content Hub Terms and Conditions (version last modified 21 Sep 2026) | Claude Code session for James, 2026-09-29 |
| `clarification-2026-09-29.md` | Four questions put to Visit Victoria and the answer | Claude Code session for James, 2026-09-29 |
| `download-2026-09-28/catalogue.json` | One row per downloaded Work: asset id, file hash, dimensions, embedded rights text, creator, region | `ops/scripts/visit-victoria/catalogue.mjs --write`, run deliberately against the download folder |
| `download-2026-09-28/annotations.json` | Alt text and shot attributes for the 332 reviewed Works (vision draft, see clarification) | Claude Code session at James's request, 2026-09-29 |
| `entity-map.json` | Approved mapping: hero and gallery per entity, plus alt text and credit per Work | `ops/scripts/visit-victoria/build-entity-map.mjs`, bulk approval by James 2026-09-29 |
| `placements.json` | Where-used ledger: every site placement, plus the CMS image overrides retired so the new heroes show (`cmsRetired`, with the SQL to restore them) | `ops/scripts/visit-victoria/apply-entity-map.mjs --write`, then the recorded CMS step |

## How every job and agent uses the library

Any picture work, scheduled or ad hoc, starts with the finder:

```
node ops/scripts/visit-victoria/find-images.mjs "<venue slug | place | topic>" [--channel site|email|social|paid] [--json]
```

- **READY**: already on the site as a licensed web derivative. Use the `src`, `alt`,
  `credit` and `caption` exactly as returned.
- **SUGGEST**: in the download but not approved or placed. Report it as a suggestion; never
  reference it until a person approves it and `apply-entity-map.mjs` makes the derivative.
- `--channel paid` returns nothing, by design.

Wired in (2026-09-29):
- daily, weekly and monthly engine: `engine/hero_image.py`
- the Insider Note Tuesday draft cron and its docs
- the `pi-weekly-social-drafts` cron (library before Unsplash; type kept off the photograph
  until the headline-tile answer is filed; never a Higgsfield source)
- `.claude/agents/dispatch-desk.md` and `style-agent.md`
- the editorial governance standard §2
- the OpenClaw `peninsula-insider` and `peninsula-social-production` skills
- Pixel's `AGENTS.md`

Detail pages lay the photographs out by the rule in `next/src/lib/photo-set.ts`.

## Enforcement and review (2026-09-30)

- **Licence gate** `next/scripts/lint-visit-victoria.mjs` (`npm run lint:visit-victoria`), in
  the build chain and the Content Gate. Fails on: a credit that does not name Visit Victoria,
  a caption that does not name the region, a false or missing `visit-victoria` licence, an
  excluded or out-of-region Work, a missing derivative, `derivative` or `commercial` in
  `permittedUses`, a Visit Victoria photograph on a featured-partner venue or partner page,
  and a placement missing from the where-used ledger.
- **Ledger upkeep**: `engine/hero_image.py` records every placement it stamps (the orchestrator
  commits the ledger with the article); for hand edits run
  `node ops/scripts/visit-victoria/record-placements.mjs --write`.
- **Upgrade scan** `node ops/scripts/visit-victoria/scan-upgrades.mjs` writes
  `ops/reports/visit-victoria/upgrade-scan.md`: ready upgrades from photographs already on the
  site, suggested Works for existing pages, and new-listing candidates. The OpenClaw cron
  `pi-image-upgrade-scan` (Mondays 08:15 Melbourne, agent `main`) runs it on a clean checkout
  of main and raises one Asana proposal when the result changes. It never applies anything.
- **Credits page** `/photography/` gives production credits for cards and previews.
- **One-off correction** `fix-false-claims-2026-09-30.mjs`: seven older heroes carried a false
  `visit-victoria` label; four were relabelled to their Wikimedia records, three replaced.

## Operating it

- **Takedown:** `node ops/scripts/visit-victoria/where-used.mjs <asset id>` lists every
  placement. Remove the imageRef from each entity, delete the derivative from
  `next/public/images/visit-victoria/`, record the removal here, deploy.
- **Web derivatives** live in `next/public/images/visit-victoria/` (resize and re-encode
  only: heroes 2000px, gallery 1280px long edge). Originals are never committed.
- **Adding Works:** download, run `catalogue.mjs --write` for the new batch,
  `propose-matches.mjs`, review, `build-entity-map.mjs`, `apply-entity-map.mjs --write`.

## House rules (derived from the terms and the clarification)

1. **Credit, every time, adjacent to the image:**
   `Photo: {Creator}, courtesy of Visit Victoria`. When the creator is unknown:
   `Photo courtesy of Visit Victoria`. The embedded creator wins over anything else.
2. **Title the place truthfully.** The caption or surrounding title must identify the
   region or destination shown. An image may only promote the region it was taken in.
   Bellarine and Melbourne images never stand in for the Mornington Peninsula.
3. **No derivatives.** Crop, resize, re-encode and technical correction only. No
   Higgsfield or any generative edit, no image-to-video, no palette grading, no text
   baked into the pixels. HTML/CSS text laid over an unaltered image on a web page is
   permitted (clarification Q2).
4. **Channels.** Site, email newsletter and organic social. Boosting an organic post
   that promotes Peninsula tourism is permitted (clarification Q3). Not permitted
   without fresh written consent: sponsored or partner-paid placements, ads that
   promote a business rather than the destination, merchandise, anything sold.
5. **Never pass a Work to anyone else.** Not to venues, partners, agencies,
   contractors or press kits. The licence is non-transferable and non-sub-licensable.
6. **AI.** Internal software, including AI-assisted tools, may use the catalogue to
   help the editorial team choose which approved asset goes where (clarification Q1).
   Never train, fine-tune or build a dataset from the Works or their metadata, and
   never send a Work to a generative image or video model.
7. **Where-used ledger.** Every placement is recorded so a takedown request (including
   a First Nations mourning request) can be honoured the same day.
8. **People.** Identifiable people in a Work are fine for editorial use. Paid use of a
   Work showing identifiable people needs a release we hold ourselves.
9. **Closed or wrong-region subjects are excluded** by the catalogue (for example
   Max's at Red Hill, permanently closed).
10. **Terms can change.** Re-read the live terms quarterly and before any new channel;
    save a new dated copy here if they have changed.

Contact: contenthub@visitvictoria.com.au
