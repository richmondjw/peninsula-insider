# Peninsula Insider — Image Library Audit

**Date:** 4 August 2026  
**Auditor:** Remy (image library audit)  
**Scope:** `next/public/images/**` (150 files) and the mirror tree `images/**` (144 files).  
**Cards blocked by these defects:** `1217082292992619` (image intelligence pilot), `1217088831493942` (hero image data quality), `1217050771643058` (image intelligence scoping).

> No image files were deleted or renamed. Several are referenced by content collections; renaming breaks pages. All destructive changes are recommendations only.

## Method

- Dimensions read directly from PNG/JPEG/WebP file headers with a purpose-written Python header parser (`sharp` has no working platform binaries in this environment; PIL is not installed). All 150 files parsed successfully; zero fallbacks.
- Duplicate detection by SHA-256 over full file bytes — exact, not perceptual.
- Near-duplicate suspicion by matching (width, height) with file sizes within 3%. These are **suspected only** and are labelled as such.
- Label verification by rendering contact sheets (HTML grids of ~12 labelled thumbnails) to PNG in headless Chromium and reading the sheets back visually. Every verdict below states whether it was **seen** or **inferred**.

## Summary

| Metric | Count |
|---|---|
| Files under `next/public/images/` | 149 |
| Files under `next/public/images/sourced/` | 137 |
| Licence records in `LICENSES.md` | 23 |
| Sourced files with **no** licence record | 114 |
| Licence records with no matching file | 0 |
| Exact-duplicate groups (SHA-256) | 21 |
| Files that are exact duplicates of another | 46 |

## Exact duplicate groups (SHA-256, byte-identical)

These are **verified** — identical bytes, not a visual judgement.

| Group | Files | Dimensions | Bytes |
|---|---|---|---|
| D1 | `sourced/article-beach-swimming-01.webp`<br>`sourced/place-rye-01.webp` | 1600x1200 | 168,960 |
| D10 | `sourced/article-sunset-01.webp`<br>`sourced/explore-farnsworth-track-01.webp` | 1600x1067 | 440,106 |
| D11 | `sourced/category-cafe-01.webp`<br>`sourced/category-cafe-02.webp` | 1920x1316 | 294,934 |
| D12 | `sourced/category-cafe-03.webp`<br>`sourced/category-cafe-04.webp` | 1920x2880 | 412,018 |
| D13 | `sourced/category-market-01.webp`<br>`sourced/category-market-02.webp` | 1920x1280 | 405,978 |
| D14 | `sourced/category-pub-01.webp`<br>`sourced/category-pub-02.webp`<br>`sourced/category-pub-03.webp` | 1920x1280 | 226,708 |
| D15 | `sourced/category-restaurant-01.webp`<br>`sourced/category-restaurant-02.webp` | 1920x1440 | 427,902 |
| D16 | `sourced/category-restaurant-03.webp`<br>`sourced/category-restaurant-06.webp` | 1920x1440 | 394,928 |
| D17 | `sourced/dog-beach-emma-01.webp`<br>`supplied/emma-2026-05-05/dog-beach-emma-01-bright.webp` | 1280x720 | 345,612 |
| D18 | `sourced/explore-dromana-beach-01.webp`<br>`sourced/place-dromana-01.webp` | 1600x1067 | 115,598 |
| D19 | `sourced/explore-mount-martha-beach-01.webp`<br>`sourced/place-mount-martha-01.webp` | 1600x1200 | 103,236 |
| D2 | `sourced/article-cellar-door-01.webp`<br>`sourced/article-long-lunch-01.webp`<br>`sourced/article-producer-trail-01.webp` | 1600x1200 | 291,672 |
| D20 | `sourced/home-cover-flinders-pier-steps-01.jpg`<br>`sourced/home-cover-sorrento-pier-01.jpg` | 2048x1536 | 1,199,032 |
| D21 | `sourced/place-red-hill-01.webp`<br>`sourced/venue-montalto-banner-01.webp`<br>`sourced/venue-tedesca-osteria-01.webp` | 1200x600 | 122,654 |
| D3 | `sourced/article-couples-weekend-01.webp`<br>`sourced/explore-portsea-front-beach-01.webp` | 1600x1082 | 210,980 |
| D4 | `sourced/article-dog-friendly-01.webp`<br>`sourced/explore-gunnamatta-01.webp` | 1600x1067 | 140,158 |
| D5 | `sourced/article-flinders-weekend-01.webp`<br>`sourced/article-seafood-01.webp` | 1600x1200 | 384,994 |
| D6 | `sourced/article-italian-dinners-01.webp`<br>`sourced/article-sorrento-weekend-01.webp` | 1600x1200 | 553,616 |
| D7 | `sourced/article-kids-peninsula-01.webp`<br>`sourced/place-rosebud-01.webp` | 1600x1200 | 200,002 |
| D8 | `sourced/article-peninsula-pantry-01.webp`<br>`sourced/article-red-hill-saturday-01.webp`<br>`sourced/place-moorooduc-01.webp` | 1600x1200 | 287,866 |
| D9 | `sourced/article-picnic-01.webp`<br>`sourced/article-vineyard-villa-01.webp` | 1600x919 | 470,156 |

### Suspected near-duplicates (NOT verified byte-identical)

Same pixel dimensions and file size within 3%, different content hash. Flagged for human review; I have **not** confirmed these are the same photograph unless the contact-sheet section says otherwise.

| A | B | Dimensions | Bytes A / B |
|---|---|---|---|
| `sourced/venue-dromana-pier-01.webp` | `sourced/venue-nazaaray-estate-01.webp` | 1400x900 | 72,562 / 74,070 |
| `sourced/venue-red-hill-general-store-01.webp` | `sourced/venue-sorrento-hotel-01.webp` | 1400x900 | 136,992 / 137,208 |
| `sourced/place-mornington-01.webp` | `sourced/explore-mornington-foreshore-01.webp` | 1600x900 | 292,448 / 297,760 |
| `sourced/explore-rye-ocean-beach-01.webp` | `sourced/article-sunset-01.webp` | 1600x1067 | 434,496 / 440,106 |
| `sourced/place-moorooduc-01.webp` | `sourced/place-main-ridge-01.webp` | 1600x1200 | 287,866 / 288,046 |
| `sourced/place-main-ridge-01.webp` | `sourced/article-cellar-door-01.webp` | 1600x1200 | 288,046 / 291,672 |
| `sourced/explore-two-bays-walk-01.webp` | `sourced/place-sorrento-01.webp` | 1600x1200 | 350,808 / 351,724 |
| `sourced/category-restaurant-06.webp` | `sourced/home-cover-bay-umbrella-01.webp` | 1920x1440 | 394,928 / 405,458 |

## Full inventory

`Licence` = has a record in `sourced/LICENSES.md`. `Dup` = exact-duplicate group id. `Label` = verdict from contact-sheet review.

| File | Format | W x H | Bytes | Dup | Licence | Label verdict |
|---|---|---|---|---|---|---|
| `email/note-band-bay.jpg` | jpeg | 1200x420 | 23,014 |  | n/a | not yet reviewed |
| `email/note-band-winterbeach.jpg` | jpeg | 1200x420 | 67,171 |  | n/a | not yet reviewed |
| `email/note-editorial-mprg.jpg` | jpeg | 1080x600 | 104,702 |  | n/a | not yet reviewed |
| `email/note-fri-gin.jpg` | jpeg | 600x440 | 54,637 |  | n/a | not yet reviewed |
| `email/note-lead-stonier.jpg` | jpeg | 1200x760 | 58,275 |  | n/a | not yet reviewed |
| `email/note-thu-hastings.jpg` | jpeg | 600x440 | 70,113 |  | n/a | not yet reviewed |
| `pi-avatar.svg` | svg | -x- | 5,416 |  | n/a | not yet reviewed |
| `pi-concierge.svg` | svg | -x- | 662,605 |  | n/a | not yet reviewed |
| `pi-logo-new.svg` | svg | -x- | 28,681 |  | n/a | not yet reviewed |
| `pi-mark.svg` | svg | -x- | 1,868 |  | n/a | not yet reviewed |
| `placeholder-golf.svg` | svg | -x- | 746 |  | n/a | not yet reviewed |
| `sourced/article-beach-swimming-01.webp` | webp-lossy | 1600x1200 | 168,960 | D1 | **MISSING** | not yet reviewed |
| `sourced/article-cellar-door-01.webp` | webp-lossy | 1600x1200 | 291,672 | D2 | **MISSING** | not yet reviewed |
| `sourced/article-chardonnay-case-01.webp` | webp-lossy | 1200x1045 | 242,658 |  | documented | not yet reviewed |
| `sourced/article-couples-weekend-01.webp` | webp-lossy | 1600x1082 | 210,980 | D3 | **MISSING** | not yet reviewed |
| `sourced/article-dog-friendly-01.webp` | webp-ext | 1600x1067 | 140,158 | D4 | **MISSING** | not yet reviewed |
| `sourced/article-flinders-weekend-01.webp` | webp-lossy | 1600x1200 | 384,994 | D5 | **MISSING** | not yet reviewed |
| `sourced/article-hatted-restaurants-01.webp` | webp-ext | 2400x1600 | 793,440 |  | documented | not yet reviewed |
| `sourced/article-italian-dinners-01.webp` | webp-lossy | 1600x1200 | 553,616 | D6 | **MISSING** | not yet reviewed |
| `sourced/article-kids-peninsula-01.webp` | webp-ext | 1600x1200 | 200,002 | D7 | **MISSING** | not yet reviewed |
| `sourced/article-long-lunch-01.webp` | webp-lossy | 1600x1200 | 291,672 | D2 | **MISSING** | not yet reviewed |
| `sourced/article-orientation-drive-01.webp` | webp-ext | 1600x754 | 65,536 |  | **MISSING** | not yet reviewed |
| `sourced/article-orientation-drive-02.webp` | webp-lossy | 1600x1178 | 381,724 |  | **MISSING** | not yet reviewed |
| `sourced/article-peninsula-pantry-01.webp` | webp-lossy | 1600x1200 | 287,866 | D8 | **MISSING** | not yet reviewed |
| `sourced/article-picnic-01.webp` | webp-lossy | 1600x919 | 470,156 | D9 | **MISSING** | not yet reviewed |
| `sourced/article-point-nepean-01.webp` | webp-ext | 1600x1067 | 295,180 |  | **MISSING** | not yet reviewed |
| `sourced/article-producer-trail-01.webp` | webp-lossy | 1600x1200 | 291,672 | D2 | **MISSING** | not yet reviewed |
| `sourced/article-rainy-day-01.webp` | webp-lossy | 1600x1200 | 369,846 |  | **MISSING** | not yet reviewed |
| `sourced/article-red-hill-saturday-01.webp` | webp-lossy | 1600x1200 | 287,866 | D8 | **MISSING** | not yet reviewed |
| `sourced/article-seafood-01.webp` | webp-lossy | 1600x1200 | 384,994 | D5 | **MISSING** | not yet reviewed |
| `sourced/article-sorrento-weekend-01.webp` | webp-lossy | 1600x1200 | 553,616 | D6 | **MISSING** | not yet reviewed |
| `sourced/article-sunset-01.webp` | webp-lossy | 1600x1067 | 440,106 | D10 | **MISSING** | not yet reviewed |
| `sourced/article-vineyard-villa-01.webp` | webp-lossy | 1600x919 | 470,156 | D9 | **MISSING** | not yet reviewed |
| `sourced/category-bakery-01.webp` | webp-lossy | 1920x1536 | 208,568 |  | **MISSING** | not yet reviewed |
| `sourced/category-bakery-02.webp` | webp-lossy | 1920x1277 | 572,938 |  | **MISSING** | not yet reviewed |
| `sourced/category-brewery-01.webp` | webp-lossy | 1920x1280 | 350,026 |  | **MISSING** | not yet reviewed |
| `sourced/category-brewery-02.webp` | webp-lossy | 1920x1920 | 22,980 |  | **MISSING** | not yet reviewed |
| `sourced/category-cafe-01.webp` | webp-lossy | 1920x1316 | 294,934 | D11 | **MISSING** | not yet reviewed |
| `sourced/category-cafe-02.webp` | webp-lossy | 1920x1316 | 294,934 | D11 | **MISSING** | not yet reviewed |
| `sourced/category-cafe-03.webp` | webp-lossy | 1920x2880 | 412,018 | D12 | **MISSING** | not yet reviewed |
| `sourced/category-cafe-04.webp` | webp-lossy | 1920x2880 | 412,018 | D12 | **MISSING** | not yet reviewed |
| `sourced/category-cottage-01.webp` | webp-lossy | 1920x1281 | 310,290 |  | **MISSING** | not yet reviewed |
| `sourced/category-glamping-01.webp` | webp-lossy | 1920x2880 | 281,358 |  | **MISSING** | not yet reviewed |
| `sourced/category-hotel-02.webp` | webp-lossy | 1920x1280 | 319,984 |  | **MISSING** | not yet reviewed |
| `sourced/category-market-01.webp` | webp-lossy | 1920x1280 | 405,978 | D13 | **MISSING** | not yet reviewed |
| `sourced/category-market-02.webp` | webp-lossy | 1920x1280 | 405,978 | D13 | **MISSING** | not yet reviewed |
| `sourced/category-producer-01.webp` | webp-lossy | 1920x1080 | 186,278 |  | **MISSING** | not yet reviewed |
| `sourced/category-producer-02.webp` | webp-lossy | 1920x1280 | 28,034 |  | **MISSING** | not yet reviewed |
| `sourced/category-producer-03.webp` | webp-lossy | 1920x1920 | 66,414 |  | **MISSING** | not yet reviewed |
| `sourced/category-producer-04.webp` | webp-lossy | 1920x1440 | 911,344 |  | **MISSING** | not yet reviewed |
| `sourced/category-pub-01.webp` | webp-lossy | 1920x1280 | 226,708 | D14 | **MISSING** | not yet reviewed |
| `sourced/category-pub-02.webp` | webp-lossy | 1920x1280 | 226,708 | D14 | **MISSING** | not yet reviewed |
| `sourced/category-pub-03.webp` | webp-lossy | 1920x1280 | 226,708 | D14 | **MISSING** | not yet reviewed |
| `sourced/category-restaurant-01.webp` | webp-lossy | 1920x1440 | 427,902 | D15 | **MISSING** | not yet reviewed |
| `sourced/category-restaurant-02.webp` | webp-lossy | 1920x1440 | 427,902 | D15 | **MISSING** | not yet reviewed |
| `sourced/category-restaurant-03.webp` | webp-lossy | 1920x1440 | 394,928 | D16 | **MISSING** | not yet reviewed |
| `sourced/category-restaurant-04.webp` | webp-lossy | 1920x2880 | 1,031,896 |  | **MISSING** | not yet reviewed |
| `sourced/category-restaurant-06.webp` | webp-lossy | 1920x1440 | 394,928 | D16 | **MISSING** | not yet reviewed |
| `sourced/category-winery-01.webp` | webp-lossy | 1920x2560 | 369,466 |  | **MISSING** | not yet reviewed |
| `sourced/category-winery-02.webp` | webp-lossy | 1920x1280 | 90,220 |  | **MISSING** | not yet reviewed |
| `sourced/category-winery-03.webp` | webp-lossy | 1920x1280 | 31,954 |  | **MISSING** | not yet reviewed |
| `sourced/category-winery-04.webp` | webp-lossy | 1920x1280 | 239,106 |  | **MISSING** | not yet reviewed |
| `sourced/category-winery-06.webp` | webp-lossy | 1920x1281 | 164,212 |  | **MISSING** | not yet reviewed |
| `sourced/category-winery-08.webp` | webp-lossy | 1920x1280 | 156,238 |  | **MISSING** | not yet reviewed |
| `sourced/dog-beach-emma-01.webp` | webp-lossy | 1280x720 | 345,612 | D17 | **MISSING** | not yet reviewed |
| `sourced/dog-beach-hero-01.webp` | jpeg | 1800x2400 | 467,991 |  | **MISSING** | not yet reviewed |
| `sourced/dog-lifestyle-hero-01.webp` | jpeg | 1800x1201 | 342,844 |  | **MISSING** | not yet reviewed |
| `sourced/dog-walk-hero-01.webp` | jpeg | 1800x1202 | 199,791 |  | **MISSING** | not yet reviewed |
| `sourced/eat-epicurean-red-hill-01.webp` | webp-lossy | 1920x1086 | 562,940 |  | **MISSING** | not yet reviewed |
| `sourced/event-portsea-polo-01.webp` | webp-lossy | 1400x788 | 157,892 |  | **MISSING** | not yet reviewed |
| `sourced/explore-arthurs-seat-lookout-01.webp` | webp-ext | 1200x900 | 139,822 |  | documented | not yet reviewed |
| `sourced/explore-balnarring-beach-01.webp` | webp-lossy | 1600x818 | 238,162 |  | **MISSING** | not yet reviewed |
| `sourced/explore-bushrangers-bay-walk-01.webp` | webp-lossy | 1600x1067 | 85,032 |  | documented | not yet reviewed |
| `sourced/explore-cape-schanck-boardwalk-01.webp` | webp-ext | 2400x1800 | 280,634 |  | documented | not yet reviewed |
| `sourced/explore-cape-schanck-lighthouse-01.webp` | webp-lossy | 768x1024 | 47,580 |  | **MISSING** | not yet reviewed |
| `sourced/explore-dromana-beach-01.webp` | webp-ext | 1600x1067 | 115,598 | D18 | **MISSING** | not yet reviewed |
| `sourced/explore-farnsworth-track-01.webp` | webp-lossy | 1600x1067 | 440,106 | D10 | **MISSING** | not yet reviewed |
| `sourced/explore-greens-bush-01.webp` | webp-lossy | 1600x961 | 316,494 |  | **MISSING** | not yet reviewed |
| `sourced/explore-gunnamatta-01.webp` | webp-ext | 1600x1067 | 140,158 | D4 | **MISSING** | not yet reviewed |
| `sourced/explore-hub-hero-01.webp` | webp-lossy | 1600x961 | 178,080 |  | documented | not yet reviewed |
| `sourced/explore-mornington-foreshore-01.webp` | webp-lossy | 1600x900 | 297,760 |  | **MISSING** | not yet reviewed |
| `sourced/explore-mount-martha-beach-01.webp` | webp-ext | 1600x1200 | 103,236 | D19 | **MISSING** | not yet reviewed |
| `sourced/explore-mprg-01.webp` | webp-ext | 1200x900 | 267,456 |  | documented | not yet reviewed |
| `sourced/explore-point-nepean-fort-01.webp` | webp-ext | 800x1200 | 208,664 |  | **MISSING** | not yet reviewed |
| `sourced/explore-portsea-front-beach-01.webp` | webp-lossy | 1600x1082 | 210,980 | D3 | **MISSING** | not yet reviewed |
| `sourced/explore-rye-ocean-beach-01.webp` | webp-lossy | 1600x1067 | 434,496 |  | **MISSING** | not yet reviewed |
| `sourced/explore-sorrento-ferry-01.webp` | webp-ext | 1600x900 | 159,498 |  | **MISSING** | not yet reviewed |
| `sourced/explore-sorrento-ocean-baths-01.webp` | webp-ext | 1400x788 | 104,894 |  | documented | not yet reviewed |
| `sourced/explore-two-bays-walk-01.webp` | webp-lossy | 1600x1200 | 350,808 |  | **MISSING** | not yet reviewed |
| `sourced/golf-rye-sunrise-01.webp` | webp-lossy | 1800x900 | 106,878 |  | **MISSING** | not yet reviewed |
| `sourced/home-cover-back-beach-horses-01.jpg` | jpeg | 1920x1440 | 782,845 |  | **MISSING** | not yet reviewed |
| `sourced/home-cover-bay-umbrella-01.webp` | webp-ext | 1920x1440 | 405,458 |  | **MISSING** | not yet reviewed |
| `sourced/home-cover-cape-schanck-rainbow-01.webp` | webp-lossy | 2400x1350 | 313,788 |  | **MISSING** | not yet reviewed |
| `sourced/home-cover-flinders-pier-steps-01.jpg` | jpeg | 2048x1536 | 1,199,032 | D20 | **MISSING** | not yet reviewed |
| `sourced/home-cover-sorrento-pier-01.jpg` | jpeg | 2048x1536 | 1,199,032 | D20 | **MISSING** | not yet reviewed |
| `sourced/home-cover-south-coast-rainbow-01.webp` | webp-lossy | 2400x1350 | 628,738 |  | **MISSING** | not yet reviewed |
| `sourced/home-cover-sunset-bay-01.jpg` | jpeg | 2048x1536 | 1,001,971 |  | **MISSING** | not yet reviewed |
| `sourced/home-cover.webp` | webp-lossy | 1280x853 | 129,134 |  | documented | not yet reviewed |
| `sourced/home-hero-cover-story.webp` | webp-lossy | 2400x1278 | 407,842 |  | **MISSING** | not yet reviewed |
| `sourced/home-hero-winter-weekend.webp` | webp-lossy | 2048x1536 | 314,156 |  | **MISSING** | not yet reviewed |
| `sourced/journal-hub-hero-01.webp` | webp-ext | 640x427 | 46,748 |  | **MISSING** | not yet reviewed |
| `sourced/journal-late-afternoon-walks-01.webp` | webp-lossy | 1600x1067 | 202,772 |  | documented | not yet reviewed |
| `sourced/place-balnarring-01.webp` | webp-lossy | 1600x1200 | 175,224 |  | **MISSING** | not yet reviewed |
| `sourced/place-cape-schanck-01.webp` | webp-lossy | 1600x1067 | 323,084 |  | documented | not yet reviewed |
| `sourced/place-dromana-01.webp` | webp-ext | 1600x1067 | 115,598 | D18 | **MISSING** | not yet reviewed |
| `sourced/place-flinders-01.webp` | webp-lossy | 1600x1200 | 253,732 |  | documented | not yet reviewed |
| `sourced/place-main-ridge-01.webp` | webp-ext | 1600x1200 | 288,046 |  | documented | not yet reviewed |
| `sourced/place-merricks-01.webp` | webp-lossy | 1600x919 | 348,814 |  | documented | not yet reviewed |
| `sourced/place-moorooduc-01.webp` | webp-lossy | 1600x1200 | 287,866 | D8 | **MISSING** | not yet reviewed |
| `sourced/place-mornington-01.webp` | webp-ext | 1600x900 | 292,448 |  | documented | not yet reviewed |
| `sourced/place-mount-martha-01.webp` | webp-ext | 1600x1200 | 103,236 | D19 | **MISSING** | not yet reviewed |
| `sourced/place-point-nepean-01.webp` | webp-lossy | 1600x1067 | 126,270 |  | documented | not yet reviewed |
| `sourced/place-portsea-01.webp` | webp-ext | 1600x1082 | 117,036 |  | documented | not yet reviewed |
| `sourced/place-red-hill-01.webp` | webp-lossy | 1200x600 | 122,654 | D21 | documented | not yet reviewed |
| `sourced/place-rosebud-01.webp` | webp-ext | 1600x1200 | 200,002 | D7 | **MISSING** | not yet reviewed |
| `sourced/place-rye-01.webp` | webp-lossy | 1600x1200 | 168,960 | D1 | **MISSING** | not yet reviewed |
| `sourced/place-safety-beach-01.webp` | webp-ext | 1600x1200 | 276,996 |  | **MISSING** | not yet reviewed |
| `sourced/place-sorrento-01.webp` | webp-lossy | 1600x1200 | 351,724 |  | documented | not yet reviewed |
| `sourced/places-hub-hero-01.webp` | webp-ext | 2400x1131 | 133,784 |  | documented | not yet reviewed |
| `sourced/spa-alba-thermal-springs-01.webp` | webp-lossy | 1920x1080 | 242,438 |  | **MISSING** | not yet reviewed |
| `sourced/spa-coastal-pool-01.webp` | webp-lossy | 1920x1438 | 169,466 |  | **MISSING** | not yet reviewed |
| `sourced/spa-dark-boutique-room-01.webp` | webp-lossy | 1920x1280 | 116,040 |  | **MISSING** | not yet reviewed |
| `sourced/spa-peninsula-hot-springs-hilltop-01.webp` | webp-lossy | 1200x600 | 85,354 |  | **MISSING** | not yet reviewed |
| `sourced/spa-treatment-room-rose-01.webp` | webp-lossy | 1920x1280 | 93,024 |  | **MISSING** | not yet reviewed |
| `sourced/spa-wellness-stones-01.webp` | webp-lossy | 1920x1280 | 64,544 |  | **MISSING** | not yet reviewed |
| `sourced/venue-ashcombe-maze-01.webp` | webp-lossy | 1400x900 | 472,062 |  | **MISSING** | not yet reviewed |
| `sourced/venue-avani-wines-01.jpg` | jpeg | 1920x1281 | 264,486 |  | **MISSING** | not yet reviewed |
| `sourced/venue-continental-sorrento-01.webp` | webp-lossy | 1400x900 | 143,100 |  | **MISSING** | not yet reviewed |
| `sourced/venue-dromana-pier-01.webp` | webp-lossy | 1400x900 | 72,562 |  | **MISSING** | not yet reviewed |
| `sourced/venue-flinders-hotel-01.webp` | webp-lossy | 1400x900 | 280,716 |  | **MISSING** | not yet reviewed |
| `sourced/venue-italian-dining-01.webp` | webp-lossy | 1920x2883 | 417,928 |  | **MISSING** | not yet reviewed |
| `sourced/venue-jackalope-hotel-01.webp` | webp-lossy | 1920x1280 | 293,238 |  | **MISSING** | not yet reviewed |
| `sourced/venue-lindenderry-01.webp` | webp-lossy | 1920x1283 | 121,754 |  | **MISSING** | not yet reviewed |
| `sourced/venue-montalto-banner-01.webp` | webp-lossy | 1200x600 | 122,654 | D21 | **MISSING** | not yet reviewed |
| `sourced/venue-nazaaray-estate-01.webp` | webp-lossy | 1400x900 | 74,070 |  | documented | not yet reviewed |
| `sourced/venue-paringa-estate-01.webp` | webp-lossy | 1429x893 | 193,244 |  | **MISSING** | not yet reviewed |
| `sourced/venue-polperro-sorrento-pier-01.webp` | webp-lossy | 1200x899 | 145,352 |  | **MISSING** | not yet reviewed |
| `sourced/venue-portsea-hotel-01.webp` | webp-lossy | 1400x900 | 200,644 |  | **MISSING** | not yet reviewed |
| `sourced/venue-pt-leo-sculpture-01.webp` | webp-lossy | 1600x1031 | 102,880 |  | documented | not yet reviewed |
| `sourced/venue-red-hill-general-store-01.webp` | webp-lossy | 1400x900 | 136,992 |  | **MISSING** | not yet reviewed |
| `sourced/venue-sorrento-hotel-01.webp` | webp-lossy | 1400x900 | 137,208 |  | **MISSING** | not yet reviewed |
| `sourced/venue-tedesca-osteria-01.webp` | webp-lossy | 1200x600 | 122,654 | D21 | **MISSING** | not yet reviewed |
| `sourced/venue-ten-minutes-by-tractor-01.jpg` | jpeg | 800x444 | 118,986 |  | **MISSING** | not yet reviewed |
| `sourced/venue-ten-minutes-by-tractor-01.webp` | webp-lossy | 1920x1278 | 214,322 |  | **MISSING** | not yet reviewed |
| `sourced/venue-wine-tasting-01.webp` | webp-lossy | 1920x1440 | 471,796 |  | **MISSING** | not yet reviewed |
| `sourced/whats-on-winter-wine.jpg` | jpeg | 1200x800 | 176,197 |  | **MISSING** | not yet reviewed |
| `sourced/whats-on-winter-wine.webp` | webp-lossy | 1200x800 | 100,602 |  | **MISSING** | not yet reviewed |
| `sourced/wine-hub-hero-01.webp` | webp-lossy | 1600x1200 | 154,426 |  | documented | not yet reviewed |
| `supplied/emma-2026-05-05/dog-beach-emma-01-bright.webp` | webp-lossy | 1280x720 | 345,612 | D17 | n/a | not yet reviewed |

