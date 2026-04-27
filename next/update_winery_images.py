#!/usr/bin/env python3
"""
Bulk-update all 42 winery hero images to ensure zero duplication on /wine/.
Each winery gets a unique image. Category-pattern images are replaced with
article/place/venue images that the resolveHeroSrc() resolver will NOT override.

Run from: next/
"""

import json
import os

BASE = "src/content/venues"

# (slug, src, alt, credit, license)
# None = keep as-is (already unique, no change needed)
ASSIGNMENTS = [
    # --- Already uniquely assigned, keep as-is ---
    # montalto            → venue-montalto-banner-01.webp
    # paringa-estate      → venue-paringa-estate-01.webp
    # pt-leo-estate       → venue-pt-leo-sculpture-01.webp
    # ten-minutes-by-tractor → venue-ten-minutes-by-tractor-01.webp
    # dexter-wines        → place-main-ridge-01.webp
    # ocean-eight         → place-moorooduc-01.webp

    # --- New: Nazaaray specific image ---
    ("nazaaray-estate",
     "/images/sourced/venue-nazaaray-estate-01.webp",
     "Nazaaray Estate winery building set among the vines, Merricks, Mornington Peninsula",
     "User:Melburnian / Wikimedia Commons (CC BY-SA 3.0)",
     "wikimedia-cc-by-sa"),

    # --- 35 unique assignments (alphabetical) ---
    ("avani-wines",
     "/images/sourced/article-rainy-day-01.webp",
     "Mornington Peninsula cellar door on a still winter day — Avani Wines",
     "Peninsula Insider",
     "editorial"),

    ("baillieu-vineyard",
     "/images/sourced/article-vineyard-villa-01.webp",
     "Vineyard estate landscape, Mornington Peninsula — Baillieu Vineyard",
     "Peninsula Insider",
     "editorial"),

    ("barmah-park-vineyard",
     "/images/sourced/place-merricks-01.webp",
     "Merricks wine country, Mornington Peninsula — Barmah Park Vineyard",
     "Peninsula Insider",
     "editorial"),

    ("circe-wines",
     "/images/sourced/place-mornington-01.webp",
     "Mornington foreshore and wine country — Circe Wines",
     "Peninsula Insider",
     "editorial"),

    ("crittenden-estate",
     "/images/sourced/place-dromana-01.webp",
     "Dromana wine region, Mornington Peninsula — Crittenden Estate",
     "Peninsula Insider",
     "editorial"),

    ("dromana-estate",
     "/images/sourced/explore-arthurs-seat-lookout-01.webp",
     "Arthurs Seat lookout above Dromana — Dromana Estate wine country",
     "Peninsula Insider",
     "editorial"),

    ("elan-vineyard",
     "/images/sourced/place-balnarring-01.webp",
     "Balnarring wine country, Mornington Peninsula — Elan Vineyard",
     "Peninsula Insider",
     "editorial"),

    ("eldridge-estate",
     "/images/sourced/article-cellar-door-01.webp",
     "Peninsula cellar door wine tasting — Eldridge Estate of Red Hill",
     "Peninsula Insider",
     "editorial"),

    ("elgee-park",
     "/images/sourced/article-beach-swimming-01.webp",
     "Mornington Peninsula bay in summer — Elgee Park Vineyard, Merricks North",
     "Peninsula Insider",
     "editorial"),

    ("foxeys-hangout",
     "/images/sourced/article-red-hill-saturday-01.webp",
     "Red Hill Saturday morning — Foxeys Hangout vineyard and produce",
     "Peninsula Insider",
     "editorial"),

    ("garagiste",
     "/images/sourced/article-long-lunch-01.webp",
     "Long lunch in Peninsula wine country — Garagiste wines",
     "Peninsula Insider",
     "editorial"),

    ("hurley-vineyard",
     "/images/sourced/place-safety-beach-01.webp",
     "Safety Beach, Mornington Peninsula wine country — Hurley Vineyard",
     "Peninsula Insider",
     "editorial"),

    ("kerri-greens",
     "/images/sourced/article-peninsula-pantry-01.webp",
     "Peninsula produce and natural wine — Kerri Greens",
     "Peninsula Insider",
     "editorial"),

    ("kooyong",
     "/images/sourced/article-hatted-restaurants-01.webp",
     "Fine dining at Kooyong Estate — Mornington Peninsula hatted winery restaurant",
     "Peninsula Insider",
     "editorial"),

    ("lightfoot-wines",
     "/images/sourced/article-producer-trail-01.webp",
     "Peninsula producer trail — Lightfoot and Sons winery",
     "Peninsula Insider",
     "editorial"),

    ("main-ridge-estate",
     "/images/sourced/article-chardonnay-case-01.webp",
     "Peninsula Chardonnay — Main Ridge Estate, Mornington Peninsula",
     "Peninsula Insider",
     "editorial"),

    ("merricks-estate",
     "/images/sourced/place-mount-martha-01.webp",
     "Mount Martha and Merricks wine country, Mornington Peninsula — Merricks Estate",
     "Peninsula Insider",
     "editorial"),

    ("moorooduc-estate",
     "/images/sourced/article-orientation-drive-01.webp",
     "Mornington Peninsula wine country drive — Moorooduc Estate",
     "Peninsula Insider",
     "editorial"),

    ("morning-sun",
     "/images/sourced/article-sunset-01.webp",
     "Sunset over Mornington Peninsula vineyards — Morning Sun Vineyard",
     "Peninsula Insider",
     "editorial"),

    ("onannon",
     "/images/sourced/article-point-nepean-01.webp",
     "Point Nepean landscape, Mornington Peninsula — Onannon wines",
     "Peninsula Insider",
     "editorial"),

    ("paradigm-hill",
     "/images/sourced/place-flinders-01.webp",
     "Flinders, Mornington Peninsula wine country — Paradigm Hill",
     "Peninsula Insider",
     "editorial"),

    ("phaedrus-estate",
     "/images/sourced/article-sorrento-weekend-01.webp",
     "Mornington Peninsula wine weekend — Phaedrus Estate",
     "Peninsula Insider",
     "editorial"),

    ("polperro",
     "/images/sourced/place-red-hill-01.webp",
     "Red Hill wine country, Mornington Peninsula — Polperro winery",
     "Peninsula Insider",
     "editorial"),

    ("port-phillip-estate",
     "/images/sourced/place-cape-schanck-01.webp",
     "Cape Schanck headland, Mornington Peninsula — Port Phillip Estate wine country",
     "Peninsula Insider",
     "editorial"),

    ("prancing-horse-estate",
     "/images/sourced/article-couples-weekend-01.webp",
     "Couples weekend at a Mornington Peninsula winery — Prancing Horse Estate",
     "Peninsula Insider",
     "editorial"),

    ("quealy-winemakers",
     "/images/sourced/venue-wine-tasting-01.webp",
     "Peninsula cellar door wine tasting — Quealy Winemakers",
     "Peninsula Insider",
     "editorial"),

    ("red-hill-estate",
     "/images/sourced/article-picnic-01.webp",
     "Vineyard picnic on the Mornington Peninsula — Red Hill Estate",
     "Peninsula Insider",
     "editorial"),

    ("scorpo-wines",
     "/images/sourced/article-flinders-weekend-01.webp",
     "Mornington Peninsula south wine country — Scorpo Wines, Merricks",
     "Peninsula Insider",
     "editorial"),

    ("stonier-wines",
     "/images/sourced/place-rosebud-01.webp",
     "Rosebud and Merricks wine country, Mornington Peninsula — Stonier Wines",
     "Peninsula Insider",
     "editorial"),

    ("stumpy-gully-vineyard",
     "/images/sourced/place-rye-01.webp",
     "Western Peninsula wine country — Stumpy Gully Vineyard",
     "Peninsula Insider",
     "editorial"),

    ("t-gallant",
     "/images/sourced/article-italian-dinners-01.webp",
     "Italian-inspired wine and dining on the Peninsula — T'Gallant",
     "Peninsula Insider",
     "editorial"),

    ("trofeo-estate",
     "/images/sourced/place-sorrento-01.webp",
     "Sorrento, Mornington Peninsula — Trofeo Estate winery",
     "Peninsula Insider",
     "editorial"),

    ("tucks-ridge",
     "/images/sourced/place-portsea-01.webp",
     "Portsea, Mornington Peninsula — Tucks Ridge winery",
     "Peninsula Insider",
     "editorial"),

    ("willow-creek-vineyard",
     "/images/sourced/place-point-nepean-01.webp",
     "Point Nepean National Park, Mornington Peninsula — Willow Creek Vineyard",
     "Peninsula Insider",
     "editorial"),

    ("yabby-lake",
     "/images/sourced/explore-cape-schanck-boardwalk-01.webp",
     "Cape Schanck boardwalk, Mornington Peninsula — Yabby Lake Vineyard",
     "Peninsula Insider",
     "editorial"),
]

updated = 0
skipped = 0
errors = []

for (slug, src, alt, credit, license) in ASSIGNMENTS:
    path = os.path.join(BASE, f"{slug}.json")
    if not os.path.exists(path):
        errors.append(f"MISSING: {path}")
        continue

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    data["heroImage"] = {
        "src": src,
        "alt": alt,
        "credit": credit,
        "license": license
    }

    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"  OK  {slug:40s} → {src.split('/')[-1]}")
    updated += 1

print(f"\n✓ Updated {updated} winery files")
if errors:
    print(f"\n✗ Errors:")
    for e in errors:
        print(f"  {e}")

# Verify no duplicates
print("\n--- Duplicate check ---")
seen = {}
for (slug, src, *_) in ASSIGNMENTS:
    fname = src.split("/")[-1]
    if fname in seen:
        print(f"  DUPLICATE: {fname} used by {seen[fname]} AND {slug}")
    else:
        seen[fname] = slug
print(f"  {len(set(src.split('/')[-1] for _, src, *_ in ASSIGNMENTS))} unique images across {len(ASSIGNMENTS)} assignments")
